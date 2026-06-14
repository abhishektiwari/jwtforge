/**
 * Tests for token introspection (RFC 7662) implementation
 */

import { validateBasicAuth, base64urlDecode } from '../src/introspect.js';

describe('Token Introspection - Basic Auth Validation', () => {
  describe('validateBasicAuth - Valid Cases', () => {
    test('Validates correct Basic auth header', () => {
      const credentials = 'client_123:client_123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Validates client ID with underscores', () => {
      const credentials = 'my_client_id:my_client_id';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Validates client ID with hyphens', () => {
      const credentials = 'my-client-id:my-client-id';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Validates client ID with alphanumeric', () => {
      const credentials = 'abc123def456:abc123def456';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Validates single character client ID', () => {
      const credentials = 'a:a';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Validates maximum length client ID (50 chars)', () => {
      const clientId = 'a'.repeat(50);
      const credentials = clientId + ':' + clientId;
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Validates client ID with mix of valid characters', () => {
      const credentials = 'my_app-123:my_app-123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });
  });

  describe('validateBasicAuth - Invalid Cases', () => {
    test('Rejects missing Basic prefix', () => {
      const credentials = Buffer.from('client_123:client_123').toString('base64');
      const result = validateBasicAuth(credentials);
      expect(result).toBe(false);
    });

    test('Rejects null header', () => {
      const result = validateBasicAuth(null);
      expect(result).toBe(false);
    });

    test('Rejects undefined header', () => {
      const result = validateBasicAuth(undefined);
      expect(result).toBe(false);
    });

    test('Rejects empty string', () => {
      const result = validateBasicAuth('');
      expect(result).toBe(false);
    });

    test('Rejects invalid base64', () => {
      const result = validateBasicAuth('Basic !!!invalid!!!');
      expect(result).toBe(false);
    });

    test('Rejects client ID with spaces', () => {
      const credentials = 'client 123:client 123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(false);
    });

    test('Rejects client ID with special characters', () => {
      const credentials = 'client@123:client@123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(false);
    });

    test('Rejects client ID with dots', () => {
      const credentials = 'client.123:client.123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(false);
    });

    test('Rejects client ID with slashes', () => {
      const credentials = 'client/123:client/123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(false);
    });

    test('Rejects client ID exceeding 50 characters', () => {
      const clientId = 'a'.repeat(51);
      const credentials = clientId + ':' + clientId;
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(false);
    });

    test('Rejects empty client ID', () => {
      const credentials = ':password';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(false);
    });

    test('Rejects wrong auth scheme', () => {
      const credentials = 'client_123:client_123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Bearer ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(false);
    });

    test('Rejects uppercase Basic (must be exact)', () => {
      const credentials = 'client_123:client_123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'BASIC ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(false);
    });

    test('Allows client ID with leading dash (valid per regex)', () => {
      const credentials = '-client_123:-client_123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Allows client ID with leading underscore (valid per regex)', () => {
      const credentials = '_client_123:_client_123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });
  });

  describe('validateBasicAuth - Edge Cases', () => {
    test('Handles client IDs that are all underscores', () => {
      const credentials = '___:___';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Handles client IDs that are all hyphens', () => {
      const credentials = '---:---';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Handles client IDs that are all numbers', () => {
      const credentials = '123456:123456';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Ignores password complexity (only validates client ID)', () => {
      const credentials = 'valid_client:!@#$%^&*()';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });

    test('Handles multiple colons in credentials (password contains colon)', () => {
      const credentials = 'valid_client:pass:word:123';
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const result = validateBasicAuth(authHeader);
      expect(result).toBe(true);
    });
  });
});

describe('Token Introspection - Base64URL Decoding', () => {
  test('Decodes base64url encoded JSON', () => {
    const jsonStr = JSON.stringify({ active: true, sub: 'user123' });
    const encoded = Buffer.from(jsonStr).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const decoded = base64urlDecode(encoded);
    expect(decoded.active).toBe(true);
    expect(decoded.sub).toBe('user123');
  });

  test('Handles URL-safe base64 characters', () => {
    const encoded = 'eyJhY3RpdmUiOnRydWUsInN1YiI6InVzZXIxMjMifQ';
    const decoded = base64urlDecode(encoded);
    expect(decoded.active).toBe(true);
  });

  test('Adds padding when remainder is 2', () => {
    // Create a string with remainder 2 after removing padding
    const jsonStr = JSON.stringify({ a: 'ab' });
    const encoded = Buffer.from(jsonStr).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const decoded = base64urlDecode(encoded);
    expect(decoded.a).toBe('ab');
  });

  test('Adds padding when remainder is 3', () => {
    // Create a string with remainder 3 after removing padding
    const jsonStr = JSON.stringify({ a: 'abc' });
    const encoded = Buffer.from(jsonStr).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const decoded = base64urlDecode(encoded);
    expect(decoded.a).toBe('abc');
  });

  test('Throws on invalid remainder 1', () => {
    const invalidEncoded = 'a';
    expect(() => {
      base64urlDecode(invalidEncoded);
    }).toThrow('Invalid base64url string');
  });
});

describe('Token Introspection - Integration Scenarios', () => {
  test('Validates introspection request with valid basic auth', () => {
    const clientId = 'api_gateway';
    const credentials = clientId + ':' + clientId;
    const base64 = Buffer.from(credentials).toString('base64');
    const authHeader = 'Basic ' + base64;

    const isValid = validateBasicAuth(authHeader);
    expect(isValid).toBe(true);
  });

  test('Rejects introspection request with invalid basic auth', () => {
    const authHeader = 'Bearer invalid_token';

    const isValid = validateBasicAuth(authHeader);
    expect(isValid).toBe(false);
  });

  test('Validates multiple introspection requests from different clients', () => {
    const clients = ['gateway_1', 'gateway_2', 'api_server', 'auth_service'];

    clients.forEach(clientId => {
      const credentials = clientId + ':' + clientId;
      const base64 = Buffer.from(credentials).toString('base64');
      const authHeader = 'Basic ' + base64;

      const isValid = validateBasicAuth(authHeader);
      expect(isValid).toBe(true);
    });
  });

  test('RFC 7662 introspection response structure', () => {
    const jsonStr = JSON.stringify({
      active: true,
      scope: 'read write',
      client_id: 'api_gateway',
      sub: 'user123',
      iss: 'https://example.com',
      aud: 'api',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      jti: 'jti-123'
    });

    const encoded = Buffer.from(jsonStr).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const decoded = base64urlDecode(encoded);

    expect(decoded.active).toBe(true);
    expect(decoded.scope).toBe('read write');
    expect(decoded.client_id).toBe('api_gateway');
    expect(decoded.sub).toBe('user123');
  });

  test('Introspection response for inactive token', () => {
    const jsonStr = JSON.stringify({ active: false });

    const encoded = Buffer.from(jsonStr).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const decoded = base64urlDecode(encoded);

    expect(decoded.active).toBe(false);
    expect(Object.keys(decoded).length).toBe(1);
  });
});
