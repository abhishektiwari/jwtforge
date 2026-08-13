---
title: Embedded JWK
description: Generate JWTs with embedded jwk header objects to test whether consumers incorrectly trust token-provided keys.
keywords: [embedded JWK, JWT jwk header, JWT trust, JWT security testing]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Embedded JWK

Generate a token with an embedded public JWK in the header:

```json
{
  "vulnerability": "embedded_jwk",
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'embedded_jwk',
    body: {
      sub: 'user123',
    },
  }}
/>
