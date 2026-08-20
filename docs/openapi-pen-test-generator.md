---
title: OpenAPI Pen Test Generator
description: Generate or directly run authentication, authorization, and known JWT vulnerability tests from an OpenAPI specification.
slug: /openapi-pen-test-generator
keywords: [OpenAPI Pen Test Generator, JWT penetration testing, API security testing, Postman, Newman]
---

# OpenAPI Pen Test Generator

JWTForge can analyze an OpenAPI JSON or YAML document, infer JWT security requirements, export Postman collections, or execute the generated test plan directly.

Only test systems you own or are explicitly authorized to assess.

## Validate security metadata

```bash
jwtforge pentest validate --spec openapi.yaml
```

JWT-compatible schemes include HTTP Bearer, OAuth2, and OpenID Connect. OAuth2 scopes are read from operation security requirements. Roles and custom claims are read only from explicit vendor extensions or a JSON configuration overlay.

Supported extensions include:

```yaml
x-required-roles: [pet-editor]
x-required-scopes: [pets:write]
x-jwt-claims:
  tenant_id: example-tenant
```

## Run without generating Postman files

```bash
jwtforge pentest run \
  --spec openapi.yaml \
  --target-url http://localhost:8000 \
  --issuer http://localhost:8787 \
  --jwtforge-url http://localhost:8787 \
  --audience http://localhost:8000 \
  --report generated/pentest-report.json
```

The runner requests fresh JWTs from JWTForge and checks missing tokens, valid authorization, insufficient privileges, and known JWT vulnerability scenarios. Signature, time, issuer, audience, and key-ID bypass scenarios require HTTP 401/403. Signed injection and stochastic fuzz probes are reported as observations and fail only on server errors because acceptance alone does not prove that an untrusted JWT header or claim reached a vulnerable sink. POST, PUT, PATCH, and DELETE operations are skipped unless `--allow-write-methods` is provided.

Review the plan without making requests:

```bash
jwtforge pentest run --spec openapi.yaml --target-url http://localhost:8000 --dry-run
```

Production execution requires both an explicit environment and acknowledgement:

```bash
jwtforge pentest run \
  --spec openapi.yaml \
  --environment prod \
  --prod-base-url https://api.example.com \
  --prod-issuer https://issuer.example.com \
  --allow-prod
```

## Generate Postman and Newman artifacts

```bash
jwtforge pentest generate \
  --spec openapi.yaml \
  --out generated \
  --test-base-url http://localhost:8000 \
  --test-issuer http://localhost:8787
```

Generated artifacts include authentication/authorization and JWT vulnerability collections, test and production environments, and an inference report.

The complete runnable example is in `examples/petstore-service`.
