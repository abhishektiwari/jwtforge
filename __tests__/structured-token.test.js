/**
 * Tests for structured token request normalization.
 */

import { applyVulnerabilityPreset, buildJwtHeader, normalizeTokenRequest, parseResponseType, removeUndefinedFields } from '../src/tokenrequest.js';

describe('Structured token request normalization', () => {
  test('legacy flat payload maps to body claims', () => {
    const normalized = normalizeTokenRequest({
      sub: 'user123',
      scope: 'openid',
      header_alg: 'none',
      sig: false
    });

    expect(normalized.structured).toBe(false);
    expect(normalized.body.sub).toBe('user123');
    expect(normalized.body.scope).toBe('openid');
    expect(normalized.header.alg).toBe('none');
    expect(normalized.signature).toBe(false);
  });

  test('structured payload keeps wrapper fields out of body', () => {
    const normalized = normalizeTokenRequest({
      mode: 'fake',
      header: { typ: 'JWT', cty: 'application/json' },
      body: { sub: 'user123' },
      signature: 'literal-signature'
    });

    expect(normalized.structured).toBe(true);
    expect(normalized.body).toEqual({ sub: 'user123' });
    expect(normalized.header.cty).toBe('application/json');
    expect(normalized.signature).toBe('literal-signature');
  });

  test('structured body metadata is not treated as JWT claims', () => {
    const normalized = normalizeTokenRequest({
      header: { typ: 'JWT' },
      body: {
        sub: 'user123',
        response_type: 'id_token',
        mode: 'fuzz',
        kty: 'EC'
      }
    });

    expect(normalized.options.responseType).toBe('id_token');
    expect(normalized.options.mode).toBe('fuzz');
    expect(normalized.options.kty).toBe('EC');
    expect(normalized.body).toEqual({ sub: 'user123' });
  });

  test('unsupported x5 certificate header fields are rejected', () => {
    expect(() => normalizeTokenRequest({
      header: { x5u: 'https://example.com/cert.pem' },
      body: { sub: 'user123' }
    })).toThrow('Unsupported JWT header field');
  });

  test('misspelled mode aliases normalize to canonical modes', () => {
    expect(normalizeTokenRequest({ mode: 'malcious' }).options.mode).toBe('malicious');
    expect(normalizeTokenRequest({ mode: 'grammer' }).options.mode).toBe('grammar');
  });

  test('rejects non-object request and non-object structured fields', () => {
    expect(() => normalizeTokenRequest(null)).toThrow('JSON request body must be an object');
    expect(() => normalizeTokenRequest([])).toThrow('JSON request body must be an object');
    expect(() => normalizeTokenRequest({ header: 'not-object' })).toThrow('header must be an object');
    expect(() => normalizeTokenRequest({ body: 'not-object' })).toThrow('body must be an object');
  });

  test('supports crit with self-asserted critical header parameters', () => {
    const normalized = normalizeTokenRequest({
      header: {
        typ: 'JWT',
        crit: ['exp-ext', 'custom-policy-id'],
        'exp-ext': '2026-12-31T23:59:59Z',
        'custom-policy-id': 'policy_99ab'
      },
      body: { sub: 'user123' }
    });

    expect(normalized.header.crit).toEqual(['exp-ext', 'custom-policy-id']);
    expect(normalized.header['exp-ext']).toBe('2026-12-31T23:59:59Z');
    expect(normalized.header['custom-policy-id']).toBe('policy_99ab');
  });

  test('rejects invalid crit definitions', () => {
    expect(() => normalizeTokenRequest({
      header: { crit: ['exp'] },
      body: { sub: 'user123' }
    })).toThrow('Missing critical JWT header field');

    expect(() => normalizeTokenRequest({
      header: { crit: 'exp-ext', 'exp-ext': '2026-12-31T23:59:59Z' },
      body: { sub: 'user123' }
    })).toThrow('crit must be an array of header parameter names');
  });

  test('rejects unknown header fields not listed in crit', () => {
    expect(() => normalizeTokenRequest({
      header: { custom: 'value' },
      body: { sub: 'user123' }
    })).toThrow('Unsupported JWT header field');
  });

  test('supports empty structured wrapper and structured options from body', () => {
    const normalized = normalizeTokenRequest({
      header: undefined,
      body: {
        sub: 'user123',
        exclude: ['exp'],
        malicious_category: 'xss',
        grammar_category: 'valid',
        vulnerability: 'kid_traversal',
        alg_none_variant: 'None'
      },
      signature: true
    });

    expect(normalized.structured).toBe(true);
    expect(normalized.header).toEqual({});
    expect(normalized.signature).toBeUndefined();
    expect(normalized.options.exclude).toEqual(['exp']);
    expect(normalized.options.maliciousCategory).toBe('xss');
    expect(normalized.options.grammarCategory).toBe('valid');
    expect(normalized.options.vulnerability).toBe('kid_traversal');
    expect(normalized.options.algNoneVariant).toBe('None');
    expect(normalized.body).toEqual({ sub: 'user123' });
  });

  test('supports legacy header kid and removes undefined values', () => {
    const normalized = normalizeTokenRequest({
      sub: 'user123',
      email: undefined,
      header_kid: 'legacy-key'
    });

    expect(normalized.header.kid).toBe('legacy-key');
    expect(normalized.body.email).toBeUndefined();
    expect(removeUndefinedFields({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  test('rejects invalid signature types', () => {
    expect(() => normalizeTokenRequest({ signature: { value: 'bad' } }))
      .toThrow('signature must be false, a string, or omitted');
  });
});

describe('Response type parsing', () => {
  test('token generates only an access token', () => {
    expect(parseResponseType('token')).toEqual({
      shouldGenerateAccessToken: true,
      shouldGenerateIdToken: false
    });
  });

  test('id_token generates only an ID token', () => {
    expect(parseResponseType('id_token')).toEqual({
      shouldGenerateAccessToken: false,
      shouldGenerateIdToken: true
    });
  });

  test('hybrid response types generate both token types', () => {
    expect(parseResponseType('id_token token')).toEqual({
      shouldGenerateAccessToken: true,
      shouldGenerateIdToken: true
    });
    expect(parseResponseType('token id_token')).toEqual({
      shouldGenerateAccessToken: true,
      shouldGenerateIdToken: true
    });
  });
});

describe('Structured vulnerability presets', () => {
  test('alg_none sets alg none and disables signature', () => {
    const normalized = normalizeTokenRequest({
      vulnerability: 'alg_none',
      body: { sub: 'admin' }
    });

    applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } });

    expect(normalized.header.alg).toBe('none');
    expect(normalized.signature).toBe(false);
  });

  test('alg_none accepts configured case variations', () => {
    const variants = ['None', 'NONE', 'nOne'];

    for (const variant of variants) {
      const normalized = normalizeTokenRequest({
        vulnerability: 'alg_none',
        alg_none_variant: variant,
        body: { sub: 'admin' }
      });

      applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } });

      expect(normalized.header.alg).toBe(variant);
      expect(normalized.signature).toBe(false);
    }
  });

  test('alg_none can use explicit structured header alg variation', () => {
    const normalized = normalizeTokenRequest({
      vulnerability: 'alg_none',
      header: { alg: 'nOnE' },
      body: { sub: 'admin' }
    });

    applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } });

    expect(normalized.header.alg).toBe('nOnE');
    expect(normalized.signature).toBe(false);
  });

  test('alg_none overrides non-none structured header algorithm by default', () => {
    const normalized = normalizeTokenRequest({
      vulnerability: 'alg_none',
      header: { alg: 'RS256', typ: 'JWT' },
      body: { sub: 'admin' }
    });

    applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } });

    expect(normalized.header.alg).toBe('none');
    expect(normalized.signature).toBe(false);
  });

  test('alg_none preserves explicit literal signature', () => {
    const normalized = normalizeTokenRequest({
      vulnerability: 'alg_none',
      signature: 'literal-signature',
      body: { sub: 'admin' }
    });

    applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } });

    expect(normalized.header.alg).toBe('none');
    expect(normalized.signature).toBe('literal-signature');
  });

  test('alg_none rejects non-none variants', () => {
    const normalized = normalizeTokenRequest({
      vulnerability: 'alg_none',
      alg_none_variant: 'HS256',
      body: { sub: 'admin' }
    });

    expect(() => applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } }))
      .toThrow('alg_none_variant must be a case variation of "none"');
  });

  test('rs_hs_confusion sets HS256 header algorithm', () => {
    const normalized = normalizeTokenRequest({
      vulnerability: 'rs_hs_confusion',
      body: { sub: 'admin' }
    });

    applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } });

    expect(normalized.header.alg).toBe('HS256');
  });

  test('embedded_jwk copies the current public key into the header', () => {
    const publicKey = { kty: 'RSA', kid: 'rsa-key-1' };
    const normalized = normalizeTokenRequest({
      vulnerability: 'embedded_jwk',
      body: { sub: 'admin' }
    });

    applyVulnerabilityPreset(normalized, { publicKey });

    expect(normalized.header.jwk).toBe(publicKey);
  });

  test('kid traversal and jku injection presets set expected headers', () => {
    const kidTraversal = normalizeTokenRequest({
      vulnerability: 'kid_traversal',
      body: { sub: 'admin' }
    });
    const jkuInjection = normalizeTokenRequest({
      vulnerability: 'jku_injection',
      body: { sub: 'admin' }
    });

    applyVulnerabilityPreset(kidTraversal, { publicKey: { kid: 'public' } });
    applyVulnerabilityPreset(jkuInjection, { publicKey: { kid: 'public' } });

    expect(kidTraversal.header.kid).toBe('../../../../../../dev/null');
    expect(jkuInjection.header.jku).toBe('https://attacker.example.com/.well-known/jwks.json');
  });

  test('header injection presets preserve explicit structured header values', () => {
    const jwk = { kty: 'RSA', kid: 'self-asserted' };
    const kidTraversal = normalizeTokenRequest({
      vulnerability: 'kid_traversal',
      header: { kid: '../../../tmp/key.pem' },
      body: { sub: 'admin' }
    });
    const jkuInjection = normalizeTokenRequest({
      vulnerability: 'jku_injection',
      header: { jku: 'https://self.example.com/jwks.json' },
      body: { sub: 'admin' }
    });
    const embeddedJwk = normalizeTokenRequest({
      vulnerability: 'embedded_jwk',
      header: { jwk },
      body: { sub: 'admin' }
    });

    applyVulnerabilityPreset(kidTraversal, { publicKey: { kid: 'public' } });
    applyVulnerabilityPreset(jkuInjection, { publicKey: { kid: 'public' } });
    applyVulnerabilityPreset(embeddedJwk, { publicKey: { kid: 'public' } });

    expect(kidTraversal.header.kid).toBe('../../../tmp/key.pem');
    expect(jkuInjection.header.jku).toBe('https://self.example.com/jwks.json');
    expect(embeddedJwk.header.jwk).toBe(jwk);
  });

  test('no vulnerability preset returns normalized request unchanged', () => {
    const normalized = normalizeTokenRequest({ body: { sub: 'user123' } });

    expect(applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } })).toBe(normalized);
  });

  test('unsupported vulnerability preset is rejected', () => {
    const normalized = normalizeTokenRequest({
      vulnerability: 'unknown',
      body: { sub: 'admin' }
    });

    expect(() => applyVulnerabilityPreset(normalized, { publicKey: { kid: 'public' } }))
      .toThrow('Unsupported vulnerability mode');
  });
});

describe('Generated JWT header defaults', () => {
  test('defaults typ and omits cty when omitted', () => {
    const header = buildJwtHeader({ alg: 'RS256', kid: 'rsa-key-1' });

    expect(header.typ).toBe('JWT');
    expect(header.cty).toBeUndefined();
  });

  test('allows self-asserted typ and cty overrides', () => {
    const header = buildJwtHeader(
      { alg: 'RS256', kid: 'rsa-key-1' },
      {
          typ: 'at+jwt',
          cty: 'application/jwt'
      }
    );

    expect(header.typ).toBe('at+jwt');
    expect(header.cty).toBe('application/jwt');
  });
});
