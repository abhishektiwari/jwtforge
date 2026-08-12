# JWTForge 

A lightweight JWT token vending service for testing purposes, deployed on Cloudflare Workers. Generate JWT tokens with standard OIDC/OAuth2 and custom claims for your development and testing needs. Use it for fuzzing, end-to-end, penetration testing of OIDC/OAuth2 application and services. Dig deeper by testing for unexpected values and claims to identify unexpected applications and service behaviours.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge)

Works on Cloudflare Workers Free Plan using Workers KV storage.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)
![Workers KV](https://img.shields.io/badge/Storage-Workers%20KV%20(Default)-blue.svg)
![Durable Objects](https://img.shields.io/badge/Storage-Durable%20Objects%20(Optional)-green.svg)
![Faker.js](https://img.shields.io/badge/Test%20Data-Faker.js-yellow.svg)
![BLNS](https://img.shields.io/badge/Fuzzing-BLNS-red.svg)
![Grammar](https://img.shields.io/badge/Testing-Grammar%20Mode-9cf.svg)
 [![Citation Badge](https://api.juleskreuer.eu/citation-badge.php?doi=10.59350/6pdmd-3cm41)](https://juleskreuer.eu//projects/citation-badge)

**Quick Start with CLI** locally or as part of CI/CD pipeline

```bash
# Install globally
npm install -g abhishektiwari/jwtforge
# or locally in your project
npm install abhishektiwari/jwtforge
# Generate with default claims
jwtforge token
```

## Supports

- Testing Modes: Four modes for different testing scenarios - applied to both header and payload.
  - `fake` (default): Realistic test data using faker.js with OIDC scopes
  - `fuzz`: Randomized fuzzing using `BLNS` (Big List of Naughty Strings) + edge cases
  - `malicious`: Injection payloads (SQL, XSS, command injection, path traversal, etc.)
  - `grammar`: Systematic JWT testing using grammar-based rules (RFC 7519, OIDC, OAuth2 compliant)
- OAuth2/OIDC Response Types: Standard `response_type` parameter (`token`, `id_token`, `id_token token`)
- OAuth2 Client Credentials Grant: Machine-to-machine token generation with spec-compliant `client_credentials` grant type
- OIDC Scope Support: Automatic claim population based on scopes (openid, profile, email, address, phone)
- Realistic Test Data: Uses `faker.js` for generating authentic-looking user data
- Fuzzing Library: Uses `BLNS` (Big List of Naughty Strings) for  security testing
- Multiple Key Types: Support for `RSA` (`RS256`) and `EC` (`ES256`) algorithms
- Automatic Key Rotation: Keys rotate every 24-hours with 6-hour grace period (production)
- JWT Token Generation: Create signed JWT tokens with configurable key types
- OIDC/OAuth2 Claims Support: Standard claims (`iss`, `sub`, `aud`, `exp`, `iat`, etc.)
- Custom Claims: Add any non-standard claims to your tokens
- JWKS Endpoint: Public key discovery at `/.well-known/jwks.json` with all active keys
- OIDC Discovery: OpenID Connect discovery endpoint at `/.well-known/openid-configuration`
- Token Introspection: RFC 7662 compliant token validation and introspection endpoint at `/introspect`
- Token Exchange: RFC 8693 compliant token exchange for converting between token types (JWT, ID Token, Access Token)
- Flexible Storage: Workers KV (free, default) or Durable Objects (paid, strong consistency)
- Lightweight: Uses Web Crypto API built into Cloudflare Workers
- CORS Enabled: Works with frontend applications

## Key Types and Algorithms

JWTForge supports multiple cryptographic key types for signing tokens:

| Key Type | Algorithm | Description |
|----------|-----------|-------------|
| `RSA` | RS256 | RSA-2048 keys with SHA-256 (default) |
| `EC` | ES256 | Elliptic Curve P-256 keys with SHA-256 |

To specify a key type, include the `kty` parameter in your token request:

```json
{
  "kty": "EC",
  "sub": "user123"
}
```

If `kty` is not specified, `RSA` (`RS256`) is used by default.

## Response Types (OAuth2/OIDC Standard)

JWTForge uses the standard OAuth2/OIDC `response_type` parameter to specify which tokens to generate:

| Response Type | Description | Returns | Use Case |
|---------------|-------------|---------|----------|
| `token` | Access token (default) | `access_token` | API authorization, resource access |
| `id_token` | ID token only | `id_token` | User authentication, identity verification |
| `id_token token` | Both tokens | `access_token` + `id_token` | Complete OIDC flow, hybrid authentication |
| `token id_token` | Both tokens (alternative order) | `access_token` + `id_token` | Complete OIDC flow |

### Response Type Examples

Access Token (`response_type=token`):
```json
{
  "response_type": "token",
  "sub": "user123",
  "scope": "read write",
  "aud": "https://api.example.com",
  "jti": "550e8400-e29b-41d4-a716-446655440000"
}
```

ID Token (`response_type=id_token`):
```json
{
  "response_type": "id_token",
  "sub": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true,
  "nonce": "random-nonce-12345",
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

Both Tokens (`response_type=id_token token`):
```json
{
  "response_type": "id_token token",
  "sub": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "nonce": "random-nonce-67890",
  "jti": "9f8e7d6c-5b4a-3210-fedc-ba9876543210"
}
```

Response when requesting both tokens:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Interactive API Documentation

Visit the root URL of your deployed service to access the Swagger UI interface:
- Local: `http://localhost:8787`
- Production: `https://your-worker.workers.dev`

## Endpoints

### POST `/token`
Generate a JWT token using JWTForge's custom implementation. Accepts either the structured JSON model (`header`, `body`, `signature`) or the legacy flat JSON model with claim fields at the top level. For spec-compliant OAuth2 token generation, see the [OAuth2 Client Credentials Grant](#oauth2-client-credentials-grant) section.

Structured request:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "header": {
      "alg": "RS256",
      "typ": "JWT",
      "cty": "application/json",
      "kid": "rsa-key-1",
      "jku": "https://example.com/.well-known/jwks.json"
    },
    "body": {
      "sub": "user123",
      "name": "John Doe",
      "roles": ["admin", "user"]
    }
  }'
```

Supported structured `header` fields are `alg`, `typ`, `cty`, `kid`, `jku`, and `jwk`. Certificate-chain header fields `x5u`, `x5c`, and `x5t` are intentionally rejected. Omit `signature` to sign normally, set `"signature": false` for an unsigned trailing-dot JWT, or pass a string to use that literal signature segment.

Request:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "roles": ["admin", "user"],
    "custom_claim": "custom_value"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRlZmF1bHQta2V5LTEifQ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### POST `/introspect`
Validate a token and retrieve its claims (RFC 7662 compliant). Requires Basic authentication. See the [Token Introspection Endpoint](#token-introspection-endpoint) section for detailed documentation.

Request:
```bash
curl -X POST https://your-worker.workers.dev/introspect \
  -H "Authorization: Basic base64(client_id:client_id)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=eyJhbGciOiJSUzI1NiIs..."
```

Response (Active Token):
```json
{
  "active": true,
  "sub": "user123",
  "exp": 1735689600,
  "iat": 1735686000
}
```

### GET `/.well-known/jwks.json`
Retrieve the JSON Web Key Set for token verification.

Request:
```bash
curl https://your-worker.workers.dev/.well-known/jwks.json
```

Response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "key_ops": [
        "verify"
      ],
      "alg": "RS256",
      "ext": true,
      "n": "...",
      "e": "AQAB",
      "use": "sig",
      "kid": "rsa-key-1"
    }
  ]
}
```

### GET `/.well-known/openid-configuration`
Retrieve the OpenID Connect discovery document.

Request:
```bash
curl https://your-worker.workers.dev/.well-known/openid-configuration
```

### POST `/token` with Token Exchange (RFC 8693)
Exchange one token format for another (JWT, ID Token, or Access Token). Supports claim transformation.

**Parameters:**
- `grant_type` (required): `urn:ietf:params:oauth:grant-type:token-exchange`
- `subject_token` (required): The token being exchanged
- `subject_token_type` (required): Type of token - `urn:ietf:params:oauth:token-type:jwt`, `urn:ietf:params:oauth:token-type:id_token`, or `urn:ietf:params:oauth:token-type:access_token`
- `resource` (optional): Target resource for the new token (updates `aud` claim)
- `audience` (optional): Target audience (overrides resource, updates `aud` claim)
- `requested_token_type` (optional): Type of token to return (defaults to `access_token`)
- `add_claims` (optional): Claims to add, format: `key1:value1,key2:value2`
- `remove_claims` (optional): Claims to remove, format: `claim1,claim2,claim3`

**Request:**
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=eyJhbGciOiJSUzI1NiIs..." \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:jwt" \
  -d "resource=https://api.example.com" \
  -d "add_claims=scope:read+write,dept:engineering" \
  -d "remove_claims=nbf,exp"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
  "subject_token_type": "urn:ietf:params:oauth:token-type:jwt"
}
```

## OIDC/OAuth2 Claims

The service supports all standard OIDC and OAuth2 claims, as well as any custom claims. Pass any claim as a JSON key-value pair in your request body (using the Direct JSON Payload approach) and it will be included in the generated token. Currently JWTForge does not verify or validate standard claims. This is intentional since it's a testing/development tool designed to generate tokens with any claims you need for testing purposes, even malformed ones.

| Claim | Description | Default | Example |
|-------|-------------|---------|---------|
| `iss` | Issuer | Your worker URL | `"https://jwtforge.workers.dev"` |
| `sub` | Subject (user identifier) | `"user123"` | `"user123"`, `"auth0\|507f1f77bcf86cd799439011"` |
| `aud` | Audience | `"https://api.example.com"` | `"https://api.example.com"`, `"my-resource-id"` |
| `exp` | Expiration time | Current time + 1 hour | `1735689600` |
| `nbf` | Not before | Current time | `1735686000` |
| `iat` | Issued at | Current time | `1735686000` |
| `jti` | JWT ID | Random UUID | `"550e8400-e29b-41d4-a716-446655440000"` |
| `client_id` | OAuth2 client identifier | Auto-generated or user-provided, Accepts alphanumeric, underscores, and/or hyphens, up to 50 characters | `"test_app"`, `"client_a1b2c3d4"` |
| `name` | Full name | - | `"John Doe"` |
| `given_name` | First name | - | `"John"` |
| `family_name` | Last name | - | `"Doe"` |
| `middle_name` | Middle name | - | `"Michael"` |
| `nickname` | Nickname | - | `"Johnny"` |
| `preferred_username` | Preferred username | - | `"johndoe"` |
| `profile` | Profile page URL | - | `"https://example.com/users/johndoe"` |
| `picture` | Profile picture URL | - | `"https://example.com/avatar.jpg"` |
| `website` | Website URL | - | `"https://johndoe.com"` |
| `email` | Email address | - | `"john@example.com"` |
| `email_verified` | Email verification status | - | `true`, `false` |
| `gender` | Gender | - | `"male"`, `"female"`, `"other"` |
| `birthdate` | Birthdate | - | `"1990-01-15"` |
| `zoneinfo` | Time zone | - | `"America/New_York"` |
| `locale` | Locale | - | `"en-US"`, `"fr-CA"` |
| `phone_number` | Phone number | - | `"+1-555-555-5555"` |
| `phone_number_verified` | Phone verification status | - | `true`, `false` |
| `address` | Address | - | `{"street_address": "123 Main St", "locality": "City", "region": "State", "postal_code": "12345", "country": "US"}` |
| `updated_at` | Last update timestamp | - | `1735686000` |
| `scope` | OAuth2 scopes | - | `"openid profile email"`, `"read write"` |
| `roles` | User roles | - | `["admin", "user"]`, `["developer"]` |
| `groups` | User groups | - | `["engineering", "management"]` |
| `nonce` | Nonce value for ID tokens | - | `"random-nonce-12345"` |

You can override any default claim or add custom claims by including them in your POST request.

## OIDC Scopes and Automatic Claim Population

JWTForge automatically populates claims based on the `scope` parameter in your request, following the OIDC specification. This feature uses faker.js to generate realistic test data.

| Scope | Claims Included | Example Data |
|-------|----------------|--------------|
| `openid` | `sub`, `iss`, `aud`, `exp`, `iat`, `nbf`, `jti` | Base claims (always included) |
| `profile` | `name`, `given_name`, `family_name`, `middle_name`, `nickname`, `preferred_username`, `profile`, `picture`, `website`, `gender`, `birthdate`, `zoneinfo`, `locale`, `updated_at` | `Jane Smith`, `jane.smith`, `https://example.com/avatar.jpg` |
| `email` | `email`, `email_verified` | `jane.smith@example.com`, `true` |
| `address` | `address` (object with street_address, locality, region, postal_code, country) | `{"street_address": "123 Main St", "locality": "Anytown", "region": "CA", "postal_code": "12345", "country": "US"}` |
| `phone` | `phone_number`, `phone_number_verified` | `+1-555-555-5555`, `true` |

## Usage Examples

### Minimal Token
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Token with Standard Claims
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user@example.com",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "email_verified": true,
    "scope": "openid profile email"
  }'
```

### Token with Custom Expiration
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user123",
    "exp": '$(date -u -d "+2 hours" +%s)'
  }'
```

### ID Token for User Authentication
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "response_type": "id_token",
    "sub": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "email_verified": true,
    "nonce": "random-nonce-12345"
  }'
```

### Both Access and ID Tokens (Complete OIDC Flow)
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "response_type": "id_token token",
    "sub": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "scope": "openid profile email",
    "nonce": "random-nonce-67890"
  }'
```

### Token with EC Key (ES256)
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "kty": "EC",
    "sub": "user@example.com",
    "name": "Jane Doe"
  }'
```

### Token with Custom Claims
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user123",
    "tenant_id": "tenant-456",
    "permissions": ["read", "write", "delete"],
    "metadata": {
      "department": "Engineering",
      "level": "senior"
    }
  }'
```

### Token Exchange - Basic (RFC 8693)
Exchange a JWT for an access token:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=eyJhbGciOiJSUzI1NiIs..." \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:jwt"
```

### Token Exchange - With Claim Transformation
Exchange ID token and add/remove claims:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=eyJhbGciOiJSUzI1NiIs..." \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:id_token" \
  -d "resource=https://api.example.com" \
  -d "add_claims=scope:read+write,dept:engineering" \
  -d "remove_claims=email_verified,nbf"
```

**Use Cases:**
- Convert ID tokens to access tokens for API access
- Change token audience/resource during token flow
- Add/remove claims to customize token for downstream services
- Test multi-hop token exchange scenarios

### Grammar Mode - Systematic Security Testing
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "grammar",
    "sub": "user123",
    "scope": "openid profile email"
  }'
```

### Grammar Mode with Exclusions
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "grammar",
    "sub": "user123",
    "exclude": ["exp", "iat", "nbf"]
  }'
```

### Compare All Modes
```bash
# Mode: fake - Realistic data
curl -X POST https://your-worker.workers.dev/token \
  -d '{"mode": "fake", "sub": "user", "scope": "openid profile"}'

# Mode: fuzz - 1-3 random claims with BLNS
curl -X POST https://your-worker.workers.dev/token \
  -d '{"mode": "fuzz", "sub": "user", "email": "test@example.com"}'

# Mode: malicious - 1-3 random claims with injection payloads
curl -X POST https://your-worker.workers.dev/token \
  -d '{"mode": "malicious", "sub": "user", "email": "test@example.com"}'

# Mode: grammar - All claims with grammar-based values (comprehensive)
curl -X POST https://your-worker.workers.dev/token \
  -d '{"mode": "grammar", "sub": "user", "email": "test@example.com"}'
```

## Security Testing Modes

JWTForge supports four modes for different testing scenarios via the `mode` parameter:

| Mode | Purpose | Coverage | Use Case |
|------|---------|----------|----------|
| `fake` | Realistic test data | OIDC scopes, faker.js | Integration testing, demos |
| `fuzz` | Random fuzzing with edge cases | 1-3 claims mutated | Robustness testing, edge case discovery |
| `malicious` | Security payload injection | 1-3 claims with attacks | Penetration testing, security validation |
| `grammar` | Systematic JWT specification testing | All claims with grammar rules | Comprehensive security testing, spec compliance |

### Mode: `fake` (Default)
Generates realistic test data using faker.js when OIDC scopes are specified.

```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "fake",
    "scope": "openid profile email",
    "sub": "user123"
  }'
```

Result: Claims like `name`, `email`, `given_name`, etc. are auto-populated with realistic faker.js data.

### Mode: `fuzz`
Randomly injects 1-3 fuzzed values from `BLNS` and additional edge cases.

```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "fuzz",
    "sub": "user123",
    "name": "Test User",
    "email": "test@example.com",
    "roles": ["user"]
  }'
```

Fuzz Patterns Include:
- BLNS library (500+ strings): Unicode edge cases, emoji sequences, RTL text, ANSI escape codes, etc.
- Non-string edge cases: `null`, `undefined`, `Infinity`, `NaN`, large arrays, nested objects
- Numeric boundaries: `Number.MAX_SAFE_INTEGER`, `Number.MIN_SAFE_INTEGER`

Example Output (random selection):
```json
{
  "sub": "Penistone Community Church",  // Real place name that causes issues
  "name": "But now...\u001b[20Cfor my greatest trick...\u001b[8m",  // ANSI escapes
  "email": "test@example.com",
  "roles": ["user"]
}
```

### Mode: `malicious`
Randomly injects 1-3 malicious payloads for security testing. Designed to validate input sanitization and injection defense mechanisms.

```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "malicious",
    "sub": "user123",
    "name": "Test User",
    "email": "test@example.com",
    "roles": ["user"]
  }'
```

**Malicious Payloads Included:**

**SQL Injection (Database Attacks)**
- `' OR '1'='1` - Classic boolean-based injection
- `'; DROP TABLE users; --` - Destructive query
- `admin' --` - Comment-based bypass
- `' UNION SELECT NULL--` - Data extraction
- `1' AND '1'='1` - Conditional bypass

**Cross-Site Scripting (XSS)**
- `<script>alert('xss')</script>` - Script tag injection
- `<img src=x onerror=alert('xss')>` - Event handler injection
- `javascript:alert('xss')` - Protocol-based XSS
- `<svg onload=alert('xss')>` - SVG-based injection
- `'\"><script>alert(String.fromCharCode(88,83,83))</script>` - Encoded payload

**Path Traversal (Directory Access)**
- `../../../etc/passwd` - Unix credential file
- `..\\..\\..\\windows\\system32\\config\\sam` - Windows SAM database
- `....//....//....//etc/passwd` - Obfuscated traversal

**Command Injection (OS Command Execution)**
- `; ls -la` - Command separator injection
- `| cat /etc/passwd` - Pipe injection
- `` `whoami` `` - Backtick command substitution
- `$(whoami)` - Dollar-sign command substitution

**LDAP Injection (Directory Service Attacks)**
- `*)(uid=*))(|(uid=*` - Filter manipulation
- `admin)(|(password=*)` - OR-based bypass

**NoSQL Injection (Document Database Attacks)**
- `{'$gt':''}` - MongoDB greater-than operator
- `{'$ne':null}` - MongoDB not-equal operator

**XML/XXE Injection (XML External Entity)**
- `<?xml version='1.0'?><!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>` - External entity

**Template Injection (Template Engine Attacks)**
- `{{7*7}}` - Jinja2/Handlebars expression
- `${7*7}` - Freemarker expression
- `{{config.items()}}` - Server-side template execution

**Header Injection (HTTP Manipulation)**
- `test\r\nInjected-Header: malicious` - CRLF injection for header splitting

**Buffer Overflow**
- `A` repeated 1,000,000 times - Large payload test

Example Output (random selection):
```json
{
  "sub": "user123",
  "name": "Test User",
  "email": "' OR '1'='1",  // SQL injection in email
  "roles": "*)(uid=*))(|(uid=*"  // LDAP injection in roles
}
```

**Security Testing Use Cases:**
- Validate input sanitization and escaping
- Test against injection attacks (SQL, NoSQL, LDAP, etc.)
- Verify XSS protection mechanisms
- Test path traversal defenses
- Validate command execution protections
- Test template engine security
- Verify header parsing robustness

**Available Malicious Categories**

Use the `malicious_category` parameter to focus on specific attack vectors:

| Category | Payloads | Use Case | Example |
|----------|----------|----------|---------|
| `sql_injection` | 5 SQL attack patterns | Test SQL injection defenses | `' OR '1'='1` |
| `xss` | 5 XSS payloads | Test XSS protection | `<script>alert('xss')</script>` |
| `path_traversal` | 3 directory traversal patterns | Test path access controls | `../../../etc/passwd` |
| `command_injection` | 4 command execution patterns | Test command injection defenses | `; ls -la` |
| `ldap_injection` | 2 LDAP filter attacks | Test LDAP security | `*)(uid=*))(|(uid=*` |
| `nosql_injection` | 2 NoSQL attacks | Test NoSQL injection defenses | `{'$ne':null}` |
| `xml_injection` | 1 XXE pattern | Test XML entity handling | XXE external entity attack |
| `template_injection` | 3 template engine attacks | Test template engine security | `{{7*7}}` |
| `header_injection` | 1 CRLF injection | Test header parsing | CRLF-based header splitting |
| `buffer_overflow` | 1 large payload | Test payload size limits | 1 million 'A' characters |
| *(omitted)* | All categories mixed | Random injection testing | Random from all categories |

**Malicious Category Examples:**
```bash
# Test SQL injection specifically
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "malicious",
    "malicious_category": "sql_injection",
    "email": "test@example.com"
  }'

# Test XSS vulnerabilities
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "malicious",
    "malicious_category": "xss",
    "name": "Test User"
  }'

# Test command injection
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "malicious",
    "malicious_category": "command_injection",
    "custom_field": "test"
  }'
```

### Exclusion List

Use the `exclude` parameter to protect specific claims from fuzz/malicious transformations:

```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "fuzz",
    "sub": "user123",
    "name": "Test User",
    "email": "test@example.com",
    "exp": 9999999999,
    "roles": ["user"],
    "exclude": ["exp", "nbf", "iat"]
  }'
```

Creates an infinitely valid token where `exp`, `nbf`, and `iat` remain unchanged, while other claims (like `name`, `email`, `roles`, `sub`) may be fuzzed.

Common Use Cases:
- `exclude: ["exp", "nbf", "iat"]` - Create tokens that remain valid indefinitely for long-running tests
- `exclude: ["sub", "aud"]` - Protect subject and audience while fuzzing other claims
- `exclude: ["roles", "permissions"]` - Test authorization logic without fuzzing permissions

### Mode: `grammar`
Systematic JWT testing using grammar rules based on RFC 7519 (JWT), RFC 7518 (JWA), and OpenID Connect specifications. Tests all claims with values from defined grammar categories.

```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "grammar",
    "sub": "user123",
    "scope": "openid profile email"
  }'
```

**What Grammar Mode Does:**
- For EACH claim, selects values from grammar rules (not random 1-3 claims)
- Provides systematic coverage of JWT specification space
- Tests valid values, edge cases, type variations, and injection patterns
- Ensures comprehensive security and spec compliance testing

Grammar rules can contain either direct literal values or semantic templates. Templates describe intent such as "timestamp one hour from now", "attacker-controlled JWKS URL", "embedded RSA JWK", or "realistic email address"; JWTForge resolves them to concrete JWT values at generation time. Runtime grammar mode uses Faker for `faker` templates, which keeps realistic values fresh without hard-coding every emitted value.

**Grammar Categories for Each Claim:**
1. **Valid**: RFC-compliant values
   - `alg`: `HS256`, `RS256`, `ES256`, `PS256`, etc.
   - `sub`: User identifiers, email addresses, UUIDs
   - `aud`: Single string or array of audience values
   
2. **Edge Cases**: Boundary conditions and unusual values
   - `exp`: Past dates, zero, negative numbers, null
   - `nbf`: Future dates, null values
   - Time-based claims with out-of-range values
   
3. **Type Variations**: Wrong data types for claims
   - String claims as arrays: `["value"]`
   - Arrays as strings: `"value1,value2"`
   - Numbers as strings: `"123"` instead of `123`
   - Booleans with different types: `"true"`, `1`, `0`
   
4. **Injection Patterns**: Security-relevant patterns
   - SQL injection in string claims
   - XSS payloads in URLs and names
   - Path traversal in file-related claims
   - Command injection in command-like fields

**Example Output (Grammar Mode):**
```json
{
  "sub": "user123",                              // From grammar.standardClaims.sub.valid
  "scope": "openid profile",                     // From grammar.authClaims.scope.valid
  "email": null,                                 // From grammar.oidcClaims.email.edge_cases
  "email_verified": "true",                      // From grammar.oidcClaims.email_verified.edge_cases (type variation)
  "name": ["John Doe"],                          // From grammar.oidcClaims.name.edge_cases (array instead of string)
  "phone_number": "../../../etc/passwd",         // From grammar.authClaims.phone_number.edge_cases
  "exp": -1,                                     // From grammar.standardClaims.exp.edge_cases (negative expiration)
  "aud": ["api1", "api2"],                       // From grammar.standardClaims.aud.array
  "alg": "none"                                  // From grammar.headerGrammar.alg.vulnerable
}
```

**Advantages Over Random Fuzzing:**
| Aspect | Fuzz | Malicious | Grammar |
|--------|------|-----------|---------|
| Claims tested | 1-3 random | 1-3 random | All claims |
| Test coverage | Spotty | Spotty | Systematic |
| Type variations | No | No | Yes |
| Spec-aligned | No | No | Yes |
| Repeatable | No | No | Predictable from rules |
| Edge cases | Limited | Limited | Comprehensive |

**Grammar Mode Use Cases:**
- Comprehensive JWT spec compliance testing
- Systematic vulnerability discovery
- Type handling validation
- Boundary condition testing
- Repeated security scanning with consistent coverage

**Available Grammar Categories**

Use the `grammar_category` parameter to focus on specific types of test values:

| Category | Description | Example Values | Use Case |
|----------|-------------|-----------------|----------|
| `valid` | RFC-compliant standard values | `HS256`, `user123`, `https://example.com`, `["api1", "api2"]` | Validate token acceptance with valid data |
| `edge_cases` | Boundary conditions and unusual values | `null`, `0`, `-1`, `""`, empty array `[]` | Test edge case handling |
| `type_variations` | Wrong data types for claims | String array: `["user123"]`, Number string: `"123"`, Boolean string: `"true"` | Test type validation/coercion |
| `injection` | Security-relevant injection patterns | SQL: `' OR '1'='1`, XSS: `<script>alert(1)</script>`, Path: `../../../etc/passwd` | Security vulnerability testing |
| `invalid` | Invalid format values | Empty string, wrong type, out-of-range, malformed | Test error handling |
| `vulnerable` | Algorithm confusion and vulnerable patterns | `alg: "none"`, `alg: "NONE"`, `alg: "HS256"` with RSA key | Test algorithm validation |
| *(omitted)* | All categories mixed (random) | Random selection from all categories above | Comprehensive fuzzing |

**Grammar Category Details by Claim Type:**

| Claim | Valid | Edge Cases | Type Variations | Injection |
|-------|-------|-----------|-----------------|-----------|
| `sub` | `"user123"`, `"admin"` | `""`, `null` | `123`, `["user123"]` | `' OR '1'='1`, `admin" OR "1"="1` |
| `exp` | Future timestamp | `0`, `-1`, `null` | `"9999999999"`, `Infinity` | N/A |
| `aud` | `"api.example.com"`, `["api1"]` | `""`, `null`, `[]` | `123`, `{"aud": "api"}` | `api"; "role":"admin` |
| `email` | `"user@example.com"` | `""`, `null` | `["email@test.com"]`, `123` | `test@example.com\r\nBcc:attacker` |
| `name` | `"John Doe"` | `""`, `null` | `["John Doe"]`, `123` | `<script>alert(1)</script>`, `O'Reilly` |
| `alg` (header) | `"RS256"`, `"ES256"` | Empty, `null` | `256`, `["RS256"]` | `"none"`, `"NONE"`, `"HS256"` |
| `nbf` | Current timestamp | Future time, `null` | `"1234567890"`, `Infinity` | N/A |
| `roles` | `["admin"]`, `"admin"` | `[]`, `null` | `"admin"`, `123` | `["admin\r\nInjected:true"]` |

**Grammar Category Examples:**
```bash
# Test with valid RFC-compliant values
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "grammar",
    "grammar_category": "valid",
    "sub": "user123",
    "scope": "openid profile email"
  }'

# Test with edge cases (null, boundaries, etc.)
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "grammar",
    "grammar_category": "edge_cases",
    "sub": "user123"
  }'

# Test with wrong data types
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "grammar",
    "grammar_category": "type_variations",
    "email": "test@example.com"
  }'

# Test with injection patterns
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "grammar",
    "grammar_category": "injection",
    "name": "Test User"
  }'

# Test algorithm confusion vulnerabilities
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "grammar",
    "grammar_category": "vulnerable",
    "sub": "user123"
  }'
```

**Note**: Grammar mode provides more thorough testing than random modes but is slower (processes all claims vs 1-3). Combine with `exclude` parameter to focus on specific claims:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -d '{
    "mode": "grammar",
    "grammar_category": "edge_cases",
    "sub": "user123",
    "exclude": ["exp", "iat", "nbf"]  # Test all claims except time-based ones
  }'
