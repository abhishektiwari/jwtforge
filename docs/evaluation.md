---
title: Evaluation
description: JWTForge evaluation scenarios for integration testing, fuzzing, algorithm confusion, injection discovery, grammar testing, and OAuth2 flows.
keywords: [JWTForge evaluation, JWT benchmarks, OAuth2 testing, JWT fuzzing, security research]
---

import DocsTokenExample from '@site/src/components/DocsTokenExample';

# Evaluation

This section describes representative JWTForge testing scenarios across integration, robustness, algorithm-confusion, injection, grammar, OAuth2 client credentials, and token exchange workflows.

Examples use `http://localhost:8787` as the local authorization server. To run them locally:

```bash
git clone https://github.com/abhishektiwari/jwtforge
cd jwtforge
npm install
npm run dev
```

## Performance Benchmark

JWTForge is architected for high-throughput token generation. Local performance testing on a Mac M2 Pro with 16 GB RAM demonstrated sustained throughput of 586 requests per second with 12 ms average response time and zero error rate across 74,315 requests.

These results show that JWTForge can sustain hundreds of concurrent token generation requests with sub-20 ms latency, making it suitable for integration testing, CI/CD pipelines, and moderate-scale fuzzing campaigns. The consistent throughput and zero error rate indicate stable handling of sustained local load without observed degradation during the benchmark run.

![JWTForge performance benchmark showing 586 requests per second throughput and 12 ms average response time over 74,315 requests.](/img/performance-benchmark.png)

## Scenario Mapping

| Scenario | JWTForge feature | Vulnerability or standard area |
| --- | --- | --- |
| Integration testing with compliant tokens | `fake` mode with OIDC scopes | OIDC claim parsing, scope enforcement, role-based authorization |
| Claim and header fuzzing | `fuzz` mode | RFC 8725 robustness concerns, malformed input handling |
| Algorithm confusion testing | Vulnerability presets and header overrides | RFC 8725 Section 2.1, CVE-2015-9235 class issues |
| Injection discovery | `malicious` mode | OWASP Top 10 A03 Injection, A07 Identification and Authentication Failures |
| Categorical grammar testing | `grammar` mode | RFC 7519, RFC 7518, OIDC Core value categories |
| Client credentials testing | OAuth2 `client_credentials` grant | RFC 6749 client authentication |
| Token exchange testing | RFC 8693 token exchange | Delegation, claim transformation, scope propagation |

## Integration Testing With Compliant Tokens

**Objective**: remove external identity provider dependencies from automated integration tests by generating realistic OIDC-style tokens locally.

**Scenario**: a development team building a single-page application with role-based access control needs tokens for multiple personas: standard users, administrators, and service accounts.

**Method**: use `fake` mode with explicit scopes and role claims.

```json
{
  "mode": "fake",
  "body": {
    "scope": "openid profile email",
    "sub": "test-user-1"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'fake',
    body: {
      scope: 'openid profile email',
      sub: 'test-user-1',
    },
  }}
/>

```json
{
  "mode": "fake",
  "body": {
    "scope": "openid profile email",
    "sub": "admin-user",
    "roles": ["admin"]
  }
}
```

<DocsTokenExample
  request={{
    mode: 'fake',
    body: {
      scope: 'openid profile email',
      sub: 'admin-user',
      roles: ['admin'],
    },
  }}
/>

**Outcome**: generated tokens include realistic-looking Faker-backed names and email values when scopes request them. This supports local and CI tests for claim extraction, persona-based authorization, scope checks, and expiration handling without relying on an external IdP. Faker-backed values vary across requests; tests that require exact claim values should pass those values explicitly in `body`.

## Robustness Testing Via Claim and Header Fuzzing

**Objective**: identify defects in JWT validation logic by injecting malformed, unexpected, and boundary-condition values.

**Scenario**: a security team auditing a JWT-consuming API wants to observe behavior when claims contain unexpected types, deeply nested structures, unusual Unicode, large arrays, or extreme numeric values.

**Method**: run `fuzz` mode repeatedly. Exclude fields that should remain stable for the target test.

```bash
for i in $(seq 1 100); do
  TOKEN=$(curl -s -X POST http://localhost:8787/token \
    -H "Content-Type: application/json" \
    -d '{
      "mode": "fuzz",
      "exclude": ["iss", "jti"],
      "body": {
        "sub": "user123"
      }
    }' | jq -r .access_token)

  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    https://target.example.com/protected
done
```

**Outcome**: response patterns can reveal denial-of-service behavior from malformed numeric claims, type confusion when string fields receive arrays or objects, null dereferences, and latency anomalies from expensive parsing paths. Since fuzz mode is intentionally stochastic, evaluate distributions and classes of failures rather than expecting a single exact token value.

## Algorithm Confusion Attack Testing

**Objective**: verify that a JWT-consuming server enforces an explicit algorithm allowlist and rejects manipulated `alg` values.

### Algorithm `none` Bypass

```json
{
  "vulnerability": "alg_none",
  "alg_none_variant": "nOne",
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'alg_none',
    alg_none_variant: 'nOne',
    body: {
      sub: 'user123',
    },
  }}
/>

### Symmetric Key Confusion

```json
{
  "vulnerability": "rs_hs_confusion",
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    vulnerability: 'rs_hs_confusion',
    body: {
      sub: 'user123',
    },
  }}
/>

### Automated Algorithm Variant Fuzzing

```json
{
  "mode": "fuzz",
  "header": {
    "alg": "trigger-fuzz"
  },
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'fuzz',
    header: {
      alg: 'trigger-fuzz',
    },
    body: {
      sub: 'user123',
    },
  }}
