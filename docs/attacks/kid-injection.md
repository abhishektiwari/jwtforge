---
title: kid Injection
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