```

**Important Notes**:
- Always protected (cannot be fuzzed): `iss`, `jti` (required for valid JWT structure)
- By default, ALL claims except `iss` and `jti` can be modified in `fuzz`/`malicious` modes, including `exp`, `nbf`, `iat`
- Grammar mode selects from all grammar categories automatically for comprehensive testing
- Use the `exclude` parameter to protect specific claims like `exp`, `nbf`, `iat` for infinitely valid tokens
- Metadata fields (`kty`, `response_type`, `mode`, `exclude`, `grammar_category`) are automatically excluded from transformations
- Transformations apply to both access tokens and ID tokens when using hybrid flows

### JWT Header Fuzzing

Test JWT header vulnerabilities by fuzzing the `alg` and `kid` fields:

Structured header override:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "header": {
      "alg": "none",
      "typ": "JWT",
      "kid": "test-key",
      "jku": "https://attacker.example.com/jwks.json"
    },
    "body": {
      "sub": "user123"
    },
    "signature": false
  }'
```

Legacy algorithm confusion override:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user123",
    "header_alg": "none"
  }'
```

**Result**: Creates a token with `"alg": "none"` in the header, testing for algorithm confusion vulnerabilities.

Known vulnerability presets:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "vulnerability": "rs_hs_confusion",
    "body": {
      "sub": "user123",
      "roles": ["admin"]
    }
  }'
```