/>

Fuzz mode can generate algorithm values such as `none`, `None`, `NONE`, `nOnE`, `HS256`, `HS384`, `HS512`, `RS384`, `RS512`, `ES384`, `ES512`, `PS256`, empty string, and BLNS-derived values.

**Outcome**: a correctly implemented server rejects every algorithm not explicitly configured for that key and issuer, including case variants of `none` and symmetric algorithm substitutions. Acceptance indicates a weakness in allowlist enforcement or key/algorithm binding.

## Injection Vulnerability Discovery Via Malicious Mode

**Objective**: identify injection vulnerabilities caused by treating JWT claims as trusted input in downstream operations such as database queries, HTML rendering, filesystem access, or shell command construction.

### Claim Injection

```json
{
  "mode": "malicious",
  "malicious_category": "sql_injection",
  "body": {
    "sub": "user123",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'malicious',
    malicious_category: 'sql_injection',
    body: {
      sub: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    },
  }}
/>

### KID Header Injection

```json
{
  "mode": "malicious",
  "malicious_category": "path_traversal",
  "header": {
    "kid": "trigger"
  },
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'malicious',
    malicious_category: 'path_traversal',
    header: {
      kid: 'trigger',
    },
    body: {
      sub: 'user123',
    },
  }}
/>

**Outcome**: target server responses can show whether claims are inserted into raw SQL, HTML rendering pipelines, filesystem-based key loading, LDAP filters, or template engines. These tests map directly to OWASP Top 10 injection classes and authentication/authorization failure classes.

## Systematic Categorical Testing Via Grammar Mode

**Objective**: exercise categorized JWT claim and header value variations using grammar rules instead of purely random fuzzing.

**Scenario**: a team developing a JWT validation library needs regression coverage across valid values, edge cases, type variations, injection strings, and known vulnerable patterns.

### Vulnerable Algorithm Patterns

```json
{
  "mode": "grammar",
  "grammar_category": "vulnerable",
  "header": {
    "alg": "trigger"
  },
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'grammar',
    grammar_category: 'vulnerable',
    header: {
      alg: 'trigger',
    },
    body: {
      sub: 'user123',
    },
  }}
/>

### Type Variations For `sub`

```json
{
  "mode": "grammar",
  "grammar_category": "type_variations",
  "body": {
    "sub": "trigger"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'grammar',
    grammar_category: 'type_variations',
    body: {
      sub: 'trigger',
    },
  }}
/>

### Edge Cases For `exp`

```json
{
  "mode": "grammar",
  "grammar_category": "edge_cases",
  "body": {
    "sub": "user123",
    "exp": "trigger"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'grammar',
    grammar_category: 'edge_cases',
    body: {
      sub: 'user123',
      exp: 'trigger',
    },
  }}
/>

### Injection Patterns In `kid`

```json
{
  "mode": "grammar",
  "grammar_category": "injection",
  "header": {
    "kid": "trigger"
  },
  "body": {
    "sub": "user123"
  }
}
```

<DocsTokenExample
  request={{
    mode: 'grammar',
    grammar_category: 'injection',
    header: {
      kid: 'trigger',
    },
    body: {
      sub: 'user123',
    },
  }}
/>

**Outcome**: grammar mode supports repeatable category-level testing. A given `(field, grammar_category)` maps to the same category set, though individual values may be selected from that set. This complements fuzz mode: grammar mode verifies known specification categories, while fuzz mode explores broader unexpected inputs.

## OAuth2 Client Credentials Testing

**Objective**: validate OAuth2 client credentials grant handling and client authentication.

**Method**: request tokens with form-encoded `client_credentials` and HTTP Basic authentication. The Basic auth username and password must both be the client ID.

```bash
curl -X POST http://localhost:8787/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic Y2xpZW50MTIzOmNsaWVudDEyMw==" \
  -d "grant_type=client_credentials&scope=openid%20profile"
```

Validate the issued token through introspection:

```bash
TOKEN=$(curl -s -X POST http://localhost:8787/token \
  -H "Authorization: Basic Y2xpZW50MTIzOmNsaWVudDEyMw==" \
  -d "grant_type=client_credentials" | jq -r .access_token)

curl -X POST http://localhost:8787/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic Y2xpZW50MTIzOmNsaWVudDEyMw==" \
  -d "token=$TOKEN"
```

**Outcome**: this verifies that authenticated clients can obtain tokens, requested scopes are honored, and introspection can validate and expose claims from issued client credentials tokens.

## Token Exchange And Claim Transformation

**Objective**: test RFC 8693 token exchange flows and claim transformation logic in delegated authorization scenarios.

**Method**: generate an initial JWT, exchange it with claim additions, then introspect the exchanged token.

```bash
INITIAL_TOKEN=$(curl -s -X POST http://localhost:8787/token \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "sub": "user123",
      "scope": "read write"
    }
  }' | jq -r .access_token)

EXCHANGED=$(curl -s -X POST http://localhost:8787/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange&subject_token=$INITIAL_TOKEN&subject_token_type=urn:ietf:params:oauth:token-type:jwt&add_claims=resource:shared-resource" | jq -r .access_token)

curl -X POST http://localhost:8787/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic Y2xpZW50MTIzOmNsaWVudDEyMw==" \
  -d "token=$EXCHANGED"
```

**Outcome**: token exchange testing verifies that original claims such as `sub` and `scope` are preserved, requested claim additions are applied, and the exchanged token remains signed and introspectable.
