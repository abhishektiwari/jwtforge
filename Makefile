.PHONY: help install dev deploy logs tail test clean

# Default target
help:
	@echo "JWTForge - Makefile commands"
	@echo ""
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Run local development server"
	@echo "  make deploy     - Deploy to Cloudflare Workers"
	@echo "  make logs       - Stream real-time logs from deployed worker"
	@echo "  make tail       - Alias for logs"
	@echo "  make test       - Run test requests against local server"
	@echo "  make test-prod  - Run test requests against production"
	@echo "  make clean      - Clean node_modules and cache"
	@echo ""

# Install dependencies
install:
	npm install

# Run local development server
dev:
	npm run dev

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

# Test local development server
test:
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
	@echo "Cleaned node_modules and .wrangler directories"

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
