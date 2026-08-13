---
title: Structured JSON
description: Use JWTForge structured JSON requests with explicit JWT header, body, and signature objects for token generation and security testing.
keywords: [JWT structured JSON, JWT header, JWT claims, JWT signature, token endpoint]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Structured JSON

Structured JSON is the recommended request model for new JWTForge tests. It maps the request to the three JWT parts directly:

| Request field | JWT part | Purpose |
| --- | --- | --- |
| `header` | JWT header | Header parameters such as `alg`, `typ`, `kid`, `jku`, and `jwk` |
| `body` | JWT payload | Standard, OIDC, OAuth2, and custom claims |
| `signature` | JWT signature | Normal signing, unsigned token, or literal signature segment |

JWTForge auto-detects structured JSON when the request contains any of these top-level fields:

- `header`
- `body`
- `signature`

If none of those fields are present, JWTForge treats the request as the legacy flat claim model.

## Minimal Request

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "rsa-key-1"
  },
  "body": {
    "sub": "user123",
    "scope": "openid profile"
  }
}
```

This generates a normally signed access token. JWTForge still adds default JWT claims such as `iss`, `aud`, `exp`, `nbf`, `iat`, and `jti` if they are not provided.

<DocsTokenExample
  request={{
    header: {
      alg: 'RS256',
      typ: 'JWT',
      kid: 'rsa-key-1',
    },
    body: {
      sub: 'user123',
      scope: 'openid profile',
    },
  }}
/>

## Header Object

The `header` object controls JWT header parameters.

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "cty": "application/json",
    "kid": "rsa-key-1",
    "jku": "https://example.com/.well-known/jwks.json",
    "jwk": {
      "kty": "RSA",
      "kid": "embedded-rsa-key",
      "use": "sig",
      "alg": "RS256",
      "n": "test",
      "e": "AQAB"
    }
  },
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    header: {
      alg: 'RS256',
      typ: 'JWT',
      cty: 'application/json',
      kid: 'rsa-key-1',
      jku: 'https://example.com/.well-known/jwks.json',
      jwk: {
        kty: 'RSA',
        kid: 'embedded-rsa-key',
        use: 'sig',
        alg: 'RS256',
        n: 'test',
        e: 'AQAB',
      },
    },
    body: {
      sub: 'user123',
    },
  }}
/>

### Supported Header Fields

| Field | Description | Default | Example |
| --- | --- | --- | --- |
| `alg` | JWT signing algorithm advertised in the header | Active key algorithm, usually `RS256` | `"RS256"`, `"ES256"`, `"none"`, `"nOne"` |
| `typ` | Token type | `"JWT"` | `"JWT"` |
| `cty` | Content type for nested or typed JWT payloads | none | `"application/json"`, `"JWT"` |
| `kid` | Key identifier | Active signing key ID | `"rsa-key-1"` |
| `jku` | JWK Set URL reference | none | `"https://example.com/.well-known/jwks.json"` |
| `jwk` | Embedded public JWK object | none | `{"kty":"RSA","kid":"embedded-rsa-key"}` |

### Unsupported Header Fields

| Field | Reason | Behavior | Example |
| --- | --- | --- | --- |
| `x5u` | X.509 certificate URL headers are intentionally out of scope | Request rejected with `400` | `"https://example.com/cert.pem"` |
| `x5c` | X.509 certificate chain headers are intentionally out of scope | Request rejected with `400` | `["MIIB..."]` |
| `x5t` | X.509 certificate thumbprint headers are intentionally out of scope | Request rejected with `400` | `"abc123"` |

JWTForge rejects unsupported header fields with `400`. That includes the certificate-chain header fields above.

## Body Object

The `body` object becomes the JWT payload.

```json
{
  "body": {
    "iss": "https://issuer.example.com",
    "sub": "user123",
    "aud": "https://api.example.com",
    "scope": "openid profile email",
    "roles": ["admin", "user"],
    "tenant_id": "tenant-abc-123"
  }
}
```

<DocsTokenExample
  request={{
    body: {
      iss: 'https://issuer.example.com',
      sub: 'user123',
      aud: 'https://api.example.com',
      scope: 'openid profile email',
      roles: ['admin', 'user'],
      tenant_id: 'tenant-abc-123',
    },
  }}
/>

### Supported Body Fields

| Field | Description | Default | Example |
| --- | --- | --- | --- |
| `iss` | Issuer identifier | Worker URL | `"https://jwtforge.workers.dev"` |
| `sub` | Subject identifier | `"user123"` | `"user123"` |
| `aud` | Audience identifier | `"https://api.example.com"` | `"my-api"` |
| `exp` | Expiration timestamp | Current time + 1 hour | `1735689600` |
| `nbf` | Not-before timestamp | Current time | `1735686000` |
| `iat` | Issued-at timestamp | Current time | `1735686000` |
| `jti` | JWT ID | Random UUID | `"550e8400-e29b-41d4-a716-446655440000"` |
| `scope` | OAuth2 scopes | none | `"openid profile email"` |
| `client_id` | OAuth2 client identifier | Auto-generated when needed | `"test_app"` |
| `roles` | Application roles | none | `["admin", "user"]` |
| `groups` | User groups | none | `["engineering"]` |
| `nonce` | OIDC nonce for replay protection | none | `"nonce-123"` |
| `name` | Full name | Generated in `fake` mode with `profile` scope | `"Jane Doe"` |
| `given_name` | First name | Generated in `fake` mode with `profile` scope | `"Jane"` |
| `family_name` | Last name | Generated in `fake` mode with `profile` scope | `"Doe"` |
| `preferred_username` | Preferred username | Generated in `fake` mode with `profile` scope | `"jane.doe"` |
| `profile` | Profile URL | Generated in `fake` mode with `profile` scope | `"https://example.com/users/jane"` |
| `picture` | Profile image URL | Generated in `fake` mode with `profile` scope | `"https://example.com/avatar.jpg"` |
| `email` | Email address | Generated in `fake` mode with `email` scope | `"jane@example.com"` |
| `email_verified` | Email verification state | Generated in `fake` mode with `email` scope | `true` |
| `address` | OIDC address object | Generated in `fake` mode with `address` scope | `{"country":"US"}` |
| `phone_number` | Phone number | Generated in `fake` mode with `phone` scope | `"+1-555-555-5555"` |
| `phone_number_verified` | Phone verification state | Generated in `fake` mode with `phone` scope | `false` |
| Custom fields | Any additional claim accepted by the API | none | `"tenant_id": "tenant-abc-123"` |

Operational fields are not emitted as JWT claims. JWTForge removes fields such as:

- `mode`
- `exclude`
- `kty`
- `response_type`
- `grammar_category`
- `malicious_category`
- `vulnerability`
- `signature`

For clarity, prefer putting operational fields at the top level and claims inside `body`.

## Signature Control

Omit `signature` to sign normally:

```json
{
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    body: {
      sub: 'user123',
    },
  }}
