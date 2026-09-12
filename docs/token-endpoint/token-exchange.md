---
title: Token Exchange
description: Exchange compact JWTs through JWTForge's token endpoint, transform claims, and inspect the result for OAuth2 integration tests.
keywords: [JWTForge, token exchange, RFC 8693, OAuth2, claim transformation]
---

# Token Exchange

Use `POST /token` with the token-exchange grant to copy claims from an existing compact JWT, apply claim transformations, and issue a new compact RS256 token signed by JWTForge.

This is a testing implementation of the [RFC 8693 token-exchange request](https://www.rfc-editor.org/rfc/rfc8693.html), with JWTForge-specific `add_claims` and `remove_claims` parameters. It is separate from the JSON token-generation request model.

:::warning Testing endpoint
JWTForge decodes the subject token without verifying its signature, expiry, issuer, or audience. This grant does not require client authentication or enforce delegation, scope restrictions, or protected-claim policies. Do not use it as a production security token service.
:::

## Request

Send `Content-Type: application/x-www-form-urlencoded`. JSON requests do not select the token-exchange flow. The examples use the local API; replace `BASE_URL` with your deployed JWTForge origin when needed.

| Parameter | Required | Default | Description and example |
| --- | --- | --- | --- |
| `grant_type` | Yes | None | Must be `urn:ietf:params:oauth:grant-type:token-exchange`. |
| `subject_token` | Yes | None | A compact JWT with three dot-separated segments. Its payload supplies the initial claims. |
| `subject_token_type` | Yes | None | One of the token-type URNs listed below. |
| `requested_token_type` | No | `urn:ietf:params:oauth:token-type:access_token` | Echoed as `issued_token_type`. The value is not validated and does not change the output format or response property. |
| `resource` | No | Original `aud` | Replaces the audience claim, for example `https://api.example.com`. |
| `audience` | No | Original `aud` | Replaces `aud`; takes precedence over `resource` when both are supplied. |
| `add_claims` | No | No additions | Comma-separated `key:value` pairs, such as `tenant:acme,scope:read`. Adds or overwrites claims with string values. |
| `remove_claims` | No | No removals | Comma-separated claim names, such as `email,name`. |

Supported `subject_token_type` values:

- `urn:ietf:params:oauth:token-type:jwt`
- `urn:ietf:params:oauth:token-type:id_token`
- `urn:ietf:params:oauth:token-type:access_token`

These values label the input; all three require a compact JWT. Opaque access tokens, JWE, and flattened or general JWS JSON objects are not supported by this endpoint.

## Generate And Exchange

These shell examples require `curl` and `jq`. First generate a source token:

```bash
BASE_URL=http://localhost:8787

TOKEN=$(curl -fsS "$BASE_URL/token" \
  -H 'Content-Type: application/json' \
  -d '{"body":{"sub":"user123","scope":"read write","tenant":"original"}}' \
  | jq -er '.access_token')
```

Exchange it, changing the audience and replacing the tenant and scope claims:

```bash
EXCHANGE_RESPONSE=$(curl -fsS "$BASE_URL/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=urn:ietf:params:oauth:grant-type:token-exchange' \
  --data-urlencode "subject_token=$TOKEN" \
  --data-urlencode 'subject_token_type=urn:ietf:params:oauth:token-type:jwt' \
  --data-urlencode 'audience=https://api.example.com/reports' \
  --data-urlencode 'remove_claims=tenant' \
  --data-urlencode 'add_claims=tenant:acme,scope:read')

printf '%s\n' "$EXCHANGE_RESPONSE" | jq .
EXCHANGED_TOKEN=$(printf '%s\n' "$EXCHANGE_RESPONSE" | jq -er '.access_token')
```

The narrower scope above is explicitly requested by the caller; JWTForge does not check whether the change is authorized.

## Response

A successful exchange returns HTTP `200` with this shape (token abbreviated):

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
  "subject_token_type": "urn:ietf:params:oauth:token-type:jwt"
}
```

| Field | Meaning |
| --- | --- |
| `access_token` | Newly signed compact RS256 token. Returned under this name even when another `requested_token_type` is supplied. |
| `token_type` | Always `Bearer`. |
| `expires_in` | Always `3600`; it is not calculated from the exchanged token's `exp`. |
| `issued_token_type` | Requested output type label, or the default access-token URN. |
| `subject_token_type` | Input token type label supplied in the request. |

## Claim And Signing Behavior

Transformations run in this order:

1. Copy the decoded subject claims.
2. Remove the names in `remove_claims`.
3. Add or overwrite the pairs in `add_claims`.
4. Apply `resource` to `aud`, then apply `audience` if provided.
5. Fill missing standard claims during token generation and sign with JWTForge's current RSA key.

`add_claims` splits each pair at the first colon, so URLs can contain colons. Commas separate pairs and cannot be escaped. Values are strings, not parsed JSON: `roles:["admin"]` creates a string, not an array. Use [JSON token generation](./structured-json.md) for typed claim values.

Existing timestamps are retained; exchange does not automatically refresh `exp` or `iat`. Removing a defaulted standard claim such as `exp` causes generation to populate it again. A missing or falsy `iss` is set from the configured issuer; an existing issuer can remain even though JWTForge signs the new token. The original header and signature are not preserved.

The exchange branch does not apply generation modes, vulnerability presets, or `header`, `signature`, and `format` controls. A standalone `scope` form field is not applied; transform it through `add_claims` or `remove_claims`. Actor-token delegation is not implemented.

For independent variants, signature edits, or serialization changes, use the [mutation endpoint](../mutation.md). For new flattened/general JWS tokens, see [format confusion](../attacks/format-confusion.md).

## Inspect The Result

Using the variables from the exchange example:

```bash
curl -fsS "$BASE_URL/introspect" \
  -u 'client123:client123' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "token=$EXCHANGED_TOKEN" \
  --data-urlencode 'token_type_hint=access_token' | jq .
```

See [Token Introspection](../introspection.md) for the checks performed and their limits. In integration tests, also submit the token to your target application's protected endpoint and assert its authorization decision; JWTForge does not make that decision for the target.

## Errors

| HTTP status | Error | Typical cause |
| --- | --- | --- |
| `400` | `invalid_request` | Missing subject token/type, invalid compact-token structure, or an undecodable payload. |
| `400` | `unsupported_token_type` | Unsupported `subject_token_type`. |
| `400` | `unsupported_grant_type` | Attempting this grant through a JSON request instead of form encoding. |
| `405` | `Method not allowed. Use POST.` | Calling `/token` with an unsupported method. |
| `500` | `server_error` | Unexpected exchange or signing failure. |
