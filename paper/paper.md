---
title: 'JWTForge: Controlled JWT Generation and Mutation for JWT Library Research and Application Security Testing'
authors:
  - name: Abhishek Tiwari
    orcid: 0000-0003-2222-2395
    affiliation: 1
affiliations:
 - name: Independent Researcher, New York, United States
   index: 1
date: 11 September 2026
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
  - token mutation
  - token exchange
  - token introspection
  - algorithm confusion
  - format confusion
  - injection attacks
  - BLNS
  - grammar-based testing
---


# Summary

Security research, fuzzing, and integration testing of JSON Web Token (JWT)-based implementations require controlled corpora spanning synthetic identities, malformed values, adversarial claims, cryptographic deviations, and serialization boundaries. JWTForge is an open-source HTTP service that produces these corpora locally or on Cloudflare Workers. Its *fake*, *fuzz*, *malicious*, and *grammar* modes generate synthetic identities, boundary values, injection payloads, and categorical cases. It accepts direct JSON, OAuth2 client-credentials requests [@rfc6749], and test-only token exchange [@rfc8693]. A separate mutation endpoint derives independent header, claim, signature, and format variants without automatic re-signing. JWTForge emits compact JWTs and JWS JSON Serialization, publishes discovery metadata and keys [@rfc7517], and associates bounded tests with protected operations through an OpenAPI-based Pentest Generator. These interfaces support reproducible CI/CD regression, fuzzing, black-box measurement, and authorized application or library research.

# Statement of need

Modern applications rely on OAuth2 [@rfc6749] and OpenID Connect [@openid_connect] for authentication and authorization. Broken access control remains the leading OWASP Top 10 risk [@owasp_top10_2025]. RFC 8725 documents recurring JWT weaknesses such as algorithm confusion, symmetric-key substitution, and missing claim validation [@rfc8725]. Research has also demonstrated sign/encrypt confusion, polyglot-token format confusion, denial-of-service attacks, and persistent parser defects across JWT libraries [@tervoort2023three; @yang2026token].

Systematic testing faces three obstacles. Using production identity providers can expose sensitive data and introduces rate limits, policy constraints, network dependence, and changing keys that weaken reproducibility. Manual construction is laborious and error-prone across combinations of claims, headers, signatures, and serializations. Existing tools often begin with captured tokens rather than supplying programmable test issuers and reproducible corpora.

JWTForge serves security engineers running fuzzing or regression campaigns, penetration testers conducting authorized assessments, researchers examining verifier behavior, and developers of protected APIs. It combines programmable generation, categorical and stochastic modes, controlled mutation, and test OIDC infrastructure in one deployable service. The same interface can supply realistic baselines and controlled negative cases without application-specific token-building code.

![JWTForge Swagger UI for generating tokens. JWTForge provides example token templates for various testing scenarios making it easier for users to generate JWT tokens.](./images/jwtforge-swagger-ui.png)

# State of the field

JWT security tools address different layers. **jwt_tool** analyzes and tampers with tokens, supports direct application scanning, and performs HMAC recovery [@jwt_tool]. **JWT Editor** and **JOSEPH** integrate interactive modification into Burp Suite [@jwt_editor; @joseph]; these proxy workflows preserve request context but normally involve an operator. **JWT Cracker** specializes in HMAC-SHA256 recovery [@jwt_cracker]. **JWTeemo** systematically tests JWS and JWE library behavior, including format-confusion classes, rather than providing an application test issuer [@jwteemo; @yang2026token]. **Nimbus JOSE+JWT** provides general Java primitives but leaves corpus policy, service fixtures, and orchestration to the application [@nimbus].

JWTForge complements these tools by combining an HTTP test issuer, reproducible corpus generation, explicit mutation, and endpoint-ready traffic. Table \ref{tab:comparison} summarizes scope rather than equivalent operator coverage.

