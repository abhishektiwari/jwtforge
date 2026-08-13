---
title: RS/HS Confusion
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# RS/HS Confusion

Generate a token that advertises `HS256` while JWTForge uses its RSA key path:

```json
{
  "vulnerability": "rs_hs_confusion",
  "body": {
    "sub": "admin"
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'rs_hs_confusion',
    body: {
      sub: 'admin',
    },
  }}
/>
