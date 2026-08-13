---
title: Malicious Mode
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Malicious Mode

`malicious` injects attack strings into selected claims or header fields.

```json
{
  "mode": "malicious",
  "malicious_category": "sql_injection",
  "body": {
    "sub": "user123",
    "email": "user@example.com"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'malicious',
    malicious_category: 'sql_injection',
    body: {
      sub: 'user123',
      email: 'user@example.com',
    },
  }}
/>

Supported categories include SQL injection, XSS, path traversal, command injection, LDAP injection, NoSQL injection, XML injection, template injection, header injection, and buffer overflow.
