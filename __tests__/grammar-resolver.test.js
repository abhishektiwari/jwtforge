/**
 * Unit tests for grammar value templates.
 */

import { resolveGrammarValue } from '../src/grammar-resolver.js';
import { getCompleteGrammar } from '../src/grammar.js';
import { applyGrammarTransformations, applyGrammarHeaderTransformations } from '../src/modes.js';

describe('Grammar Resolver', () => {
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

  test('resolves faker templates to realistic values', () => {
    const email = resolveGrammarValue({ type: 'faker', kind: 'email' });
    const bool = resolveGrammarValue({ type: 'faker', kind: 'boolean' });

    expect(typeof email).toBe('string');
    expect(email).toContain('@');
    expect(typeof bool).toBe('boolean');
  });

  test('throws for unsupported faker kinds', () => {
    expect(() => resolveGrammarValue({ type: 'faker', kind: 'not_supported' }))
      .toThrow('Unsupported faker template kind');
  });

  test('passes non-template literals through unchanged', () => {
    expect(resolveGrammarValue('RS256')).toBe('RS256');
    expect(resolveGrammarValue(null)).toBeNull();
    expect(resolveGrammarValue({ alg: 'RS256' })).toEqual({ alg: 'RS256' });
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
