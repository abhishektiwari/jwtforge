---
title: Format Confusion
description: Generate JWS JSON Serialization tokens to test whether OAuth2/OIDC bearer token parsers reject non-compact JWT formats.
keywords: [JWT format confusion, JWS JSON Serialization, flattened JWS, general JWS, bearer token security]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Format Confusion

Most OAuth2/OIDC bearer-token deployments expect compact JWTs:

```text
base64url(header).base64url(payload).base64url(signature)
```

JWTForge uses compact output by default. Format-confusion testing intentionally produces JWS JSON Serialization instead, then sends that JSON text where a compact JWT would normally be expected. A compliant bearer-token parser should reject these values unless the application explicitly supports JWS JSON Serialization for that endpoint.

## Flattened JWS JSON

Set `format` to `flattened` to return JWS Flattened JSON Serialization:

```json
{
  "format": "flattened",
  "body": {
    "sub": "user123",
    "scope": "read write"
  }
}
```

<DocsTokenExample
  request={{
    format: 'flattened',
    body: {
      sub: 'user123',
      scope: 'read write',
    },
  }}
/>

The response token is an object with `payload`, `protected`, and `signature` members instead of a compact JWT string.

## General JWS JSON

Set `format` to `general` and pass `signatures` to create a JWS General JSON Serialization token with multiple signatures:

```json
{
  "format": "general",
  "body": {
    "sub": "user123",
    "scope": "read write"
  },
  "signatures": [
    {
      "header": {
        "kid": "rsa-key-1"
      }
    },
    {
      "header": {
        "kid": "alternate-rsa-key",
        "alg": "RS256"
      },
      "signature": "literal-secondary-signature"
    }
  ]
}
```

<DocsTokenExample
  request={{
    format: 'general',
    body: {
      sub: 'user123',
      scope: 'read write',
    },
    signatures: [
      {
        header: {
          kid: 'rsa-key-1',
        },
      },
      {
        header: {
          kid: 'alternate-rsa-key',
          alg: 'RS256',
        },
        signature: 'literal-secondary-signature',
      },
    ],
  }}
/>

This is useful for testing whether application code verifies one signature but later reads or trusts a different signature entry.

## Preset

Use `vulnerability: "format_confusion"` when you want the preset form. If no explicit `format` is provided, JWTForge switches compact output to flattened JWS JSON:

```json
{
  "vulnerability": "format_confusion",
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'format_confusion',
    body: {
      sub: 'user123',
    },
  }}
/>

If you explicitly set `format: "general"`, the preset preserves that choice.

## Pentest Behavior

The pentest generator includes format-confusion cases in the JWT vulnerability collection:

| Scenario | JWTForge request | Expected target behavior |
| --- | --- | --- |
| Flattened JWS JSON bearer token | `format: "flattened"` | Reject with `401` or `403` |
| General JWS JSON bearer token | `format: "general"` with multiple signatures | Reject with `401` or `403` |
| Conflicting payload hint | `format: "general"` with `confusion.payload_hint` | Reject with `401` or `403` |

For these tests, the generated JWS JSON object is serialized to JSON and sent as:

```text
Authorization: Bearer {"payload":"...","signatures":[...]}
```

Accepting that value on an endpoint documented as accepting compact OAuth2/OIDC bearer JWTs is a format-confusion finding.
