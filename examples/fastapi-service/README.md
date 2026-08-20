# Axioms FastAPI Example Application

This is a complete example FastAPI application demonstrating the `axioms-fastapi` library for JWT-based authentication and authorization.

This example demonstrates:

- Public endpoints - No authentication required
- Authenticated endpoints - Requires valid JWT token
- Scope-based authorization - Both OR and AND logic
- Role-based authorization - Both OR and AND logic
- Permission-based authorization
- Mixed authorization - Combining scopes, roles, and permissions
- **Object-level ownership** - Row-level security with `check_object_ownership`
- **Database models** - SQLModel integration with ownership tracking
- **Database migrations** - Alembic setup for schema versioning

## Quick Start

### Using Make (Recommended)

```bash
cd examples/fastapi-service

# Complete setup (creates .env, installs dependencies)
make setup

# Edit .env with your jwtforge.dev domain
nano .env  # or use your preferred editor

# Start development server
make run
```

### Manual Setup

If you prefer not to use Make:

```bash
cd examples/fastapi-service

# 1. Create environment file
cp .env.example .env

# 2. Install dependencies
pip install -r requirements.txt

# 3. Edit .env with your configuration
nano .env

# 4. Start server
uvicorn main:app --reload
```

## Makefile Commands

The example includes a Makefile with helpful commands:

```bash
make help            # Show all available commands
make setup           # Complete setup (env, install)
make install         # Install Python dependencies
make run             # Start production server
make dev             # Start development server with auto-reload
make check           # Check code for syntax errors
make clean           # Remove generated files

# Database Migration Commands
make db-upgrade      # Apply all pending migrations
make db-downgrade    # Rollback last migration
make db-current      # Show current migration version
make db-history      # Show migration history
make db-revision     # Create new migration (requires msg="...")
make db-reset        # Reset database (WARNING: destroys data)
```

## Testing with Postman

Import the `Axioms_FastAPI_Example.postman_collection.json` file into Postman.

The collection includes 7 folders with comprehensive tests:
1. Public Endpoints
2. Authentication Only
3. Scope-Based Authorization
4. Role-Based Authorization
5. Permission-Based Authorization
6. Mixed Authorization
7. **Object-Level Ownership** (Articles and Comments with ownership checks)

The example also includes `Axioms_FastAPI_JWT_Vulnerabilities.postman_collection.json`, a negative security test collection that uses JWTForge to generate known JWT attack tokens and verifies that the API rejects them.

It covers:

- Algorithm confusion: `alg: none`, `nOne`, and RS/HS substitution
- Key injection: `kid` traversal, self-asserted `jku`, and embedded `jwk`
- Malicious claim robustness: signed tokens with injection-style claim values

Run it with Newman:

```bash
make newman-vuln
```

Expected secure behavior is `401` or `403` for forged JWTs. The baseline folder should pass first; if it does not, check `issuer`, `audience`, `base_url`, and `jwtforge_url` in the Postman environment.


## Common Issues

- **401 Unauthorized**: Token missing, invalid, or expired
- **403 Forbidden**: Token valid but missing required scope/role/permission
- **Invalid token header**: Ensure format is `Authorization: Bearer TOKEN`

## Learn More

- [axioms-fastapi Documentation](https://axioms-fastapi.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [JWT.io](https://jwt.io/) - Decode and inspect JWT tokens
- [jwtforge.dev](https://jwtforge.dev/) - Generate test tokens

## License

This example is part of the axioms-fastapi project and is distributed under the same license.
