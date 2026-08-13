---
title: CLI
description: Install and use the JWTForge CLI locally and in CI/CD pipelines with GitHub Actions, Newman, and Postman examples.
keywords: [JWTForge CLI, CI/CD, GitHub Actions, Postman, Newman]
---

# CLI

The `jwtforge` CLI runs JWTForge locally and generates tokens from shell scripts, test suites, and CI/CD pipelines.

## Install

Install globally from the GitHub repository:

```bash
npm install -g abhishektiwari/jwtforge
```

Or install inside a project:

```bash
npm install abhishektiwari/jwtforge
npx jwtforge help
```

## Commands

| Command | Purpose | Example |
| --- | --- | --- |
| `jwtforge start` | Start the local JWTForge Worker server in the background | `jwtforge start` |
| `jwtforge token [payload]` | Generate a token by posting JSON to `/token` | `jwtforge token '{"body":{"sub":"user123"}}'` |
| `jwtforge status` | Check whether JWTForge is listening locally | `jwtforge status` |
| `jwtforge stop` | Stop the local JWTForge server | `jwtforge stop` |
| `jwtforge help` | Show CLI help | `jwtforge help` |

The CLI uses port `8787` by default. Override the port with either:

```bash
jwtforge token '{"body":{"sub":"alice"}}' --port=9000
```

or:

```bash
JWTFORGE_PORT=9000 jwtforge token '{"body":{"sub":"alice"}}'
```

When `jwtforge start` runs locally, it starts Wrangler with a local issuer by default:

```text
http://localhost:8787
```

If `JWTFORGE_PORT` or `--port` is set, the default local issuer follows that port. This avoids local CLI tokens accidentally using the production `ISSUER` from `wrangler.toml`.

Set `ISSUER` explicitly only when you want production-like issuer values in local tokens:

```bash
ISSUER=https://jwtforge.dev jwtforge start
```

## Generate Tokens

Default token:

```bash
jwtforge token
```

Structured JSON token:

```bash
jwtforge token '{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "body": {
    "sub": "alice",
    "scope": "openid profile email",
    "roles": ["admin"]
  }
}'
```

Extract the access token for another command:

```bash
TOKEN=$(jwtforge token '{"body":{"sub":"alice","scope":"openid profile"}}' | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/protected
```

Generate security testing tokens:

```bash
jwtforge token '{"mode":"fuzz","body":{"sub":"user123","email":"user@example.com"}}'
jwtforge token '{"mode":"malicious","malicious_category":"sql_injection","body":{"sub":"user123","email":"user@example.com"}}'
jwtforge token '{"mode":"grammar","grammar_category":"vulnerable","header":{"alg":"trigger"},"body":{"sub":"user123"}}'
jwtforge token '{"vulnerability":"alg_none","alg_none_variant":"nOne","body":{"sub":"admin"}}'
```

## Local Workflow

Use one terminal to start JWTForge:

```bash
jwtforge start
jwtforge status
```

Use another terminal or script to generate tokens:

```bash
TOKEN=$(jwtforge token '{"body":{"sub":"user123"}}' | jq -r .access_token)
echo "$TOKEN"
```

Stop the server when finished:

```bash
jwtforge stop
```

## CI/CD Pipeline Usage

The CLI is useful in pipelines when tests need a local authorization server and fresh JWTs.

```yaml
name: JWTForge CLI Example

on:
  pull_request:
  push:
    branches: [main]

jobs:
  jwtforge-cli:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install JWTForge CLI
        run: npm install -g abhishektiwari/jwtforge

      - name: Start JWTForge
        run: jwtforge start

      - name: Wait for JWTForge
        run: |
          for i in {1..30}; do
            jwtforge status && exit 0
            sleep 1
          done
          exit 1

      - name: Generate token for tests
        run: |
          TOKEN=$(jwtforge token '{"body":{"sub":"ci-user","scope":"openid profile"}}' | jq -r .access_token)
          echo "::add-mask::$TOKEN"
          echo "TEST_TOKEN=$TOKEN" >> "$GITHUB_ENV"

      - name: Run API tests
        run: |
          curl -f -H "Authorization: Bearer $TEST_TOKEN" http://localhost:8000/protected

      - name: Stop JWTForge
        if: always()
        run: jwtforge stop || true
```

For this repository's existing GitHub Actions examples, see:

- [Unit and Postman E2E workflow](https://github.com/abhishektiwari/jwtforge/blob/main/.github/workflows/test.yml)
- [FastAPI integration workflow](https://github.com/abhishektiwari/jwtforge/blob/main/.github/workflows/integration.yml)

## Postman And Newman

JWTForge includes Postman collections that can be run with Newman in local or CI environments:

- [Basic JWTForge Postman collection](https://github.com/abhishektiwari/jwtforge/blob/main/tests/e2e/JWTForge-Collection.postman_collection.json)
- [Advanced JWTForge Postman collection](https://github.com/abhishektiwari/jwtforge/blob/main/tests/e2e/JWTForge-Collection-Advanced.postman_collection.json)
- [Development Postman environment](https://github.com/abhishektiwari/jwtforge/blob/main/tests/e2e/JWTForge-Environment-Dev.postman_environment.json)
- [Production Postman environment](https://github.com/abhishektiwari/jwtforge/blob/main/tests/e2e/JWTForge-Environment-Prod.postman_environment.json)

Run the basic collection against the local server:

```bash
jwtforge start
npx newman run tests/e2e/JWTForge-Collection.postman_collection.json \
  -e tests/e2e/JWTForge-Environment-Dev.postman_environment.json \
  --delay-request 5000 \
  --reporters cli,json \
  --reporter-json-export test-results-e2e-basic.json
jwtforge stop
```

Run the advanced collection:

```bash
jwtforge start
npx newman run tests/e2e/JWTForge-Collection-Advanced.postman_collection.json \
  -e tests/e2e/JWTForge-Environment-Dev.postman_environment.json \
  --delay-request 5000 \
  --reporters cli,json \
  --reporter-json-export test-results-e2e-advanced.json
jwtforge stop
```

The repository Makefile also exposes these as:

```bash
make test-e2e-dev
make test-e2e-adv
```
