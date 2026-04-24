# JWTForge Test Suite

Test collection for JWTForge JWT token service using Postman.

## Overview

The test suite includes requests for:
- **JWT Token Generation**: Direct JSON payload approach with custom claims
- **Client Credentials Grant**: OAuth2 `client_credentials` grant (RFC 6749)
- **Token Exchange**: RFC 8693 token exchange between different formats
- **Token Introspection**: RFC 7662 token validation for each approach
- **Discovery & JWKS**: OpenID Connect discovery and public key retrieval

## Setup

### Prerequisites
- [Postman](https://www.postman.com/downloads/) installed
- JWTForge service running (local or remote)
- Base URL configured (default: `http://localhost:8787`)

### Import Collection and Environments

1. Open Postman
2. Click **Import** in the top-left
3. Import these files (one at a time):
   - **Collection:** `shared/JWTForge-Collection.postman_collection.json`
   - **Development Environment:** `shared/JWTForge-Environment-Dev.postman_environment.json`
   - **Production Environment:** `shared/JWTForge-Environment-Prod.postman_environment.json`
4. The collection will be imported with all requests organized by type
5. Both environments will be available in the top-right dropdown

### Select Environment

Click the environment dropdown in Postman's top-right and choose:
- **JWTForge - Development** for local testing (`http://localhost:8787`)
- **JWTForge - Production** for production testing (`https://jwtforge.dev`)

### Configure Environment Variables (Alternative)

Before running tests, set these variables in Postman:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:8787` | JWTForge service URL |
| `client_id` | `client_123` | OAuth2 client identifier |
| `basic_auth` | `Y2xpZW50XzEyMzpjbGllbnRfMTIz` | Base64(client_123:client_123) |
| `jwt_token` | Empty | Store generated JWT token |
| `cc_token` | Empty | Store client_credentials token |
| `exchanged_token` | Empty | Store exchanged token |

**Basic Auth Encoding:**
```
client_id: client_123
password: client_123
Base64: Y2xpZW50XzEyMzpjbGllbnRfMTIz
```

To generate your own: `echo -n "client_123:client_123" | base64`

## Folder Structure

```
tests/
├── shared/
│   ├── JWTForge-Collection.postman_collection.json  (Main Postman collection)
│   └── README.md (This file)
├── jwt/
├── client-credentials/
├── token-exchange/
└── README.md
```

## Test Workflows

### 1. JWT Token Generation Flow

1. **Generate Token - Basic**
   - Creates a token with basic claims
   - Stores token in `{{jwt_token}}` variable
   
2. **Introspect JWT Token**
   - Uses `{{jwt_token}}` from previous request
   - Validates token claims and expiration
   - Requires Basic auth with `client_123:client_123`

**Steps:**
1. Open "JWT Token Generation" folder
2. Run "Generate Token - Basic"
3. Copy the access_token from response
4. Set `{{jwt_token}}` variable with the token
5. Run "Introspect JWT Token" to validate

### 2. Client Credentials Grant Flow

1. **Generate Token - Basic (No Scope)**
   - Uses OAuth2 client_credentials grant
   - Requires Basic auth header
   
2. **Introspect Client Credentials Token**
   - Validates the generated token
   - Stores in `{{cc_token}}` variable

**Steps:**
1. Open "Client Credentials Grant" folder
2. Run "Generate Token - Basic (No Scope)"
3. Copy the access_token from response
4. Set `{{cc_token}}` variable with the token
5. Run "Introspect Client Credentials Token" to validate

### 3. Token Exchange (RFC 8693) Flow

1. **Exchange Token - Basic**
   - Exchanges a JWT for an access token
   
2. **Exchange Token - With Resource**
   - Updates the resource/audience during exchange
   
3. **Exchange Token - With Claim Transformation**
   - Adds and removes claims during exchange
   
4. **Exchange Token - Multi-Hop**
   - Exchanges an already exchanged token
   
5. **Introspect Exchanged Token**
   - Validates the exchanged token

**Steps:**
1. Generate a JWT using "JWT Token Generation - Generate Token - Basic"
2. Copy the access_token
3. Open "Token Exchange (RFC 8693)" folder
4. Set `{{jwt_token}}` variable with the token
5. Run "Exchange Token - Basic"
6. Copy the access_token from exchange response
7. Set `{{exchanged_token}}` variable
8. Run "Introspect Exchanged Token" to validate
9. Optionally run "Exchange Token - Multi-Hop" to exchange the exchanged token

## Request Details

### JWT Token Generation

**Endpoint:** `POST /token`  
**Content-Type:** `application/json`  
**Body:** JSON object with claims

**Example:**
```json
{
  "sub": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["admin", "user"],
  "client_id": "client_123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "algorithm": "RS256",
  "key_id": "rsa-key-1"
}
```

### Client Credentials Grant

**Endpoint:** `POST /token`  
**Content-Type:** `application/x-www-form-urlencoded`  
**Authorization:** `Basic {{basic_auth}}`  
**Body:**
- `grant_type`: `client_credentials` (required)
- `scope`: `openid profile email` (optional)
- `sub`: Custom subject (optional)

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Token Exchange (RFC 8693)

**Endpoint:** `POST /token`  
**Content-Type:** `application/x-www-form-urlencoded`  
**Body:**
- `grant_type`: `urn:ietf:params:oauth:grant-type:token-exchange` (required)
- `subject_token`: Token to exchange (required)
- `subject_token_type`: Type of token (required)
  - `urn:ietf:params:oauth:token-type:jwt`
  - `urn:ietf:params:oauth:token-type:id_token`
  - `urn:ietf:params:oauth:token-type:access_token`
- `resource`: Target resource (optional)
- `audience`: Target audience (optional)
- `add_claims`: Claims to add `key:value,key:value` (optional)
- `remove_claims`: Claims to remove `claim1,claim2` (optional)

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

### Token Introspection (RFC 7662)

**Endpoint:** `POST /introspect`  
**Content-Type:** `application/x-www-form-urlencoded`  
**Authorization:** `Basic {{basic_auth}}`  
**Body:**
- `token`: Token to introspect (required)
- `token_type_hint`: `access_token` (optional)

**Response (Active Token):**
```json
{
  "active": true,
  "sub": "user123",
  "name": "John Doe",
  "exp": 1735689600,
  "iat": 1735686000,
  "nbf": 1735686000
}
```

**Response (Inactive Token):**
```json
{
  "active": false
}
```

## Tips

1. **Variable Management**: Use Postman's variable system to store tokens for reuse
2. **Pre-request Scripts**: Modify requests to dynamically set variables
3. **Tests Tab**: Add tests to verify response structure
4. **Environment**: Create separate environments for dev/staging/prod
5. **Runner**: Use Postman Runner to execute multiple requests in sequence

## Test Execution Order

Recommended order for  testing:

1. **Discovery & JWKS** - Verify service health
2. **JWT Token Generation** - Generate and introspect tokens
3. **Client Credentials Grant** - Test OAuth2 flow
4. **Token Exchange (RFC 8693)** - Test token conversion

## Common Issues

### 401 Unauthorized
- Check `{{basic_auth}}` variable is correctly set
- Ensure authorization header is included in requests
- Verify client_id and password are the same

### Invalid Token Format
- Token must be a valid JWT (3 parts separated by dots)
- Ensure `{{jwt_token}}` variable contains a complete token

### Token Not Found
- Replace placeholder tokens with actual tokens from previous requests
- Use Postman variables to chain requests together

## Further Reading

- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [RFC 7662 - OAuth 2.0 Token Introspection](https://tools.ietf.org/html/rfc7662)
- [RFC 8693 - OAuth 2.0 Token Exchange](https://tools.ietf.org/html/rfc8693)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [Postman Learning Center](https://learning.postman.com/)

## Support

For issues or questions:
1. Check the [JWTForge README](../README.md)
2. Review the [OpenAPI Documentation](../README.md#interactive-api-documentation)
3. Check request response status and error messages
4. Verify all variables are properly configured
