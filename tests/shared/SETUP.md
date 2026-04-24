# JWTForge Postman Collection - Quick Setup Guide

## Quick Start (30 seconds)

1. **Import Collection:** `JWTForge-Collection.postman_collection.json`
2. **Import Environment:** Choose one:
   - Dev: `JWTForge-Environment-Dev.postman_environment.json` (local testing)
   - Prod: `JWTForge-Environment-Prod.postman_environment.json` (production)
3. **Select Environment:** Top-right dropdown
4. **Start Testing:** Run requests from the collection

## Constants Used

All tests use a consistent client identifier for easy testing:

```
Client ID: client_123
Password:  client_123 (must equal client_id)
```

## Available Environments

### Development Environment
- **File:** `JWTForge-Environment-Dev.postman_environment.json`
- **Base URL:** `http://localhost:8787`
- **Use Case:** Local development and testing
- **Import:** Postman → Import → Select file

### Production Environment
- **File:** `JWTForge-Environment-Prod.postman_environment.json`
- **Base URL:** `https://jwtforge.dev`
- **Use Case:** Testing against production deployment
- **Import:** Postman → Import → Select file

### Switch Between Environments

In Postman, top-right dropdown shows active environment. Click to switch:

```
Environment ▼
├─ JWTForge - Development
└─ JWTForge - Production
```

## Postman Variables

The collection uses the following variables that need to be configured:

### Environment Variables

Set these in Postman's Environment settings:

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `base_url` | `http://localhost:8787` | JWTForge service URL | `http://localhost:8787` or `https://jwtforge.workers.dev` |
| `client_id` | `client_123` | OAuth2 client identifier | `client_123` |
| `basic_auth` | `Y2xpZW50XzEyMzpjbGllbnRfMTIz` | Base64 encoded auth | Auto-generated from client_id:password |

### Collection Variables

Used internally for storing tokens between requests:

| Variable | Purpose | Type |
|----------|---------|------|
| `jwt_token` | Store JWT token from generation | String |
| `cc_token` | Store client_credentials token | String |
| `exchanged_token` | Store exchanged token | String |

## Basic Auth Setup

### What is Basic Auth?

Basic Auth uses username:password encoded in Base64:

```
Format: Basic [Base64(username:password)]
Example: Basic Y2xpZW50XzEyMzpjbGllbnRfMTIz
```

### For client_123:

```
Username: client_123
Password: client_123
Combined: client_123:client_123
Base64:   Y2xpZW50XzEyMzpjbGllbnRfMTIz
```

### Generate Your Own

If using a different client_id:

```bash
# macOS/Linux
echo -n "client_123:client_123" | base64

# Result: Y2xpZW50XzEyMzpjbGllbnRfMTIz
```

### In Postman

The collection includes the pre-encoded value. To use:

1. Go to **Environment** settings
2. Set `basic_auth` variable to: `Y2xpZW50XzEyMzpjbGllbnRfMTIz`
3. Or generate your own using the command above

## Request Types

### 1. JWT Token (Direct JSON Payload)

**No authorization required**

```
POST /token
Content-Type: application/json

{
  "sub": "user123",
  "name": "John Doe",
  "client_id": "client_123"
}
```

**Note:** client_id is auto-generated if not provided, but we set it to `client_123` for consistent testing.

### 2. Client Credentials Grant (RFC 6749)

**Requires Basic Auth**

```
POST /token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic Y2xpZW50XzEyMzpjbGllbnRfMTIz

grant_type=client_credentials&scope=openid+profile+email
```

**Requirements:**
- `grant_type` must be `client_credentials`
- Basic Auth header required
- Password must equal client_id

### 3. Token Exchange (RFC 8693)

**No authorization required (but can include Basic Auth)**

```
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=eyJhbGci...
&subject_token_type=urn:ietf:params:oauth:token-type:jwt
&resource=https://api.example.com
&add_claims=scope:read+write
&remove_claims=nbf
```

**Supported token types:**
- `urn:ietf:params:oauth:token-type:jwt` - Standard JWT
- `urn:ietf:params:oauth:token-type:id_token` - OIDC ID Token
- `urn:ietf:params:oauth:token-type:access_token` - OAuth2 Access Token

