# Client Credentials Grant Tests (RFC 6749)

OAuth2 machine-to-machine token generation using client_credentials grant type.

## Overview

Client Credentials Grant is ideal for service-to-service authentication. This folder contains tests for:

- Basic client_credentials grant (no scope)
- Grant with OIDC scopes
- Grant with custom subject identifier
- Token introspection and validation

## Test Requests

See main test collection: `../shared/JWTForge-Collection.postman_collection.json`

### Requests in this category:
1. Generate Token - Basic (No Scope)
2. Generate Token - With Scope
3. Generate Token - With Custom Subject
4. Introspect Client Credentials Token

## Client ID

All tests use: `client_123`

**Basic Auth Format:**
- Username: `client_123`
- Password: `client_123` (must equal username)
- Base64: `Y2xpZW50XzEyMzpjbGllbnRfMTIz`

## How to Test

1. Import the Postman collection
2. Set up environment:
   - `base_url`: Your JWTForge service URL
   - `basic_auth`: `Y2xpZW50XzEyMzpjbGllbnRfMTIz`
3. Navigate to "Client Credentials Grant" folder
4. Run "Generate Token - Basic (No Scope)"
5. Copy the `access_token` from response
6. Set the `{{cc_token}}` variable with the token
7. Run "Introspect Client Credentials Token" to validate

## Request Format

```
POST /token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic Y2xpZW50XzEyMzpjbGllbnRfMTIz

grant_type=client_credentials
scope=openid+profile+email
sub=user@example.com
```

## Response Format

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS1rZXktMSJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Token Claims

Generated tokens include:
- `iss` - Issuer
- `sub` - Subject (custom if provided)
- `aud` - Audience
- `exp` - Expiration
- `iat` - Issued at
- `nbf` - Not before
- `jti` - JWT ID
- `client_id` - Always set to `client_123`
- Scope claims (if scope provided)

## Requirements

- **grant_type:** Must be `client_credentials`
- **Authorization:** Basic auth header required
- **Password:** Must equal client_id for validation

## Use Cases

- Service-to-service authentication
- Microservice communication
- CI/CD pipeline authentication
- Application-to-API access
- Testing OAuth2 flows

## More Information

- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- Main documentation: `../README.md`
