PYTHON ?= python3
JWT_FORGE_URL ?= http://localhost:8787
PROFILE ?= fake
USERS ?= 50
SPAWN_RATE ?= 10
WARMUP ?= 10s
DURATION ?= 60s
OUT_DIR ?= generated
MAX_FAILURE_RATE ?= 0
MIN_RPS ?= 0
MAX_P95_MS ?= 0

.PHONY: setup run ui clean help

setup:
	"$(PYTHON)" -m pip install -r requirements.txt

run:
	"$(PYTHON)" run_experiment.py \
		--host "$(JWT_FORGE_URL)" \
		--profile "$(PROFILE)" \
		--users "$(USERS)" \
		--spawn-rate "$(SPAWN_RATE)" \
		--warmup "$(WARMUP)" \
		--duration "$(DURATION)" \
		--output-dir "$(OUT_DIR)" \
		--max-failure-rate "$(MAX_FAILURE_RATE)" \
		--min-rps "$(MIN_RPS)" \
		--max-p95-ms "$(MAX_P95_MS)"

ui:
	"$(PYTHON)" -m locust -f locustfile.py --host "$(JWT_FORGE_URL)" --workload-profile "$(PROFILE)"

clean:
	rm -rf -- "$(OUT_DIR)"

help:
	@echo "make setup  Install the pinned Locust dependency using $(PYTHON)"
	@echo "make run    Run warm-up and measured headless load tests"
	@echo "make ui     Start the interactive Locust web interface"
	@echo "make clean  Remove generated output (OUT_DIR, default: generated)"
