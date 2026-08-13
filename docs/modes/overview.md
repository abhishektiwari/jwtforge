---
title: Security Testing Modes
---

# Security Testing Modes

JWTForge uses the top-level `mode` field to control how request data is generated or mutated.

| Mode | Purpose | Coverage | Use case | Example |
| --- | --- | --- | --- | --- |
| `fake` | Realistic test data | OIDC scope-derived claims with Faker values | Integration tests, demos, local development | `"mode": "fake"` |
| `fuzz` | Random robustness testing | Mutates 1-3 body claims and mutates provided supported header fields unless excluded | Edge-case discovery and parser robustness | `"mode": "fuzz"` |
| `malicious` | Security payload injection | Mutates 1-3 fields with attack strings | Penetration testing and sanitizer validation | `"mode": "malicious"` |
| `grammar` | Systematic JWT grammar testing | Selects values from claim/header grammar rules | Spec coverage, boundary testing, repeatable security scans | `"mode": "grammar"` |

## Mode Options

| Field | Applies to | Description | Default | Example |
| --- | --- | --- | --- | --- |
| `mode` | All modes | Selects generation behavior | `fake` | `"grammar"` |
| `exclude` | `fuzz`, `malicious`, `grammar` | Protects fields from mutation | `[]` | `["exp", "nbf", "iat", "header.alg"]` |
| `malicious_category` | `malicious` | Limits malicious values to one attack family | Mixed categories | `"sql_injection"` |
| `grammar_category` | `grammar` | Selects grammar value family | `valid` or mixed rules depending path | `"vulnerable"` |

## Malicious Categories

| Category | Description | Example payload | Use case |
| --- | --- | --- | --- |
| `sql_injection` | SQL query manipulation strings | `' OR '1'='1` | Test SQL sanitization |
| `xss` | Browser script injection strings | `<script>alert('xss')</script>` | Test output encoding |
| `path_traversal` | File path escape attempts | `../../../etc/passwd` | Test file path handling |
| `command_injection` | Shell command separators/substitution | `; ls -la` | Test command execution defenses |
| `ldap_injection` | LDAP filter manipulation | `*)(uid=*))(|(uid=*` | Test LDAP query construction |
| `nosql_injection` | Document database operator strings | `{'$ne':null}` | Test NoSQL query handling |
| `xml_injection` | XML/XXE style payloads | External entity payload | Test XML parsing defenses |
| `template_injection` | Template expression payloads | `{{7*7}}` | Test template rendering boundaries |
| `header_injection` | CRLF/header splitting strings | `test\r\nInjected-Header: malicious` | Test header parsing |
| `buffer_overflow` | Very large payload | 1 million `A` characters | Test payload size limits |

## Grammar Categories

| Category | Description | Example values | Use case |
| --- | --- | --- | --- |
| `valid` | Spec-aligned values | `RS256`, `user123`, `https://example.com` | Validate normal acceptance |
| `edge_cases` | Boundary and unusual values | `null`, `0`, `-1`, `""` | Test boundary handling |
| `type_variations` | Unexpected claim types | `["user123"]`, `"123"`, `"true"` | Test type validation |
| `injection` | Security-relevant strings | SQL, XSS, traversal payloads | Test sanitizer behavior |
| `invalid` | Malformed or invalid values | Empty or wrong-format values | Test rejection paths |
| `vulnerable` | JWT-specific vulnerable patterns | `alg: "none"`, `alg: "NONE"`, `alg: "HS256"` | Test algorithm validation |

Use the individual mode pages for executable examples.
