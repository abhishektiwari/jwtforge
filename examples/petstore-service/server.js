import express from "express";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { createRemoteJWKSet, jwtVerify } from "jose";

const serviceDirectory = dirname(fileURLToPath(import.meta.url));
const openApiPath = resolve(serviceDirectory, "openapi.yaml");
const openApiDocument = YAML.parse(readFileSync(openApiPath, "utf8"));

const PORT = Number(process.env.PORT || 8000);
const JWT_ISSUER = (process.env.JWT_ISSUER || "http://localhost:8787").replace(/\/$/, "");
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "http://localhost:8000";
const JWT_ROLE_CLAIM = process.env.JWT_ROLE_CLAIM || "roles";
const JWT_SCOPE_CLAIM = process.env.JWT_SCOPE_CLAIM || "scope";
const JWT_ALGORITHMS = (process.env.JWT_ALGORITHMS || "RS256,ES256").split(",").map((value) => value.trim()).filter(Boolean);
const JWKS = createRemoteJWKSet(new URL(`${JWT_ISSUER}/.well-known/jwks.json`));

const seedPets = [
  { id: "pet-001", name: "Fluffy", species: "cat", status: "available", tags: ["indoor", "vaccinated"], tenant_id: "example-tenant" },
  { id: "pet-002", name: "Rex", species: "dog", status: "pending", tags: ["rescue"], tenant_id: "example-tenant" },
  { id: "pet-003", name: "Bubbles", species: "fish", status: "sold", tags: ["aquarium"], tenant_id: "example-tenant" },
];
let pets = clone(seedPets);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function errorResponse(res, status, error, message) {
  return res.status(status).json({ error, message });
}

async function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return errorResponse(res, 401, "missing_token", "Provide an Authorization: Bearer JWT header.");

  try {
    const result = await jwtVerify(match[1], JWKS, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: JWT_ALGORITHMS,
    });
    req.auth = result.payload;
    return next();
  } catch (error) {
    return errorResponse(res, 401, "invalid_token", process.env.EXPOSE_AUTH_ERRORS === "true" ? error.message : "The JWT is missing, invalid, expired, or not intended for this API.");
  }
}

function valuesFromClaim(payload, claimName) {
  const value = payload?.[claimName];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/[ ,]+/).filter(Boolean);
  return [];
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!valuesFromClaim(req.auth, JWT_SCOPE_CLAIM).includes(scope)) {
      return errorResponse(res, 403, "insufficient_scope", `The token does not include ${scope}.`);
    }
    return next();
  };
}

function requireRole(role) {
  return (req, res, next) => {
    if (!valuesFromClaim(req.auth, JWT_ROLE_CLAIM).includes(role)) {
      return errorResponse(res, 403, "insufficient_role", `The token does not include the ${role} role.`);
    }
    return next();
  };
}

function requireClaim(name, expected) {
  return (req, res, next) => {
    if (req.auth?.[name] !== expected) {
      return errorResponse(res, 403, "invalid_claim", `The token must include ${name}=${expected}.`);
    }
    return next();
  };
}

function parsePetInput(body) {
  if (!body || typeof body.name !== "string" || !body.name.trim() || typeof body.species !== "string" || !body.species.trim()) return null;
  return {
    name: body.name.trim(),
    species: body.species.trim(),
    status: ["available", "pending", "sold"].includes(body.status) ? body.status : "available",
    tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 10) : [],
  };
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "petstore-example" }));
app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

app.get("/pets", authenticate, requireScope("pets:read"), (req, res) => {
  const status = req.query.status;
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const result = status ? pets.filter((pet) => pet.status === status) : pets;
  return res.json(result.slice(0, limit).map(clone));
});

app.post("/pets", authenticate, requireScope("pets:write"), requireRole("pet-editor"), requireClaim("tenant_id", "example-tenant"), (req, res) => {
  const input = parsePetInput(req.body);
  if (!input) return errorResponse(res, 400, "invalid_pet", "name and species are required strings.");
  const pet = { id: `pet-${String(pets.length + 1).padStart(3, "0")}`, ...input, tenant_id: "example-tenant" };
  pets.push(pet);
  return res.status(201).json(clone(pet));
});

app.get("/pets/:petId", authenticate, requireScope("pets:read"), (req, res) => {
  const pet = pets.find((item) => item.id === req.params.petId);
  return pet ? res.json(clone(pet)) : errorResponse(res, 404, "not_found", "Pet was not found.");
});

app.put("/pets/:petId", authenticate, requireScope("pets:write"), requireRole("pet-editor"), requireClaim("tenant_id", "example-tenant"), (req, res) => {
  const index = pets.findIndex((item) => item.id === req.params.petId);
  if (index === -1) return errorResponse(res, 404, "not_found", "Pet was not found.");
  const input = parsePetInput(req.body);
  if (!input) return errorResponse(res, 400, "invalid_pet", "name and species are required strings.");
  pets[index] = { ...pets[index], ...input };
  return res.json(clone(pets[index]));
});

app.delete("/pets/:petId", authenticate, requireScope("pets:delete"), requireRole("pet-admin"), (req, res) => {
  const index = pets.findIndex((item) => item.id === req.params.petId);
  if (index === -1) return errorResponse(res, 404, "not_found", "Pet was not found.");
  pets.splice(index, 1);
  return res.status(204).send();
});

app.post("/admin/pets/reseed", authenticate, requireScope("pets:write"), requireRole("pet-admin"), (_req, res) => {
  pets = clone(seedPets);
  return res.json({ count: pets.length });
});

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  app.listen(PORT, () => {
    console.log(`Pet Store example listening on http://localhost:${PORT}`);
    console.log(`JWT issuer: ${JWT_ISSUER}`);
    console.log(`JWT audience: ${JWT_AUDIENCE}`);
  });
}

export { app };
