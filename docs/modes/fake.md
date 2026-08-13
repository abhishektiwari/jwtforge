---
title: Fake Mode
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Fake Mode

`fake` is the default mode. It preserves provided claims and fills OIDC scope-derived claims with realistic Faker data.

```json
{
  "mode": "fake",
  "body": {
    "sub": "user123",
    "scope": "openid profile email"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'fake',
    body: {
      sub: 'user123',
      scope: 'openid profile email',
    },
  }}
/>
