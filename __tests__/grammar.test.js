/**
 * Unit tests for grammar.js - JWT Grammar definitions
 */

import {
  headerGrammar,
  standardClaimsGrammar,
  oidcClaimsGrammar,
  authClaimsGrammar,
  typeVariations,
  getCompleteGrammar,
  getClaimGrammar,
  getHeaderGrammar,
  getAllClaimNames,
  getAllHeaderFieldNames
} from '../src/grammar.js';

describe('Grammar - Structure', () => {
  test('getCompleteGrammar returns all grammar objects', () => {
    const grammar = getCompleteGrammar();

    expect(grammar.header).toBeDefined();
    expect(grammar.standardClaims).toBeDefined();
    expect(grammar.oidcClaims).toBeDefined();
    expect(grammar.authClaims).toBeDefined();
    expect(grammar.typeVariations).toBeDefined();
  });

  test('Header grammar is an object', () => {
    expect(typeof headerGrammar).toBe('object');
  });

  test('Standard claims grammar is an object', () => {
    expect(typeof standardClaimsGrammar).toBe('object');
  });

  test('OIDC claims grammar is an object', () => {
    expect(typeof oidcClaimsGrammar).toBe('object');
  });

  test('Auth claims grammar is an object', () => {
    expect(typeof authClaimsGrammar).toBe('object');
  });

  test('Type variations is an object with arrays', () => {
    expect(typeof typeVariations).toBe('object');
    expect(Array.isArray(typeVariations.string)).toBe(true);
    expect(Array.isArray(typeVariations.number)).toBe(true);
    expect(Array.isArray(typeVariations.boolean)).toBe(true);
  });
});

describe('Grammar - Header Fields', () => {
  test('Header grammar contains algorithm field', () => {
    expect(headerGrammar.alg).toBeDefined();
  });

  test('Algorithm grammar has valid algorithms', () => {
    expect(Array.isArray(headerGrammar.alg.valid)).toBe(true);
    expect(headerGrammar.alg.valid.length).toBeGreaterThan(0);
  });

  test('Algorithm grammar includes vulnerable patterns', () => {
    expect(Array.isArray(headerGrammar.alg.vulnerable)).toBe(true);
    expect(headerGrammar.alg.vulnerable).toContain('none');
  });

  test('Header grammar contains type field', () => {
    expect(headerGrammar.typ).toBeDefined();
  });

  test('Header grammar contains kid field', () => {
    expect(headerGrammar.kid).toBeDefined();
  });

  test('KID field has edge cases for injection', () => {
    expect(headerGrammar.kid.edge_cases).toBeDefined();
    expect(headerGrammar.kid.injection).toBeDefined();
  });

  test('getAllHeaderFieldNames returns array of header fields', () => {
    const fields = getAllHeaderFieldNames();

    expect(Array.isArray(fields)).toBe(true);
    expect(fields).toContain('alg');
    expect(fields).toContain('typ');
    expect(fields).toContain('kid');
  });

  test('getHeaderGrammar returns grammar for valid field', () => {
    const grammar = getHeaderGrammar('alg');

    expect(grammar).toBeDefined();
    expect(grammar.valid).toBeDefined();
  });

  test('getHeaderGrammar returns null for invalid field', () => {
    const grammar = getHeaderGrammar('nonexistent_field');

    expect(grammar).toBeNull();
  });
});

describe('Grammar - Standard Claims', () => {
  test('Standard claims grammar contains required fields', () => {
    expect(standardClaimsGrammar.iss).toBeDefined();
    expect(standardClaimsGrammar.sub).toBeDefined();
    expect(standardClaimsGrammar.aud).toBeDefined();
    expect(standardClaimsGrammar.exp).toBeDefined();
    expect(standardClaimsGrammar.iat).toBeDefined();
    expect(standardClaimsGrammar.nbf).toBeDefined();
    expect(standardClaimsGrammar.jti).toBeDefined();
  });

  test('Issuer grammar has valid and injection patterns', () => {
    const iss = standardClaimsGrammar.iss;

    expect(iss.valid).toBeDefined();
    expect(iss.edge_cases).toBeDefined();
    expect(iss.injection).toBeDefined();
  });

  test('Subject grammar includes edge cases', () => {
    const sub = standardClaimsGrammar.sub;

    expect(sub.valid).toBeDefined();
    expect(sub.edge_cases).toContain('');
    expect(sub.edge_cases).toContain(null);
  });

  test('Audience grammar supports string and array', () => {
    const aud = standardClaimsGrammar.aud;

    expect(aud.single_string).toBeDefined();
    expect(aud.array).toBeDefined();
    expect(Array.isArray(aud.array)).toBe(true);
    expect(aud.array.some(a => Array.isArray(a))).toBe(true);
  });

  test('Expiration has edge cases for testing', () => {
    const exp = standardClaimsGrammar.exp;

    expect(exp.valid).toBeDefined();
    expect(exp.edge_cases).toBeDefined();
    // Should have past, future, zero, negative values
    expect(exp.edge_cases.some(v => typeof v === 'number')).toBe(true);
  });
});

