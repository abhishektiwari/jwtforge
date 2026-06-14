/**
 * Tests for token exchange (RFC 8693) implementation
 */

import { base64urlDecode, parseAddClaims, parseRemoveClaims, extractTokenClaims } from '../src/tokenexchange.js';

describe('Token Exchange - Claim Parsing', () => {
  describe('parseAddClaims', () => {
    test('Parses single claim', () => {
      const result = parseAddClaims('scope:read');
      expect(result).toEqual({ scope: 'read' });
    });

    test('Parses multiple claims', () => {
      const result = parseAddClaims('scope:read write,dept:engineering,level:senior');
      expect(result).toEqual({
        scope: 'read write',
        dept: 'engineering',
        level: 'senior'
      });
    });

    test('Handles claims with colons in values', () => {
      const result = parseAddClaims('url:https://example.com,time:12:30:45');
      expect(result).toEqual({
        url: 'https://example.com',
        time: '12:30:45'
      });
    });

    test('Trims whitespace from keys and values', () => {
      const result = parseAddClaims('  scope  :  read write  ,  dept  :  eng  ');
      expect(result).toEqual({
        scope: 'read write',
        dept: 'eng'
      });
    });

    test('Returns empty object for null input', () => {
      const result = parseAddClaims(null);
      expect(result).toEqual({});
    });

    test('Returns empty object for undefined input', () => {
      const result = parseAddClaims(undefined);
      expect(result).toEqual({});
    });

    test('Returns empty object for empty string', () => {
      const result = parseAddClaims('');
      expect(result).toEqual({});
    });

    test('Ignores malformed pairs without values', () => {
      const result = parseAddClaims('scope:read,invalid_pair,dept:eng');
      expect(result).toEqual({
        scope: 'read',
        dept: 'eng'
      });
    });

    test('Ignores pairs with empty key', () => {
      const result = parseAddClaims(':value,scope:read');
      expect(result).toEqual({
        scope: 'read'
      });
    });

    test('Handles complex claim values', () => {
      const result = parseAddClaims('roles:admin;user;viewer,path:/api/v1/users');
      expect(result).toEqual({
        roles: 'admin;user;viewer',
        path: '/api/v1/users'
      });
    });
  });

  describe('parseRemoveClaims', () => {
    test('Parses single claim', () => {
      const result = parseRemoveClaims('email_verified');
      expect(result).toEqual(['email_verified']);
    });

    test('Parses multiple claims', () => {
      const result = parseRemoveClaims('email_verified,nbf,picture');
      expect(result).toEqual(['email_verified', 'nbf', 'picture']);
    });

    test('Trims whitespace', () => {
      const result = parseRemoveClaims('  email_verified  ,  nbf  ,  picture  ');
      expect(result).toEqual(['email_verified', 'nbf', 'picture']);
    });

    test('Filters empty strings', () => {
      const result = parseRemoveClaims('email_verified,,nbf,,picture');
      expect(result).toEqual(['email_verified', 'nbf', 'picture']);
    });

    test('Returns empty array for null input', () => {
      const result = parseRemoveClaims(null);
      expect(result).toEqual([]);
    });

    test('Returns empty array for undefined input', () => {
      const result = parseRemoveClaims(undefined);
      expect(result).toEqual([]);
    });

    test('Returns empty array for empty string', () => {
      const result = parseRemoveClaims('');
      expect(result).toEqual([]);
    });

    test('Handles single claim with no commas', () => {
      const result = parseRemoveClaims('exp');
      expect(result).toEqual(['exp']);
    });

    test('Handles claims with underscores and numbers', () => {
      const result = parseRemoveClaims('email_verified_at,claim_123,_private');
      expect(result).toEqual(['email_verified_at', 'claim_123', '_private']);
    });
  });
});

