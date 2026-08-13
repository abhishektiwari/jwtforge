---
title: jku Injection
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# jku Injection

Generate a token with an attacker-controlled JWKS URL:

```json
{
  "vulnerability": "jku_injection",
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'jku_injection',
    body: {
      sub: 'user123',
    },
  }}
/>