### 4. Token Introspection (RFC 7662)

**Requires Basic Auth**

```
POST /introspect
Content-Type: application/x-www-form-urlencoded
Authorization: Basic Y2xpZW50XzEyMzpjbGllbnRfMTIz

token=eyJhbGci...&token_type_hint=access_token
```

**Requirements:**
- Basic Auth header required
- Password must equal client_id (client_123:client_123)

## Testing Workflow

### Complete Test Flow (Recommended)

1. **Setup Environment**
   - Set `base_url` to your JWTForge instance
   - Verify `basic_auth` is set to `Y2xpZW50XzEyMzpjbGllbnRfMTIz`

2. **Test JWT Generation**
   - Run "Generate Token - Basic" in JWT folder
   - Copy access_token from response
   - Update `{{jwt_token}}` variable
   - Run "Introspect JWT Token" to validate

3. **Test Client Credentials**
   - Run "Generate Token - Basic (No Scope)" in Client Credentials folder
   - Copy access_token from response
   - Update `{{cc_token}}` variable
   - Run "Introspect Client Credentials Token" to validate

4. **Test Token Exchange**
   - Run "Exchange Token - Basic" (uses `{{jwt_token}}`)
   - Copy access_token from response
   - Update `{{exchanged_token}}` variable
   - Run "Introspect Exchanged Token" to validate
   - Run "Exchange Token - Multi-Hop" to test multi-hop exchange

## Postman Features

### Pre-request Script Example

Add token validation before introspection:

```javascript
// Check if token exists
if (!pm.variables.get("jwt_token")) {
  pm.test("ERROR: jwt_token not set", function() {
    pm.expect(pm.variables.get("jwt_token")).to.exist;
  });
}
```

### Test Script Example

Validate successful response:

```javascript
pm.test("Token is active", function() {
  const jsonData = pm.response.json();
  pm.expect(jsonData.active).to.be.true;
  pm.expect(jsonData.sub).to.exist;
});
```

## Troubleshooting

### Issue: 401 Unauthorized

**Cause:** Basic auth header missing or invalid

**Solution:**
```
1. Check Authorization header is set
2. Verify basic_auth variable = Y2xpZW50XzEyMzpjbGllbnRfMTIz
3. Ensure POST body does NOT contain auth (use header)
```

### Issue: "Invalid token format"

**Cause:** Token is not a valid JWT

**Solution:**
```
1. Verify token is copied completely (3 parts, separated by dots)
2. Check token is from recent successful request
3. Ensure token hasn't expired
```

### Issue: Token not found in introspect

**Cause:** Variable not set or token variable is empty

**Solution:**
```
1. Generate token first
2. Copy complete access_token from response
3. Manually set variable or use collection's token-saving logic
4. Verify token value in introspect request
```

## Advanced Usage

### Using Different Client IDs

To use a different client_id (e.g., `app_789`):

1. Generate Basic Auth: `echo -n "app_789:app_789" | base64`
2. Update `basic_auth` variable in Postman
3. Update all request bodies to use new client_id
4. Run tests with new client identifier

### Testing Multiple Environments

Create separate Postman Environments:

- **Development:** `base_url = http://localhost:8787`
- **Staging:** `base_url = https://staging-jwtforge.workers.dev`
- **Production:** `base_url = https://jwtforge.workers.dev`

Switch between them in Postman's top-right dropdown.

### Automating Tests with Runner

Use Postman Runner to execute test sequences:

1. Click **Runner** in top-left
2. Select collection and environment
3. Set iteration count for load testing
4. Run and view results

## References

- **Collection File:** `JWTForge-Collection.postman_collection.json`
- **Main Readme:** `../README.md`
- **Base URL:** Configurable in environment variables
- **Client ID:** Always `client_123` (constant for testing)

## Support

For issues:
1. Verify `base_url` is accessible
2. Check all environment variables are set
3. Confirm Basic Auth encoding is correct
4. Review JWTForge logs for detailed error messages