describe('Token Exchange - Claim Extraction', () => {
  test('Extracts claims from valid token', () => {
    const token = 'header.' + Buffer.from(JSON.stringify({
      sub: 'user123',
      aud: 'app1',
      scope: 'read write'
    })).toString('base64') + '.sig';

    const claims = extractTokenClaims(token, 'JWT');

    expect(claims.sub).toBe('user123');
    expect(claims.aud).toBe('app1');
    expect(claims.scope).toBe('read write');
  });

  test('Transforms claims by adding new ones', () => {
    const token = 'header.' + Buffer.from(JSON.stringify({
      sub: 'user123',
      aud: 'app1'
    })).toString('base64') + '.sig';

    const claims = extractTokenClaims(token, 'JWT');
    const addedClaims = parseAddClaims('scope:read write,dept:engineering');

    const transformed = { ...claims, ...addedClaims };

    expect(transformed.sub).toBe('user123');
    expect(transformed.aud).toBe('app1');
    expect(transformed.scope).toBe('read write');
    expect(transformed.dept).toBe('engineering');
  });

  test('Transforms claims by removing them', () => {
    const token = 'header.' + Buffer.from(JSON.stringify({
      sub: 'user123',
      email: 'user@example.com',
      email_verified: true,
      nbf: 1234567890
    })).toString('base64') + '.sig';

    const claims = extractTokenClaims(token, 'JWT');
    const toRemove = parseRemoveClaims('email_verified,nbf');

    const transformed = { ...claims };
    toRemove.forEach(claim => delete transformed[claim]);

    expect(transformed.sub).toBe('user123');
    expect(transformed.email).toBe('user@example.com');
    expect(transformed.email_verified).toBeUndefined();
    expect(transformed.nbf).toBeUndefined();
  });

  test('Updates audience with resource parameter', () => {
    const token = 'header.' + Buffer.from(JSON.stringify({
      sub: 'user123',
      aud: 'app1'
    })).toString('base64') + '.sig';

    const claims = extractTokenClaims(token, 'JWT');
    const resource = 'https://api.example.com';

    const transformed = { ...claims, aud: resource };

    expect(transformed.aud).toBe(resource);
  });

  test('Complex token exchange scenario', () => {
    // Original token
    const originalToken = 'header.' + Buffer.from(JSON.stringify({
      sub: 'user123',
      aud: 'app1',
      scope: 'read',
      email: 'user@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64') + '.sig';

    // Exchange process
    const claims = extractTokenClaims(originalToken, 'JWT');
    const addedClaims = parseAddClaims('scope:read write,dept:engineering');
    const removedClaims = parseRemoveClaims('email_verified,email');

    // Build exchanged claims
    let exchanged = { ...claims, ...addedClaims };
    removedClaims.forEach(claim => delete exchanged[claim]);
    exchanged.aud = 'https://api.example.com'; // resource

    expect(exchanged.sub).toBe('user123');
    expect(exchanged.scope).toBe('read write');
    expect(exchanged.dept).toBe('engineering');
    expect(exchanged.aud).toBe('https://api.example.com');
    expect(exchanged.email_verified).toBeUndefined();
    expect(exchanged.email).toBeUndefined();
    expect(exchanged.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe('Token Exchange - Base64URL Decoding', () => {
  test('Decodes base64url encoded JSON', () => {
    const jsonStr = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const encoded = Buffer.from(jsonStr).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const decoded = base64urlDecode(encoded);
    expect(decoded.alg).toBe('RS256');
    expect(decoded.typ).toBe('JWT');
  });

  test('Handles URL-safe base64 characters', () => {
    const encoded = 'eyJhbGciOiJSUzI1NiJ9';
    const decoded = base64urlDecode(encoded);
    expect(decoded.alg).toBe('RS256');
  });

  test('Adds padding when needed', () => {
    // Create strings that need different padding
    const jsonStr = JSON.stringify({ a: 'b' });
    const encoded = Buffer.from(jsonStr).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const decoded = base64urlDecode(encoded);
    expect(decoded.a).toBe('b');
  });

  test('Throws on invalid remainder 1', () => {
    const invalidEncoded = 'a'; // remainder is 1
    expect(() => {
      base64urlDecode(invalidEncoded);
    }).toThrow('Invalid base64url string');
  });
});

describe('Token Exchange - Integration Scenarios', () => {
  test('JWT to access token exchange with scope expansion', () => {
    const jwtToken = 'header.' + Buffer.from(JSON.stringify({
      sub: 'user123',
      aud: 'https://example.com',
      scope: 'read'
    })).toString('base64') + '.sig';

    // Extract from JWT
    const claims = extractTokenClaims(jwtToken, 'urn:ietf:params:oauth:token-type:jwt');

    // Add scope
    const additionalClaims = parseAddClaims('scope:read write execute');
    const result = { ...claims, ...additionalClaims };

    expect(result.scope).toBe('read write execute');
  });

  test('ID token to access token exchange with audience change', () => {
    const idToken = 'header.' + Buffer.from(JSON.stringify({
      sub: 'user123',
      aud: 'https://example.com',
      email: 'user@example.com'
    })).toString('base64') + '.sig';

    const claims = extractTokenClaims(idToken, 'urn:ietf:params:oauth:token-type:id_token');

    // Change audience and remove email
    const removed = parseRemoveClaims('email');
    const result = { ...claims, aud: 'https://api.example.com' };
    removed.forEach(claim => delete result[claim]);

    expect(result.aud).toBe('https://api.example.com');
    expect(result.email).toBeUndefined();
    expect(result.sub).toBe('user123');
  });

  test('Multi-hop token exchange', () => {
    // Hop 1: Service A token
    const serviceAToken = 'header.' + Buffer.from(JSON.stringify({
      sub: 'user123',
      aud: 'service-a',
      scope: 'api1'
    })).toString('base64') + '.sig';

    const claimsA = extractTokenClaims(serviceAToken, 'JWT');
    const addedA = parseAddClaims('scope:api1 api2,issued_by:service-a');
    let hopA = { ...claimsA, ...addedA };

    // Hop 2: Service B token
    const addedB = parseAddClaims('scope:api1 api2 api3,issued_by:service-b');
    const removedB = parseRemoveClaims('issued_by');
    let hopB = { ...hopA, aud: 'service-b', ...addedB };
    removedB.forEach(claim => delete hopB[claim]);

    expect(hopB.scope).toBe('api1 api2 api3');
    expect(hopB.aud).toBe('service-b');
    expect(hopB.issued_by).toBeUndefined();
  });
});
