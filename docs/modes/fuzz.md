---
title: Fuzz Mode
description: Use JWTForge fuzz mode to randomly mutate selected JWT body claims and supported header fields for robustness testing.
keywords: [JWT fuzzing, claim fuzzing, header fuzzing, robustness testing]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Fuzz Mode

`fuzz` performs random selective mutation. It does not rewrite every field in the token.

For body claims, JWTForge randomly mutates 1-3 available claims per generated token. It always protects `iss`, `jti`, `kty`, and `response_type`, and it also protects any fields listed in `exclude`.

For header fields, JWTForge fuzzes each provided supported header field unless that field is excluded. Supported structured header fields are `alg`, `typ`, `cty`, `kid`, `jku`, and `jwk`.

```json
{
  "mode": "fuzz",
  "header": {
    "alg": "RS256",
    "kid": "stable-key"
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
      kid: 'stable-key',
    },
    body: {
      sub: 'user123',
      email: 'user@example.com',
    },
  }}
/>

Use `exclude` to protect fields:

```json
{
  "mode": "fuzz",
  "exclude": ["exp", "nbf", "iat", "header.alg"],
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'fuzz',
    exclude: ['exp', 'nbf', 'iat', 'header.alg'],
    body: {
      sub: 'user123',
    },
  }}
/>

## Mutation Scope

| Token part | Fuzz behavior | Protected fields |
| --- | --- | --- |
| `body` | Randomly mutates 1-3 body claims from the available claim set | `iss`, `jti`, `kty`, `response_type`, and fields in `exclude` |
| `header` | Mutates each provided supported header field | Fields in `exclude`, using either `header.alg` style or legacy names such as `header_alg` |
| `signature` | Not fuzzed by `mode: "fuzz"` | Use `signature: false`, a literal signature string, or vulnerability presets for signature-specific testing |

Use dotted field names to protect structured header fields:

```json
{
  "mode": "fuzz",
  "exclude": ["header.alg", "exp", "nbf", "iat"],
  "header": {
    "alg": "RS256",
    "kid": "rsa-key-1"
  },
  "body": {
    "sub": "user123",
    "email": "user@example.com",
    "roles": ["admin"]
  }
}
```

In this example, `header.alg`, `exp`, `nbf`, and `iat` remain stable. `header.kid` can be fuzzed because it was provided and not excluded. One to three body claims from the remaining available body fields can be fuzzed.

Fuzzed body values are selected from BLNS strings plus edge-case values such as booleans, large numbers, negative numbers, arrays, nested objects, `null`, `Infinity`, and `NaN`. Fuzzed `alg` values include algorithm-confusion candidates such as `none`, `None`, `NONE`, `nOnE`, `HS256`, `HS384`, and `HS512`.
