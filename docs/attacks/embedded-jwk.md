---
title: Embedded JWK
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
