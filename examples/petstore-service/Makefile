ROOT_DIR := ../..
PORT ?= 8000
JWT_ISSUER ?= http://localhost:8787
JWT_AUDIENCE ?= http://localhost:8000
OUT ?= ../../generated/petstore

.PHONY: install start validate generate pentest newman

install:
	cd $(ROOT_DIR) && npm install
	npm install

start:
	PORT="$(PORT)" JWT_ISSUER="$(JWT_ISSUER)" JWT_AUDIENCE="$(JWT_AUDIENCE)" node server.js

validate:
	node $(ROOT_DIR)/bin/jwtforge.js pentest validate --spec openapi.yaml --config security-config.json

generate:
	node $(ROOT_DIR)/bin/jwtforge.js pentest generate \
		--spec openapi.yaml \
		--config security-config.json \
		--out "$(OUT)" \
		--test-base-url "http://localhost:$(PORT)" \
		--test-issuer "$(JWT_ISSUER)" \
		--jwtforge-url "$(JWT_ISSUER)" \
		--audience "$(JWT_AUDIENCE)"

pentest:
	node $(ROOT_DIR)/bin/jwtforge.js pentest run \
		--spec openapi.yaml \
		--config security-config.json \
		--target-url "http://localhost:$(PORT)" \
		--issuer "$(JWT_ISSUER)" \
		--jwtforge-url "$(JWT_ISSUER)" \
		--audience "$(JWT_AUDIENCE)" \
		--allow-write-methods \
		--report "$(OUT)/direct-run-report.json"

newman: generate
	npx newman run "$(OUT)/authentication-authorization.postman_collection.json" -e "$(OUT)/test.postman_environment.json"
	npx newman run "$(OUT)/jwt-vulnerabilities.postman_collection.json" -e "$(OUT)/test.postman_environment.json"
