# JWT Token Generation Tests

Direct JSON payload approach for generating JWT tokens with custom claims.

## Overview

JWT token generation is JWTForge's core feature. This folder contains tests for:

- Basic token generation with custom claims
- Token generation with OIDC scopes
- ID token generation
- Tokens with custom claims (roles, permissions, etc.)
- Token introspection and validation

## Test Requests

See main test collection: `../shared/JWTForge-Collection.postman_collection.json`

### Requests in this category:
1. Generate Token - Basic
2. Generate Token - With Scope
3. Generate Token - ID Token
4. Generate Token - Custom Claims
5. Introspect JWT Token

## Client ID

All tests use: `client_123`

This is automatically included in all generated tokens.

## How to Test

1. Import the Postman collection
2. Navigate to "JWT Token Generation" folder
3. Run "Generate Token - Basic"
4. Copy the `access_token` from response
5. Set the `{{jwt_token}}` variable with the token
6. Run "Introspect JWT Token" to validate

## Response Format

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS1rZXktMSJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "algorithm": "RS256",
  "key_id": "rsa-key-1"
}
```

## Token Claims

Generated tokens include:
- Standard OIDC/OAuth2 claims (iss, sub, aud, exp, iat, nbf, jti)
- Custom claims from request body
- auto-generated client_id (if not provided)
- Automatically populated claims based on scopes (profile, email, etc.)

## More Information

See `../README.md` for  documentation.
