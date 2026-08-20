# Express Pet Store Pentest Target

This local Express API demonstrates `jwtforge pentest` against a service whose JWT authorization contract is described by OpenAPI. The service reads `openapi.yaml` at startup and serves that same document from `/openapi.json`, keeping the implementation example and contract colocated.

It validates JWT signatures through JWTForge's JWKS endpoint and enforces issuer, audience, expiration, OAuth2 scopes, application roles, and a custom `tenant_id` claim.

## Run

Use Node.js 22 or newer. From this directory:

```bash
make install
make start
```

JWTForge must be running at `http://localhost:8787`. Start it from the repository root with:

```bash
jwtforge start
```

Then validate, generate Postman artifacts, or run directly:

```bash
make validate
make generate
make pentest
```

`make pentest` opts into write methods because this disposable example intentionally exercises POST, PUT, and DELETE operations. Direct execution skips those methods unless `--allow-write-methods` is explicitly supplied.

The service defaults to:

- Target: `http://localhost:8000`
- JWTForge/issuer: `http://localhost:8787`
- Audience: `http://localhost:8000`

The optional `security-config.json` demonstrates claims that cannot always be inferred from standard OpenAPI fields. Operation-level roles and the `tenant_id` requirement are also colocated in `openapi.yaml` as vendor extensions.