Supported presets: `alg_none`, `rs_hs_confusion`, `kid_traversal`, `jku_injection`, and `embedded_jwk`.

Automated Header Fuzzing (fuzz mode):
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "fuzz",
    "sub": "user123",
    "header_alg": "trigger-fuzz",
    "header_kid": "trigger-fuzz"
  }'
```

Fuzzed `alg` Values (in fuzz mode):
- Algorithm confusion: `none`, `None`, `NONE`, `nOnE`
- Symmetric key confusion: `HS256`, `HS384`, `HS512`
- Different algorithms: `RS384`, `RS512`, `ES384`, `ES512`, `PS256`
- Edge cases: empty string, BLNS patterns

Fuzzed `kid` Values (in fuzz/malicious modes):
- SQL injection: `' OR '1'='1`
- Path traversal: `../../../etc/passwd`
- XSS: `<script>alert('xss')</script>`
- BLNS patterns: Unicode, null bytes, control characters

Example Output:
```json
Header: {"alg": "none", "typ": "JWT", "kid": "<img src=x onerror=alert('xss')>"}
```

**Protect Header Fields**:
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "fuzz",
    "sub": "user123",
    "header_alg": "RS256",
    "exclude": ["header_alg"]
  }'
```

**Use Cases**:
- Test algorithm validation (reject `none`, case-insensitive checks)
- Test key confusion attacks (HS256 with RSA keys)
- Test `kid` injection vulnerabilities (SQL, path traversal, XSS)
- Test header parsing edge cases

