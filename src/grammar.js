/**
 * JWT Grammar Definition (FBNF-like)
 * Defines the structure and variations of JWT header and payload for systematic testing
 * Based on: RFC 7519 (JWT), RFC 7518 (JWA), OpenID Connect Core 1.0
 */

/**
 * JWT Header Grammar
 * Defines valid and test variations for JWT header fields
 */
export const headerGrammar = {
  // Algorithm field - includes valid algorithms and test cases
  alg: {
    valid: ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'],
    vulnerable: ['none', 'None', 'NONE', 'nOnE'],  // Algorithm confusion attacks
    invalid: ['', 'invalid', 'RSA256', 'HMAC256', null],
    typeVariations: ['RS256', 256, true, false, ['RS256'], { alg: 'RS256' }],
  },

  // Type field - token type identifier
  typ: {
    valid: ['JWT', 'jwt'],
    variations: ['JWT', 'jwt', 'JOSE', '', null, 'JWE', 'JWS', 'CUSTOM'],
    typeVariations: ['JWT', 123, true, false, ['JWT'], { typ: 'JWT' }],
  },

  // Key ID - identifies which key was used
  kid: {
    valid: ['key1', 'key2', 'my-rsa-key', 'ec-key-1'],
    edge_cases: ['', null, 'key with spaces', 'key/with/slashes', '../../../etc/passwd'],
    type_variations: ['key1', 1, true, false, ['key1'], { kid: 'key1' }],
    injection: ['key1"; alg="none', 'key1\r\nInjected: true', 'key1<script>'],
  },

  // Content Type field
  cty: {
    valid: ['application/json', 'application/octet-stream', 'text/plain'],
    variations: ['application/json', '', null, 'text/html', 'application/json;charset=utf-8'],
  },

  // Additional header fields that may appear
  crit: {
    valid: [['exp'], ['exp', 'nbf'], []],
    variations: [['exp'], 'exp', null, '', ['exp', 'unknown_field']],
  },

  custom: {
    common: [
      { custom_field: 'value' },
      { jku: 'https://attacker.com/keys.json' },  // JWK Set URL injection
      { x5u: 'https://attacker.com/cert.pem' },   // X.509 URL injection
    ],
  }
};

/**
 * JWT Payload Grammar - Standard Claims
 * RFC 7519 standard registered claim names
 */
export const standardClaimsGrammar = {
  // Issuer - identifies the principal that issued the JWT
  iss: {
    valid: ['https://example.com', 'https://auth.example.com', 'urn:example:issuer'],
    edge_cases: ['', null, 'iss', 'http://localhost:3000'],
    injection: [
      'iss"; "aud":"https://evil.com',
      'iss\r\nX-Injected: true',
      '"; "iss":"https://evil.com";"',
    ],
    type_variations: ['https://example.com', 123, true, false, ['iss'], { iss: 'value' }],
  },

  // Subject - identifies the principal that is the subject of the JWT
  sub: {
    valid: ['user123', 'admin', '1234567890', 'user@example.com'],
    edge_cases: ['', null, '0', 'root', 'admin', 'superuser'],
    injection: ['sub"; "role":"admin', '1" OR "1"="1'],
    type_variations: ['user123', 123, true, false, ['user123'], { sub: 'user' }],
  },

  // Audience - identifies the recipients the JWT is intended for
  aud: {
    single_string: ['api.example.com', 'web-app', 'https://example.com/api'],
    array: [['api1', 'api2'], ['api'], []],
    edge_cases: [null, '', 'aud'],
    injection: ['api"; "admin":true', 'api\nInjected: true'],
    type_variations: ['api', ['api'], 123, true, false, null, { aud: 'api' }],
  },

  // Expiration Time - identifies expiration time on or after which the JWT is not accepted
  exp: {
    valid: [
      Math.floor(Date.now() / 1000) + 3600,  // 1 hour in future
      Math.floor(Date.now() / 1000) + 86400, // 1 day in future
    ],
    edge_cases: [
      Math.floor(Date.now() / 1000) - 3600,  // 1 hour in past
      0,                                      // Epoch
      -1,                                     // Negative
      null,                                   // Missing expiration
    ],
    invalid_types: ['9999999999999999999', '1.5', 'never', 'infinite', Infinity, NaN],
  },

  // Not Before - identifies the time before which the JWT is not accepted
  nbf: {
    valid: [
      Math.floor(Date.now() / 1000),         // Now
      Math.floor(Date.now() / 1000) - 3600,  // 1 hour ago
    ],
    edge_cases: [
      Math.floor(Date.now() / 1000) + 86400, // 1 day in future
      0,
      -1,
      null,
    ],
    invalid_types: ['now', 'today', 'never', Infinity, NaN],
  },

  // Issued At - identifies the time at which the JWT was issued
  iat: {
    valid: [Math.floor(Date.now() / 1000)],
    edge_cases: [
      Math.floor(Date.now() / 1000) + 86400, // Future issue time
      0,
      -1,
      null,
    ],
    invalid_types: ['now', '2024-01-01', Infinity, NaN],
  },

  // JWT ID - unique identifier for the JWT
  jti: {
    valid: ['jti-123456', 'session-abc123', '550e8400-e29b-41d4-a716-446655440000'],
    edge_cases: ['', null, 'jti', '0', 'jti' + '0'.repeat(1000)],
    injection: ['jti"; "admin":true', 'jti\r\nSet-Cookie: admin=true'],
  },
};

