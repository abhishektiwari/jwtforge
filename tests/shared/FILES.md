# JWTForge Test Suite - Files Overview

## Files in `tests/shared/`

### Core Files

#### 1. JWTForge-Collection.postman_collection.json
**Postman Collection** - Main test collection with all API requests

**Contains:**
- 15 requests organized in 4 folders
- JWT Token Generation (5 requests + introspect)
- Client Credentials Grant (3 requests + introspect)
- Token Exchange (4 requests + introspect)
- Discovery & JWKS (2 requests)

**How to import:**
1. Postman → Import
2. Select this file
3. All requests will be available in the left sidebar

**Import size:** ~25 KB

---

#### 2. JWTForge-Environment-Dev.postman_environment.json
**Development Environment** - For local testing

**Variables:**
- `base_url`: `http://localhost:8787`
- `client_id`: `client_123`
- `basic_auth`: `Y2xpZW50XzEyMzpjbGllbnRfMTIz`
- `jwt_token`: Empty (filled during testing)
- `cc_token`: Empty (filled during testing)
- `exchanged_token`: Empty (filled during testing)

**How to import:**
1. Postman → Import
2. Select this file
3. Available in top-right environment dropdown

**Use case:** 
- Local development with `wrangler dev`
- Running JWTForge on localhost:8787

---

#### 3. JWTForge-Environment-Prod.postman_environment.json
**Production Environment** - For production testing

**Variables:**
- `base_url`: `https://jwtforge.dev`
- `client_id`: `client_123`
- `basic_auth`: `Y2xpZW50XzEyMzpjbGllbnRfMTIz`
- `jwt_token`: Empty (filled during testing)
- `cc_token`: Empty (filled during testing)
- `exchanged_token`: Empty (filled during testing)

**How to import:**
1. Postman → Import
2. Select this file
3. Available in top-right environment dropdown

**Use case:** 
- Testing deployed JWTForge on Cloudflare Workers
- Integration with production services
- End-to-end testing

---

#### 4. SETUP.md
**Setup Guide** - Quick reference for configuration

**Contains:**
- Quick start instructions
- Environment setup details
- Basic auth explanation
- Request type documentation
- Testing workflow
- Troubleshooting guide

**Read time:** 10-15 minutes

---

#### 5. FILES.md
**This file** - Overview of all test files

---

## Files in `tests/jwt/`

#### README.md
Documentation for JWT token generation tests

- Overview of JWT approach
- Request descriptions
- Testing steps
- Response format
- Token claims documentation

---

## Files in `tests/client-credentials/`

#### README.md
Documentation for OAuth2 client_credentials grant tests

- Overview of client_credentials approach
- Request descriptions
- Testing steps
- Request/response format
- Token claims documentation
- Use cases

---

## Files in `tests/token-exchange/`

#### README.md
Documentation for RFC 8693 token exchange tests

- Overview of token exchange
- Request descriptions
- Testing steps
- All supported token types
- Parameters documentation
- Use cases and examples

---

## Files in `tests/`

#### README.md
**Main Testing Guide** -  documentation

**Sections:**
- Setup instructions
- Environment configuration
- Test workflows (JWT, Client Credentials, Token Exchange)
- Request details and examples
- Tips for Postman
- Test execution order
- Common issues and troubleshooting
- References to RFCs and specifications

**Read time:** 20-30 minutes

---

## Quick Reference

### To Get Started:
1. Read: `tests/README.md` (main guide)
2. Import: `tests/shared/JWTForge-Collection.postman_collection.json`
3. Import: `tests/shared/JWTForge-Environment-Dev.postman_environment.json`
4. Setup: Follow "Postman Variables" section in `tests/README.md`
5. Test: Start with "JWT Token Generation" folder

### For Specific Topics:
- **JWT Testing:** See `tests/jwt/README.md`
- **Client Credentials:** See `tests/client-credentials/README.md`
- **Token Exchange:** See `tests/token-exchange/README.md`
- **Setup Help:** See `tests/shared/SETUP.md`
- **Full Guide:** See `tests/README.md`

### For Configuration:
- **Dev Environment:** Import `JWTForge-Environment-Dev.postman_environment.json`
- **Prod Environment:** Import `JWTForge-Environment-Prod.postman_environment.json`
- **Shared Details:** See `tests/shared/SETUP.md`

---

## File Sizes and Formats

| File | Type | Size | Format |
|------|------|------|--------|
| JWTForge-Collection.postman_collection.json | Collection | ~25 KB | JSON |
| JWTForge-Environment-Dev.postman_environment.json | Environment | ~1 KB | JSON |
| JWTForge-Environment-Prod.postman_environment.json | Environment | ~1 KB | JSON |
| README.md (main) | Documentation | ~15 KB | Markdown |
| SETUP.md | Documentation | ~10 KB | Markdown |
| FILES.md | Documentation | ~5 KB | Markdown |
| jwt/README.md | Documentation | ~3 KB | Markdown |
| client-credentials/README.md | Documentation | ~4 KB | Markdown |
| token-exchange/README.md | Documentation | ~5 KB | Markdown |

---

## Total Test Coverage

- **Total Requests:** 15 API calls
- **Test Scenarios:** 
  - 4 JWT token generation approaches
  - 3 Client credentials variations
  - 4 Token exchange scenarios
  - 2 Discovery endpoints
  - 5 Token introspection calls

- **Coverage:**
  - ✅ JWT Token Generation (with custom claims, scopes, ID tokens)
  - ✅ OAuth2 Client Credentials Grant (RFC 6749)
  - ✅ Token Exchange (RFC 8693)
  - ✅ Token Introspection (RFC 7662)
  - ✅ OIDC Discovery
  - ✅ JWKS Endpoint

---

## Updating Environments

If you need to change the URLs:

### Edit in Postman:
1. Top-right: Click environment dropdown
2. Click "Edit" or gear icon
3. Modify `base_url` value
4. Save

### Create New Environment:
1. File → New Environment
2. Add variables (see SETUP.md for list)
3. Save and use

---

## Next Steps

1. **Import Files:** Collection + Environments
2. **Read Documentation:** Start with `tests/README.md`
3. **Select Environment:** Dev or Prod from dropdown
4. **Run Tests:** Start with JWT folder
5. **Verify:** Check responses and token values
6. **Explore:** Try different request variations

---

## Support

For detailed help, see:
- Main guide: `tests/README.md`
- Setup help: `tests/shared/SETUP.md`
- Specific topics: Folder-specific README files
- RFC specifications: Links in documentation