**Note**: New requests can use structured `header` fields `alg`, `typ`, `cty`, `kid`, `jku`, and `jwk`. The certificate header fields `x5u`, `x5c`, and `x5t` are rejected.

## OAuth2 Client Credentials Grant

JWTForge supports the OAuth2 `client_credentials` grant for machine-to-machine token generation. This is ideal for automated testing, CI/CD pipelines, and scripting scenarios  when you want to verify your application handles standard OAuth2 `client_credentials` grant correctly.

### Two Approaches

**Approach 1: Direct JSON Payload (Core)**
The standard approach for generating tokens with full flexibility. Any arbitrary claims can be passed as JSON fields.
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user123",
    "name": "John Doe",
    "client_id": "my_test_app",
    "roles": ["admin", "user"],
    "custom_claim": "custom_value"
  }'
```

**Approach 2: OAuth2 client_credentials Grant (RFC 6749)**
Standard OAuth2 flow using form-encoded request with Basic authentication. The password in Basic auth must equal the client_id (username).
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Authorization: Basic base64(my_test_app:my_test_app)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&scope=openid+profile+email"
```

**Note**: Custom claims like `roles` or `custom_claim` CANNOT be passed via OAuth2 form-encoded approach. Use the Direct JSON Payload approach if you need to include arbitrary custom claims.