/**
 * JWT Payload Grammar - OIDC Standard Claims
 * OpenID Connect Core 1.0 standard claims
 */
export const oidcClaimsGrammar = {
  name: {
    valid: ['John Doe', 'Jane Smith', 'Admin User'],
    edge_cases: ['', null, 'A'.repeat(1000)],
    injection: ['<script>alert(1)</script>', 'O\'Reilly'],
  },

  email: {
    valid: ['user@example.com', 'admin@example.com', 'test+tag@example.com'],
    edge_cases: ['', null, 'not-an-email', 'user@localhost'],
    injection: ['user@example.com\r\nBcc: attacker@evil.com', 'user"@example.com'],
  },

  email_verified: {
    valid: [true, false],
    edge_cases: [null, '', 'true', 'false', 1, 0],
  },

  given_name: {
    valid: ['John', 'Jane', 'Admin'],
    edge_cases: ['', null, '0', ' '],
  },

  family_name: {
    valid: ['Doe', 'Smith', 'User'],
    edge_cases: ['', null, '0'],
  },

  phone_number: {
    valid: ['+1-201-555-0123', '(201) 555-0123', '2015550123'],
    edge_cases: ['', null, '0', 'not-a-phone', '+1' + '0'.repeat(100), '../../../etc/passwd'],
  },

  phone_number_verified: {
    valid: [true, false],
    edge_cases: [null, '', 'true', 'false', 1, 0],
  },

  address: {
    valid: [
      { street_address: '123 Main St', locality: 'Anytown', country: 'US' },
      { formatted: '123 Main St, Anytown, US' },
    ],
    edge_cases: [null, '', {}, { street_address: null }],
  },

  picture: {
    valid: ['https://example.com/photo.jpg', 'https://example.com/profile.png'],
    edge_cases: ['', null, 'javascript:alert(1)', '../../../etc/passwd'],
  },

  locale: {
    valid: ['en-US', 'en', 'fr-FR', 'es'],
    edge_cases: ['', null, 'invalid-locale', 'en_US'],
  },

  updated_at: {
    valid: [Math.floor(Date.now() / 1000)],
    edge_cases: [null, 0, -1, Infinity],
  },
};

/**
 * JWT Payload Grammar - OAuth2/Authorization Claims
 */
