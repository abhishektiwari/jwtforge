---
title: Grammar Mode
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Grammar Mode

`grammar` selects values from JWTForge's grammar catalog.

```json
{
  "mode": "grammar",
  "grammar_category": "vulnerable",
  "header": {
    "alg": "trigger",
    "jku": "trigger"
  },
  "body": {
    "sub": "user123",
    "email": "user@example.com"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'grammar',
    grammar_category: 'vulnerable',
    header: {
      alg: 'trigger',
      jku: 'trigger',
    },
    body: {
      sub: 'user123',
      email: 'user@example.com',
    },
  }}
/>

Grammar entries can be direct literals or templates. Templates are resolved at generation time.

Template types:

- `timestamp`
- `url`
- `jwk`
- `literal`
- `attack_string`
- `faker`

Faker templates generate realistic values such as emails, names, usernames, phone numbers, avatars, booleans, locales, and UUIDs.