### Client ID Management

- **Auto-Generated**: If `client_id` is not provided, JWTForge generates a random one (e.g., `client_a1b2c3d4`)
- **Custom Client ID**: Pass `client_id` parameter in JSON or via Basic auth username (for client_credentials)
- **Basic Auth Password**: For client_credentials grant, the password must equal the client_id (username)
- **In Token Payload**: The `client_id` is automatically included in all generated tokens

### Examples

**Auto-generate client_id:**
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{"sub": "user123"}'

# Returns token with auto-generated client_id
```

**Explicit client_id in JSON:**
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{"sub": "user123", "client_id": "test_app"}'
```

**OAuth2 client_credentials with Basic auth:**
```bash
# Basic auth format: base64(client_id:password) where password = client_id
# For client_id "test_app", password is also "test_app"
# base64(test_app:test_app) = dGVzdF9hcHA6dGVzdF9hcHA=
curl -X POST https://your-worker.workers.dev/token \
  -H "Authorization: Basic dGVzdF9hcHA6dGVzdF9hcHA=" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&scope=openid"
```

## Token Introspection Endpoint

JWTForge provides an RFC 7662 compliant token introspection endpoint for validating and retrieving information about tokens.

### POST `/introspect`

Validate a token and retrieve its claims.

**Requirements:**
- Basic authentication with `client_id:password` format (password must equal client_id)
- Form-encoded request body
- Content-Type: `application/x-www-form-urlencoded`

