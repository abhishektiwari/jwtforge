---
title: RS/HS Confusion
description: Test RS256 to HS256 algorithm confusion handling with JWTForge vulnerability presets.
keywords: [RS256 HS256 confusion, JWT algorithm confusion, CVE-2015-9235, JWT security]
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
