/**
 * Tests for structured token request normalization.
 */

import { applyVulnerabilityPreset, normalizeTokenRequest } from '../src/tokenrequest.js';

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
});
