.PHONY: help install dev docs docs-start docs-build docs-serve docs-clear deploy logs tail test test-unit test-feature test-all test-coverage test-watch test-server test-e2e-dev test-e2e-adv test-example-vuln test-prod clean login info rollback

# Default target
help:
	@echo "JWTForge - Makefile commands"
	@echo ""
	@echo "Setup & Deployment:"
	@echo "  make install       - Install dependencies"
	@echo "  make dev           - Run local development server"
	@echo "  make docs-start    - Run Docusaurus docs development server"
	@echo "  make docs-build    - Build Docusaurus static documentation"
	@echo "  make docs-serve    - Serve the built Docusaurus site locally"
	@echo "  make docs-clear    - Clear Docusaurus cache"
	@echo "  make deploy        - Deploy to Cloudflare Workers"
	@echo "  make logs          - Stream real-time logs from deployed worker"
	@echo "  make tail          - Alias for logs"
	@echo ""
	@echo "Testing:"
	@echo "  make test-unit     - Run unit tests (modes, grammar)"
	@echo "  make test-feature  - Run feature tests (token generation, introspection, exchange, keys)"
	@echo "  make test-all      - Run all Jest tests"
	@echo "  make test-watch    - Run tests in watch mode"
	@echo "  make test-coverage - Generate coverage report"
	@echo "  make test-server   - Run integration tests against local server (manual)"
	@echo "  make test-e2e-dev  - Run Postman E2E tests with dev environment"
	@echo "  make test-e2e-adv  - Run Postman advanced tests with dev environment"
	@echo "  make test-example-vuln - Run example JWT vulnerability Postman tests"
	@echo "  make test-prod     - Run tests against production server"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean         - Clean node_modules and cache"
	@echo ""

# Install dependencies
install:
	npm install

# Run local development server
dev:
	npm run dev

# Alias for docs build
docs: docs-build

# Run Docusaurus development server
docs-start:
	npm run docs:start

# Build Docusaurus static documentation
docs-build:
	npm run docs:build

# Serve built Docusaurus documentation
docs-serve:
	npm run docs:serve

# Clear Docusaurus generated cache
docs-clear:
	npm run docs:clear

# Deploy to Cloudflare Workers
deploy:
	@echo "Deploying to Cloudflare Workers..."
	npm run deploy
	@echo ""
	@echo "Deployment complete! Test with:"
	@echo "  make test-prod"

# Stream logs from production
logs:
	npx wrangler tail

# Alias for logs
tail: logs

# Run all Jest tests (default test target)
test: test-all

# Run unit tests (modes and grammar)
test-unit:
	@echo "Running unit tests (modes, grammar)..."
	npm run test -- modes.test.js grammar.test.js
	@echo ""
	@echo "✓ Unit tests completed"
	@echo ""

# Run feature tests (token generation, introspection, exchange, key management)
test-feature:
	@echo "Running feature tests (token generation, introspection, exchange, key management)..."
	npm run test -- token-generation.test.js token-operations.test.js key-management.test.js
	@echo ""
	@echo "✓ Feature tests completed"
	@echo ""

# Run all Jest tests
test-all:
	@echo "Running all Jest tests..."
	@echo ""
	npm run test -- --verbose
	@echo ""
	@echo "✓ All tests completed"
	@echo ""

# Run tests in watch mode
test-watch:
	@echo "Running tests in watch mode..."
	@echo "Tests will re-run automatically when files change."
	@echo ""
	npm run test:watch

# Generate test coverage report
test-coverage:
	@echo "Generating test coverage report..."
	@echo ""
	npm run test:coverage
	@echo ""
	@echo "✓ Coverage report generated in ./coverage/index.html"
	@echo ""

