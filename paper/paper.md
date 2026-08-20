---
title: 'JWTForge: A JWT Vending Service for Testing, Fuzzing, and Security Research of OAuth2/OIDC Implementations'
authors:
  - name: Abhishek Tiwari
    orcid: 0000-0003-2222-2395
    affiliation: 1
affiliations:
 - name: Independent Researcher, New York, United States
   index: 1
date: 11 November 2025
bibliography: paper.bib
tags:
  - JWT
  - OAuth2
  - OIDC
  - security testing
  - security research
  - penetration testing
  - fuzzing
  - token generation
  - token exchange
  - token introspection
  - algorithm confusion
  - injection attacks
  - BLNS
  - grammar-based testing
---


# Summary

JWTForge is an open-source HTTP service that programmatically generates cryptographically signed JSON Web Tokens (JWT) for security testing, fuzzing, and integration testing of OAuth2 and OpenID Connect (OIDC) implementations. It can be run locally or deployed to Cloudflare Workers. JWTForge returns signed tokens transformed by one of four testing modes: *compliant* (Faker-generated realistic OIDC tokens), *fuzz* (Big List of Naughty Strings and boundary values), *malicious* (injection payloads), and *grammar* (categorical RFC-derived patterns). It supports three generation approaches — JSON payload, OAuth2 client_credentials [@rfc6749], and RFC 8693 token exchange [@rfc8693] — and exposes OIDC infrastructure endpoints (RFC 7662 introspection [@rfc7662], JWKS [@rfc7517], discovery [@openid_connect_discovery]). By addressing token *generation* rather than *manipulation*, JWTForge enables reproducible token corpora for CI/CD integration testing, robustness evaluation, and vulnerability research.

# Statement of need

Modern web applications rely extensively on OAuth2 [@rfc6749] and OpenID Connect [@openid_connect] for authentication and authorization. According to the OWASP Top 10 for 2025 [@owasp_top10_2025], broken access control is the leading security risk, with 100% of tested applications exhibiting some form of access control vulnerability. RFC 8725 [@rfc8725] documents systemic JWT implementation weaknesses — algorithm confusion, symmetric key substitution, and missing claim validation — that continue to manifest in production identity systems.

Systematic JWT security testing faces three obstacles. First, using production identity providers (Auth0, Okta, AWS Cognito) for testing risks exposing sensitive data, may violate terms of service, and introduces dependencies that undermine reproducibility. Second, manually constructing JWTs for edge-case testing is labor-intensive and error-prone across the combinatorial space of claims, headers, and encodings. Third, existing tools focus on exploitation of pre-existing tokens rather than systematic generation at scale.

The target audience is broad: security engineers running fuzzing campaigns; penetration testers conducting authorized assessments; researchers studying token validation defects; and developers building OAuth2/OIDC-protected APIs requiring realistic tokens for integration tests. Existing alternatives address only narrow slices of this need — supporting token tampering or brute-force secret recovery but lacking programmable generation, categorical coverage, or OIDC infrastructure. JWTForge fills this gap with a single deployable service combining automated generation, four testing modes, three generation approaches, and OIDC infrastructure for drop-in client library compatibility.

![JWTForge Swagger UI for generating tokens. JWTForge provides example token templates for various testing scenarios making it easier for users to generate JWT tokens.](./images/jwtforge-swagger-ui.png)

# State of the field

The JWT security tooling ecosystem comprises tools focused on exploitation, interactive editing, and brute-force secret recovery. **jwt_tool** [@jwt_tool] performs algorithm confusion attacks, brute-force HMAC recovery, and claim tampering, but requires an existing JWT as input. **JWT Editor** [@jwt_editor] and **JOSEPH** [@joseph] are Burp Suite extensions enabling interactive JWT modification within intercepted traffic; both require proxy-based interception and human interaction, precluding CI/CD integration. **JWT Cracker** [@jwt_cracker] focuses on HMAC-SHA256 secret brute-forcing. Cryptographic libraries such as **Nimbus JOSE+JWT** [@nimbus] support programmatic construction but require application-level code to assemble testing scenarios.

A *build vs. contribute* analysis motivates a new tool. The exploitation-focused tools (jwt_tool, JWT Editor, JOSEPH) are architected around the assumption that a token already exists and must be manipulated — adding generation, OIDC infrastructure, and categorical testing would require substantial architectural rework conflicting with their interactive, single-token operational models. Cryptographic libraries operate at the wrong abstraction layer: they provide signing primitives but require each consumer to assemble testing scenarios from scratch. JWTForge occupies a distinct architectural position — an HTTP service exposing testing modes as API parameters — complementing rather than replacing these tools. A representative workflow generates a token corpus with JWTForge and applies jwt_tool or JWT Editor to attack individual tokens, combining generation-side automation with exploitation-side depth. Table \ref{tab:comparison} summarises tool capabilities.

