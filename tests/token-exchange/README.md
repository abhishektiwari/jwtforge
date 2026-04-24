# Token Exchange Tests (RFC 8693)

Token exchange for converting between different token formats with claim transformation.

## Overview

Token Exchange allows converting one token type to another while optionally modifying claims. This folder contains tests for:

- Basic JWT-to-token exchange
- Exchange with resource update
- Exchange with claim transformation (add/remove claims)
- Multi-hop token exchange
- Token introspection and validation

## Test Requests

See main test collection: `../shared/JWTForge-Collection.postman_collection.json`

### Requests in this category:
1. Exchange Token - Basic
2. Exchange Token - With Resource
3. Exchange Token - With Claim Transformation
4. Exchange Token - Multi-Hop
5. Introspect Exchanged Token

## Client ID

All tests use: `client_123`

(Basic auth required only for introspection, not for token exchange)

## How to Test

1. Import the Postman collection
2. Set up environment:
   - `base_url`: Your JWTForge service URL
   - `basic_auth`: `Y2xpZW50XzEyMzpjbGllbnRfMTIz` (for introspection)
3. First, generate a JWT token:
   - Run JWT Token Generation test
   - Copy `access_token` and set `{{jwt_token}}`
4. Navigate to "Token Exchange (RFC 8693)" folder
5. Run "Exchange Token - Basic"
6. Copy the `access_token` from response
7. Set the `{{exchanged_token}}` variable
8. Run "Introspect Exchanged Token" to validate
9. Optionally run "Exchange Token - Multi-Hop" to exchange the exchanged token

## Request Format

### Basic Exchange

```
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
subject_token=eyJhbGci...
subject_token_type=urn:ietf:params:oauth:token-type:jwt
```

### With Resource and Claims Transformation

```
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
subject_token=eyJhbGci...
subject_token_type=urn:ietf:params:oauth:token-type:id_token
resource=https://api.example.com
add_claims=scope:read write,dept:engineering
remove_claims=email_verified,nbf
```

## Response Format

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS1rZXktMSJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
  "subject_token_type": "urn:ietf:params:oauth:token-type:jwt"
}
```

## Supported Token Types

**Subject Token Types (input):**
- `urn:ietf:params:oauth:token-type:jwt` - Standard JWT
- `urn:ietf:params:oauth:token-type:id_token` - OpenID Connect ID Token
- `urn:ietf:params:oauth:token-type:access_token` - OAuth2 Access Token

**Requested Token Type (output):**
- Defaults to `urn:ietf:params:oauth:token-type:access_token`
- Can be any of the above types

## Parameters

- **grant_type** (required): `urn:ietf:params:oauth:grant-type:token-exchange`
- **subject_token** (required): Token to exchange (JWT format)
- **subject_token_type** (required): Type of subject token
- **resource** (optional): Target resource (updates `aud` claim)
- **audience** (optional): Target audience (overrides resource)
- **requested_token_type** (optional): Type of returned token
- **add_claims** (optional): Claims to add, format: `key1:value1,key2:value2`
- **remove_claims** (optional): Claims to remove, format: `claim1,claim2`

## Use Cases

### 1. Service-to-Service Token Exchange
Convert user's ID token to backend API access token with specific scopes:

```
Exchange ID token → Add API scopes → Remove user personal info
```

### 2. Multi-Hop Token Exchange
Exchange through multiple services in a chain:

```
JWT → Exchange 1 → Token A → Exchange 2 → Token B → Exchange 3 → Token C
```

### 3. Authorization Transformation
Modify token audience and claims for different service:

```
Original token for Service A → Exchange for Service B with updated roles
```

### 4. Cross-Service Authorization
Convert one service's token format to another:

```
Legacy Auth Service token → Exchange → Modern OAuth2 token
```

## Token Claims

Original claims are preserved in exchange, with modifications:

**Preserved:**
- All original claims from subject token
- `iss`, `sub`, `exp`, `iat`, `nbf`

**Can be removed:**
- Any claim in the original token
- Specify in `remove_claims` parameter

**Can be added:**
- New claims via `add_claims` parameter
- Merged with existing claims

**Updated:**
- `aud` (if `resource` or `audience` provided)
- `jti` (regenerated)

## More Information

- [RFC 8693 - OAuth 2.0 Token Exchange](https://tools.ietf.org/html/rfc8693)
- Main documentation: `../README.md`
- SETUP guide: `../shared/SETUP.md`
