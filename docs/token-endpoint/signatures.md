---
title: Signatures
description: Configure JWTForge token signatures, including normal signing, unsigned tokens, literal signatures, and vulnerability-oriented signature behavior.
keywords: [JWT signature, unsigned JWT, alg none, literal signature, JWTForge]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Signatures

Omit `signature` to let JWTForge sign normally with its active key:

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

Set `signature` to `false` to generate an unsigned trailing-dot token:

```json
{
  "header": {
    "alg": "none"
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
      alg: 'none',
    },
    body: {
      sub: 'admin',
    },
    signature: false,
  }}
/>

Pass a string to use a literal signature segment:

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
