import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { MUTATION_LIMITS, mutateToken, readMutationRequest, validateMutationRequest } from '../src/mutation.js';

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = value => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
const header = Buffer.from('{ "alg": "RS256", "typ": "JWT" }').toString('base64url');
const payload = encode({ sub: 'user123', roles: ['user'], exp: 0, name: 'Ren\u00e9' });
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const signature = sign('sha256', Buffer.from(`${header}.${payload}`), privateKey).toString('base64url');
const original = `${header}.${payload}.${signature}`;
const group = (...operations) => [{ id: 'test', operations }];
const removeSignature = { type: 'signature', operation: 'remove' };
const convert = format => ({ type: 'format', operation: 'convert', format });
const set = (type, field, value) => ({ type, operation: 'set', field, value });

describe('Mutation engine', () => {
  test('groups start from the original; operations within a group execute in order', () => {
    const results = mutateToken(original, [
      { id: 'unsigned', operations: [set('header', 'alg', 'None'), removeSignature] },
      { id: 'admin', operations: [set('body', 'roles', ['admin'])] },
    ]).results;
    const unsigned = results[0].token.split('.');
    const admin = results[1].token.split('.');
    expect(decode(unsigned[0]).alg).toBe('None');
    expect(unsigned.slice(1)).toEqual([payload, '']);
    expect(admin[0]).toBe(header);
    expect(decode(admin[1])).toEqual({ sub: 'user123', roles: ['admin'], exp: 0, name: 'Ren\u00e9' });
    expect(admin[2]).toBe(signature);
    expect(results[0].signatures[0]).toEqual({ signature_index: 0, signing_input_changed: true, signature_action: 'removed' });
    expect(results[1].signatures[0].signature_action).toBe('preserved');
    expect(verify('sha256', Buffer.from(admin.slice(0, 2).join('.')), publicKey, Buffer.from(admin[2], 'base64url'))).toBe(false);
  });

  test.each(['flattened', 'general'])('conversion to %s preserves signing bytes and verifies', format => {
    const result = mutateToken(original, group(convert(format))).results[0];
    const entry = format === 'general' ? result.token.signatures[0] : result.token;
    expect(entry.protected).toBe(header);
    expect(result.token.payload).toBe(payload);
    expect(entry.signature).toBe(signature);
    expect(verify('sha256', Buffer.from(`${entry.protected}.${result.token.payload}`), publicKey, Buffer.from(entry.signature, 'base64url'))).toBe(true);
    expect(result.signatures[0].signing_input_changed).toBe(false);
    expect(mutateToken(result.token, group(convert('compact'))).results[0].token).toBe(original);
  });

  test('no-op edits do not normalize original whitespace or signature encoding', () => {
    expect(mutateToken(original, group(set('header', 'alg', 'RS256'), convert('compact'))).results[0].token).toBe(original);
  });

  test('fields can be deleted, re-added, or assigned arbitrary types and header names', () => {
    const result = mutateToken(original, group(
      { type: 'body', operation: 'remove', field: 'exp' },
      set('body', 'exp', null), set('header', 'x5u', 'https://example.test/key'),
      set('header', 'crit', ['missing']), set('body', '__proto__', { admin: true }),
    )).results[0];
    const [h, p] = result.token.split('.');
    expect(decode(h).crit).toEqual(['missing']);
    expect(decode(h).x5u).toBe('https://example.test/key');
    expect(decode(p).exp).toBeNull();
    expect(Object.hasOwn(decode(p), '__proto__')).toBe(true);
    expect({}.admin).toBeUndefined();
  });

  test('signature edits preserve signed input', () => {
    const source = `${header}.${payload}.AQID`;
    const results = mutateToken(source, [
      { id: 'literal', operations: [{ type: 'signature', operation: 'replace', value: 'literal!' }] },
      { id: 'truncate', operations: [{ type: 'signature', operation: 'truncate', length: 2 }] },
      { id: 'flip', operations: [{ type: 'signature', operation: 'flip_bit', byte_index: 0, bit_index: 0 }] },
    ]).results;
    expect(results.map(result => result.token.split('.')[2])).toEqual(['literal!', 'AQI', 'AAID']);
    expect(results.every(result => result.signatures[0].signing_input_changed === false)).toBe(true);
    expect(results.every(result => result.signatures[0].signature_action === 'modified')).toBe(true);
    expect(mutateToken(source, group({ type: 'signature', operation: 'truncate', length: 3 })).results[0].token).toBe(source);
    expect(mutateToken(source, group({ type: 'signature', operation: 'truncate', length: 0 })).results[0].signatures[0].signature_action).toBe('removed');
  });

  test('general JWS targets only the selected signature and preserves extensions', () => {
    const source = { payload, signatures: [
      { protected: header, signature, header: { kid: 'unprotected' } },
      { protected: header, signature: 'AQID' },
    ], payload_decoded: { sub: 'hint' } };
    const result = mutateToken(source, group({ ...removeSignature, signature_index: 1 },
      { ...set('header', 'kid', 'other'), signature_index: 1 })).results[0];
    expect(result.token.signatures[0]).toEqual(source.signatures[0]);
    expect(result.token.payload_decoded).toEqual(source.payload_decoded);
    expect(result.token.signatures[1].signature).toBe('');
    expect(result.signatures.map(entry => entry.signing_input_changed)).toEqual([false, true]);
    expect(source.signatures[1].signature).toBe('AQID');
    const bodyChange = mutateToken(source, group(set('body', 'sub', 'changed'))).results[0];
    expect(bodyChange.signatures.every(entry => entry.signing_input_changed)).toBe(true);
    expect(bodyChange.token.signatures).toEqual(source.signatures);
    expect(() => mutateToken(source, group(removeSignature))).toThrow('require signature_index');
  });

  test('JSON JWS without a protected header is preserved or gains a protected header explicitly', () => {
    const source = { payload, signature: 'AQID', header: { alg: 'HS256' }, extension: true };
    const result = mutateToken(source, group(convert('general'), convert('flattened'))).results[0];
    expect(result.token).toEqual(source);
    expect(mutateToken(source, group(set('header', 'typ', 'JWT'))).results[0].token.protected).toBe(encode({ typ: 'JWT' }));
    expect(() => mutateToken({ payload, signature }, group(convert('compact')))).toThrow('requires a protected header');
  });

  test('errors identify the group and operation, with no partial results', () => {
    try {
      mutateToken(original, [
        { id: 'valid', operations: [removeSignature] },
        { id: 'invalid', operations: [set('body', 'foo', 1), { type: 'body', operation: 'remove', field: 'missing' }] },
      ]);
      throw new Error('Expected mutation failure');
    } catch (error) {
      expect(error.context).toEqual({ group_id: 'invalid', group_index: 1, operation_index: 1 });
      expect(error.status).toBe(400);
    }
  });

  test.each([
    ['multiple signatures', { payload, signatures: [{ protected: header, signature }, { protected: header, signature }] }, 'flattened'],
    ['unprotected header', { payload, protected: header, signature, header: {} }, 'compact'],
    ['extension', { payload, protected: header, signature, payload_decoded: {} }, 'compact'],
    ['colliding extension', { payload, signatures: [{ protected: header, signature, payload: 'other' }] }, 'flattened'],
    ['overlapping extension', { payload, extension: 1, signatures: [{ protected: header, signature, extension: 2 }] }, 'flattened'],
  ])('rejects lossy conversion: %s', (_label, source, format) => {
    expect(() => mutateToken(source, group(convert(format)))).toThrow();
  });

  test.each([
    null, [], 4, 'a.b.c.d.e', `.${payload}.`, `${header}..`,
    `*.${payload}.`, `${encode([])}.${payload}.`, `${encode({ b64: false })}.${payload}.`,
    `${encode({ enc: 'A256GCM' })}.${payload}.`, `${header}.${encode('string')}.`,
    `ew.${payload}.`, `_w.${payload}.`, `${header}.A.`,
    { payload, signatures: [] }, { payload }, { payload, signature: false },
    { payload, signature, protected: false }, { payload, signature, header: [] },
    { payload, signature, signatures: [{ signature }] },
    { payload, signatures: Array.from({ length: 9 }, () => ({ signature })) },
    { payload, signature, header: { b64: false } }, { payload, signature, header: { enc: 'A256GCM' } },
  ])('rejects unsupported source %#', source => {
    expect(() => mutateToken(source, group(removeSignature))).toThrow();
  });

  test.each([
    { type: 'body', operation: 'remove', field: 'unknown' },
    { ...removeSignature, signature_index: 1 },
    { type: 'signature', operation: 'truncate', length: 9999 },
    { type: 'signature', operation: 'flip_bit', byte_index: 9999, bit_index: 1 },
  ])('rejects out-of-range operations %#', operation => {
    expect(() => mutateToken(original, group(operation))).toThrow();
  });

  test('raw signature replacement can be removed but not byte-edited without valid encoding', () => {
    expect(() => mutateToken(original, group({ type: 'signature', operation: 'replace', value: '!' },
      { type: 'signature', operation: 'truncate', length: 0 }))).toThrow('Base64url');
    expect(mutateToken(original, group({ type: 'signature', operation: 'replace', value: '!' }, removeSignature)).results[0].token).toBe(`${header}.${payload}.`);
  });

  test('enforces source, request, and cumulative output byte limits', () => {
    const largeSource = `${header}.${encode({ text: 'x'.repeat(MUTATION_LIMITS.sourceBytes) })}.`;
    expect(() => mutateToken(largeSource, group(removeSignature))).toThrow('64 KiB');
    expect(() => validateMutationRequest({ source: { body: { text: 'x'.repeat(MUTATION_LIMITS.requestBytes) } }, mutations: group(removeSignature) })).toThrow('1 MiB');
    const source = `${header}.${encode({ text: 'x'.repeat(45000) })}.AQID`;
    const groups = Array.from({ length: 32 }, (_, index) => ({ id: String(index), operations: [removeSignature] }));
    expect(() => mutateToken(source, groups)).toThrow('response exceeds 1 MiB');
    expect(() => mutateToken(original, group(set('body', 'large', 'x'.repeat(800000))))).toThrow('Mutated token exceeds 1 MiB');
  });
});

