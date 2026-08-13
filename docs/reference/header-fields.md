---
title: Header Fields
description: Reference for JWTForge supported and rejected structured JWT header fields, including alg, typ, cty, kid, jku, and jwk.
keywords: [JWT header fields, alg, kid, jku, jwk, JWTForge reference]
---

# Header Fields

Supported structured header fields:

| Field | Description | Default | Example |
| --- | --- | --- | --- |
| `alg` | JWT signing algorithm advertised in the header | Active key algorithm, usually `RS256` | `"RS256"`, `"ES256"`, `"none"`, `"nOne"` |
| `typ` | Token type | `"JWT"` | `"JWT"` |
| `cty` | Content type for nested or typed JWT payloads | none | `"application/json"`, `"JWT"` |
| `kid` | Key identifier | Active signing key ID | `"rsa-key-1"` |
| `jku` | JWK Set URL reference | none | `"https://example.com/.well-known/jwks.json"` |
| `jwk` | Embedded public JWK object | none | `{"kty":"RSA","kid":"embedded-rsa-key"}` |

Unsupported and rejected fields:

| Field | Reason | Behavior | Example |
| --- | --- | --- | --- |
| `x5u` | X.509 certificate URL headers are intentionally out of scope | Request rejected with `400` | `"https://example.com/cert.pem"` |
| `x5c` | X.509 certificate chain headers are intentionally out of scope | Request rejected with `400` | `["MIIB..."]` |
| `x5t` | X.509 certificate thumbprint headers are intentionally out of scope | Request rejected with `400` | `"abc123"` |

Any other header field is also rejected. Supported fields are limited to `alg`, `typ`, `cty`, `kid`, `jku`, and `jwk`.
