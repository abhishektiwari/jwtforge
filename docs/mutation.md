---
title: Mutation Endpoint
description: Produce reproducible JWT variants from imported or generated tokens using explicit header, claim, signature, and format operations in POST /mutation.
keywords: [JWT mutation, token tampering, signature testing, format confusion, JWT pentesting]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';
import { tokenExamples } from '@site/src/token-examples';

# Mutation Endpoint

Use `POST /mutation` and `Content-Type: application/json` to derive multiple variants from one source token. Mutation is a separate endpoint, not a token generation mode. Each `mutations[]` group starts from the original source and produces exactly one result. Its `operations[]` execute in order. Groups never inherit changes from earlier groups.

Provide exactly one of `token` (import an existing token) or `source` (generate one). The only request-root fields are `token`, `source`, and required `mutations`. `/token` retains its existing access/ID-token response; `/mutation` always returns a batch.

## Generate A Source

Supply a `source` object to generate one token using the existing generation pipeline, then apply the groups. Default source mode is `fake`; explicit claims override its generated values. Supported source-generation options are `mode`, `header`, `body`, `signature`, `kty`, `format`, `signatures`, `confusion`, `vulnerability`, `alg_none_variant`, `exclude`, `malicious_category`, and `grammar_category`. All options belong directly in `source`, while claims belong in `source.body`. Default source format is `compact`. Use `"source": {}` for default generation.

```json
{
  "source": {
    "mode": "fake",
    "body": {"sub": "user123", "roles": ["user"], "scope": "read write"}
  },
  "mutations": [
    {
      "id": "missing-signature",
      "operations": [{"type": "signature", "operation": "remove"}]
    },
    {
      "id": "alg-none",
      "operations": [
        {"type": "header", "operation": "set", "field": "alg", "value": "None"},
        {"type": "signature", "operation": "remove"}
      ]
    },
    {
      "id": "flattened",
      "operations": [{"type": "format", "operation": "convert", "format": "flattened"}]
    }
  ]
}
```

<DocsTokenExample endpoint="/mutation" request={tokenExamples.mutation.value} />

The first result retains the original header and body but empties the signature. The second changes `alg` and empties the signature. The third converts the original signed token to flattened JWS JSON without changing its signed segments.

## Import A Source

Provide `token` as a compact string, flattened JWS object, or general JWS object. Imported tokens receive no claim defaults, issuer updates, Faker values, or signing-key lookup. Their signatures are not verified. A source need not have a valid signature, but must have a supported structure with an encoded JSON object payload.

```json
{
  "token": "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.AQID",
  "mutations": [
    {
      "id": "claim-edit",
      "operations": [{"type": "body", "operation": "set", "field": "roles", "value": ["admin"]}]
    },
    {
      "id": "signature-bit",
      "operations": [{"type": "signature", "operation": "flip_bit", "byte_index": 0, "bit_index": 0}]
    }
  ]
}
```

This sample's `AQID` signature is an unverified byte fixture. Replace `token` with a token from your test application for baseline comparisons.

<DocsTokenExample endpoint="/mutation" request={tokenExamples.mutateImportedToken.value} />

Do not combine imported `token` with `source`. To generate a source using `fuzz`, `malicious`, or `grammar`, select that mode in `source.mode`; source transformations run once before group operations. Mutation itself is deterministic for a fixed source, but generated sources may vary. Both source paths reject `grant_type` and `response_type`; this endpoint returns variants rather than OAuth token pairs. It does not accept form-encoded requests, flat top-level claims, or `mode` at the request root.

## Operations

| Type | Operation | Required parameters | Behavior |
| --- | --- | --- | --- |
| `header` | `set` | `field`, `value` | Add or replace a protected header parameter |
| `header` | `remove` | `field` | Remove an existing protected header parameter |
| `body` | `set` | `field`, `value` | Add or replace a claim with any JSON value |
| `body` | `remove` | `field` | Remove an existing claim |
| `signature` | `remove` | None | Empty the signature, keeping its segment/member |
| `signature` | `replace` | `value` (string) | Use the exact encoded signature string; no automatic encoding |
| `signature` | `truncate` | `length` | Retain this many decoded signature bytes, then Base64url-encode |
| `signature` | `flip_bit` | `byte_index`, `bit_index` | Flip a bit of the decoded signature, then Base64url-encode |
| `format` | `convert` | `format` | Convert to `compact`, `flattened`, or `general` without discarding information |

`field` is a literal top-level name, not a JSON path. Replace nested objects or arrays as complete values. Type variations use `set`, for example `"field": "exp", "value": "invalid"`. Mutation header edits allow arbitrary names and values, including intentionally inconsistent `crit` values or certificate header fields that source generation rejects.