\begin{table}[ht]
\centering
\scriptsize
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline
\textbf{Capability} & \textbf{JWTForge} & \textbf{jwt\_tool} & \textbf{JWT Editor} & \textbf{JOSEPH} & \textbf{JWT Cracker} & \textbf{JWTeemo} \\
\hline
Token generation & $\checkmark$ & $\times$ & $\times$ & $\times$ & $\times$ & Limited \\
\hline
JWS testing & $\checkmark$ & $\checkmark$ & $\checkmark$ & $\checkmark$ & Limited & $\checkmark$ \\
\hline
JWE testing & $\times$ & Limited & $\checkmark$ & Partial & $\times$ & $\checkmark$ \\
\hline
Automated fuzzing & $\checkmark$ & Limited & $\times$ & $\times$ & $\times$ & $\checkmark$ \\
\hline
Injection payloads & $\checkmark$ & $\times$ & $\times$ & $\times$ & $\times$ & Partial \\
\hline
Algorithm confusion & $\checkmark$ & $\checkmark$ & Partial & Partial & $\times$ & $\checkmark$ \\
\hline
Format confusion & $\checkmark$ & $\times$ & Partial & $\times$ & $\times$ & $\checkmark$ \\
\hline
OIDC infrastructure & $\checkmark$ & $\times$ & $\times$ & $\times$ & $\times$ & $\times$ \\
\hline
CI/CD integration & $\checkmark$ & Limited & $\times$ & $\times$ & $\checkmark$ & Limited \\
\hline
OpenAPI-based Pentest Generator & $\checkmark$ & $\times$ & $\times$ & $\times$ & $\times$ & $\times$ \\
\hline
Signature tampering & $\checkmark$ & $\checkmark$ & $\checkmark$ & $\checkmark$ & $\times$ & $\checkmark$ \\
\hline
Brute-force workflow support & Partial & $\checkmark$ & $\times$ & $\times$ & $\checkmark$ & $\times$ \\
\hline
\end{tabular}
\vspace{0.5cm}
\caption{Scope comparison of JWT security tools. Checkmarks indicate support, crosses indicate no support, and ``Partial'' or ``Limited'' indicate restricted functionality. JWTForge's partial brute-force workflow support supplies tokens and mutations to an external harness; it does not enumerate or verify candidate secrets.}
\label{tab:comparison}
\end{table}

# Software design

JWTForge (see Figure \ref{fig:test-execution}) is a JavaScript HTTP API for token generation, mutation, and OIDC infrastructure, installable via `npm` or deployable to Cloudflare Workers. It requires Node.js 22 or later and uses the Web Crypto API for RSA-2048/RS256 and P-256/ES256 operations [@w3c_webcrypto]. Its modules separate request parsing, claim transformation, mutation, key management, and response formatting.

![JWTForge test execution from token request through protected API invocation and response evaluation. \label{fig:test-execution}](./images/jwtforge-test-execution-overview.pdf){width=100%}

## Token Generation Workflow

Generation parses structured headers, claims, signature controls, and options before applying OIDC scope defaults and the selected mode. Explicit claims take precedence over generated defaults, while an exclusion list preserves control variables during stochastic runs. In `fake` mode, standard scopes populate Faker-backed claims [@faker; @openid_connect]; the other modes apply BLNS and boundary values, categorized injection strings, or grammar-derived values. Header options select algorithm and key identifiers, after which Web Crypto signs the result [@w3c_webcrypto]. Output is a compact JWT by default, with flattened and general JWS JSON Serialization available for representation-boundary testing. Hybrid access-token and ID-token responses are generated independently.


![JWTForge generation and mutation workflows. Token exchange bypasses generation-mode transforms and issues compact RS256 tokens. Mutation independently transforms an imported or generated source without automatic re-signing. Dashed arrows indicate conditional paths. \label{fig:workflow}](./images/jwtforge-overall-workflow-v2.pdf){width=100%}

## Token Generation and Mutation Approaches

JWTForge supports three generation approaches and a separate mutation endpoint:

1. **Direct JSON Payload:** Clients submit claims as a JSON object, providing maximum flexibility for unit testing, integration testing, and adversarial payload injection. Custom claims, OIDC scopes, and modes are all supported.

2. **OAuth2 Client Credentials Grant (RFC 6749):** Clients authenticate via HTTP Basic auth and request tokens with `grant_type=client_credentials` and optional `scope`/`sub` parameters. Base claims are auto-generated, enabling testing of OAuth2-compliant endpoints and client authentication mechanisms.

3. **Token Exchange (RFC 8693):** Clients submit a compact subject token with optional `add_claims`/`remove_claims` transformations and receive a newly signed compact RS256 token. JWTForge decodes rather than authenticates the subject and does not enforce delegation policy, so this path is a testing fixture rather than a production token service.

4. **Token Mutation:** `POST /mutation` applies explicit operation groups to imported or generated tokens, returning one independent variant per group without automatic re-signing. Operations edit headers and claims, remove/replace/truncate signatures, flip signature bits, or losslessly convert JWS formats. Untouched encoded segments are preserved, and response metadata identifies signing-input changes. General JWS supports per-signature targeting; JWE is unsupported.

JSON token-generation requests can produce compact JWTs or JWS JSON Serialization outputs; token exchange issues compact RS256 tokens. These outputs support representation-boundary testing inspired by polyglot-token attacks reported in prior JWT research [@tervoort2023three]. Whether a JSON-form token is accepted or creates a security impact depends on the target parser, verification interface, and configured token profile; generating the representation does not by itself establish arbitrary token forgery.

## Workflow Scenarios

JWTForge supports CI/CD and authorized-research workflows (Figures \ref{fig:cicd} and \ref{fig:researcher}). CI pipelines run generation and mutation cases before promotion; researchers compare controlled variants with an accepted baseline to investigate parser, validation, injection, and authorization behavior.

Its OpenAPI-based Pentest Generator discovers protected operations, derives authentication and authorization assessment plans, and runs bounded probes for issuer, audience, scope, role, signature, key, and format handling.

A FastAPI example supplies curated Postman/Newman collections covering authentication, scopes, roles, permissions, compound policies, and object ownership. A disposable Express PetStore example verifies signatures and enforces issuer, audience, expiration, scopes, roles, and a tenant claim; its OpenAPI contract drives the Pentest Generator. Together they demonstrate curated and specification-derived application workflows.

JWTForge also includes a [reproducible library-differential example](https://github.com/abhishektiwari/jwtforge/tree/main/examples/library-differential). It applies one 23-case JWTForge corpus to three JavaScript and four Python libraries under policy-unconfigured and explicitly configured profiles. The harness retains the exact requests and generated tokens, JWTForge source revision, reference clock, normalized verification decisions, and separate exception classifications. Differences are reported as investigation leads rather than vulnerability declarations.

![CI/CD integration: generation probes and optional custom mutation batches test target decisions against a baseline before promotion. \label{fig:cicd}](./images/jwtforge-cicd-workflow.pdf){width=100%}

![Researcher workflow: generate adversarial tokens or mutate captured/generated sources, then replay baseline and variant tokens against target APIs. \label{fig:researcher}](./images/jwtforge-researcher-workflow.pdf){width=100%}

# Research impact

JWTForge enables several lines of research on authentication, authorization, and microservice observability that currently lack a programmable token generation infrastructure.

**Observability research in microservice architectures.** Empirical studies of logs, metrics, and traces under authentication load require locally controlled token streams without production identity-provider confounders [@bakhtin2025lo2; @nugraha2023performance].

**Security evaluation and vulnerability discovery.** Researchers studying JWT performance and validation defects often construct ad hoc corpora [@rahmatulloh2019performance; @yang2026token; @nugraha2023performance]. JWTForge supplies reproducible realistic, stochastic, adversarial, and categorical token sets. Its malicious mode, grammar mode, and header transformations operationalise key confusion [@xu2023jwtkey], injection, format-confusion, and claim-handling tests as API parameters. A [load test](https://github.com/abhishektiwari/jwtforge/tree/main/examples/locust-load-test) demonstrates more than 600 token-generation requests per second in one local workload. This throughput and controlled mutation can supply inputs for external brute-force workflows; secret enumeration and candidate-signature verification remain the responsibility of the external harness.

**Black-box measurement studies.** Large-scale automated measurement of authentication implementations [@costa2026automated] requires combining token mutation with original request context replay. JWTForge's mutation endpoint derives variants from captured tokens without re-signing. An external test harness replays these variants in the original request context and compares target responses with the baseline.


# Availability

JWTForge is freely available from [GitHub](https://github.com/abhishektiwari/jwtforge) under the MIT license, with interactive OpenAPI documentation. The software can be installed locally via `npm install -g abhishektiwari/jwtforge` for CLI use or CI/CD automation, or deployed with one click to Cloudflare Workers for self-hosted access. A public hosted instance is available at [https://jwtforge.dev](https://jwtforge.dev) for immediate browser-based token generation and testing without installation.

# AI usage disclosure

AI tools were used for developing JWTForge. AI tools were also used to assist with editing portions of this manuscript. All AI-assisted code outputs were reviewed, validated, and tested by the human author, who takes full responsibility for the final software and paper. No figures or data were generated by AI.

# References
