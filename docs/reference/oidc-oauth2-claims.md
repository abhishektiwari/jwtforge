---
title: OIDC/OAuth2 Claims
description: Reference for JWTForge standard JWT, OIDC, OAuth2, and custom claim support in structured JSON payloads.
keywords: [OIDC claims, OAuth2 claims, JWT claims, OpenID Connect]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# OIDC/OAuth2 Claims

JWTForge supports standard JWT, OIDC, and OAuth2 claims, plus arbitrary custom claims.

In the structured JSON model, put claims under `body`:

```json
{
  "body": {
    "sub": "user123",
    "scope": "openid profile email",
    "roles": ["admin", "user"]
  }
}
```

<DocsTokenExample
  request={{
    body: {
      sub: 'user123',
      scope: 'openid profile email',
      roles: ['admin', 'user'],
    },
  }}
/>

In the legacy flat model, claims can still be passed at the top level:

```json
{
  "sub": "user123",
  "scope": "openid profile email",
  "roles": ["admin", "user"]
}
```

<DocsTokenExample
  request={{
    body: {
      sub: 'user123',
      tenant_id: 'tenant-456',
      permissions: ['read', 'write', 'delete'],
      metadata: {
        department: 'Engineering',
        level: 'senior',
      },
    },
  }}
/>

JWTForge intentionally does not strictly validate standard claims. It is a testing tool, so malformed, unexpected, or custom values are allowed where possible.

## Claim Reference

| Claim | Description | Default | Example |
| --- | --- | --- | --- |
| `iss` | Issuer | Worker URL | `"https://jwtforge.workers.dev"` |
| `sub` | Subject | `"user123"` | `"user123"`, `"auth0\|507f1f77bcf86cd799439011"` |
| `aud` | Audience | `"https://api.example.com"` | `"https://api.example.com"`, `"my-resource-id"` |
| `exp` | Expiration time | Current time + 1 hour | `1735689600` |
| `nbf` | Not before | Current time | `1735686000` |
| `iat` | Issued at | Current time | `1735686000` |
| `jti` | JWT ID | Random UUID | `"550e8400-e29b-41d4-a716-446655440000"` |
| `client_id` | OAuth2 client identifier | Auto-generated or user-provided | `"test_app"`, `"client_a1b2c3d4"` |
| `name` | Full name | none | `"John Doe"` |
| `given_name` | First name | none | `"John"` |
| `family_name` | Last name | none | `"Doe"` |
| `middle_name` | Middle name | none | `"Michael"` |
| `nickname` | Nickname | none | `"Johnny"` |
| `preferred_username` | Preferred username | none | `"johndoe"` |
| `profile` | Profile page URL | none | `"https://example.com/users/johndoe"` |
| `picture` | Picture URL | none | `"https://example.com/avatar.jpg"` |
| `website` | Website URL | none | `"https://johndoe.com"` |
| `email` | Email address | none | `"john@example.com"` |
| `email_verified` | Email verification status | none | `true`, `false` |
| `gender` | Gender | none | `"male"`, `"female"`, `"other"` |
| `birthdate` | Birthdate | none | `"1990-01-15"` |
| `zoneinfo` | Time zone | none | `"America/New_York"` |
| `locale` | Locale | none | `"en-US"`, `"fr-CA"` |
| `phone_number` | Phone number | none | `"+1-555-555-5555"` |
| `phone_number_verified` | Phone verification status | none | `true`, `false` |
| `address` | Address object | none | `{"street_address":"123 Main St","locality":"City","region":"State","postal_code":"12345","country":"US"}` |
| `updated_at` | Last update timestamp | none | `1735686000` |
| `scope` | OAuth2 scopes | none | `"openid profile email"`, `"read write"` |
| `roles` | User roles | none | `["admin", "user"]` |
| `groups` | User groups | none | `["engineering", "management"]` |
| `nonce` | Nonce for ID tokens | none | `"random-nonce-12345"` |

You can override any default claim or add custom claims in the request body.

## Custom Claims

Custom claims are preserved in the JWT payload:

```json
{
  "body": {
    "sub": "user123",
    "tenant_id": "tenant-456",
    "permissions": ["read", "write", "delete"],
    "metadata": {
      "department": "Engineering",
      "level": "senior"
    }
  }
}
```

## Operational Fields Are Not Claims

These fields configure token generation and are not emitted as payload claims:

- `mode`
- `exclude`
- `kty`
- `response_type`
- `grammar_category`
- `malicious_category`
- `vulnerability`
- `header`
- `signature`

Keep operational fields at the top level and payload claims under `body` when using structured JSON.
