# SwipeX — Unified Test Execution Guide (Local & CI)
**Role:** Intern 5 (Platform, Testing & Deployment / Integrator)  
**Branch:** `Team-4`

This document provides exact, cross-platform commands to execute test suites locally (Windows PowerShell & Linux) and in GitHub Actions CI.

---

## 1. Single Source of Truth: `run_suites.py`

All test executions are consolidated into `integration_omkar/scripts/run_suites.py`. Each suite executes in an isolated process with its own working directory and `PYTHONPATH`, eliminating package collision (`app` package in backend vs aiml).

### Running on Windows PowerShell:
```powershell
# Activate your virtual environment
.\venv311\Scripts\Activate.ps1

# Run all static, unit, and live integration tests (requires Docker stack up)
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite all

# Run CI suites without live Docker containers (fast gate)
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite ci --no-docker

# Run specific individual suites
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite backend
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite aiml
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite frontend
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite m3-schema
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite m4
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite integration-unit
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite integration-live
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite flake8
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite render-config
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite security
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite perf
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite smoke --base-url http://localhost:8001
```

### Running on Linux / macOS / CI:
```bash
python3 integration_omkar/scripts/run_suites.py --suite all
python3 integration_omkar/scripts/run_suites.py --suite ci --no-docker
```

---

## 2. Docker Stack Management & Health Verification

Always manage Docker from fresh volumes to guarantee reproducibility:

```powershell
# 1. Clean teardown with volume removal (removes stale DB state)
docker compose -f docker-compose.dev.yml down -v

# 2. Build and start all services with health checks
docker compose -f docker-compose.dev.yml up --build -d --wait

# 3. Verify readiness using the automated health gate
.\venv311\Scripts\python.exe integration_omkar/scripts/wait_for_stack.py
```

### Quick Manual Inspection (PowerShell):
*Note: Always use `curl.exe` instead of PowerShell alias `curl`.*
```powershell
# Auth Gateway Health
curl.exe -s http://localhost:8001/health

# Job Intelligence Service Health & Jobs Data
curl.exe -s http://localhost:8001/api/v1/jobs

# Companies API
curl.exe -s http://localhost:8001/api/v1/companies

# Resume Service Health
curl.exe -s http://localhost:8003/health
```

---

## 3. Suite Inventory & Target Results

| Suite Name | Target Directory / Command | Pass Threshold | Expected Output |
|---|---|---|---|
| `flake8` | `flake8 --select=E9,F63,F7,F82` across all folders | 0 violations | Clean syntax |
| `render-config` | `render.yaml` yaml validation + `docker compose config` | 0 errors | Valid config |
| `frontend` | `frontend_boomika` (vitest + eslint + build) | 123 tests pass | 0 lint errors, build OK |
| `backend` | `backend_mansi/tests` | 46 tests pass | 0 failed |
| `aiml` | `aiml_hemalatha/tests` | 9 tests pass | 0 failed |
| `m3-schema` | `tests/test_m3_day2..6` | 40 tests pass | 0 failed |
| `m4` | `tests/test_m4_day1..5` | 39 tests pass | 0 failed |
| `integration-unit` | `integration_omkar/tests/unit` + contracts | 42 tests pass | 0 failed |
| `integration-live`| `integration_omkar/tests/test_*.py` | 132 tests pass | 0 failed, 1 skip (dataset) |
| `security` | `integration_omkar/scripts/security_check.py` | 100% pass | 0 leaks, 401/403 enforced |
| `perf` | `integration_omkar/scripts/perf_benchmark.py` | p95 < 500ms | 20 concurrency benchmark |
| `smoke` | `integration_omkar/scripts/smoke_test.py` | 100% pass | 200 OK across public endpoints |

---

## 4. Teardown
```powershell
docker compose -f docker-compose.dev.yml down -v
```
