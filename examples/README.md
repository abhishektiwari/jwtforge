# JWTForge Examples

- [`fastapi-service`](fastapi-service/) demonstrates JWT authentication and authorization with Axioms FastAPI, SQLModel, Alembic, and Postman/Newman tests.
- [`petstore-service`](petstore-service/) is a disposable Express API whose colocated OpenAPI specification can be exercised with `jwtforge pentest` directly or exported to Postman.
- [`library-differential`](library-differential/) compares a JWTForge-generated verification corpus across selected JavaScript (`jose`, `jsonwebtoken`, `fast-jwt`) and Python (PyJWT, Authlib, joserfc, python-jose) libraries.
- [`locust-load-test`](locust-load-test/) provides a reproducible Python/Locust experiment for token-generation throughput, failure rate, and latency percentiles.

Each example has its own README and Makefile.
