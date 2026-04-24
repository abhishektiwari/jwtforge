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

## Supports

- Testing Modes: Three modes for different testing scenarios - applied to both header and payload.
  - `fake` (default): Realistic test data using faker.js with OIDC scopes
  - `fuzz`: Randomized fuzzing using `BLNS` (Big List of Naughty Strings) + edge cases
  - `malicious`: Injection payloads (SQL, XSS, command injection, path traversal, etc.)
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
Generate a JWT token using JWTForge's custom implementation. Accepts a JSON body with key-value pairs representing any claims you want to include in the JWT token. For spec-compliant OAuth2 token generation, see the [OAuth2 Client Credentials Grant](#oauth2-client-credentials-grant) section.

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

## Security Testing Modes

JWTForge supports three modes for different testing scenarios via the `mode` parameter:

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
Randomly injects 1-3 malicious payloads for security testing.

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

Malicious Payloads Include:
- SQL Injection: `' OR '1'='1`, `'; DROP TABLE users; --`, `' UNION SELECT NULL--`
- XSS: `<script>alert('xss')</script>`, `<img src=x onerror=alert('xss')>`
- Path Traversal: `../../../etc/passwd`, `....//....//....//etc/passwd`
- Command Injection: `; ls -la`, `| cat /etc/passwd`, `` `whoami` ``
- LDAP Injection: `*)(uid=*))(|(uid=*`
- NoSQL Injection: `{'$gt':''}`, `{'$ne':null}`
- Template Injection: `{{7*7}}`, `${7*7}`, `{{config.items()}}`
- XML/XXE: XML entities and external entity attacks
- Header Injection: CRLF injection attempts

Example Output (random selection):
```json
{
  "sub": "user123",
  "name": "Test User",
  "email": "' OR '1'='1",  // SQL injection in email
  "roles": "*)(uid=*))(|(uid=*"  // LDAP injection in roles
}
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

**Important Notes**:
- Always protected (cannot be fuzzed): `iss`, `jti` (required for valid JWT structure)
- By default, ALL claims except `iss` and `jti` can be fuzzed in `fuzz`/`malicious` modes, including `exp`, `nbf`, `iat`
- Use the `exclude` parameter to protect specific claims like `exp`, `nbf`, `iat` for infinitely valid tokens
- Metadata fields (`kty`, `response_type`, `mode`, `exclude`) are automatically excluded from transformations
- Transformations apply to both access tokens and ID tokens when using hybrid flows

### JWT Header Fuzzing

Test JWT header vulnerabilities by fuzzing the `alg` and `kid` fields:

Algorithm Confusion Attacks (manual override):
```bash
curl -X POST https://your-worker.workers.dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user123",
    "header_alg": "none"
  }'
```

**Result**: Creates a token with `"alg": "none"` in the header, testing for algorithm confusion vulnerabilities.

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

**Note**: `typ` field is not modifiable to maintain valid JWT structure.

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
- **Signature**: Valid signature using active keys from JWKS endpoint
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

## Deployment

JWTForge offers two deployment options to suit different needs:

### 1. One-Click Deploy
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge)

Click the button above for instant deployment. Perfect for testing and demos.

### 2. Manual Deploy
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

### Requirements

- Cloudflare Account (Free tier works with Workers KV storage)
- Node.js 18+ (for manual deployment)
- Wrangler CLI (installed automatically with `make install`)

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
