---
title: jku Injection
description: Generate JWTs with attacker-controlled jku header URLs to test JWKS URL allowlist and trust enforcement.
keywords: [JWT jku injection, JWKS, JWT header, OAuth2 security]
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