\begin{table}[ht]
\centering
\small
\begin{tabular}{|l|l|l|l|l|l|}
\hline
\textbf{Capability} & \textbf{JWTForge} & \textbf{jwt\_tool} & \textbf{JWT Editor} & \textbf{JOSEPH} & \textbf{JWT Cracker} \\
\hline
Token generation & $\checkmark$ & $\times$ & $\times$ & $\times$ & $\times$ \\
\hline
Automated fuzzing & $\checkmark$ & Limited & $\times$ & $\times$ & $\times$ \\
\hline
Injection payloads & $\checkmark$ & $\times$ & $\times$ & $\times$ & $\times$ \\
\hline
Algorithm confusion & $\checkmark$ & $\checkmark$ & Partial & Partial & $\times$ \\
\hline
OIDC infrastructure & $\checkmark$ & $\times$ & $\times$ & $\times$ & $\times$ \\
\hline
CI/CD integration & $\checkmark$ & Limited & $\times$ & $\times$ & $\checkmark$ \\
\hline
Signature tampering & Partial & $\checkmark$ & $\checkmark$ & $\checkmark$ & $\times$ \\
\hline
Brute-force cracking & $\times$ & $\checkmark$ & $\times$ & $\times$ & $\checkmark$ \\
\hline
Serverless deployment & $\checkmark$ & $\times$ & $\times$ & $\times$ & $\times$ \\
\hline
\end{tabular}
\vspace{0.5cm}
\caption{Comparative capabilities of JWT security tools. JWTForge occupies a distinct position within the JWT security ecosystem, addressing token \textit{generation} rather than token \textit{manipulation}. Checkmarks ($\checkmark$) indicate full support, crosses ($\times$) indicate no support, and ``Partial'' or ``Limited'' indicate restricted or partial functionality.}
\label{tab:comparison}
\end{table}

# Software design

JWTForge is implemented in JavaScript, exposing an HTTP API for token generation and OIDC infrastructure endpoints. It can be installed locally via `npm` or deployed with one click to Cloudflare Workers. The architecture is modular, separating request parsing, claim transformation, cryptographic key management, and response formatting.

## Token Generation Workflow

Token generation proceeds through five stages.

1. **Request Parsing:** The HTTP request body is parsed to extract JWT claims, metadata fields (`kty`, `mode`, `response_type`, `exclude`, `header_alg`, `header_kid`), and custom claims.

2. **OIDC Scope Processing:** In compliant mode (the default), when the `scope` parameter includes standard OIDC scopes (`openid`, `profile`, `email`, `address`, `phone`), JWTForge auto-populates corresponding claims using Faker.js [@faker], eliminating manual construction of OIDC-conformant claim sets [@openid_connect]. Fuzz, malicious, and grammar modes skip this step.

3. **Mode-Specific Transformations:** Based on the `mode` parameter and the caller-supplied `exclude` list, one of four transformation strategies is applied:

- *Compliant mode* (default): Faker-generated data is used without modification, producing tokens conformant with RFC 7519 and OIDC Core.
- *Fuzz mode*: One to three claims (excluding protected `iss`, `jti`, `kty`, `response_type`, and caller-excluded fields) are replaced with entries drawn uniformly at random from the BLNS corpus [@blns] (485 strings) augmented with edge cases (`null`, `undefined`, `Infinity`, `NaN`, deeply nested objects, large arrays, numeric boundaries).
- *Malicious mode*: Claims are replaced with injection payloads from ten categories: SQL, XSS, path traversal, command injection, LDAP, NoSQL, XXE, SSTI, header injection, and buffer overflow patterns.
- *Grammar mode*: Claims and header fields are populated using categorical patterns derived from RFC 7519 [@rfc7519], RFC 7518 [@rfc7518], and OIDC Core [@openid_connect]. Each claim and header field is associated with categories: `valid`, `edge_cases`, `type_variations`, `injection`, and `vulnerable`. The caller selects a category via the `grammar_category` parameter, providing deterministic, specification-based test coverage — complementing fuzz mode's stochastic exploration.

4. **Header Processing:** When `header_alg` or `header_kid` accompany fuzz or malicious modes, header-level transformations are applied: `alg` receives algorithm confusion variants (`none`/`None`/`NONE`/`nOnE`, symmetric key substitutions, BLNS patterns); `kid` receives BLNS, SQL injection, XSS, path traversal, and null-byte sequences. Grammar mode applies its own categorical header transformations independently of this fuzz/malicious gate.

5. **Signing and Response:** Modified claims are assembled with the JWT header and signed using the Web Crypto API [@w3c_webcrypto]. For hybrid flows (`response_type=id_token token`), access and ID tokens are generated independently.


