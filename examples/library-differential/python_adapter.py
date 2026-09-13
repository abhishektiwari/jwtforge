#!/usr/bin/env python3
"""Run one JWT corpus through the selected Python verification libraries."""

from __future__ import annotations

import base64
import json
import signal
import sys
from pathlib import Path
from typing import Any, Callable

import jwt as pyjwt
from authlib.jose import JsonWebKey, JsonWebToken, jwt as authlib_jwt
from authlib.jose.errors import JoseError as AuthlibJoseError
from jose.exceptions import JOSEError as PythonJoseError
from jose import jwt as python_jose_jwt
from joserfc.errors import JoseError as JoseRFCError
from joserfc import jwt as joserfc_jwt
from joserfc.jwk import import_key as import_joserfc_key
from joserfc.jwt import JWTClaimsRegistry


Verifier = Callable[[Any, Any, dict[str, Any]], dict[str, Any]]


class ConfiguredJkuPolicyError(ValueError):
    """Raised by the experiment's disclosed application-level jku policy."""


def require_compact(token: Any) -> str:
    if not isinstance(token, str):
        raise NotImplementedError("JWT decoder accepts compact serialization only")
    return token


def enforce_jku_policy(token: str, policy: dict[str, Any]) -> None:
    encoded = token.split(".", 1)[0]
    encoded += "=" * (-len(encoded) % 4)
    header = json.loads(base64.urlsafe_b64decode(encoded).decode("utf-8"))
    jku = header.get("jku")
    if jku is not None and jku != policy["allowed_jku"]:
        raise ConfiguredJkuPolicyError(f"jku is not allowlisted: {jku}")


def verify_pyjwt_default(token: Any, key: Any, policy: dict[str, Any]) -> dict[str, Any]:
    kwargs: dict[str, Any] = {}
    if policy["case_category"] != "audience":
        # As with python-jose below, isolate non-audience experiments from the
        # aud claim that JWTForge always emits.
        kwargs["audience"] = policy["audience"]
    return pyjwt.decode(require_compact(token), key, **kwargs)


def verify_pyjwt_configured(token: Any, key: Any, policy: dict[str, Any]) -> dict[str, Any]:
    return pyjwt.decode(
        require_compact(token), key, algorithms=policy["algorithms"],
        audience=policy["audience"], issuer=policy["issuer"],
    )


def verify_authlib_default(token: Any, key: Any, _policy: dict[str, Any]) -> dict[str, Any]:
    claims = authlib_jwt.decode(require_compact(token), key)
    claims.validate()
    return dict(claims)


def verify_authlib_configured(token: Any, key: Any, policy: dict[str, Any]) -> dict[str, Any]:
    jwt = JsonWebToken(policy["algorithms"])
    claims = jwt.decode(require_compact(token), key, claims_options={
        "iss": {"essential": True, "value": policy["issuer"]},
        "aud": {"essential": True, "value": policy["audience"]},
    })
    claims.validate()
    return dict(claims)


def verify_joserfc_default(token: Any, key: Any, _policy: dict[str, Any]) -> dict[str, Any]:
    decoded = joserfc_jwt.decode(require_compact(token), key)
    JWTClaimsRegistry().validate(decoded.claims)
    return decoded.claims


def verify_joserfc_configured(token: Any, key: Any, policy: dict[str, Any]) -> dict[str, Any]:
    decoded = joserfc_jwt.decode(require_compact(token), key, algorithms=policy["algorithms"])
    JWTClaimsRegistry(
        iss={"essential": True, "value": policy["issuer"]},
        aud={"essential": True, "value": policy["audience"]},
    ).validate(decoded.claims)
    return decoded.claims


def verify_python_jose_default(token: Any, key: Any, policy: dict[str, Any]) -> dict[str, Any]:
    kwargs: dict[str, Any] = {}
    if policy["case_category"] != "audience":
        # JWTForge always emits aud. Supply the known-good value so audience
        # validation cannot mask an experiment about another dimension.
        kwargs["audience"] = policy["audience"]
    return python_jose_jwt.decode(require_compact(token), key, **kwargs)


