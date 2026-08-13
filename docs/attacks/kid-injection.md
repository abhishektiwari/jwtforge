---
title: kid Injection
description: Generate JWTs with malicious kid header values for key lookup, path traversal, and injection testing.
keywords: [JWT kid injection, path traversal, JWT header, key lookup]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# kid Injection

Generate a token with a traversal-style `kid`:

```json
{
  "vulnerability": "kid_traversal",
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'kid_traversal',
    body: {
      sub: 'user123',
    },
  }}
/>