export const authClaimsGrammar = {
  scope: {
    valid: ['openid profile email', 'read write', 'api admin'],
    single: ['openid', 'profile', 'email', 'offline_access'],
    edge_cases: ['', null, 'admin system:superuser'],
    injection: ['openid"; "role":"admin', 'openid\nX-Privilege: root'],
  },

  client_id: {
    valid: ['my-app', 'web-client', 'mobile-app'],
    edge_cases: ['', null, 'client_id', 'admin', 'root'],
  },

  username: {
    valid: ['john_doe', 'admin', 'user123'],
    edge_cases: ['', null, 'admin', 'root', 'superuser'],
    injection: ['admin" OR "1"="1', 'admin\r\nInjected: true'],
  },

  preferred_username: {
    valid: ['john.doe', 'admin', 'user@example.com'],
    edge_cases: ['', null, 'root', 'admin'],
  },

  groups: {
    single: ['admins', 'users', 'developers'],
    array: [['admins', 'developers'], ['admins'], []],
    edge_cases: [null, '', 'admins\r\nAdmin: true', ['admin\r\nInjected: true']],
  },

  roles: {
    single: ['admin', 'user', 'superuser'],
    array: [['admin', 'user'], ['admin'], []],
    edge_cases: [null, '', 'admin system:superuser', ['admin', 'root']],
  },

  response_type: {
    valid: ['code', 'token', 'id_token', 'id_token token', 'code token', 'code id_token', 'code id_token token'],
    edge_cases: ['', null, 'invalid', 'implicit'],
  },

  nonce: {
    valid: ['n-0S6_WzA2Mj', 'nonce123', 'random-string'],
    edge_cases: ['', null, '0', 'nonce\r\nInjected: true'],
  },

  auth_time: {
    valid: [Math.floor(Date.now() / 1000)],
    edge_cases: [Math.floor(Date.now() / 1000) + 86400, 0, -1, null],
  },

  acr: {
    valid: ['urn:mace:incommon:iap:silver', 'urn:mace:incommon:iap:bronze'],
    edge_cases: ['', null, '0'],
  },

  amr: {
    valid: ['mfa', 'password', 'otp', 'sms'],
    array: [['mfa', 'password'], ['password'], []],
    edge_cases: [null, '', 'mfa\r\nAdmin: true'],
  },
};

/**
 * Claim Type Variations
 * Different data types for the same claim to test type handling
 */
export const typeVariations = {
  string: ['value', 'test', ''],
  number: [0, 1, -1, 999999999, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Infinity, -Infinity, NaN],
  boolean: [true, false],
  null: [null],
  array: [[], ['single'], ['item1', 'item2'], [1, 2, 3], [true, false], [null], [{ nested: 'obj' }]],
  object: [{}, { key: 'value' }, { nested: { deep: 'value' } }],
  undefined: [undefined],
};

/**
 * Helper function to get all grammar rules
 * @returns {Object} Complete grammar specification
 */
export function getCompleteGrammar() {
  return {
    header: headerGrammar,
    standardClaims: standardClaimsGrammar,
    oidcClaims: oidcClaimsGrammar,
    authClaims: authClaimsGrammar,
    typeVariations: typeVariations,
  };
}

/**
 * Helper function to get grammar for a specific claim
 * @param {string} claimName - Name of the claim (e.g., 'sub', 'aud', 'exp')
 * @returns {Object|null} Grammar rules for the claim or null if not found
 */
export function getClaimGrammar(claimName) {
  // Check standard claims
  if (standardClaimsGrammar[claimName]) {
    return standardClaimsGrammar[claimName];
  }
  // Check OIDC claims
  if (oidcClaimsGrammar[claimName]) {
    return oidcClaimsGrammar[claimName];
  }
  // Check auth claims
  if (authClaimsGrammar[claimName]) {
    return authClaimsGrammar[claimName];
  }
  return null;
}

/**
 * Helper function to get header field grammar
 * @param {string} fieldName - Header field name (e.g., 'alg', 'typ', 'kid')
 * @returns {Object|null} Grammar rules for the header field or null if not found
 */
export function getHeaderGrammar(fieldName) {
  return headerGrammar[fieldName] || null;
}

/**
 * Get all available claims from grammar
 * @returns {Array<string>} List of all defined claim names
 */
export function getAllClaimNames() {
  return [
    ...Object.keys(standardClaimsGrammar),
    ...Object.keys(oidcClaimsGrammar),
    ...Object.keys(authClaimsGrammar),
  ];
}

/**
 * Get all header field names from grammar
 * @returns {Array<string>} List of all defined header field names
 */
export function getAllHeaderFieldNames() {
  return Object.keys(headerGrammar);
}