/>

Set `signature` to `false` to generate an unsigned token with a trailing dot:

```json
{
  "header": {
    "alg": "none"
  },
  "body": {
    "sub": "admin",
    "roles": ["admin"]
  },
  "signature": false
}
```

<DocsTokenExample
  request={{
    header: {
      alg: 'none',
    },
    body: {
      sub: 'admin',
      roles: ['admin'],
    },
    signature: false,
  }}
/>

Pass a string to force a literal signature segment:

```json
{
  "body": {
    "sub": "user123"
  },
  "signature": "literal-signature"
}
```

<DocsTokenExample
  request={{
    body: {
      sub: 'user123',
    },
    signature: 'literal-signature',
  }}
/>

Private-key signing from request payloads is reserved for a future extension.

## Modes With Structured JSON

Modes work with structured JSON. JWTForge applies body transformations to `body` claims and header transformations to supported `header` fields.

### Fake Mode

```json
{
  "mode": "fake",
  "body": {
    "sub": "user123",
    "scope": "openid profile email"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'fake',
    body: {
      sub: 'user123',
      scope: 'openid profile email',
    },
  }}
/>

### Fuzz Mode

Fuzz mode is selective. It randomly mutates 1-3 available `body` claims per token, while provided supported `header` fields are fuzzed unless excluded. The `signature` field is not fuzzed by `mode: "fuzz"`; use `signature: false`, a literal signature string, or a vulnerability preset for signature-specific tests.

```json
{
  "mode": "fuzz",
  "header": {
    "alg": "RS256",
    "kid": "rsa-key-1"
  },
  "body": {
    "sub": "user123",
    "email": "user@example.com"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'fuzz',
    header: {
      alg: 'RS256',
      kid: 'rsa-key-1',
    },
    body: {
      sub: 'user123',
      email: 'user@example.com',
    },
  }}
/>

Protect selected fields with `exclude`:

```json
{
  "mode": "fuzz",
  "exclude": ["exp", "nbf", "iat", "header.alg"],
  "header": {
    "alg": "RS256"
  },
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'fuzz',
    exclude: ['exp', 'nbf', 'iat', 'header.alg'],
    header: {
      alg: 'RS256',
    },
    body: {
      sub: 'user123',
    },
  }}
/>

### Malicious Mode

```json
{
  "mode": "malicious",
  "malicious_category": "sql_injection",
  "body": {
    "sub": "user123",
    "email": "user@example.com"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'malicious',
    malicious_category: 'sql_injection',
    body: {
      sub: 'user123',
      email: 'user@example.com',
    },
  }}
/>

### Grammar Mode

