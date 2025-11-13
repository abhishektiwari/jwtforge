# JWTForge 

A lightweight JWT token vending service for testing purposes, deployed on Cloudflare Workers. Generate JWT tokens with standard OIDC/OAuth2 and custom claims for your development and testing needs.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge)

**Free Tier Available** - Works on Cloudflare Workers Free Plan using Workers KV storage

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)
![Workers KV](https://img.shields.io/badge/Storage-Workers%20KV%20(Default)-blue.svg)
![Durable Objects](https://img.shields.io/badge/Storage-Durable%20Objects%20(Optional)-green.svg)

## Features

- **OAuth2/OIDC Response Types**: Standard `response_type` parameter (token, id_token, id_token token)
- **Multiple Key Types**: Support for RSA (RS256) and EC (ES256) algorithms
- **Automatic Key Rotation**: Keys rotate every 24 hours with 6-hour grace period (production)
- **JWT Token Generation**: Create signed JWT tokens with configurable key types
- **OIDC/OAuth2 Claims Support**: Standard claims (iss, sub, aud, exp, iat, etc.)
- **Custom Claims**: Add any non-standard claims to your tokens
- **JWKS Endpoint**: Public key discovery at `/.well-known/jwks.json` with all active keys
- **OIDC Discovery**: OpenID Connect discovery endpoint at `/.well-known/openid-configuration`
- **Flexible Storage**: Workers KV (free, default) or Durable Objects (paid, strong consistency)
- **Zero Dependencies**: Uses Web Crypto API built into Cloudflare Workers
- **CORS Enabled**: Works with frontend applications

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

If `kty` is not specified, RSA (RS256) is used by default.

## Response Types (OAuth2/OIDC Standard)

JWTForge uses the standard OAuth2/OIDC `response_type` parameter to specify which tokens to generate:

| Response Type | Description | Returns | Use Case |
|---------------|-------------|---------|----------|
| `token` | Access token (default) | `access_token` | API authorization, resource access |
| `id_token` | ID token only | `id_token` | User authentication, identity verification |
| `id_token token` | Both tokens | `access_token` + `id_token` | Complete OIDC flow, hybrid authentication |
| `token id_token` | Both tokens (alternative order) | `access_token` + `id_token` | Complete OIDC flow |

### Response Type Examples

**Access Token** (`response_type=token`):
```json
{
  "response_type": "token",
  "sub": "user123",
  "scope": "read write",
  "aud": "https://api.example.com"
}
```

**ID Token** (`response_type=id_token`):
```json
{
  "response_type": "id_token",
  "sub": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true,
  "nonce": "random-nonce-12345"
}
```

**Both Tokens** (`response_type=id_token token`):
```json
{
  "response_type": "id_token token",
  "sub": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "scope": "openid profile email",
  "nonce": "random-nonce-67890"
}
```

Response when requesting both tokens:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email",
  "algorithm": "RS256",
  "key_id": "rsa-key-1"
}
```

## Interactive API Documentation

Visit the root URL of your deployed service to access the **Swagger UI** interface:
- Local: `http://localhost:8787`
- Production: `https://your-worker.workers.dev`

## Endpoints

### POST /token
Generate a JWT token with custom claims and optional key type.

**Request:**
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

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRlZmF1bHQta2V5LTEifQ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### GET /.well-known/jwks.json
Retrieve the JSON Web Key Set for token verification.

**Request:**
```bash
curl https://your-worker.workers.dev/.well-known/jwks.json
```

**Response:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "n": "...",
      "e": "AQAB",
      "alg": "RS256",
      "use": "sig",
      "kid": "default-key-1"
    }
  ]
}
```

### GET /.well-known/openid-configuration
Retrieve the OpenID Connect discovery document.

**Request:**
```bash
curl https://your-worker.workers.dev/.well-known/openid-configuration
```

## Standard OIDC/OAuth2 Claims

The service supports all standard OIDC and OAuth2 claims. Currently JWTForge does not verify or validate standard claims. This is intentional since it's a testing/development tool designed to generate tokens with any claims you need for testing purposes, even malformed ones.

| Claim | Description | Default | Example |
|-------|-------------|---------|---------|
| `iss` | Issuer | Your worker URL | `"https://jwtforge.workers.dev"` |
| `sub` | Subject (user identifier) | `"user123"` | `"user123"`, `"auth0\|507f1f77bcf86cd799439011"` |
| `aud` | Audience | `"https://api.example.com"` | `"https://api.example.com"`, `"my-client-id"` |
| `exp` | Expiration time | Current time + 1 hour | `1735689600` |
| `nbf` | Not before | Current time | `1735686000` |
| `iat` | Issued at | Current time | `1735686000` |
| `jti` | JWT ID | Random UUID | `"550e8400-e29b-41d4-a716-446655440000"` |
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

## Key Storage and Rotation

JWTForge uses different storage mechanisms depending on the environment:

For local development: keys are stored in memory and regenerated on restart.

For production (i.e. deployed as Cloudflare Workers): Keys are stored in Cloudflare Durable Objects. Keys automatically rotate every 24 hours with old keys remain valid for 6 hours after rotation

## Deployment

JWTForge offers **two deployment options** to suit different needs:

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

- **Cloudflare Account** (Free tier works with Workers KV storage)
- **Node.js 18+** (for manual deployment)
- **Wrangler CLI** (installed automatically with `make install`)

### Switching to Durable Objects (Optional)

By default, JWTForge uses **Workers KV** (free tier). To switch to **Durable Objects** for strong consistency:

**Requirements:**
- [Workers Paid Plan](https://workers.cloudflare.com/plans) ($5/month)

**Setup Steps:**

1. **Enable Durable Objects in wrangler.toml:**
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
# id = "your-kv-namespace-id"
```

2. **Deploy:**
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
id = "your-kv-namespace-id"  # Run: wrangler kv:namespace create KEYSTORE_KV
```

### Storage Backend Selection

JWTForge automatically selects the storage backend based on your configuration:

- **Workers KV (Default)**: If `KEYSTORE_KV` binding exists
- **Durable Objects**: If `USE_DURABLE_OBJECTS="true"` and `KEYSTORE_DURABLE` binding exists
- **In-Memory**: Fallback for local development with `wrangler dev`

## Security Considerations

**⚠️⚠️⚠️ IMPORTANT**: This service is designed for **testing and development purposes only**. 

**🚨🚨🚨🚨 DO NOT USE FOR PRODUCTION USE CASES**

For production use cases, use proper identity providers like Auth0, Okta, AWS Cognito, Azure AD, Keycloak, etc.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
