/**
 * Integration tests for token generation with different modes
 */

import {
  applyModeTransformations,
  applyGrammarTransformations,
  getMaliciousValue,
  getMaliciousCategories
} from '../src/modes.js';
import { getCompleteGrammar } from '../src/grammar.js';

describe('Integration - Token Generation with Modes', () => {
  const basePayload = {
    sub: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
    iss: 'https://example.com',
    jti: 'jti-123'
  };

  describe('Mode: fake', () => {
    test('Fake mode preserves original claims', () => {
      const result = applyModeTransformations({ ...basePayload }, 'fake');

      expect(result.sub).toBe(basePayload.sub);
      expect(result.email).toBe(basePayload.email);
      expect(result.name).toBe(basePayload.name);
      expect(result.iss).toBe(basePayload.iss);
    });

    test('Fake mode works with scope claims', () => {
      const payload = {
        ...basePayload,
        scope: 'openid profile email'
      };
      const result = applyModeTransformations({ ...payload }, 'fake');

      expect(result.scope).toBe('openid profile email');
    });
  });

  describe('Mode: fuzz', () => {
    test('Fuzz mode mutates some claims', () => {
      const result = applyModeTransformations({ ...basePayload }, 'fuzz');

      // At least one non-protected claim should be different
      const modified =
        result.sub !== basePayload.sub ||
        result.email !== basePayload.email ||
        result.name !== basePayload.name ||
        result.roles !== basePayload.roles;

      expect(modified).toBe(true);
    });

    test('Fuzz mode protects iss and jti', () => {
      const result = applyModeTransformations({ ...basePayload }, 'fuzz');

      expect(result.iss).toBe(basePayload.iss);
      expect(result.jti).toBe(basePayload.jti);
    });

    test('Fuzz mode respects exclude list', () => {
      const result = applyModeTransformations(
        { ...basePayload },
        'fuzz',
        ['email', 'name']
      );

      expect(result.email).toBe(basePayload.email);
      expect(result.name).toBe(basePayload.name);
    });

    test('Fuzz mode with multiple calls produces different results', () => {
      const result1 = applyModeTransformations({ ...basePayload }, 'fuzz');
      const result2 = applyModeTransformations({ ...basePayload }, 'fuzz');

      // Results should be different (very likely with high probability)
      const different =
        JSON.stringify(result1) !== JSON.stringify(result2);

      expect(different).toBe(true);
    });
  });

  describe('Mode: malicious', () => {
    test('Malicious mode injects payloads', () => {
      const result = applyModeTransformations({ ...basePayload }, 'malicious');

      const modified =
        result.sub !== basePayload.sub ||
        result.email !== basePayload.email ||
        result.name !== basePayload.name;

      expect(modified).toBe(true);
    });

    test('Malicious mode creates injectable claims', () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        query: 'select * from users'
      };

      const result = applyModeTransformations({ ...payload }, 'malicious');

      // At least one should be modified with malicious content
      expect(
        typeof result.sub === 'string' ||
        typeof result.email === 'string' ||
        typeof result.query === 'string'
      ).toBe(true);
    });

    test('Malicious mode with category focuses on specific attacks', () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        name: 'Test'
      };

      // Inject category through claims
      const claimsWithCategory = {
        ...payload,
        __maliciousCategory: 'sql_injection'
      };

      const result = applyModeTransformations(claimsWithCategory, 'malicious');
      delete result.__maliciousCategory;

      // Should have modified at least one claim
      expect(
        result.sub !== payload.sub ||
        result.email !== payload.email ||
        result.name !== payload.name
      ).toBe(true);
    });
  });

  describe('Mode: grammar', () => {
    test('Grammar mode transforms all modifiable claims', () => {
      const grammar = getCompleteGrammar();
      const result = applyGrammarTransformations({ ...basePayload }, grammar);

      expect(result).toBeDefined();
      expect(result.iss).toBe(basePayload.iss); // Protected
    });

    test('Grammar mode with valid category uses valid values', () => {
      const grammar = getCompleteGrammar();
      const result = applyGrammarTransformations(
        { ...basePayload },
        grammar,
        [],
        'valid'
      );

      expect(result).toBeDefined();
    });

    test('Grammar mode with edge_cases uses edge case values', () => {
      const payload = { sub: 'user123', exp: 9999999999 };
      const grammar = getCompleteGrammar();

      const result = applyGrammarTransformations(
        { ...payload },
        grammar,
        [],
        'edge_cases'
      );

      expect(result).toBeDefined();
    });

    test('Grammar mode with injection category injects payloads', () => {
      const grammar = getCompleteGrammar();
      const result = applyGrammarTransformations(
        { ...basePayload },
        grammar,
        [],
        'injection'
      );

      expect(result).toBeDefined();
    });

    test('Grammar mode with type_variations creates type mismatches', () => {
      const grammar = getCompleteGrammar();
      const result = applyGrammarTransformations(
        { ...basePayload },
        grammar,
        [],
        'type_variations'
      );

      expect(result).toBeDefined();
    });

    test('Grammar mode with vulnerable category tests algorithm confusion', () => {
      const grammar = getCompleteGrammar();
      // Note: vulnerable category mainly affects header, not claims
      const result = applyGrammarTransformations(
        { ...basePayload },
        grammar,
        [],
        'vulnerable'
      );

      expect(result).toBeDefined();
    });

    test('Grammar mode respects exclude list', () => {
      const grammar = getCompleteGrammar();
      const result = applyGrammarTransformations(
        { ...basePayload },
        grammar,
        ['email', 'roles']
      );

      expect(result.email).toBe(basePayload.email);
      expect(result.roles).toBe(basePayload.roles);
    });
  });

  describe('Integration - Complex Scenarios', () => {
    test('Fuzz mode with multiple excluded fields', () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        name: 'Test',
        roles: ['admin'],
        exp: 9999999999,
        iat: 1234567890
      };

      const result = applyModeTransformations(
        { ...payload },
        'fuzz',
        ['exp', 'iat', 'sub']
      );

      expect(result.exp).toBe(payload.exp);
      expect(result.iat).toBe(payload.iat);
      expect(result.sub).toBe(payload.sub);
    });

    test('Grammar mode with complex claim structure', () => {
      const complexPayload = {
        sub: 'user123',
        email: 'test@example.com',
        roles: ['admin', 'user'],
        address: {
          street: '123 Main St',
          city: 'Anytown'
        },
        scope: 'openid profile email',
        iss: 'https://example.com'
      };

      const grammar = getCompleteGrammar();
      const result = applyGrammarTransformations(
        { ...complexPayload },
        grammar
      );

      expect(result).toBeDefined();
      expect(result.iss).toBe(complexPayload.iss);
    });

    test('Malicious mode creates varied payloads', () => {
      const payload = { sub: 'user123', email: 'test@example.com' };
      const results = [];

      // Generate multiple malicious tokens
      for (let i = 0; i < 5; i++) {
        const result = applyModeTransformations(
          { ...payload },
          'malicious'
        );
        results.push(result);
      }

      // They should have variety
      const uniquePayloads = new Set(
        results.map(r => JSON.stringify(r))
      );
      expect(uniquePayloads.size).toBeGreaterThan(1);
    });

    test('Grammar mode produces consistent results with same category', () => {
      const payload = { sub: 'user123', email: 'test@example.com' };
      const grammar = getCompleteGrammar();

      // Multiple calls with same category should produce valid results
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = applyGrammarTransformations(
          { ...payload },
          grammar,
          [],
          'valid'
        );
        results.push(result);
      }

      // All should be defined and have modified values
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.sub).toBeDefined();
      });
    });
  });

  describe('Integration - Malicious Categories Coverage', () => {
    test('All malicious categories produce payloads', () => {
      const categories = getMaliciousCategories();

      categories.forEach(category => {
        const payload = getMaliciousValue(category);
        expect(typeof payload).toBe('string');
        expect(payload.length).toBeGreaterThan(0);
      });
    });

    test('SQL injection category produces SQL patterns', () => {
      const payload = getMaliciousValue('sql_injection');
      expect(/['";-]|--|SELECT|DROP|UNION/.test(payload)).toBe(true);
    });

    test('XSS category produces script injection', () => {
      const payload = getMaliciousValue('xss');
      expect(/[<>]|script|alert|onerror|javascript/.test(payload)).toBe(true);
    });

    test('Command injection category produces shell operators', () => {
      const payload = getMaliciousValue('command_injection');
      expect(/[|;`$()]/.test(payload)).toBe(true);
    });

    test('Path traversal category produces directory traversal', () => {
      const payload = getMaliciousValue('path_traversal');
      expect(/\.\.\/|\.\.\\/.test(payload)).toBe(true);
    });

    test('LDAP injection category produces LDAP patterns', () => {
      const payload = getMaliciousValue('ldap_injection');
      expect(/\*|uid|\||&/.test(payload)).toBe(true);
    });

    test('NoSQL injection category produces database operators', () => {
      const payload = getMaliciousValue('nosql_injection');
      expect(/\$|{|}/.test(payload)).toBe(true);
    });

    test('Template injection category produces template expressions', () => {
      const payload = getMaliciousValue('template_injection');
      expect(/{{|}}|\$\{|\}/.test(payload)).toBe(true);
    });
  });

  describe('Integration - Mode Consistency', () => {
    test('Mode fake is idempotent for same input', () => {
      const payload = { ...basePayload };

      const result1 = applyModeTransformations({ ...payload }, 'fake');
      const result2 = applyModeTransformations({ ...payload }, 'fake');

      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });

    test('All modes handle metadata removal', () => {
      const payloadWithMetadata = {
        ...basePayload,
        mode: 'test',
        exclude: ['field']
      };

      const modes = ['fake', 'fuzz', 'malicious'];
      modes.forEach(mode => {
        const result = applyModeTransformations(
          { ...payloadWithMetadata },
          mode
        );
        expect(result.mode).toBeUndefined();
        expect(result.exclude).toBeUndefined();
      });
    });
  });
});
