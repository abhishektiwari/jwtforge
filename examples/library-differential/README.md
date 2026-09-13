# JWT Library Differential Experiment

This example uses JWTForge to generate one controlled JWT corpus and compares how selected JavaScript and Python libraries verify it under policy-unconfigured and explicitly configured profiles. It is inspired by differential-testing methodology, but it is intentionally a small, reproducible example rather than a reproduction of JWTeemo's coverage-guided campaign.

The selected implementations are:

| Language | Library | Version |
|---|---|---:|
| JavaScript | [`jose`](https://github.com/panva/jose) | 6.2.12 |
| JavaScript | [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) | 9.0.3 |
| JavaScript | [`fast-jwt`](https://github.com/nearform/fast-jwt) | 6.3.3 |
| Python | [PyJWT](https://github.com/jpadilla/pyjwt) | 2.14.0 |
| Python | [Authlib](https://github.com/authlib/authlib) | 1.8.0 |
| Python | [joserfc](https://github.com/authlib/joserfc) | 1.7.5 |
| Python | [python-jose](https://github.com/mpdavis/python-jose) | 3.5.0 |


## Run the experiment

Use Node.js 22 or later for the JWTForge development server and Python 3 with
`venv` and `pip` available. From the repository root, create a virtual environment
and install the pinned dependencies:

```bash
cd examples/library-differential
python3 -m venv .venv
source .venv/bin/activate
make setup
```

Keep this environment active when running the experiment. The Makefile defaults
to `python3` on your `PATH`. To select another interpreter without activation,
pass `PYTHON=/path/to/venv/bin/python` to both `make setup` and `make run`.

Start JWTForge from the repository root in another terminal:

```bash
npm run dev
```

Then run the experiment from this directory:

```bash
make run
```

Alternative endpoints and corpus claim values can be supplied explicitly:

```bash
make run \
  JWT_FORGE_URL=http://localhost:8787 \
  JWT_ISSUER=http://localhost:8787 \
  JWT_AUDIENCE=https://library-differential.example
```

The ignored `generated/` directory contains:

- `corpus.json`: the exact evaluated tokens, descriptions, expectations, generation requests, reference clock, corpus parameters, JWTForge revision, and JWKS;
- `results.json`: authorization decisions, failure classifications, and library-specific outcomes for both profiles; and
- `report.md`: policy-unconfigured and configured comparison tables plus failure details.

## Experimental method

JWTForge first issues a compact RS256 signed control. It then generates signed claim and header variants and derives signature, payload, and serialization variants through `/mutation`. Every adapter receives the same trusted public key and evaluates every case twice:

- The **policy-unconfigured profile** uses key-only library verification. PyJWT receives the JWTForge `PyJWK`; Authlib decodes and then calls `claims.validate()` without `claims_options`; and joserfc uses an empty `JWTClaimsRegistry`. The documented exception is PyJWT and python-jose in non-audience cases: they receive the known-good audience because JWTForge always emits `aud`, preventing audience handling from masking issuer, `jku`, timing, type, or integrity behavior.
- The **configured profile** uses each library's native options to restrict the algorithm to RS256 and require the configured issuer and audience. A common application-level precheck also permits an absent `jku` or the configured JWTForge JWKS URL and rejects any other `jku`. This is harness policy, not a claim that every library implements a native `jku` allowlist, and the harness never fetches a URL from the token.

The implementation is separated by responsibility: `corpus.mjs` generates and records the JWTForge inputs, `javascript_adapters.mjs` contains the JavaScript verifier integrations, `python_adapter.py` contains the Python integrations, `report.mjs` analyzes and renders outcomes, and `experiment.mjs` only orchestrates a run.

JWTForge always inserts an `aud` claim, so the corpus uses the known-good configured audience for cases that study another dimension. Audience behavior is tested independently with matching scalar, matching array, and mismatched values. In those three cases the policy-unconfigured profile supplies no expected audience—including to python-jose—while the configured profile supplies it. This directly compares behavior when audience validation is unconfigured with behavior when it is configured.

The scalar and array rows therefore use profile-specific experiment identifiers—for example, `scalar-audience-without-expected-audience-config` and `scalar-audience-with-expected-audience-config`—while sharing the same underlying `scalar-audience` token. This ensures that verifier configuration, rather than token generation, is the changed variable.

The signed control records whether the libraries agree before mutations are considered. Each outcome is normalized to `accepted`, `rejected`, or `unsupported`, separately for each profile. It also records whether verification was attempted and classifies a failed attempt as `documented-validation-exception`, `other-exception`, `timeout`, or `crash`. This keeps non-acceptance separate from graceful error handling. Cases marked `observe` have no required acceptance decision and are excluded from required-expectation failure counts.

Flattened and general JWS values are classified as `unsupported` by the harness before the selected compact-JWT verification function is called. These outcomes characterize an interface boundary; they do not exercise a library's separate JWS JSON parser, if one exists.

The corpus records the UTC reference clock, a zero-second verifier tolerance, and the JWTForge release and commit. Timing cases are regenerated relative to the clock of each run. The retained tokens and outcomes preserve the exact evaluated artifacts, including random values resolved by JWTForge; replaying an old expiring token later is not equivalent to regenerating the case.

This distinction matters:

- A divergence is a lead for manual investigation, not a vulnerability finding.
- Acceptance of an alternate issuer in the policy-unconfigured profile is expected when an application has not configured an issuer. The configured profile is expected to reject it.
- Flattened and general JWS inputs are marked `unsupported` by adapters whose JWT verification API accepts compact serialization only. That expected API boundary is not a security defect.
- The `jku` cases supply the trusted key directly to every adapter. Default-profile acceptance means the header was ignored. Configured-profile rejection of the untrusted URL is produced by the disclosed application-level allowlist and does not test remote-key retrieval.
- Per-token timing is deliberately excluded. This example evaluates acceptance semantics, not resource-exhaustion behavior or performance.
- Run the experiment only against JWTForge instances and systems you are authorized to test.

## Clean generated output

Run `make clean` from this experiment directory to remove `generated/`. If you
used a custom output directory, pass the same value: `make clean OUT_DIR=results`.
Dependencies and the virtual environment are preserved.
