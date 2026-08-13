---
sidebar_position: 2
title: Local Development
---

# Local Development

Run the Worker API and Docusaurus docs in separate terminal tabs.

## Terminal 1: JWTForge API

```bash
npm run dev
```

By default, Wrangler serves the Worker at:

```text
http://localhost:8787
```

Because Wrangler static assets are enabled, this local Worker can also serve the built Docusaurus site from `build/`. That means `http://localhost:8787` and `http://localhost:3000` can both show the JWTForge docs UI:

- `http://localhost:8787` is the Worker preview with static assets plus API routes.
- `http://localhost:3000` is the live Docusaurus development server.

API routes still run through the Worker on port `8787`, including `/token`, `/introspect`, `/.well-known/*`, `/openapi.json`, and `/swagger`.

The Docusaurus widget calls the `/token` endpoint on the same origin in production. For local docs running on port `3000`, it falls back to the local Worker API at `http://localhost:8787`.

Set `JWTFORGE_API_BASE_URL` only when building or starting docs against a separate API host:

```bash
JWTFORGE_API_BASE_URL=https://your-worker.workers.dev npm run docs:start
```

For the same-domain production site, no API base override is required:

```bash
npm run docs:build
```

If it is not set, local Docusaurus uses `http://localhost:8787` and production uses the docs site's origin.

## Terminal 2: Docusaurus

```bash
npm run docs:start
```

Docusaurus serves the docs site at:

```text
http://localhost:3000
```

The landing page includes the custom token-generation widget. The embedded Swagger page is available at:

```text
http://localhost:3000/api-reference
```

## Production Build

Build the static documentation site:

```bash
npm run docs:build
```

Preview the built site:

```bash
npm run docs:serve
```

## Cloudflare Deployment

`wrangler.toml` uses Wrangler static assets to deploy the Docusaurus build with the Worker:

```toml
[build]
command = "npm run docs:build"

[assets]
directory = "./build"
binding = "ASSETS"
```

Wrangler runs the build command before packaging static assets. This prevents deploys from failing when `./build` does not exist yet. The Worker handles API paths such as `/token`, `/introspect`, `/.well-known/jwks.json`, `/.well-known/openid-configuration`, and `/openapi.json` first. Other paths fall back to the static Docusaurus assets when `ASSETS` is available.

The same deployment uses the `ISSUER` variable for token `iss` claims, OIDC discovery URLs, and the OpenAPI server URL:

```toml
[vars]
ISSUER = "https://jwtforge.dev"
```

Deploy the Worker and static docs together:

```bash
npm run deploy
```

For Cloudflare dashboard deployments, use these build settings:

| Field | Value |
| --- | --- |
| Build command | None |
| Deploy command | `npx wrangler versions upload` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |
| Build token | `jwtforge-dev build token` |
| Build variables | None |

The dashboard Build command can stay empty because Wrangler reads `[build] command = "npm run docs:build"` from `wrangler.toml`. In the build log this appears as `[custom build] Running: npm run docs:build` before Wrangler uploads static assets from `./build`.

## Swagger UI

The Worker API serves Swagger UI at:

```text
http://localhost:8787/swagger
```

The OpenAPI JSON is available at:

```text
http://localhost:8787/openapi.json
```

The Docusaurus `/api-reference` page embeds Swagger UI from the Worker `/swagger` route and links to the raw OpenAPI JSON.

For the hosted same-domain site, the production API URLs are:

```text
https://jwtforge.dev/token
https://jwtforge.dev/swagger
https://jwtforge.dev/openapi.json
```

## Troubleshooting

If Docusaurus starts but token generation fails, confirm:

- Wrangler is running in the API terminal.
- The widget API base URL resolves to the Wrangler URL.
- The Worker allows CORS for `Content-Type` and returns `Access-Control-Allow-Origin` on the actual `/token` response, not only the `OPTIONS` preflight response.
- `http://localhost:8787/swagger` is reachable if you are using Swagger UI locally.