**Parameters:**
- `token` (required): The token string to introspect
- `token_type_hint` (optional): Set to `access_token` for hint (currently only value supported)

### Request

```bash
curl -X POST https://your-worker.workers.dev/introspect \
  -H "Authorization: Basic base64(client_id:client_id)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=eyJhbGciOiJSUzI1NiIs..." \
  -d "token_type_hint=access_token"
```

### Response (Active Token)

```json
{
  "active": true,
  "scope": "openid profile email",
  "client_id": "test_app",
  "sub": "user123",
  "iss": "https://jwtforge.dev",
  "aud": "https://api.example.com",
  "exp": 1735689600,
  "iat": 1735686000,
  "nbf": 1735686000,
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true
}
```

### Response (Inactive Token)

```json
{
  "active": false
}
```

### Validation Logic

The introspection endpoint validates:
- **Token Format**: Valid JWT with 3 parts (header.payload.signature)
- **Expiration**: Token not expired (`exp` > current time)
- **Not Before**: Token activation time valid (`nbf` <= current time)
- **Signature**: Valid signature using active keys from JWKS endpoint, unless the token was intentionally generated unsigned or with a literal test signature
- **Authorization**: Valid Basic auth credentials (password == client_id)

### Use Cases

**Testing Token Validation:**
```bash
# Generate a token
TOKEN=$(curl -s -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{"sub": "test_user"}' | jq -r .access_token)

# Introspect it
curl -X POST https://your-worker.workers.dev/introspect \
  -H "Authorization: Basic dGVzdF9hcHA6dGVzdF9hcHA=" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=$TOKEN"
```