![JWTForge token generation workflow. Three approaches (JSON payload, OAuth2 client credentials, RFC 8693 token exchange) converge to a common signing workflow. Solid arrows indicate primary flow; dashed arrows indicate conditional paths. \label{fig:workflow}](./images/jwtforge-overall-workflow.pdf){width=100%}

## Token Generation Approaches

JWTForge supports three operationally distinct generation approaches:

1. **Direct JSON Payload:** Clients submit claims as a JSON object, providing maximum flexibility for unit testing, integration testing, and adversarial payload injection. Custom claims, OIDC scopes, and modes are all supported.

2. **OAuth2 Client Credentials Grant (RFC 6749):** Clients authenticate via HTTP Basic auth and request tokens with `grant_type=client_credentials` and optional `scope`/`sub` parameters. Base claims are auto-generated, enabling testing of OAuth2-compliant endpoints and client authentication mechanisms.

3. **Token Exchange (RFC 8693):** Clients submit a subject token (JWT, ID token, or access token) with optional `add_claims`/`remove_claims` modifications, enabling testing of exchange scenarios, delegation flows, and claim transformation without access to the original issuer. The introspection endpoint validates exchanged tokens, completing the lifecycle.

## Workflow Scenarios

JWTForge supports two operational patterns (Figure \ref{fig:cicd}, Figure \ref{fig:researcher}). In CI/CD, a commit triggers local API and JWTForge deployment; Postman/Newman runs compliant, fuzz, and malicious tests, gating promotion to beta, gamma, and production. In security research, JWTForge generates adversarial tokens across all four modes to probe algorithm confusion, injection, and authorization bypass; researchers analyze target-API responses to produce reproducible, responsibly disclosed findings.

![CI/CD integration: commits trigger local API and JWTForge deployment, automated security testing, and promotion on success. \label{fig:cicd}](./images/jwtforge-cicd-workflow.pdf){width=100%}

![Researcher workflow: adversarial payload testing against target APIs via local or remote JWTForge. \label{fig:researcher}](./images/jwtforge-researcher-workflow.pdf){width=100%}

# Research impact

JWTForge enables several lines of research on authentication, authorization, and microservice observability that currently lack a programmable token generation infrastructure.

**Observability research in microservice architectures.** Empirical studies of microservices — collection of logs, metrics, and traces under authentication load — require reproducible token streams without the confounders of production identity providers [@bakhtin2025lo2; @nugraha2023performance]. JWTForge provides deterministic generation at sustained throughput (586 requests/second, 12 ms mean latency, zero error rate across 74,315 requests on a Mac M2 Pro), enabling controlled studies of authentication overhead and trace propagation across OAuth2-protected service meshes.

**JWT library performance and security evaluation.** Researchers studying JWT library performance across runtimes [@rahmatulloh2019performance] and security defects in validation logic [@yang2026token; @nugraha2023performance] currently construct ad hoc corpora. JWTForge's four modes supply reproducible corpora spanning realistic, stochastic, adversarial, and categorical patterns. Grammar mode supports systematic comparative evaluation: a fixed `(claim, grammar_category)` tuple yields the same input set across runs and libraries under test.

**Vulnerability discovery in OAuth2/OIDC implementations.** Research on JWT vulnerabilities — including key confusion [@xu2023jwtkey] and structural weaknesses [@zulkarneev2024json] — relies on adversarial token construction. JWTForge's malicious mode (ten injection categories) and `header_alg`/`header_kid` transformations operationalise these vectors as API parameters, lowering the marginal cost of constructing new attack variants.

**Black-box measurement studies.** Large-scale automated measurement of authentication implementations [@costa2026automated] requires combining token mutation with original request context replay. JWTForge's RFC 8693 token exchange [@rfc8693] supports this directly: a captured token can be exchanged into a mutated variant while preserving the surrounding request context.

# Availability

JWTForge is freely available from [GitHub](https://github.com/abhishektiwari/jwtforge) under the MIT license, with interactive OpenAPI documentation. The software can be installed via via `npm install -g abhishektiwari/jwtforge` for local CLI use or CI/CD automation, or deployed with one click to Cloudflare Workers for self-hosted access. A public hosted instance is available at [https://jwtforge.dev](https://jwtforge.dev) for immediate browser-based token generation and testing without installation.

# AI usage disclosure

AI tools were used for developing JWTForge, as well as for refactoring, test scaffolding, and documentation generation. AI tools were also used to assist with editing portions of this manuscript. All AI-assisted code and documentation outputs were reviewed, edited, validated, and tested by the human author, who takes full responsibility for the final software and paper. No figures or data were generated by AI.

# References