`byte_index` and `signature_index` are zero-based. `bit_index` ranges from 0 (least significant bit) to 7. Truncation length cannot exceed the current decoded byte length. Byte operations require an unpadded Base64url signature; literal replacement can deliberately produce invalid signature text. No operation implicitly changes `alg` or re-signs a token.

### Multiple Signatures

Header and signature operations require `signature_index` when the current format is `general`. For compact/flattened tokens it may be omitted or set to `0`. Body operations change the shared payload and therefore the signing input of every signature.

<DocsTokenExample endpoint="/mutation" request={{
  source: {
    format: 'general',
    body: {sub: 'user123'},
    signatures: [{}, {signature: 'AQID'}]
  },
  mutations: [{
    id: 'second-signature',
    operations: [{type: 'signature', operation: 'remove', signature_index: 1}]
  }]
}} />

Index requirements follow the format at each operation: converting compact to general requires subsequent header/signature operations in that group to specify an index. Protected header edits leave unprotected headers untouched, allowing deliberate protected/unprotected conflicts.

## Preservation And Formats

Unchanged protected-header, payload, and signature segments retain their original bytes, including JSON whitespace. A field edit reserializes only the affected JSON segment. Setting a field to its existing JSON value leaves its segment untouched.

Retaining a signature does not mean it still verifies after a header or claim change. Conversely, a format-only conversion preserves the signing input and signature. Acceptance as an OAuth bearer token still depends on the target's format policy. See [Format Confusion](./attacks/format-confusion.md).

Conversions reject loss of signatures, unprotected headers, or extension fields. General JWS with multiple signatures cannot become compact/flattened. Compact output requires a protected header and cannot represent unprotected headers or JSON envelope extensions. A conflicting extension that would be overwritten during conversion also causes an error.

Initial source support excludes JWE, detached payloads, and `b64: false` unencoded payloads. Encoded headers and payloads must use unpadded Base64url and valid UTF-8 JSON objects. Random mutation operators, automatic preset expansion, raw encoding operations, and re-signing are not part of this endpoint.

## Response And Errors

Successful mutation requests return `count` and `results`, in request-group order. They do not return `access_token`, `id_token`, or shared algorithm/key metadata. Ordinary generation requests retain their existing response.

| Result field | Meaning |
| --- | --- |
| `id` | Original group identifier |
| `format` | Result format |
| `token` | Compact string or JWS JSON object |
| `operations` | The group's operations |
| `changes` | Per-operation `type`, `operation`, `changed`, and applicable `field`/`signature_index` |
| `signatures` | Per-signature `signature_index`, `signing_input_changed`, and `signature_action` |

Signature metadata compares final output with the source. `signature_action` is `preserved` when its string is unchanged, `removed` when changed to empty, or `modified` otherwise. Removing an already empty signature is therefore `preserved` with `changed: false`. `signing_input_changed` compares final encoded header/payload segments. These values do not assert signature validity or a discovered vulnerability.

Groups require unique nonblank IDs and at least one operation. Unknown fields, operations, invalid indexes, removing nonexistent fields, and lossy conversions return HTTP `400`. Errors identify `group_id`, `group_index`, and `operation_index` when applicable. The entire batch fails without partial results; no variants are silently dropped.

| Limit | Maximum |
| --- | --- |
| JSON request (wire bytes and serialized object) | 1 MiB |
| Imported or generated source | 64 KiB |
| Groups per request | 32 |
| Operations per group | 16 |
| Signatures per token | 8 |
| Intermediate mutated token | 1 MiB |
| Entire JSON response, including metadata | 1 MiB |

Size violations return HTTP `413`. Count-limit violations return `400`. For reproducible runs, reuse the same imported source and operations; newly generated sources can differ in timestamps, IDs, Faker values, and signatures.

## CLI And CI/CD

Use the `mutation` CLI command to call `/mutation`:

```bash
jwtforge mutation '{"source":{"body":{"sub":"user123"}},"mutations":[{"id":"unsigned","operations":[{"type":"signature","operation":"remove"}]}]}'
```

For Postman or pipeline integration, iterate over `results[]` and associate assertions with each `id`. Use compact strings directly; serialize JWS JSON objects with `JSON.stringify(result.token)` for explicit JSON bearer-format tests. Establish target acceptance of the original source before comparing mutations.

JWTForge only produces variants. It does not contact the target, fetch header key URLs, or decide whether a mutation bypasses authentication. The Postman collection or pentest runner performs those checks.
