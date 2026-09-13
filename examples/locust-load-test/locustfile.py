"""Locust workload for reproducible JWTForge token-generation load tests."""

from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Any

from locust import HttpUser, constant, events, task


PROFILES = ("fake", "fuzz", "malicious", "grammar")


@events.init_command_line_parser.add_listener
def add_profile_argument(parser: Any) -> None:
    parser.add_argument(
        "--workload-profile",
        choices=(*PROFILES, "mixed"),
        default=os.environ.get("JWT_LOAD_PROFILE", "fake"),
        help="JWTForge generation workload to execute (default: fake)",
    )
    parser.add_argument(
        "--raw-summary",
        default="",
        help="Write exact final aggregate statistics to this JSON path",
    )


@events.test_stop.add_listener
def write_raw_summary(environment: Any, **_kwargs: Any) -> None:
    destination = environment.parsed_options.raw_summary
    if not destination:
        return
    total = environment.runner.stats.total
    document = {
        "requests": total.num_requests,
        "failures": total.num_failures,
        "requests_per_second": total.total_rps,
        "failures_per_second": total.total_fail_per_sec,
        "average_response_time_ms": total.avg_response_time,
        "minimum_response_time_ms": total.min_response_time or 0,
        "maximum_response_time_ms": total.max_response_time,
        "p50_response_time_ms": total.get_response_time_percentile(0.50),
        "p95_response_time_ms": total.get_response_time_percentile(0.95),
        "p99_response_time_ms": total.get_response_time_percentile(0.99),
    }
    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(document, indent=2)}\n", encoding="utf-8")


def request_for(profile: str) -> dict[str, Any]:
    common_body = {
        "sub": "locust-subject",
        "scope": "openid profile email",
        "roles": ["reader"],
    }
    if profile == "fake":
        return {"mode": "fake", "body": common_body}
    if profile == "fuzz":
        return {
            "mode": "fuzz",
            "exclude": ["iss", "sub"],
            "body": common_body,
        }
    if profile == "malicious":
        return {
            "mode": "malicious",
            "malicious_category": "sql_injection",
            "exclude": ["iss", "sub"],
            "body": common_body,
        }
    if profile == "grammar":
        return {
            "mode": "grammar",
            "grammar_category": "edge_cases",
            "exclude": ["iss", "sub"],
            "body": common_body,
        }
    raise ValueError(f"unsupported workload profile: {profile}")


class JWTForgeTokenUser(HttpUser):
    """Continuously request tokens and validate the response contract."""

    wait_time = constant(0)

    def on_start(self) -> None:
        self._mixed_index = 0

    def next_profile(self) -> str:
        configured = self.environment.parsed_options.workload_profile
        if configured != "mixed":
            return configured
        profile = PROFILES[self._mixed_index % len(PROFILES)]
        self._mixed_index += 1
        return profile

    @task
    def generate_token(self) -> None:
        profile = self.next_profile()
        with self.client.post(
            "/token",
            json=request_for(profile),
            name=f"POST /token [{profile}]",
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"unexpected HTTP status {response.status_code}")
                return
            try:
                document = response.json()
            except ValueError:
                response.failure("response body is not JSON")
                return
            token = document.get("access_token")
            if not isinstance(token, (str, dict)):
                response.failure("response does not contain an access_token")
