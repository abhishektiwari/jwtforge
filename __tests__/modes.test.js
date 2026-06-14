/**
 * Unit tests for modes.js - Mode-based claim transformations
 */

import {
  getFuzzedValue,
  getFuzzedAlgorithm,
  getMaliciousValue,
  getMaliciousCategories,
  applyModeTransformations,
  applyHeaderTransformations,
  applyGrammarTransformations,
  applyGrammarHeaderTransformations
} from '../src/modes.js';
import { getCompleteGrammar } from '../src/grammar.js';

describe('Modes - Fuzzing', () => {
  test('getFuzzedValue returns a value', () => {
    const value = getFuzzedValue();
    expect(value).toBeDefined();
  });

  test('getFuzzedValue can return different types', () => {
    const values = new Set();
    for (let i = 0; i < 50; i++) {
      values.add(getFuzzedValue());
    }
    // Should have at least 20 different values from 50 calls
    expect(values.size).toBeGreaterThan(20);
  });

  test('getFuzzedAlgorithm returns algorithm string or pattern', () => {
    const alg = getFuzzedAlgorithm();
    expect(typeof alg === 'string' || alg === null).toBe(true);
  });

  test('getFuzzedAlgorithm includes vulnerable algorithms', () => {
    const algorithms = new Set();
    for (let i = 0; i < 100; i++) {
      algorithms.add(getFuzzedAlgorithm());
    }
    const algArray = Array.from(algorithms);
    // Should include some algorithm confusion attempts
    expect(algArray.some(a => ['none', 'None', 'NONE'].includes(a))).toBe(true);
  });
});

