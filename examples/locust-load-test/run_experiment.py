#!/usr/bin/env python3
"""Run a warm-up and measured Locust experiment and summarize its outputs."""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def nonnegative_float(value: str) -> float:
    parsed = float(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be zero or greater")
    return parsed


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="http://localhost:8787")
    parser.add_argument("--profile", choices=("fake", "fuzz", "malicious", "grammar", "mixed"), default="fake")
    parser.add_argument("--users", type=positive_int, default=50)
    parser.add_argument("--spawn-rate", type=positive_int, default=10)
    parser.add_argument("--warmup", default="10s", help="Locust run-time expression for warm-up")
    parser.add_argument("--duration", default="60s", help="Locust run-time expression for measurement")
    parser.add_argument("--output-dir", type=Path, default=Path("generated"))
    parser.add_argument("--max-failure-rate", type=nonnegative_float, default=0.0)
    parser.add_argument("--min-rps", type=nonnegative_float, default=0.0)
    parser.add_argument("--max-p95-ms", type=nonnegative_float, default=0.0)
    parser.add_argument("--skip-warmup", action="store_true")
    return parser.parse_args()


def locust_command(args: argparse.Namespace, run_time: str) -> list[str]:
    return [
        sys.executable,
        "-m",
        "locust",
        "-f",
        str(Path(__file__).with_name("locustfile.py")),
        "--host",
        args.host,
        "--headless",
        "--users",
        str(args.users),
        "--spawn-rate",
        str(args.spawn_rate),
        "--run-time",
        run_time,
        "--workload-profile",
        args.profile,
        "--stop-timeout",
        "10",
        "--only-summary",
    ]


def write_summary(args: argparse.Namespace, raw_path: Path, started_at: str) -> dict[str, Any]:
    aggregate = json.loads(raw_path.read_text(encoding="utf-8"))
    requests = int(aggregate["requests"])
    failures = int(aggregate["failures"])
    aggregate["failure_rate"] = failures / requests if requests else 0.0
    summary = {
        "schema_version": 1,
        "started_at": started_at,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "environment": {
            "host": args.host,
            "workload_profile": args.profile,
            "users": args.users,
            "spawn_rate_per_second": args.spawn_rate,
            "warmup": None if args.skip_warmup else args.warmup,
            "duration": args.duration,
            "python": platform.python_version(),
            "locust": importlib.metadata.version("locust"),
            "platform": platform.platform(),
            "machine": platform.machine(),
        },
        "aggregate": aggregate,
        "thresholds": {
            "max_failure_rate": args.max_failure_rate,
            "min_requests_per_second": args.min_rps or None,
            "max_p95_response_time_ms": args.max_p95_ms or None,
        },
    }
    failures_list = []
    aggregate = summary["aggregate"]
    if aggregate["failure_rate"] > args.max_failure_rate:
        failures_list.append(
            f"failure rate {aggregate['failure_rate']:.6f} exceeds {args.max_failure_rate:.6f}"
        )
    if args.min_rps and aggregate["requests_per_second"] < args.min_rps:
        failures_list.append(
            f"request rate {aggregate['requests_per_second']:.2f} is below {args.min_rps:.2f}"
        )
    if args.max_p95_ms and aggregate["p95_response_time_ms"] > args.max_p95_ms:
        failures_list.append(
            f"p95 {aggregate['p95_response_time_ms']:.2f} ms exceeds {args.max_p95_ms:.2f} ms"
        )
    summary["threshold_failures"] = failures_list

    summary_path = args.output_dir / "summary.json"
    summary_path.write_text(f"{json.dumps(summary, indent=2)}\n", encoding="utf-8")
    markdown = [
        "# JWTForge Locust Load-Test Summary",
        "",
        f"- Profile: **{args.profile}**",
        f"- Users: **{args.users}**",
        f"- Duration: **{args.duration}**",
        f"- Requests: **{requests}**",
        f"- Failures: **{failures}** ({aggregate['failure_rate']:.4%})",
        f"- Throughput: **{aggregate['requests_per_second']:.2f} requests/s**",
        f"- Mean response time: **{aggregate['average_response_time_ms']:.2f} ms**",
        f"- p95 response time: **{aggregate['p95_response_time_ms']:.2f} ms**",
        f"- p99 response time: **{aggregate['p99_response_time_ms']:.2f} ms**",
        "",
    ]
    if failures_list:
        markdown.extend(["## Threshold failures", "", *[f"- {message}" for message in failures_list], ""])
    (args.output_dir / "summary.md").write_text("\n".join(markdown), encoding="utf-8")
    return summary


def main() -> int:
    args = arguments()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    if not args.skip_warmup:
        print(f"Warm-up: {args.warmup} with {args.users} users")
        subprocess.run(locust_command(args, args.warmup), check=True)

    prefix = args.output_dir / "jwtforge"
    raw_path = args.output_dir / "locust-final-stats.json"
    command = [
        *locust_command(args, args.duration),
        "--csv",
        str(prefix),
        "--csv-full-history",
        "--html",
        str(args.output_dir / "report.html"),
        "--raw-summary",
        str(raw_path),
    ]
    started_at = datetime.now(timezone.utc).isoformat()
    print(f"Measurement: {args.duration} with {args.users} users")
    subprocess.run(command, check=True)
    summary = write_summary(args, raw_path, started_at)
    aggregate = summary["aggregate"]
    print(
        f"Summary: {aggregate['requests']} requests, "
        f"{aggregate['requests_per_second']:.2f} requests/s, "
        f"{aggregate['p95_response_time_ms']:.2f} ms p95, "
        f"{aggregate['failures']} failures"
    )
    print(f"Artifacts: {args.output_dir.resolve()}")
    return 1 if summary["threshold_failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