# Run integration tests against local server
test-server:
	@echo "Testing local server (http://localhost:8787)..."
	@echo ""
	@echo "1. Testing root endpoint..."
	@curl -s http://localhost:8787/ | head -20
	@echo ""
	@echo "2. Testing JWKS endpoint..."
	@curl -s http://localhost:8787/.well-known/jwks.json | jq '.' || curl -s http://localhost:8787/.well-known/jwks.json
	@echo ""
	@echo "3. Testing discovery endpoint..."
	@curl -s http://localhost:8787/.well-known/openid-configuration | jq '.issuer' || curl -s http://localhost:8787/.well-known/openid-configuration
	@echo ""
	@echo "4. Generating token with RSA..."
	@curl -s -X POST http://localhost:8787/token \
		-H "Content-Type: application/json" \
		-d '{"sub":"test-user","name":"Test User"}' | jq '.' || curl -s -X POST http://localhost:8787/token -H "Content-Type: application/json" -d '{"sub":"test-user"}'
	@echo ""
	@echo "5. Generating token with EC..."
	@curl -s -X POST http://localhost:8787/token \
		-H "Content-Type: application/json" \
		-d '{"kty":"EC","sub":"test-user","name":"Test User"}' | jq '.' || curl -s -X POST http://localhost:8787/token -H "Content-Type: application/json" -d '{"kty":"EC","sub":"test-user"}'

# Run Postman E2E tests with newman (basic collection + dev environment)
test-e2e-dev:
	@echo "Running Postman E2E tests (Basic Collection) with Dev environment..."
	@echo ""
	npx newman run tests/e2e/JWTForge-Collection.postman_collection.json \
		-e tests/e2e/JWTForge-Environment-Dev.postman_environment.json \
		--delay-request 5000 \
		--reporters cli,json \
		--reporter-json-export test-results-e2e-basic.json
	@echo ""
	@echo "✓ E2E tests completed (results: test-results-e2e-basic.json)"
	@echo ""

# Run Postman advanced E2E tests with newman (advanced collection + dev environment)
test-e2e-adv:
	@echo "Running Postman Advanced E2E tests (Advanced Collection) with Dev environment..."
	@echo ""
	npx newman run tests/e2e/JWTForge-Collection-Advanced.postman_collection.json \
		-e tests/e2e/JWTForge-Environment-Dev.postman_environment.json \
		--delay-request 5000 \
		--reporters cli,json \
		--reporter-json-export test-results-e2e-advanced.json
	@echo ""
	@echo "✓ Advanced E2E tests completed (results: test-results-e2e-advanced.json)"
	@echo ""

# Run example JWT vulnerability tests with newman
test-example-vuln:
	@echo "Running example JWT vulnerability Postman tests..."
	@echo ""
	cd example && $(MAKE) newman-vuln
	@echo ""
	@echo "✓ Example JWT vulnerability tests completed"
	@echo ""

# Test production deployment
test-prod:
	@echo "Enter your worker URL (e.g., https://jwtforge.your-subdomain.workers.dev):"
	@read -p "URL: " URL; \
	echo ""; \
	echo "Testing $$URL..."; \
	echo ""; \
	echo "1. Testing JWKS endpoint..."; \
	curl -s $$URL/.well-known/jwks.json | jq '.' || curl -s $$URL/.well-known/jwks.json; \
	echo ""; \
	echo "2. Generating token with RSA..."; \
	curl -s -X POST $$URL/token \
		-H "Content-Type: application/json" \
		-d '{"sub":"test-user","name":"Test User"}' | jq '.' || curl -s -X POST $$URL/token -H "Content-Type: application/json" -d '{"sub":"test-user"}'; \
	echo ""; \
	echo "3. Generating token with EC..."; \
	curl -s -X POST $$URL/token \
		-H "Content-Type: application/json" \
		-d '{"kty":"EC","sub":"test-user"}' | jq '.' || curl -s -X POST $$URL/token -H "Content-Type: application/json" -d '{"kty":"EC","sub":"test-user"}'

# Clean build artifacts and dependencies
clean:
	rm -rf node_modules
	rm -rf .wrangler
	rm -rf .docusaurus
	rm -rf build
	rm -rf test-results-*.json
	@echo "Cleaned node_modules, .wrangler, Docusaurus build artifacts, and test results"

# Login to Cloudflare
login:
	npx wrangler login

# Show worker info
info:
	npx wrangler whoami
	@echo ""
	npx wrangler deployments list

# Rollback deployment
rollback:
	npx wrangler deployments list
	@echo ""
	@echo "Enter deployment ID to rollback to:"
	@read -p "Deployment ID: " DEPLOYMENT_ID; \
	npx wrangler rollback --deployment-id $$DEPLOYMENT_ID