```json
{
  "mode": "grammar",
  "grammar_category": "vulnerable",
  "header": {
    "alg": "trigger",
    "jku": "trigger",
    "jwk": {}
  },
  "body": {
    "sub": "user123",
    "email": "user@example.com"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'grammar',
    grammar_category: 'vulnerable',
    header: {
      alg: 'trigger',
      jku: 'trigger',
      jwk: {},
    },
    body: {
      sub: 'user123',
      email: 'user@example.com',
    },
  }}
/>

Grammar mode resolves literal values and semantic templates before generating the token. Faker templates become realistic values such as emails, names, booleans, UUIDs, avatars, and usernames.

## Vulnerability Presets

Structured JSON supports known JWT vulnerability presets.

```json
{
  "vulnerability": "rs_hs_confusion",
  "body": {
    "sub": "admin",
    "roles": ["admin"]
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'rs_hs_confusion',
    body: {
      sub: 'admin',
      roles: ['admin'],
    },
  }}
/>

Supported presets:

| Preset | Effect |
| --- | --- |
| `alg_none` | Sets `header.alg` to `none` and `signature` to `false`; use `alg_none_variant` for case variants such as `None`, `NONE`, or `nOne` |
| `rs_hs_confusion` | Sets `header.alg` to `HS256` |
| `kid_traversal` | Sets `header.kid` to a traversal-style value |
| `jku_injection` | Sets `header.jku` to an attacker-style JWKS URL |
| `embedded_jwk` | Embeds the current public JWK in `header.jwk` |

Presets apply before mode transformations, so use `exclude` when a mode should not mutate a preset field.

Example `alg_none` case variant:

```json
{
  "vulnerability": "alg_none",
  "alg_none_variant": "nOne",
  "body": {
    "sub": "admin"
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'alg_none',
    alg_none_variant: 'nOne',
    body: {
      sub: 'admin',
    },
  }}
/>

## Response Types

Use `response_type` at the top level to generate access tokens, ID tokens, or both:

```json
{
  "response_type": "id_token token",
  "body": {
    "sub": "user123",
    "scope": "openid profile email",
    "nonce": "nonce-123"
  }
}
```

<DocsTokenExample
  request={{
    response_type: 'id_token token',
    body: {
      sub: 'user123',
      scope: 'openid profile email',
      nonce: 'nonce-123',
    },
  }}
/>

Supported values:

| Response type | Description | Returns | Use case |
| --- | --- | --- | --- |
| `token` | Access token only | `access_token` | API authorization and resource access |
| `id_token` | ID token only | `id_token` | User authentication and identity verification |
| `id_token token` | Access token and ID token | `access_token` + `id_token` | OIDC hybrid-style testing |
| `token id_token` | Access token and ID token, alternative order | `access_token` + `id_token` | Compatibility testing for order-insensitive clients |

## Key Type

Use `kty` at the top level to choose JWTForge's signing key type:

```json
{
  "kty": "EC",
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    kty: 'EC',
    body: {
      sub: 'user123',
    },
  }}
/>

Supported values:

| Key type | Signing algorithm | Description | Default | Example |
| --- | --- | --- | --- | --- |
| `RSA` | `RS256` | RSA-2048 with SHA-256 | Yes | `"kty": "RSA"` |
| `EC` | `ES256` | ECDSA P-256 with SHA-256 | No | `"kty": "EC"` |

## Full Example

```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "grammar",
    "grammar_category": "valid",
    "response_type": "id_token token",
    "kty": "RSA",
    "header": {
      "alg": "RS256",
      "typ": "JWT",
      "cty": "application/json",
      "kid": "rsa-key-1"
    },
    "body": {
      "sub": "user123",
      "scope": "openid profile email",
      "aud": "my-client",
      "nonce": "nonce-123",
      "roles": ["admin"]
    }
  }'
```

<DocsTokenExample
  request={{
    mode: 'grammar',
    grammar_category: 'valid',
    response_type: 'id_token token',
    kty: 'RSA',
    header: {
      alg: 'RS256',
      typ: 'JWT',
      cty: 'application/json',
      kid: 'rsa-key-1',
    },
    body: {
      sub: 'user123',
      scope: 'openid profile email',
      aud: 'my-client',
      nonce: 'nonce-123',
      roles: ['admin'],
    },
  }}
/>

## Migration From Legacy JSON

Legacy flat JSON:

```json
{
  "sub": "user123",
  "scope": "openid profile",
  "header_alg": "none",
  "sig": false
}
```

Structured JSON:

```json
{
  "header": {
    "alg": "none"
  },
  "body": {
    "sub": "user123",
    "scope": "openid profile"
  },
  "signature": false
}
```

Migration rules:

- Move JWT payload claims into `body`.
- Move `header_alg` to `header.alg`.
- Move `header_kid` to `header.kid`.
- Replace `sig: false` with `signature: false`.
- Keep operational fields such as `mode`, `exclude`, `kty`, `response_type`, and `grammar_category` at the top level.
