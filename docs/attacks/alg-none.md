---
title: alg none
description: Generate unsigned JWTs and alg none variants to test algorithm allowlist enforcement in JWT consumers.
keywords: [alg none, unsigned JWT, JWT algorithm confusion, JWT security]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# alg none

Generate an unsigned token with `alg: none`:

```json
{
  "vulnerability": "alg_none",
  "body": {
    "sub": "admin",
    "roles": ["admin"]
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'alg_none',
    body: {
      sub: 'admin',
      roles: ['admin'],
    },
  }}
/>

## Case Variations

Some JWT validation bugs only reject lowercase `none` and miss other case variants.
Use `alg_none_variant` with the preset to generate a specific spelling:

```json
{
  "vulnerability": "alg_none",
  "alg_none_variant": "nOne",
  "body": {
    "sub": "admin",
    "roles": ["admin"]
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'alg_none',
    alg_none_variant: 'nOne',
    body: {
      sub: 'admin',
      roles: ['admin'],
    },
  }}
/>

Supported values are any case variation of `none`, such as `none`, `None`, `NONE`, `nOne`, and `nOnE`.

You can also set the header directly in structured JSON:

```json
{
  "header": {
    "alg": "None"
  },
  "body": {
    "sub": "admin"
  },
  "signature": false
}
```

<DocsTokenExample
  request={{
    header: {
      alg: 'None',
    },
    body: {
      sub: 'admin',
    },
    signature: false,
  }}
/>
