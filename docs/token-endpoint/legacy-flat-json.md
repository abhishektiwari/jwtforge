---
title: Legacy Flat JSON
---

# Legacy Flat JSON

Legacy requests put claims at the top level:

```json
{
  "sub": "user123",
  "scope": "openid profile",
  "roles": ["admin"]
}
```

Legacy header controls remain supported:

```json
{
  "sub": "user123",
  "header_alg": "none",
  "header_kid": "../../../../../../dev/null",
  "sig": false
}
```

Use the structured JSON model for new tests. Keep the legacy model for existing integrations and simple claim-only token generation.