describe('Grammar - OIDC Claims', () => {
  test('OIDC claims grammar contains user info fields', () => {
    expect(oidcClaimsGrammar.name).toBeDefined();
    expect(oidcClaimsGrammar.email).toBeDefined();
    expect(oidcClaimsGrammar.email_verified).toBeDefined();
    expect(oidcClaimsGrammar.phone_number).toBeDefined();
  });

  test('Email has valid and edge cases', () => {
    const email = oidcClaimsGrammar.email;

    expect(email.valid).toBeDefined();
    expect(email.edge_cases).toBeDefined();
    expect(email.injection).toBeDefined();
  });

  test('Email verified has boolean variations', () => {
    const emailVerified = oidcClaimsGrammar.email_verified;

    expect(emailVerified.valid).toContain(true);
    expect(emailVerified.valid).toContain(false);
  });

  test('Name has injection patterns for XSS', () => {
    const name = oidcClaimsGrammar.name;

    expect(name.injection).toBeDefined();
    const injectionStr = JSON.stringify(name.injection);
    expect(/[<>]|script/.test(injectionStr)).toBe(true);
  });

  test('Phone number has path traversal in edge cases', () => {
    const phone = oidcClaimsGrammar.phone_number;

    expect(phone.edge_cases).toBeDefined();
    const edgeStr = JSON.stringify(phone.edge_cases);
    expect(edgeStr.includes('..')).toBe(true);
  });
});

describe('Grammar - Authorization Claims', () => {
  test('Auth claims grammar contains OAuth2 fields', () => {
    expect(authClaimsGrammar.scope).toBeDefined();
    expect(authClaimsGrammar.client_id).toBeDefined();
    expect(authClaimsGrammar.username).toBeDefined();
  });

  test('Scope has single and array variations', () => {
    const scope = authClaimsGrammar.scope;

    expect(scope.single).toBeDefined();
    expect(scope.valid).toBeDefined();
    expect(Array.isArray(scope.single)).toBe(true);
  });

  test('Roles and groups support both string and array', () => {
    const roles = authClaimsGrammar.roles;

    expect(roles.single).toBeDefined();
    expect(roles.array).toBeDefined();
  });

  test('Username has privilege escalation attempts', () => {
    const username = authClaimsGrammar.username;

    expect(username.injection).toBeDefined();
    const injectionStr = JSON.stringify(username.injection);
    expect(/admin|root/.test(injectionStr)).toBe(true);
  });

  test('Scope has privilege escalation patterns', () => {
    const scope = authClaimsGrammar.scope;

    expect(scope.injection).toBeDefined();
  });
});

describe('Grammar - Lookup Functions', () => {
  test('getClaimGrammar finds standard claims', () => {
    const grammar = getClaimGrammar('sub');

    expect(grammar).toBeDefined();
    expect(grammar.valid).toBeDefined();
  });

  test('getClaimGrammar finds OIDC claims', () => {
    const grammar = getClaimGrammar('email');

    expect(grammar).toBeDefined();
  });

  test('getClaimGrammar finds auth claims', () => {
    const grammar = getClaimGrammar('scope');

    expect(grammar).toBeDefined();
  });

  test('getClaimGrammar returns null for unknown claim', () => {
    const grammar = getClaimGrammar('unknown_claim_xyz');

    expect(grammar).toBeNull();
  });

  test('getAllClaimNames returns comprehensive list', () => {
    const claims = getAllClaimNames();

    expect(Array.isArray(claims)).toBe(true);
    expect(claims.length).toBeGreaterThan(20); // Should have many claims

    // Check for some known claims
    expect(claims).toContain('sub');
    expect(claims).toContain('email');
    expect(claims).toContain('scope');
  });
});

describe('Grammar - Category Structure', () => {
  test('Grammar rules have standard category names', () => {
    const sub = standardClaimsGrammar.sub;

    // Common categories
    expect(sub.valid || sub.valid_values || sub.values).toBeDefined();
    expect(sub.edge_cases).toBeDefined();
  });

  test('All claims have at least one category of values', () => {
    const allClaims = [
      ...Object.values(standardClaimsGrammar),
      ...Object.values(oidcClaimsGrammar),
      ...Object.values(authClaimsGrammar)
    ];

    allClaims.forEach(claim => {
      // Check for any array category (valid, single, array, edge_cases, injection, etc.)
      const hasCategory = Object.values(claim).some(val => Array.isArray(val));
      expect(hasCategory).toBe(true);
    });
  });

  test('Grammar supports type_variations category', () => {
    const sub = standardClaimsGrammar.sub;

    expect(sub.type_variations).toBeDefined();
  });

  test('Header grammar supports vulnerable category', () => {
    const alg = headerGrammar.alg;

    expect(alg.vulnerable).toBeDefined();
  });
});

describe('Grammar - Injection Patterns', () => {
  test('SQL injection patterns exist in grammar', () => {
    const injectionClaims = [
      standardClaimsGrammar.sub,
      standardClaimsGrammar.iss,
      oidcClaimsGrammar.email
    ];

    const allInjections = injectionClaims
      .filter(c => c && c.injection)
      .map(c => JSON.stringify(c.injection))
      .join('');

    expect(/[']|OR|DROP|UNION/.test(allInjections)).toBe(true);
  });

  test('XSS patterns exist in grammar', () => {
    const nameInjection = oidcClaimsGrammar.name.injection;
    const injectionStr = JSON.stringify(nameInjection);

    expect(/[<>]|script|alert/.test(injectionStr)).toBe(true);
  });

  test('Path traversal patterns exist in grammar', () => {
    const phoneEdgeCases = oidcClaimsGrammar.phone_number.edge_cases;
    const edgeStr = JSON.stringify(phoneEdgeCases);

    expect(/\.\.\/|\.\.\\/.test(edgeStr)).toBe(true);
  });
});