**Integration Testing:**
```bash
# Generate and immediately validate token in test script
TOKEN=$(curl -s -X POST http://localhost:8787/token \
  -H "Content-Type: application/json" \
  -d '{"sub": "user123", "client_id": "test_app"}' | jq -r .access_token)

INTROSPECTION=$(curl -s -X POST http://localhost:8787/introspect \
  -H "Authorization: Basic dGVzdF9hcHA6dGVzdF9hcHA=" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=$TOKEN")

# Assert token is active
echo $INTROSPECTION | jq .active # Should output: true
```

**Automated Credential Rotation:**
```bash
#!/bin/bash
# Periodically introspect current token and regenerate if invalid

while true; do
  RESULT=$(curl -s -X POST https://your-worker.workers.dev/introspect \
    -H "Authorization: Basic dGVzdF9hcHA6dGVzdF9hcHA=" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "token=$CURRENT_TOKEN")

  if [ "$(echo $RESULT | jq -r .active)" = "false" ]; then
    # Token expired, generate new one
    CURRENT_TOKEN=$(curl -s -X POST https://your-worker.workers.dev/token \
      -H "Content-Type: application/json" \
      -d '{"client_id": "test_app"}' | jq -r .access_token)
  fi

  sleep 300  # Check every 5 minutes
done
```

## Token Exchange (RFC 8693)

JWTForge provides an RFC 8693 compliant token exchange endpoint for converting between different token types and transforming claims.

### Overview

Token exchange allows you to convert one token format into another (e.g., ID token to access token) while optionally modifying claims. Supports JWT, ID Token, and Access Token formats.

**Supported Token Types:**
- `urn:ietf:params:oauth:token-type:jwt` - Standard JWT
- `urn:ietf:params:oauth:token-type:id_token` - OpenID Connect ID Token
- `urn:ietf:params:oauth:token-type:access_token` - OAuth 2.0 Access Token

### Request Parameters

- `grant_type` (required): `urn:ietf:params:oauth:grant-type:token-exchange`
- `subject_token` (required): The token being exchanged (JWT format)
- `subject_token_type` (required): Type of the subject token (one of the supported types above)
- `resource` (optional): Target resource audience (updates `aud` claim)
- `audience` (optional): Target audience (overrides resource, updates `aud` claim)
- `requested_token_type` (optional): Type of token to return (defaults to `urn:ietf:params:oauth:token-type:access_token`)
- `add_claims` (optional): Claims to add, format: `key1:value1,key2:value2`
- `remove_claims` (optional): Claims to remove, format: `claim1,claim2,claim3`

### Basic Exchange

Exchange a JWT for an access token without modifications:

```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=eyJhbGciOiJSUzI1NiIs..." \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:jwt"
```

### With Claim Transformation

Exchange ID token and modify claims:

```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=eyJhbGciOiJSUzI1NiIs..." \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:id_token" \
  -d "resource=https://api.example.com" \
  -d "add_claims=scope:read+write,dept:engineering,level:senior" \
  -d "remove_claims=email_verified,nbf,picture"
```

### Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
  "subject_token_type": "urn:ietf:params:oauth:token-type:id_token"
}
```

### Use Cases

**Service-to-Service Token Exchange:**
```bash
# Exchange user's ID token for service API access token
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=$ID_TOKEN" \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:id_token" \
  -d "resource=https://api.backend.example.com" \
  -d "add_claims=client_id:service-app,scope:api.write"
