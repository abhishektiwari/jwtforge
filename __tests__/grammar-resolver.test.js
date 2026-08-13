/**
 * Unit tests for grammar value templates.
 */

import { resolveGrammarValue, setGrammarFaker } from '../src/grammar-resolver.js';
import { getCompleteGrammar } from '../src/grammar.js';
import { applyGrammarTransformations, applyGrammarHeaderTransformations } from '../src/modes.js';

describe('Grammar Resolver', () => {
  afterEach(() => {
    setGrammarFaker(null);
  });

  test('resolves timestamp templates relative to current time', () => {
    const before = Math.floor(Date.now() / 1000);
    const value = resolveGrammarValue({ type: 'timestamp', offsetSeconds: 3600 });
    const after = Math.floor(Date.now() / 1000);

    expect(value).toBeGreaterThanOrEqual(before + 3600);
    expect(value).toBeLessThanOrEqual(after + 3600);
  });

  test('resolves URL templates with aliases and ports', () => {
    const value = resolveGrammarValue({
      type: 'url',
      scheme: 'http',
      host: 'localhost',
      port: 8787,
      path: '/jwks.json'
    });

    expect(value).toBe('http://localhost:8787/jwks.json');
  });

  test('resolves URL literal and default templates', () => {
    expect(resolveGrammarValue({ type: 'url', value: 'file:///etc/passwd' }))
      .toBe('file:///etc/passwd');
    expect(resolveGrammarValue({ type: 'url' })).toBe('https://example.com/');
  });

  test('resolves JWK templates to concrete JWK objects', () => {
    const value = resolveGrammarValue({
      type: 'jwk',
      kty: 'RSA',
      kid: 'attacker-key',
      alg: 'HS256'
    });

    expect(value).toEqual({
      kty: 'RSA',
      use: 'sig',
      kid: 'attacker-key',
      alg: 'HS256',
      n: 'test',
      e: 'AQAB'
    });
  });

  test('resolves literal JWK and EC JWK templates', () => {
    const literal = { kty: 'oct', k: 'secret' };
    expect(resolveGrammarValue({ type: 'jwk', value: literal })).toEqual(literal);

    expect(resolveGrammarValue({ type: 'jwk', kty: 'EC', kid: 'ec-key' })).toEqual({
      kty: 'EC',
      use: 'sig',
      kid: 'ec-key',
      alg: 'ES256',
      crv: 'P-256',
      x: 'test',
      y: 'test'
    });
  });

  test('resolves faker templates to realistic values', () => {
    const email = resolveGrammarValue({ type: 'faker', kind: 'email' });
    const bool = resolveGrammarValue({ type: 'faker', kind: 'boolean' });

    expect(typeof email).toBe('string');
    expect(email).toContain('@');
    expect(typeof bool).toBe('boolean');
  });

  test('fallback faker supports all template kinds', () => {
    const kinds = [
      'full_name',
      'first_name',
      'last_name',
      'username',
      'email',
      'url',
      'avatar',
      'phone_number',
      'country_code',
      'locale',
      'timezone',
      'birthdate',
      'street_address',
      'city',
      'state',
      'zip_code',
      'boolean',
      'uuid'
    ];

    for (const kind of kinds) {
      expect(resolveGrammarValue({ type: 'faker', kind })).toBeDefined();
    }
  });

  test('configured faker provider is used for every supported template kind', () => {
    const provider = {
      person: {
        fullName: () => 'Provider User',
        firstName: () => 'Provider',
        lastName: () => 'User'
      },
      internet: {
        username: () => 'provider_user',
        email: () => 'provider@example.com',
        url: () => 'https://provider.example.com'
      },
      image: {
        avatar: () => 'https://provider.example.com/avatar.png'
      },
      phone: {
        number: () => '+1-202-555-0101'
      },
      location: {
        countryCode: () => 'US',
        timeZone: () => 'America/New_York',
        streetAddress: () => '1 Provider Way',
        city: () => 'Provider City',
        state: () => 'NY',
        zipCode: () => '10001'
      },
      date: {
        birthdate: () => new Date('1990-01-01T00:00:00.000Z')
      },
      datatype: {
        boolean: () => true
      },
      string: {
        uuid: () => '550e8400-e29b-41d4-a716-446655440000'
      }
    };

    setGrammarFaker(provider);

    expect(resolveGrammarValue({ type: 'faker', kind: 'full_name' })).toBe('Provider User');
    expect(resolveGrammarValue({ type: 'faker', kind: 'first_name' })).toBe('Provider');
    expect(resolveGrammarValue({ type: 'faker', kind: 'last_name' })).toBe('User');
    expect(resolveGrammarValue({ type: 'faker', kind: 'username' })).toBe('provider_user');
    expect(resolveGrammarValue({ type: 'faker', kind: 'email' })).toBe('provider@example.com');
    expect(resolveGrammarValue({ type: 'faker', kind: 'url' })).toBe('https://provider.example.com');
    expect(resolveGrammarValue({ type: 'faker', kind: 'avatar' })).toBe('https://provider.example.com/avatar.png');
    expect(resolveGrammarValue({ type: 'faker', kind: 'phone_number' })).toBe('+1-202-555-0101');
    expect(resolveGrammarValue({ type: 'faker', kind: 'country_code' })).toBe('US');
    expect(resolveGrammarValue({ type: 'faker', kind: 'locale' })).toBe('US-US');
    expect(resolveGrammarValue({ type: 'faker', kind: 'timezone' })).toBe('America/New_York');
    expect(resolveGrammarValue({ type: 'faker', kind: 'birthdate' })).toBe('1990-01-01');
    expect(resolveGrammarValue({ type: 'faker', kind: 'street_address' })).toBe('1 Provider Way');
    expect(resolveGrammarValue({ type: 'faker', kind: 'city' })).toBe('Provider City');
    expect(resolveGrammarValue({ type: 'faker', kind: 'state' })).toBe('NY');
    expect(resolveGrammarValue({ type: 'faker', kind: 'zip_code' })).toBe('10001');
    expect(resolveGrammarValue({ type: 'faker', kind: 'boolean' })).toBe(true);
    expect(resolveGrammarValue({ type: 'faker', kind: 'uuid' })).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  test('throws for unsupported faker kinds', () => {
    expect(() => resolveGrammarValue({ type: 'faker', kind: 'not_supported' }))
      .toThrow('Unsupported faker template kind');
  });

  test('passes non-template literals through unchanged', () => {
    expect(resolveGrammarValue('RS256')).toBe('RS256');
    expect(resolveGrammarValue(null)).toBeNull();
    expect(resolveGrammarValue(['a', { nested: true }])).toEqual(['a', { nested: true }]);
    expect(resolveGrammarValue({ alg: 'RS256' })).toEqual({ alg: 'RS256' });
    expect(resolveGrammarValue({ type: 'literal', value: { nested: ['value'] } }))
      .toEqual({ nested: ['value'] });
    expect(resolveGrammarValue({ type: 'attack_string', value: "' OR '1'='1" }))
      .toBe("' OR '1'='1");
  });
});

describe('Grammar templates in modes', () => {
  test('grammar claim transformations return concrete timestamps', () => {
    const grammar = getCompleteGrammar();
    const result = applyGrammarTransformations({ exp: 1 }, grammar, [], 'valid');

    expect(typeof result.exp).toBe('number');
  });

  test('grammar claim transformations return concrete faker values', () => {
    const grammar = getCompleteGrammar();
    const result = applyGrammarTransformations({ email: 'placeholder' }, grammar, [], 'valid');

    expect(typeof result.email).toBe('string');
    expect(result.email).not.toEqual({ type: 'faker', kind: 'email' });
  });

  test('grammar header transformations return concrete vulnerable header values', () => {
    const grammar = getCompleteGrammar();
    const result = applyGrammarHeaderTransformations(
      { header: { alg: 'trigger', jku: 'trigger', jwk: {} } },
      grammar,
      [],
      'vulnerable'
    );

    expect(typeof result.alg).toBe('string');
    expect(typeof result.jku).toBe('string');
    expect(result.jwk).toBeDefined();
    expect(result.jwk.type).toBeUndefined();
  });
});
