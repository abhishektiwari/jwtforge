PYTHON ?= python3
JWT_FORGE_URL ?= http://localhost:8787
JWT_ISSUER ?= $(JWT_FORGE_URL)
JWT_AUDIENCE ?= https://library-differential.example
OUT_DIR ?= generated

.PHONY: setup run clean help

setup:
	npm install
	"$(PYTHON)" -m pip install -r requirements.txt

run:
	PYTHON="$(PYTHON)" \
	JWT_FORGE_URL="$(JWT_FORGE_URL)" \
	JWT_ISSUER="$(JWT_ISSUER)" \
	JWT_AUDIENCE="$(JWT_AUDIENCE)" \
	OUT_DIR="$(OUT_DIR)" \
	npm run experiment

clean:
	rm -rf -- "$(OUT_DIR)"

help:
	@echo "make setup  Install pinned JavaScript packages and Python packages using $(PYTHON)"
	@echo "make run    Generate a JWTForge corpus and compare the seven verifier adapters"
	@echo "make clean  Remove generated output (OUT_DIR, default: generated)"
