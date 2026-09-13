# JWTForge Locust Load-Test Experiment

This experiment measures JWTForge token-generation throughput, failures, and response-time percentiles with [Locust](https://locust.io/). It is a reproducible local benchmark, not a claim about hosted Cloudflare Worker performance or a comparison with another product.

## Experimental design

The default run uses a closed workload of 50 concurrent Locust users with no wait time. It warms the service for 10 seconds and then records a separate 60-second measurement. Every response must return HTTP 200 JSON containing an access token; contract violations count as failures.

Five workload profiles are available:

| Profile | JWTForge request |
|---|---|
| fake | Realistic OIDC identity generation; the default benchmark |
| fuzz | Fuzz generation with issuer and subject held constant |
| malicious | SQL-injection claim payload generation |
| grammar | Grammar-derived edge-case generation |
| mixed | Deterministic round-robin use of the four profiles per simulated user |

Do not combine results from different profiles as though they measured the same operation. Record hardware, operating system, JWTForge revision, Node.js version, key backend, user count, spawn rate, warm-up, duration, and whether the Worker ran locally or remotely.

## Run

Use Python 3 with `venv` and `pip` available. From the repository root, create a
virtual environment and install the pinned Locust release:

~~~bash
cd examples/locust-load-test
python3 -m venv .venv
source .venv/bin/activate
make setup
~~~

Keep this environment active when running the experiment or the Locust UI. The
Makefile defaults to `python3` on your `PATH`. To select another interpreter
without activation, pass `PYTHON=/path/to/venv/bin/python` to `make setup`,
`make run`, and `make ui`.

Start JWTForge from the repository root in another terminal using Node.js 22 or later:

~~~bash
npm run dev
~~~

## Run with the Locust UI

Start the interactive Locust server with the default fake-token workload:

~~~bash
make ui
~~~

Then open [http://localhost:8089](http://localhost:8089). On the **Start new load test** screen, enter:

- **Number of users:** 50
- **Ramp up:** 10 users per second
- **Host:** http://localhost:8787

Select **Start swarming**. The Statistics page reports current request rate, failures, and response-time percentiles. Use the Charts and Failures tabs to inspect behavior during the run. Stop the measurement from the Locust UI before changing the user count or workload.

The workload profile is selected when Locust starts. Restart the UI with one of the supported profiles:

~~~bash
make ui PROFILE=mixed
make ui PROFILE=fuzz
make ui PROFILE=malicious
make ui PROFILE=grammar
~~~

The UI is intended for interactive exploration. It does not automatically separate warm-up from measurement or write the experiment's JSON and Markdown summaries. Record the start and stop times and download the Locust report if UI results will be retained.

Stop the Locust server with Ctrl+C.

An interactive UI report includes the user-count history and timing percentiles but does not record the configured spawn rate or create a distinct warm-up interval. For a publication artifact that must retain all workload parameters and exclude warm-up, use the headless runner below.

## Run headlessly

Run the default measured experiment:

~~~bash
make run
~~~

Override the workload or load parameters:

~~~bash
make run \
  PROFILE=mixed \
  USERS=100 \
  SPAWN_RATE=20 \
  WARMUP=30s \
  DURATION=5m
~~~

Optional thresholds make the command suitable for a controlled CI environment:

~~~bash
make run MAX_FAILURE_RATE=0 MIN_RPS=400 MAX_P95_MS=50
~~~

Thresholds should be calibrated for a stable, dedicated runner. Throughput comparisons are not meaningful when the target, client hardware, runtime, storage backend, or network path changes.

## Outputs

Headless runs write the following files to the ignored generated directory:

- summary.json: machine-readable environment, aggregate measurements, and threshold results;
- summary.md: concise human-readable measurements;
- locust-final-stats.json: exact final counters emitted when the measured run stops;
- report.html: the Locust HTML report;
- jwtforge_stats.csv: aggregate and per-profile statistics;
- jwtforge_stats_history.csv: time-series measurements; and
- Locust failure and exception CSV files.

The warm-up is intentionally excluded from these artifacts. The measured run records aggregate throughput plus p50, p95, and p99 response times; the mean alone should not be used to characterize tail latency.

## Clean generated output

Run `make clean` from this experiment directory to remove `generated/`. If you
used a custom output directory, pass the same value: `make clean OUT_DIR=results`.
Dependencies and the virtual environment are preserved.
