# JWTForge

JWTForge: A JWT Vending Service for Testing, Fuzzing, and Security Research of OAuth2/OIDC Implementations.

A lightweight JWT token vending service for testing purposes, deployable on Cloudflare Workers. Generate JWT tokens with standard OIDC/OAuth2 and custom claims for development and testing. Use it for fuzzing, end-to-end testing, and penetration testing of OAuth2/OIDC applications and services.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)
![Workers KV](https://img.shields.io/badge/Storage-Workers%20KV%20(Default)-blue.svg)
![Durable Objects](https://img.shields.io/badge/Storage-Durable%20Objects%20(Optional)-green.svg)
![Faker.js](https://img.shields.io/badge/Test%20Data-Faker.js-yellow.svg)
![BLNS](https://img.shields.io/badge/Fuzzing-BLNS-red.svg)
![Grammar](https://img.shields.io/badge/Testing-Grammar%20Mode-9cf.svg)
[![Citation Badge](https://api.juleskreuer.eu/citation-badge.php?doi=10.59350/6pdmd-3cm41)](https://juleskreuer.eu//projects/citation-badge)

## What It Does

- Generates signed, unsigned, malformed, and literal-signature JWTs.
- Supports structured JSON requests with explicit `header`, `body`, and `signature` objects.
- Keeps backward compatibility with the legacy flat claim model.
- Provides `fake`, `fuzz`, `malicious`, and `grammar` testing modes.
- Supports known JWT attack presets such as `alg_none`, RS/HS confusion, `kid` traversal, `jku` injection, and embedded JWK.
- Provides OIDC discovery, JWKS, token introspection, OAuth2 client credentials, and RFC 8693 token exchange.
- Generates and directly runs authentication, authorization, and JWT vulnerability tests from OpenAPI specifications.
- Runs locally, in CI/CD, or on Cloudflare Workers.

## Quick Start

JWTForge requires Node.js 22 or newer.

Install the CLI:

```bash
npm install -g abhishektiwari/jwtforge
```

Start JWTForge locally:

```bash
jwtforge start
```

The CLI starts Wrangler with a local issuer by default, so locally generated tokens use `iss: "http://localhost:8787"` unless you explicitly set `ISSUER`.

Generate a token:

```bash
jwtforge token '{"body":{"sub":"user123","scope":"openid profile email"}}'
```

Generate a security testing token:

```bash
jwtforge token '{"vulnerability":"alg_none","alg_none_variant":"nOne","body":{"sub":"admin"}}'
```

Stop the local server:

```bash
jwtforge stop
```

Analyze and directly test a JWT-protected API from its OpenAPI specification:

```bash
jwtforge pentest validate --spec openapi.yaml
jwtforge pentest run \
  --spec openapi.yaml \
  --target-url http://localhost:8000 \
  --issuer http://localhost:8787
```

Direct execution does not write Postman files. Use `jwtforge pentest generate` when Postman/Newman artifacts are required. See [OpenAPI JWT Pen Testing](https://jwtforge.dev/docs/pentest) and the runnable `examples/petstore-service` example.

## Local Development

Run the Worker API and Docusaurus docs in separate terminals:

```bash
# Terminal 1: Worker API
npm run dev

# Terminal 2: Docusaurus docs
npm run docs:start
```

Local URLs:

| Service | URL |
| --- | --- |
| Worker static docs and API | `http://localhost:8787` |
| Token API | `http://localhost:8787/token` |
| Swagger UI | `http://localhost:8787/swagger` |
| OpenAPI JSON | `http://localhost:8787/openapi.json` |
| Docusaurus dev server | `http://localhost:3000` |

Because Wrangler static assets are enabled, `npm run dev` can serve the built Docusaurus site and API from `http://localhost:8787`. `npm run docs:start` serves the live Docusaurus development server from `http://localhost:3000`.

Hosted URLs:

| Service | URL |
| --- | --- |
| Documentation site | `https://jwtforge.dev` |
| Token API | `https://jwtforge.dev/token` |
| Swagger UI | `https://jwtforge.dev/swagger` |
| OpenAPI JSON | `https://jwtforge.dev/openapi.json` |
| OIDC issuer | `https://jwtforge.dev` |

The hosted docs call the API on the same origin. Set `JWTFORGE_API_BASE_URL` only when building docs for a separate API host:

```bash
JWTFORGE_API_BASE_URL=https://your-worker.workers.dev npm run docs:build
```

Cloudflare deployment uses the `ISSUER` variable in `wrangler.toml` to set token `iss` claims, OIDC discovery URLs, and the OpenAPI server URL:

```toml
[vars]
ISSUER = "https://jwtforge.dev"
```

## Token Endpoint

Recommended structured JSON request:

```bash
curl -X POST http://localhost:8787/token \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "fake",
    "header": {
      "alg": "RS256",
      "typ": "JWT",
      "kid": "rsa-key-1"
    },
    "body": {
      "sub": "user123",
      "scope": "openid profile email",
      "roles": ["admin", "user"]
    }
  }'
```

Response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Documentation

The detailed documentation is maintained at [https://jwtforge.dev](https://jwtforge.dev).

Important pages:

| Page | What it covers |
| --- | --- |
| [Overview](https://jwtforge.dev/docs/intro) | Project introduction, request styles, and first token examples |
| [CLI](https://jwtforge.dev/docs/cli) | CLI installation, token generation, local server workflow, CI/CD, Postman, and GitHub Actions examples |
| [Evaluation](https://jwtforge.dev/docs/evaluation) | Performance benchmark and representative OAuth2/OIDC testing scenarios |
| [Security testing modes](https://jwtforge.dev/docs/modes/overview) | `fake`, `fuzz`, `malicious`, and `grammar` mode behavior and options |
| [OpenAPI and Swagger](https://jwtforge.dev/docs/reference/openapi) | OpenAPI contract, Swagger UI usage, local URLs, and production configuration |
| [Swagger UI](https://jwtforge.dev/api-reference) | Interactive API reference served from the deployed docs site |

Token endpoint documentation:

| Topic | What it covers |
| --- | --- |
| [Structured JSON](https://jwtforge.dev/docs/token-endpoint/structured-json) | Recommended `{header, body, signature}` request shape, examples, field placement, modes, and vulnerability presets |
| [Legacy flat JSON](https://jwtforge.dev/docs/token-endpoint/legacy-flat-json) | Backward-compatible claim-at-top-level request style and migration guidance |
| [Signatures](https://jwtforge.dev/docs/token-endpoint/signatures) | Signed tokens, unsigned test tokens, literal signature segments, and signature-related testing behavior |
| [Header fields](https://jwtforge.dev/docs/reference/header-fields) | Supported JWT header fields, rejected certificate-chain fields, defaults, examples, and security notes |
| [OIDC/OAuth2 claims](https://jwtforge.dev/docs/reference/oidc-oauth2-claims) | Supported standard claims, custom claims, defaults, examples, and claim metadata rules |
| [OIDC scopes](https://jwtforge.dev/docs/reference/oidc-scopes) | Scope-driven claim population for `openid`, `profile`, `email`, `address`, and `phone` |

## Testing Modes

JWTForge supports four mode families:

| Mode | Purpose |
| --- | --- |
| [`fake`](https://jwtforge.dev/docs/modes/fake) | Realistic OIDC-style data using Faker |
| [`fuzz`](https://jwtforge.dev/docs/modes/fuzz) | Random BLNS and edge-case mutation |
| [`malicious`](https://jwtforge.dev/docs/modes/malicious) | Injection payloads for security testing |
| [`grammar`](https://jwtforge.dev/docs/modes/grammar) | Categorized JWT/OIDC grammar-based values |

See [Security Testing Modes](https://jwtforge.dev/docs/modes/overview) for the full mode reference.

## CLI And CI/CD

The CLI can run JWTForge locally in shell scripts and CI/CD pipelines:

```bash
jwtforge start
TOKEN=$(jwtforge token '{"body":{"sub":"ci-user","scope":"openid profile"}}' | jq -r .access_token)
jwtforge stop
```

See [CLI docs](https://jwtforge.dev/docs/cli) for:

- CLI install and command reference
- [GitHub Actions unit and Postman E2E workflow](https://github.com/abhishektiwari/jwtforge/blob/main/.github/workflows/test.yml)
- [GitHub Actions FastAPI integration workflow](https://github.com/abhishektiwari/jwtforge/blob/main/.github/workflows/integration.yml)
- [Basic Postman collection](https://github.com/abhishektiwari/jwtforge/blob/main/tests/e2e/JWTForge-Collection.postman_collection.json)
- [Advanced Postman collection](https://github.com/abhishektiwari/jwtforge/blob/main/tests/e2e/JWTForge-Collection-Advanced.postman_collection.json)

Run the local Postman/Newman example:

```bash
jwtforge start
npx newman run tests/e2e/JWTForge-Collection.postman_collection.json \
  -e tests/e2e/JWTForge-Environment-Dev.postman_environment.json \
  --delay-request 5000
jwtforge stop
```

## Deploy

One-click deploy:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge)

Manual deploy:

```bash
npm install
npm run deploy
```

Wrangler runs the configured Docusaurus build command before deployment, writes static assets to `build/`, and deploys them with the Worker. JWTForge works on the Cloudflare Workers free plan with Workers KV. Durable Objects are optional for stronger consistency.

Cloudflare dashboard build configuration:

| Field | Value |
| --- | --- |
| Build command | None |
| Deploy command | `npx wrangler versions upload` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |
| Build token | `jwtforge-dev build token` |
| Build variables | None |

## Security Notice

JWTForge is designed for testing, development, fuzzing, and authorized security research.

Do not use it as a production identity provider. For production identity and access management, use a real IdP such as Auth0, Okta, AWS Cognito, Microsoft Entra ID, Keycloak, or another hardened provider.

## License

MIT

## Contributing

Contributions are welcome. Please open an issue or pull request on GitHub.