describe('Modes - Malicious', () => {
  test('getMaliciousValue returns a payload', () => {
    const payload = getMaliciousValue();
    expect(typeof payload).toBe('string');
    expect(payload.length).toBeGreaterThan(0);
  });

  test('getMaliciousCategories returns array of categories', () => {
    const categories = getMaliciousCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  test('getMaliciousCategories includes expected types', () => {
    const categories = getMaliciousCategories();
    expect(categories).toContain('sql_injection');
    expect(categories).toContain('xss');
    expect(categories).toContain('command_injection');
  });

  test('getMaliciousValue with category returns payload from that category', () => {
    const sqlPayload = getMaliciousValue('sql_injection');
    expect(typeof sqlPayload).toBe('string');
    // SQL injection payloads typically contain quotes or common SQL keywords
    expect(/['";-]|--|SELECT|DROP/.test(sqlPayload)).toBe(true);
  });

  test('getMaliciousValue with invalid category returns from any category', () => {
    const payload = getMaliciousValue('invalid_category');
    expect(typeof payload).toBe('string');
    expect(payload.length).toBeGreaterThan(0);
  });

  test('XSS category payloads contain script or HTML tags', () => {
    const xssPayload = getMaliciousValue('xss');
    expect(/[<>]|script|alert|onerror/.test(xssPayload)).toBe(true);
  });

  test('Command injection payloads contain shell operators', () => {
    const cmdPayload = getMaliciousValue('command_injection');
    expect(/[|;`$()]/.test(cmdPayload)).toBe(true);
  });
});

describe('Modes - Transformations', () => {
  test('applyModeTransformations with fake mode returns original claims', () => {
    const claims = { sub: 'user123', email: 'test@example.com' };
    const result = applyModeTransformations({ ...claims }, 'fake');
    expect(result.sub).toBe('user123');
    expect(result.email).toBe('test@example.com');
  });

  test('applyModeTransformations with fuzz mode modifies 1-3 claims', () => {
    const claims = {
      sub: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      roles: ['admin']
    };
    const result = applyModeTransformations({ ...claims }, 'fuzz');

    // Count how many claims were modified
    let modified = 0;
    if (result.sub !== claims.sub) modified++;
    if (result.email !== claims.email) modified++;
    if (result.name !== claims.name) modified++;
    if (result.roles !== claims.roles) modified++;

    expect(modified).toBeGreaterThanOrEqual(1);
    expect(modified).toBeLessThanOrEqual(3);
  });

  test('applyModeTransformations with malicious mode injects payloads', () => {
    const claims = {
      sub: 'user123',
      email: 'test@example.com',
      name: 'Test User'
    };
    const result = applyModeTransformations({ ...claims }, 'malicious');

    // At least one claim should be different
    const different =
      result.sub !== claims.sub ||
      result.email !== claims.email ||
      result.name !== claims.name;

    expect(different).toBe(true);
  });

  test('applyModeTransformations protects excluded fields', () => {
    const claims = {
      sub: 'user123',
      email: 'test@example.com',
      exp: 9999999999
    };
    const result = applyModeTransformations({ ...claims }, 'fuzz', ['exp']);

    expect(result.exp).toBe(claims.exp);
  });

  test('applyModeTransformations always protects iss and jti', () => {
    const claims = {
      iss: 'https://example.com',
      jti: 'uuid-1234',
      sub: 'user123'
    };
    const result = applyModeTransformations({ ...claims }, 'malicious');

    expect(result.iss).toBe(claims.iss);
    expect(result.jti).toBe(claims.jti);
  });

  test('applyHeaderTransformations fuzzes algorithm when mode is fuzz', () => {
    const requestData = {
      header_alg: 'trigger-fuzz',
      sub: 'user123'
    };
    const result = applyHeaderTransformations(requestData, 'fuzz');

    expect(result.alg).toBeDefined();
    // Fuzzed alg could be various values
    expect(typeof result.alg).toBe('string');
  });

  test('applyHeaderTransformations injects malicious values when mode is malicious', () => {
    const requestData = {
      header_kid: 'trigger-malicious',
      sub: 'user123'
    };
    const result = applyHeaderTransformations(requestData, 'malicious');

    expect(result.kid).toBeDefined();
    expect(typeof result.kid).toBe('string');
  });
});

describe('Modes - Grammar', () => {
  test('applyGrammarTransformations returns object', () => {
    const claims = { sub: 'user123' };
    const grammar = getCompleteGrammar();
    const result = applyGrammarTransformations({ ...claims }, grammar);

    expect(typeof result).toBe('object');
  });

  test('applyGrammarTransformations protects excluded fields', () => {
    const claims = { sub: 'user123', email: 'test@example.com' };
    const grammar = getCompleteGrammar();
    const result = applyGrammarTransformations({ ...claims }, grammar, ['email']);

    expect(result.email).toBe(claims.email);
  });

  test('applyGrammarTransformations with specific category', () => {
    const claims = { sub: 'user123', exp: 9999999999 };
    const grammar = getCompleteGrammar();
    const result = applyGrammarTransformations({ ...claims }, grammar, [], 'edge_cases');

    expect(result).toBeDefined();
  });

  test('applyGrammarHeaderTransformations transforms header fields', () => {
    const requestData = { header_alg: 'trigger' };
    const grammar = getCompleteGrammar();
    const result = applyGrammarHeaderTransformations(requestData, grammar);

    expect(result.alg).toBeDefined();
  });

  test('applyGrammarHeaderTransformations with category', () => {
    const requestData = { header_alg: 'trigger' };
    const grammar = getCompleteGrammar();
    const result = applyGrammarHeaderTransformations(requestData, grammar, [], 'vulnerable');

    expect(result.alg).toBeDefined();
  });
});

describe('Modes - Metadata Removal', () => {
  test('Mode parameter itself is not included in transformations', () => {
    const claims = { sub: 'user123', mode: 'fuzz' };
    const result = applyModeTransformations({ ...claims }, 'fake');

    // mode should be filtered out before or be undefined
    expect(result.mode).toBeUndefined();
  });

  test('Exclude parameter itself is not included in claims', () => {
    const claims = { sub: 'user123', exclude: ['email'] };
    const result = applyModeTransformations({ ...claims }, 'fake');

    expect(result.exclude).toBeUndefined();
  });
});