```

**Multi-Hop Token Exchange:**
Testing token exchange through multiple services:
```bash
# Step 1: Get initial token
TOKEN=$(curl -s -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{"sub": "user123", "name": "Alice"}' | jq -r .access_token)

# Step 2: Exchange for different resource
EXCHANGED=$(curl -s -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=$TOKEN" \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:jwt" \
  -d "resource=https://api-v2.example.com" \
  -d "add_claims=version:2,api_key:abc123" \
  -d "remove_claims=email,phone" | jq -r .access_token)
```

**Claim Modification for Authorization:**
```bash
# Exchange and update roles for new service
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=$EXISTING_TOKEN" \
  -d "subject_token_type=urn:ietf:params:oauth:token-type:access_token" \
  -d "add_claims=roles:admin,permissions:read:write:delete" \
  -d "remove_claims=roles"
```

## Key Storage and Rotation

JWTForge uses different storage mechanisms depending on the environment:

For local development: keys are stored in memory and regenerated on restart.

For production (i.e. deployed as Cloudflare Workers): Keys are stored in Cloudflare Durable Objects. Keys automatically rotate every 24 hours with old keys remain valid for 6 hours after rotation


## Run Locally or in CI/CD Pipeline with CLI

The easiest way to run JWTForge locally or in CI/CD Pipeline  is using the `jwtforge` CLI tool. Install it as an npm package and use commands to start the server and generate tokens.

### Installation

```bash
npm install -g abhishektiwari/jwtforge
# or locally in your project
npm install abhishektiwari/jwtforge
```

### CLI Commands

**Start the development server:**
```bash
jwtforge start
```

**Generate a JWT token:**
```bash
# Generate with default claims
jwtforge token

# Generate with custom payload
jwtforge token '{"sub":"user123","scope":"profile email"}'

# Generate with custom port (if running on different port)
jwtforge token '{"sub":"alice"}' --port=9000

# Using environment variable
JWTFORGE_PORT=9000 jwtforge token '{"sub":"bob"}'
```

**Check server status:**
```bash
jwtforge status
# Output: ✓ jwtforge is running on localhost:8787
```

**Stop the server:**
```bash
jwtforge stop
# Output: ✓ Stopped jwtforge on port 8787
```

**Show help:**
```bash
jwtforge help
```

### CLI Port Options

The CLI automatically detects the port where `jwtforge` is running. You can also specify it manually:

1. **Command-line argument**: `jwtforge token --port=8787`
2. **Environment variable**: `JWTFORGE_PORT=8787 jwtforge token`
3. **Default**: Falls back to 8787

### Example Workflow

```bash
# Terminal 1: Start the server
jwtforge start

# Terminal 2: In another terminal, use these commands
# Check if server is running
jwtforge status

# Generate a basic token
TOKEN=$(jwtforge token | jq -r .access_token)
echo $TOKEN

# Generate token with custom claims
jwtforge token '{"sub":"alice","role":"admin","scope":"openid profile"}' 

# Generate token with EC key
jwtforge token '{"kty":"EC","sub":"user123"}'

# Generate token with fuzzing mode
jwtforge token '{"mode":"fuzz","sub":"user123","email":"test@example.com"}'

# Generate token with grammar mode (systematic security testing)
jwtforge token '{"mode":"grammar","sub":"user123","scope":"openid profile"}'

# Generate token with malicious payloads
jwtforge token '{"mode":"malicious","sub":"user123","email":"test@example.com"}'

# Stop the server
jwtforge stop
```

## Deploy on CloudAuth Workers

### Requirements

- Cloudflare Account (Free tier works with Workers KV storage)
- Node.js 18+ (for manual deployment)
- Wrangler CLI (installed automatically with `make install`)

### One-Click Deploy
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge)

Click the button above for instant deployment. Perfect for testing and demos.

### Manual Deploy
Clone the repository. Then quick setup and deploy.

```bash
# Quick setup
make install  # Install dependencies
make login    # Authenticate with Cloudflare
make dev      # Test locally at http://localhost:8787
make deploy   # Deploy to production

# Additional commands
make test       # Test local server
make test-prod  # Test production
make logs       # Stream logs
make help       # Show all commands
```



### Switching to Durable Objects (Optional)

By default, JWTForge uses Workers KV (free tier). To switch to Durable Objects for strong consistency:

Requirements:
- [Workers Paid Plan](https://workers.cloudflare.com/plans) ($5/month)

Setup Steps:

1. Enable Durable Objects in wrangler.toml:
```toml
[vars]
USE_DURABLE_OBJECTS = "true"

# Uncomment Durable Objects binding
[[durable_objects.bindings]]
name = "KEYSTORE_DURABLE"
class_name = "KeyStore"
script_name = "jwtforge"

[[migrations]]
tag = "v1"
new_classes = ["KeyStore"]

# Comment out or remove KV binding
# [[kv_namespaces]]
# binding = "KEYSTORE_KV"
```

2. Deploy:
```bash
make deploy
```

## Configuration

### Basic Configuration

Edit `wrangler.toml` to customize settings:

```toml
name = "jwtforge"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
ISSUER = "https://your-domain.com"  # Optional: Set custom issuer

# Workers KV binding (Default, Free Tier)
[[kv_namespaces]]
binding = "KEYSTORE_KV"
```

### Storage Backend Selection

JWTForge automatically selects the storage backend based on your configuration:

- Workers KV (Default): If `KEYSTORE_KV` binding exists
- Durable Objects: If `USE_DURABLE_OBJECTS="true"` and `KEYSTORE_DURABLE` binding exists
- In-Memory: Fallback for local development with `wrangler dev`

## Security Considerations

This service is designed for testing and development purposes only. For production use cases, use proper identity providers like Auth0, Okta, AWS Cognito, Azure AD, Keycloak, etc.

🚨🚨 DO NOT USE FOR PRODUCTION USE CASES 🚨🚨

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