describe('Mutation request validation', () => {
  test.each([
    {}, { mode: 'fake', mutations: group(removeSignature) },
    { source: {}, mutations: [] },
    { token: original, source: {}, mutations: group(removeSignature) },
    { source: null, mutations: group(removeSignature) },
    { source: {}, response_type: 'token', mutations: group(removeSignature) },
    { source: { grant_type: 'client_credentials' }, mutations: group(removeSignature) },
    { source: { mode: 'mutation' }, mutations: group(removeSignature) },
    { source: { body: { mode: 'fuzz' } }, mutations: group(removeSignature) },
    { source: { signatures: [] }, mutations: group(removeSignature) },
    { source: {}, mutations: [null] },
    { source: {}, mutations: [{ id: ' ', operations: [removeSignature] }] },
    { source: {}, mutations: [{ id: 'empty', operations: [] }] },
    { source: {}, mutations: [...group(removeSignature), ...group(removeSignature)] },
    { source: {}, mutations: Array.from({ length: 33 }, (_, index) => ({ id: String(index), operations: [removeSignature] })) },
    { source: {}, mutations: group(...Array(17).fill(removeSignature)) },
  ])('rejects invalid request %#', request => {
    expect(() => validateMutationRequest(request)).toThrow();
  });

  test.each([
    null, { type: 'unknown', operation: 'set' },
    { type: 'body', operation: 'increment', field: 'exp' },
    { type: 'body', operation: 'set', field: '' },
    { type: 'body', operation: 'set', field: 'exp' },
    { type: 'body', operation: 'remove', field: 'exp', value: 0 },
    { type: 'body', operation: 'set', field: 'exp', value: 0, signature_index: 0 },
    { type: 'signature', operation: 'sign' },
    { type: 'signature', operation: 'replace', value: false },
    { type: 'signature', operation: 'truncate', length: -1 },
    { type: 'signature', operation: 'truncate', length: 1.5 },
    { type: 'signature', operation: 'flip_bit', byte_index: 0, bit_index: 8 },
    { ...removeSignature, signature_index: -1 },
    { type: 'format', operation: 'set', format: 'compact' },
    convert('jwe'), { ...convert('general'), signature_index: 0 },
  ])('rejects invalid operation %#', operation => {
    try {
      validateMutationRequest({ token: original, mutations: group(operation) });
      throw new Error('Expected validation failure');
    } catch (error) {
      expect(error.context).toEqual({ group_id: 'test', group_index: 0, operation_index: 0 });
    }
  });
});

describe('Bounded mutation request parsing', () => {
  const request = body => new Request('https://jwtforge.test/mutation', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body,
    duplex: 'half',
  });

  test('reads UTF-8 across chunk boundaries', async () => {
    const input = { source: { body: { name: 'Ren\u00e9' } }, mutations: group(removeSignature) };
    const bytes = new TextEncoder().encode(JSON.stringify(input));
    const stream = new ReadableStream({ start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    } });
    expect(await readMutationRequest(request(stream))).toEqual(input);
  });

  test('cancels oversized requests before JSON parsing', async () => {
    const cancel = jest.fn();
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(MUTATION_LIMITS.requestBytes + 1)); },
      cancel,
    });
    await expect(readMutationRequest(request(stream))).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalled();
  });

  test.each(['{', new Uint8Array([255]), 'null', '[]'])('rejects invalid JSON/object input %#', async input => {
    await expect(readMutationRequest(request(input))).rejects.toMatchObject({ status: 400 });
  });

  test('rejects an absent body or content type', async () => {
    await expect(readMutationRequest(request(undefined))).rejects.toThrow('body is required');
    await expect(readMutationRequest(new Request('https://jwtforge.test/mutation'))).rejects.toThrow('application/json');
  });
});
