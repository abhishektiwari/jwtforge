---
sidebar_position: 1
title: Overview
description: JWTForge overview for generating JWT tokens with OAuth2/OIDC claims, structured payloads, fuzzing modes, and security testing scenarios.
keywords: [JWTForge, JWT testing, OAuth2, OIDC, Cloudflare Workers]
---

# JWTForge

JWTForge is a JWT Vending Service for Testing, Fuzzing, and Security Research of OAuth2/OIDC Implementations.

It is a lightweight JWT token vending service for testing purposes, deployable on Cloudflare Workers. Generate JWT tokens with standard OIDC/OAuth2 and custom claims for development and testing. Use it for fuzzing, end-to-end testing, and penetration testing of OAuth2/OIDC applications and services.

Use it to generate:

- Normal signed JWTs with common OIDC/OAuth2 claims.
- Structured JWTs with explicit `header`, `body`, and `signature` objects.
- Unsigned or literal-signature tokens.
- Fuzzed, malicious, and grammar-generated payloads.
- Known JWT vulnerability scenarios.

The interactive widget on the home page covers the common token-generation workflows. The Swagger page at `/api-reference` embeds the Worker-hosted Swagger UI and links to the raw `/openapi.json` contract.

## Request Models

JWTForge supports both request styles:

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