def verify_python_jose_configured(token: Any, key: Any, policy: dict[str, Any]) -> dict[str, Any]:
    return python_jose_jwt.decode(
        require_compact(token), key, algorithms=policy["algorithms"],
        audience=policy["audience"], issuer=policy["issuer"],
    )


def classify(
    case: dict[str, Any],
    library: str,
    profile: str,
    verifier: Verifier,
    key: Any,
    policy: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(case["token"], str):
        return {
            "case_id": case["id"],
            "experiment_id": case.get("profile_case_ids", {}).get(profile, case["id"]),
            "library": library, "language": "Python", "profile": profile,
            "status": "unsupported", "verification_attempted": False,
            "verification_decision": "not-attempted", "error_classification": None,
            "interface_classification": "compact-jwt-only-precheck",
            "error_class": "UnsupportedSerialization",
            "message": "JWT decoder accepts compact serialization only",
        }

    def timeout_handler(_signum: int, _frame: Any) -> None:
        raise TimeoutError("verification exceeded 5 seconds")

    previous_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.setitimer(signal.ITIMER_REAL, 5.0)
    try:
        compact = case["token"]
        if profile == "configured":
            # Common application policy; the libraries have no uniform native
            # jku allowlist option and this code never dereferences the URL.
            enforce_jku_policy(compact, policy)
        claims = verifier(compact, key, {**policy, "case_category": case["category"]})
        return {
            "case_id": case["id"],
            "experiment_id": case.get("profile_case_ids", {}).get(profile, case["id"]),
            "library": library, "language": "Python",
            "profile": profile, "status": "accepted", "verification_attempted": True,
            "verification_decision": "accepted", "error_classification": None,
            "subject": claims.get("sub"),
        }
    except TimeoutError as error:
        status = "rejected"
        classification = "timeout"
        error_class = type(error).__name__
        message = str(error)
    except Exception as error:  # Each library exposes its own rejection hierarchy.
        status = "rejected"
        documented_types = {
            "PyJWT": pyjwt.exceptions.PyJWTError,
            "Authlib": AuthlibJoseError,
            "joserfc": JoseRFCError,
            "python-jose": PythonJoseError,
        }
        classification = (
            "documented-validation-exception"
            if isinstance(error, (documented_types[library], ConfiguredJkuPolicyError))
            else "other-exception"
        )
        error_class = type(error).__name__
        message = str(error)
    except BaseException as error:
        status = "rejected"
        classification = "crash"
        error_class = type(error).__name__
        message = str(error)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous_handler)

    return {
        "case_id": case["id"],
        "experiment_id": case.get("profile_case_ids", {}).get(profile, case["id"]),
        "library": library, "language": "Python",
        "profile": profile, "status": status, "verification_attempted": True,
        "verification_decision": "rejected", "error_classification": classification,
        "error_class": error_class, "message": message,
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python_adapter.py CORPUS.json", file=sys.stderr)
        return 2

    corpus = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    policy = corpus["configured_policy"]
    jwk = next(key for key in corpus["jwks"]["keys"] if key.get("kty") == "RSA")
    keys = {
        "PyJWT": pyjwt.PyJWK.from_dict(jwk),
        "Authlib": JsonWebKey.import_key(jwk),
        "joserfc": import_joserfc_key(jwk),
        "python-jose": jwk,
    }
    adapters: dict[str, dict[str, Verifier]] = {
        "PyJWT": {"policy-unconfigured": verify_pyjwt_default, "configured": verify_pyjwt_configured},
        "Authlib": {"policy-unconfigured": verify_authlib_default, "configured": verify_authlib_configured},
        "joserfc": {"policy-unconfigured": verify_joserfc_default, "configured": verify_joserfc_configured},
        "python-jose": {"policy-unconfigured": verify_python_jose_default, "configured": verify_python_jose_configured},
    }

    results: list[dict[str, Any]] = []
    for case in corpus["cases"]:
        for library, profiles in adapters.items():
            for profile, verifier in profiles.items():
                results.append(classify(case, library, profile, verifier, keys[library], policy))

    json.dump(results, sys.stdout, separators=(",", ":"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
