import { webcrypto, createPublicKey, verify } from 'node:crypto';
import worker from '../src/index.js';
import { getOpenAPISpec } from '../src/openapi.js';
import { tokenExamples } from '../src/token-examples.js';

jest.mock('@faker-js/faker', () => ({ faker: {
  internet: { email: () => 'generated@example.test' },
  datatype: { boolean: () => true },
} }));

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
const source = `${encode({ alg: 'RS256' })}.${encode({ sub: 'source-user', exp: 0 })}.AQID`;
const mutations = [
  { id: 'unsigned', operations: [{ type: 'signature', operation: 'remove' }] },
  { id: 'flattened', operations: [{ type: 'format', operation: 'convert', format: 'flattened' }] },
];
const post = (body, env = {}, path = '/mutation') => worker.fetch(new Request(`https://jwtforge.test${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), env);

beforeAll(() => { if (!globalThis.crypto) globalThis.crypto = webcrypto; });

describe('POST /mutation', () => {
  test('imported sources bypass keys, issuer, client ID, and default claims', async () => {
    const env = { ISSUER: 'https://other.test', KEYSTORE_KV: { get: jest.fn(() => { throw new Error('Unexpected key lookup'); }) } };
    const response = await post({ token: source, mutations }, env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const data = await response.json();
    expect(data.count).toBe(2);
    expect(data.access_token).toBeUndefined();
    expect(decode(data.results[0].token)).toEqual({ sub: 'source-user', exp: 0 });
    expect(env.KEYSTORE_KV.get).not.toHaveBeenCalled();
  });

  test('generates a single signed source with scope defaults and explicit values before mutation', async () => {
    const response = await post({ source: { body: { sub: 'alice', scope: 'openid email', exp: 0, email: 'asserted@example.test' } }, mutations });
    expect(response.status).toBe(200);
    const data = await response.json();
    const unsignedClaims = decode(data.results[0].token);
    const flattened = data.results[1].token;
    const flattenedClaims = JSON.parse(Buffer.from(flattened.payload, 'base64url').toString());
    expect(flattenedClaims).toEqual(unsignedClaims);
    expect(flattenedClaims).toMatchObject({ sub: 'alice', exp: 0, email: 'asserted@example.test', email_verified: true, iss: 'https://jwtforge.test' });
    expect(flattenedClaims).not.toHaveProperty('mode');
    expect(flattenedClaims).not.toHaveProperty('mutations');
    const jwks = await (await worker.fetch(new Request('https://jwtforge.test/.well-known/jwks.json'), {})).json();
    const header = JSON.parse(Buffer.from(flattened.protected, 'base64url').toString());
    const key = createPublicKey({ key: jwks.keys.find(key => key.kid === header.kid), format: 'jwk' });
    expect(verify('sha256', Buffer.from(`${flattened.protected}.${flattened.payload}`), key, Buffer.from(flattened.signature, 'base64url'))).toBe(true);
  });

  test('generated general source supports per-signature operations', async () => {
    const response = await post({ source: { format: 'general', body: { sub: 'user' }, signatures: [{}, { signature: 'AQID' }] },
      mutations: [{ id: 'second', operations: [{ type: 'signature', operation: 'remove', signature_index: 1 }] }] });
    expect(response.status).toBe(200);
    const result = (await response.json()).results[0];
    expect(result.token.signatures[0].signature).not.toBe('');
    expect(result.token.signatures[1].signature).toBe('');
  });

  test('mutation source can use a vulnerability preset', async () => {
    const response = await post({ source: { vulnerability: 'alg_none', body: { sub: 'user' } }, mutations });
    expect(response.status).toBe(200);
    expect((await response.json()).results[1].token.signature).toBe('');
  });

  test.each([
    { mutations },
    { token: source, source: {}, mutations },
    { source: null, mutations },
    { mode: 'fake', mutations },
    { mode: 'mutation' },
    { mode: 'mutation', token: source, body: {}, mutations },
    { mode: 'mutation', grant_type: 'client_credentials', mutations },
    { mode: 'mutation', response_type: 'id_token', mutations },
    { mode: 'mutation', body: { response_type: 'id_token' }, mutations },
    { body: { mode: 'mutation' } },
    { source: { response_type: 'id_token' }, mutations },
    { source: { mode: 'mutation' }, mutations },
    { source: { body: { response_type: 'id_token' } }, mutations },
  ])('rejects ambiguous requests %#', async body => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('invalid_request');
  });

  test('error identifies the failed operation without partial results', async () => {
    const response = await post({ token: source, mutations: [mutations[0],
      { id: 'bad', operations: [{ type: 'body', operation: 'remove', field: 'missing' }] }] });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ group_id: 'bad', group_index: 1, operation_index: 0, error: 'invalid_request' });
  });

  test('oversized sources return 413', async () => {
    const response = await post({ token: `${encode({ alg: 'none' })}.${encode({ text: 'x'.repeat(65536) })}.`, mutations });
    expect(response.status).toBe(413);
    expect((await response.json()).error).toBe('payload_too_large');
  });

  test('mutation endpoint requires JSON content type', async () => {
    const response = await worker.fetch(new Request('https://jwtforge.test/mutation', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'mode=mutation',
    }), {});
    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain('application/json');
  });

  test.each(['token', 'id_token', 'id_token token'])('existing %s response stays unchanged', async response_type => {
    const response = await post({ body: { sub: 'user' }, response_type }, {}, '/token');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.results).toBeUndefined();
    expect(Boolean(data.access_token)).toBe(response_type.split(' ').includes('token'));
    expect(Boolean(data.id_token)).toBe(response_type.split(' ').includes('id_token'));
  });

  test('Swagger and shared mutation examples execute successfully', async () => {
    const spec = getOpenAPISpec('https://jwtforge.test');
    expect(spec.paths['/token'].post.requestBody.content['application/json'].schema.properties.mode.enum).not.toContain('mutation');
    expect(spec.paths['/token'].post.requestBody.content['application/json'].examples).not.toHaveProperty('mutation');
    expect(spec.paths['/mutation'].post.requestBody.content['application/json'].examples).toHaveProperty('mutation');
    const examples = Object.values(tokenExamples).filter(example => example.endpoint === '/mutation');
    expect(examples.length).toBeGreaterThanOrEqual(2);
    for (const example of examples) {
      const response = await post(example.value);
      expect(response.status).toBe(200);
      expect((await response.json()).count).toBe(example.value.mutations.length);
    }
  });

  test('mutation is not a token mode', async () => {
    const response = await post({ mode: 'mutation', body: {}, mutations }, {}, '/token');
    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain('Use POST /mutation');
  });

  test.each(['fake', 'fuzz', 'malicious', 'grammar'])('source supports %s generation', async mode => {
    const response = await post({ source: { mode, body: { sub: 'source-user' }, exclude: ['sub', 'iss', 'client_id'] }, mutations });
    expect(response.status).toBe(200);
    expect(decode((await response.json()).results[0].token).sub).toBe('source-user');
  });

  test('mutation route bypasses assets and supports CORS and method errors', async () => {
    const env = { ASSETS: { fetch: jest.fn(() => new Response('asset')) } };
    expect((await post({ token: source, mutations }, env)).status).toBe(200);
    const get = await worker.fetch(new Request('https://jwtforge.test/mutation'), env);
    expect(get.status).toBe(405);
    expect(get.headers.get('Allow')).toBe('POST');
    const options = await worker.fetch(new Request('https://jwtforge.test/mutation', { method: 'OPTIONS' }), env);
    expect(options.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  test('oversized wire body returns 413 and invalid source generation returns 400', async () => {
    const response = await worker.fetch(new Request('https://jwtforge.test/mutation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ' '.repeat(1024 * 1024 + 1),
    }), {});
    expect(response.status).toBe(413);
    expect((await post({ source: { header: 'invalid' }, mutations })).status).toBe(400);
  });
});
