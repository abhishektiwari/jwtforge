---
title: OpenAPI
---

# OpenAPI and Swagger

JWTForge keeps the OpenAPI contract available at:

```text
/openapi.json
```

The Worker serves Swagger UI for that contract at:

```text
/swagger
```

## Trying Requests

Swagger UI provides editable request forms and `Try it out`.
To use it locally:

1. Run `npm run dev`.
2. Open `http://localhost:8787/swagger`.
3. Select an operation such as `POST /token`.
4. Click `Try it out`.
5. Edit the request body, headers, auth, and content type.
6. Execute the request.

The Docusaurus `/api-reference` page embeds the Worker-hosted Swagger UI from `/swagger` in an iframe and also links to the raw OpenAPI JSON.

For guided token generation, use the JWTForge widget on the Docusaurus landing page.

## Local Development

During local development, Docusaurus and the Worker run on different ports:

| Service | URL |
| --- | --- |
| Docusaurus docs | `http://localhost:3000` |
| JWTForge Worker API | `http://localhost:8787` |
| Swagger UI | `http://localhost:8787/swagger` |
| OpenAPI JSON | `http://localhost:8787/openapi.json` |

## Production

JWTForge can use one Cloudflare Worker domain for both the Docusaurus static site and the API. The hosted site uses:

```text
https://jwtforge.dev
```

Wrangler static assets serve the documentation pages, while Worker routes handle API paths such as `/token`, `/introspect`, `/.well-known/*`, `/openapi.json`, and `/swagger`.

The OpenAPI `servers` value is generated from the Worker `ISSUER` environment variable when it is configured. In this project:

```toml
[vars]
ISSUER = "https://jwtforge.dev"
```

The Docusaurus widget uses the same origin in production. Set `JWTFORGE_API_BASE_URL` only if the docs are built for a separate API host.

Keep the OpenAPI JSON available at:

```text
https://jwtforge.dev/openapi.json
```

## Troubleshooting

If Swagger UI is empty or cannot send requests:

- Confirm the Worker is running.
- Open `http://localhost:8787/openapi.json`.
- Confirm `/openapi.json` returns valid JSON.
- Open `http://localhost:8787/swagger`.
- Confirm the browser can load `swagger-ui-dist` from the CDN.

Keep `/openapi.json` as the machine-readable contract even when Docusaurus is the primary documentation experience.
