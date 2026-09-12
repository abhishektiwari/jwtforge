---
title: Token Introspection
description: Inspect compact JWTs with JWTForge's introspection endpoint, including request fields, Basic authentication, responses, and validation limits.
keywords: [JWTForge, introspection, RFC 7662, OAuth2, JWT validation]
---

# Token Introspection

Use `POST /introspect` to inspect a compact JWT and retrieve its claims after JWTForge's time and signature checks. The endpoint uses the form-encoded request and `active` response pattern from [RFC 7662](https://www.rfc-editor.org/rfc/rfc7662.html).

:::warning Not a production validator
Introspection is a test helper with deliberately permissive behavior. Basic authentication checks client-ID syntax, not a registered client secret, and some algorithm values bypass signature verification. An `active` response does not establish that a token is secure or that your target application should accept it. See [Validation Limits](#validation-limits).
:::

## Request

Send `Content-Type: application/x-www-form-urlencoded` and HTTP Basic authorization.

| Input | Required | Default | Description and example |
| --- | --- | --- | --- |
| `Authorization` header | Yes | None | HTTP Basic, for example `curl -u 'client123:client123'`. The client ID must contain 1-50 letters, digits, underscores, or hyphens. The password is not verified. |
| `token` form field | Yes | None | The compact JWT to inspect. |
| `token_type_hint` form field | No | No hint | Only `access_token` is accepted as a nonempty hint. This does not enforce whether the JWT is an access token or an ID token. |

Opaque tokens, JWE, and flattened/general JWS JSON Serialization are not supported. A compact ID token can be submitted without a hint; `token_type_hint=id_token` is rejected.

## Generate And Inspect

These examples require `curl` and `jq`. Replace the local `BASE_URL` with your deployed JWTForge origin when needed.

```bash
BASE_URL=http://localhost:8787

TOKEN=$(curl -fsS "$BASE_URL/token" \
  -H 'Content-Type: application/json' \
  -d '{"body":{"sub":"user123","scope":"read write","roles":["user"]}}' \
  | jq -er '.access_token')

curl -fsS "$BASE_URL/introspect" \
  -u 'client123:client123' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "token=$TOKEN" \
  --data-urlencode 'token_type_hint=access_token' | jq .
```

## Responses

Successful checks return HTTP `200` and the decoded payload claims alongside `active`. A representative response is shown below; timestamps, issuer, and generated identifiers vary:

```json
{
  "active": true,
  "iss": "http://localhost:8787",
  "sub": "user123",
  "aud": "https://api.example.com",
  "exp": 2000003600,
  "nbf": 2000000000,
  "iat": 2000000000,
  "jti": "test-token-id",
  "scope": "read write",
  "roles": ["user"]
}
```

Claims are not redacted. The response does not include decoded headers, signing keys, or JWKS metadata.

A malformed compact token, failed signature check, unavailable signing keys, or a failed time check normally returns HTTP `200`, not `401`:

```json
{
  "active": false
}
```

For example:

```bash
curl -fsS "$BASE_URL/introspect" \
  -u 'client123:client123' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'token=not-a-jwt' | jq .
```

## Validation Limits

| Area | Current behavior |
| --- | --- |
| Time claims | Checks truthy `exp` values for `exp < now` and truthy `nbf` values for `nbf > now`, using Unix seconds. Missing values are allowed; numeric types are not strictly validated. `iat` is not checked. |
| Signed tokens | Tries active RSA and EC public keys from JWTForge storage. Ordinary generated RS256 and ES256 tokens use these paths. Missing keys or storage failures return inactive. |
| Algorithm selection | Uses `RS`/`ES` prefixes with SHA-256 verification, not a strict algorithm allowlist. Other signed algorithm families are not supported. |
| Unsigned tokens | Exact `none`, `None`, and `NONE`, as well as missing or falsy `alg`, skip signature verification. Other case variations do not share this bypass. |
| Key lookup | Tries stored keys without selecting by `kid`. Does not retrieve a token-supplied `jku` URL or use an embedded `jwk`. |
| Authorization policy | Does not enforce issuer, audience, scope, roles, permissions, or revocation. |
| Response claim collision | Payload claims are merged after `active: true`. A token containing an `active` claim can overwrite that field. Do not treat it as an authoritative security verdict. |

Signed-token introspection requires access to the stored signing keys, normally supplied by the project's configured KV or Durable Object storage. A token produced by a separate instance or an in-memory generation fallback may not have a matching key available to introspection.

These checks are not a substitute for tests against your application. For example, ignoring an untrusted `jku` is different from proving that the application's verifier ignores it. Use the [OpenAPI Pen Test Generator](./openapi-pen-test-generator.md) or your integration tests to observe the target's actual behavior.

## Errors

Request errors use an OAuth-style JSON body with `error` and `error_description`:

| HTTP status | Error | Typical cause |
| --- | --- | --- |
| `400` | `invalid_request` | Wrong content type or missing/empty `token`. |
| `400` | `unsupported_token_type` | Nonempty `token_type_hint` other than `access_token`. |
| `401` | `invalid_client` | Missing/malformed Basic authorization or invalid client-ID syntax. Includes `WWW-Authenticate: Basic realm="JWTForge"`. |
| `405` | `invalid_request` | Unsupported HTTP method. |
| `500` | `server_error` | Unexpected processing failure. |

Use curl, Postman, or a server-side client for these examples. Introspection responses currently do not include CORS headers, so cross-origin browser requests may be blocked.

## Related Workflows

- [Token exchange](./token-endpoint/token-exchange.md): transform claims and issue a newly signed compact token, then inspect it.
- [Token mutations](./mutation.md): derive independent variants without automatically re-signing changed content.
- [Format confusion](./attacks/format-confusion.md): test serialization boundaries against the target application; introspection only handles compact JWTs.
