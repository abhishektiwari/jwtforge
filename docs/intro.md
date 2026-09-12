---
sidebar_position: 1
title: Overview
description: JWTForge overview for generating and mutating JWT tokens with OAuth2/OIDC claims, structured payloads, fuzzing modes, and format-confusion testing.
keywords: [JWTForge, JWT testing, JWT mutation, format confusion, OAuth2, OIDC, Cloudflare Workers]
---

# JWTForge

JWTForge is a JWT Vending Service for Testing, Fuzzing, and Security Research of OAuth2/OIDC Implementations.

It is a lightweight JWT token vending service for testing purposes, deployable on Cloudflare Workers. Generate JWT tokens with standard OIDC/OAuth2 and custom claims for development and testing. Use it for fuzzing, end-to-end testing, and penetration testing of OAuth2/OIDC applications and services.

Use it to generate:

- Normal signed JWTs with common OIDC/OAuth2 claims.
- Structured JWTs with explicit `header`, `body`, and `signature` objects.
- Unsigned or literal-signature tokens.
- Fuzzed, malicious, and grammar-generated payloads.
- Independent token variants through the [mutation endpoint](./mutation.md), using explicit header, claim, signature, and format operations.
- Compact, flattened, and general JWS representations for [format-confusion testing](./attacks/format-confusion.md).
- Known JWT vulnerability scenarios.

The interactive widget on the home page covers token generation and mutation workflows, with decoded output for each selected variant. The Swagger page at `/api-reference/` embeds the Worker-hosted Swagger UI and links to the raw `/openapi.json` contract.

## Request Models

The `/token` endpoint supports both request styles:

Structured JSON:

```json
{
  "header": {},
  "body": {},
  "signature": false
}
```

Legacy flat JSON:

```json
{
  "sub": "user123",
  "scope": "openid"
}
```

Structured JSON is recommended for new tests because it maps directly to JWT parts.

## Token Mutations

Use [POST /mutation](./mutation.md) to derive test variants from an existing `token` or a generated `source`. Provide exactly one source option and explicit `mutations` groups. Each group starts from the same original token, applies its operations in order, and produces one entry in `results[]`.

Mutation is a separate endpoint, not a generation mode. Imported tokens receive no default claims, and mutations do not automatically re-sign changed content. The documentation covers supported operations, signature metadata, batch limits, and CLI usage with `jwtforge mutation`.

## Format Confusion

[Format-confusion testing](./attacks/format-confusion.md) exercises how applications handle compact JWTs versus flattened or general JWS JSON Serialization. `/token` generates compact tokens by default; select `format: "flattened"` or `format: "general"` to generate JSON representations. The mutation endpoint can also convert an existing token while preserving its signed segments, rejecting conversions that would discard information.

## Exchange And Introspection

Use [token exchange](./token-endpoint/token-exchange.md) through form-encoded `POST /token` requests to copy and transform claims from a compact JWT and issue a newly signed RS256 token. Unlike mutation, exchange signs the result; it does not validate or authorize the source token.

Use [POST /introspect](./introspection.md) with form encoding and Basic authorization to inspect compact tokens and retrieve claims after JWTForge's time and signature checks. The guide explains active/inactive responses and the endpoint's permissive validation limits. Neither endpoint replaces authentication and authorization checks in your target application.
