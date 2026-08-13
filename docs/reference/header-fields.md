---
title: Header Fields
description: Reference for JWTForge supported and rejected structured JWT header fields, including alg, typ, cty, kid, jku, jwk, and crit.
keywords: [JWT header fields, alg, kid, jku, jwk, crit, JWTForge reference]
---

# Header Fields

Supported structured header fields:

| Field | Description | Default | Example |
| --- | --- | --- | --- |
| `alg` | JWT signing algorithm advertised in the header | Active key algorithm, usually `RS256` | `"RS256"`, `"ES256"`, `"none"`, `"nOne"` |
| `typ` | Token type | `"JWT"` | `"JWT"`, `"at+jwt"` |
| `cty` | Content type for nested or typed JWT payloads | none | `"JWT"`, `"application/jwt"` |
| `kid` | Key identifier | Active signing key ID | `"rsa-key-1"` |
| `jku` | JWK Set URL reference | none | `"https://example.com/.well-known/jwks.json"` |
| `jwk` | Embedded public JWK object | none | `{"kty":"RSA","kid":"embedded-rsa-key"}` |
| `crit` | Critical header parameter names | none | `["exp-ext","custom-policy-id"]` |

Custom header parameters are allowed only when their names are listed in `crit`. Each name in `crit` must also exist as a header parameter:

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "crit": ["exp-ext", "custom-policy-id"],
    "exp-ext": "2026-12-31T23:59:59Z",
    "custom-policy-id": "policy_99ab"
  },
  "body": {
    "sub": "user123"
  }
}
```

Unsupported and rejected fields:

| Field | Reason | Behavior | Example |
| --- | --- | --- | --- |
| `x5u` | X.509 certificate URL headers are intentionally out of scope | Request rejected with `400` | `"https://example.com/cert.pem"` |
| `x5c` | X.509 certificate chain headers are intentionally out of scope | Request rejected with `400` | `["MIIB..."]` |
| `x5t` | X.509 certificate thumbprint headers are intentionally out of scope | Request rejected with `400` | `"abc123"` |

Any other header field is rejected unless it is explicitly listed in `crit`. Supported fields are limited to `alg`, `typ`, `cty`, `kid`, `jku`, `jwk`, and `crit`.

## Key Injection Surfaces

JWTForge supports three key-injection test surfaces:

| Surface | Header field | Preset | What it tests |
| --- | --- | --- | --- |
| Key ID injection | `kid` | `kid_traversal` | Unsafe local key lookup, path traversal, SQL-style lookup injection, or untrusted key ID handling |
| JWKS URL injection | `jku` | `jku_injection` | Whether a verifier fetches token-supplied JWKS URLs without enforcing a trusted allowlist |
| Embedded key injection | `jwk` | `embedded_jwk` | Whether a verifier trusts a public key embedded directly in the token header |
