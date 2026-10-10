# SwipeX — Platform Integration, QA & Deployment Workspace (`integration_omkar`)

> **Role:** Intern 5 (Omkar — Platform, Testing, CI/CD & Deployment / Integrator)  
> **Working Branch:** `Team-4`  
> **Architecture:** Microservices Ingress Gateway, Dual PostgreSQL, Redis/Valkey Cache, MinIO S3, ChromaDB Vector DB, React Web Client  
> **Cloud Target:** Render (Free Tier Blueprint)

---

## 1. Milestone Reports Index (M1 – M4)

The comprehensive reports for each milestone, detailing exactly the platform, integration, testing, and deployment work completed by Intern 5, are organized into 4 standalone documents:

| Milestone Report | Primary Theme & Deliverables | Scope & Achievements |
|---|---|---|
| 📘 [`M1_REPORT.md`](M1_REPORT.md) | **Milestone 1: Platform Baseline & Docker Environment** | Multi-container Compose architecture (`docker-compose.dev.yml`), private bridge networking, environment configuration standards (`.env.example`), Gateway reverse proxy baseline, and initial health verification gates. |
| 📘 [`M2_REPORT.md`](M2_REPORT.md) | **Milestone 2: Job Discovery & Swipe Matching** | Gateway routing integration for jobs, search, and companies; swipe system ingestion and idempotency (HTTP 409); Redis feed exclusion caching; cross-service RBAC testing; 55/55 automated integration tests. |
| 📘 [`M3_REPORT.md`](M3_REPORT.md) | **Milestone 3: AI Resume & Career Intelligence** | Resume upload and parsing gateway wiring, MinIO S3 object storage & ChromaDB vector database orchestration, automated storage and vector mocking strategy (`ai_vector_mocking_strategy.md`), ATS scoring & recommendations contract validation; 94/94 automated integration tests. |
| 📘 [`M4_REPORT.md`](M4_REPORT.md) | **Milestone 4: Platform Finalization, CI/CD & Render Cloud** | Unified test orchestrator (`run_suites.py`), automated database migration & seeding coordinator (`migrate_and_seed.py` / `db-migrate`), Render Cloud Blueprint (`render.yaml`), Render entrypoint wrapper (`entrypoint_render.py`), hardened 7-gate GitHub Actions CI/CD pipeline, latency performance benchmark, security gate, cold-start smoke tests, and final QA Sign-Off. |

---

## 2. Directory Structure & Workspace Layout

```text
integration_omkar/
├── M1_REPORT.md                  # Milestone 1 Integration & Platform Report
├── M2_REPORT.md                  # Milestone 2 Job Discovery & Swipe Matching Report
├── M3_REPORT.md                  # Milestone 3 AI Resume & Career Intelligence Report
├── M4_REPORT.md                  # Milestone 4 Final Integration, CI/CD & Render Report
├── README.md                     # This directory index and architecture guide
├── requirements.txt              # Integration testing dependencies
├── requirements-prod.txt         # Production migration and entrypoint dependencies
├── ai_vector_mocking_strategy.md # S3 and Vector Database mocking specification
├── defect_log.md                 # Historic milestone defect tracker
├── DEPLOYMENT_RUNBOOK.md         # Operational deployment runbook
├── QA_SIGNOFF.md                 # Summary sign-off document
├── deploy/                       # Cloud deployment & migration runners
│   ├── entrypoint_render.py      # Render production startup wrapper ($PORT, DB normalization, uvicorn)
│   ├── migrate_and_seed.py       # Idempotent database migration & seed coordinator
│   └── trigger_render_deploy.py  # Render webhook deploy hook dispatcher
├── docker/                       # Container build definitions
│   ├── Dockerfile.auth           # Auth Gateway container
│   ├── Dockerfile.frontend       # Frontend Vite container
│   ├── Dockerfile.job            # Job Data Service container
│   ├── Dockerfile.migrate        # Dedicated one-shot db-migrate container
│   └── Dockerfile.resume         # Resume Intelligence Service container
├── docs/                         # Detailed engineering guides and sign-off audits
│   ├── m4_defect_log.md          # Milestone 4 formal defect and root-cause log
│   ├── m4_go_no_go.md            # Formal GO / NO-GO production readiness assessment
│   ├── m4_wiring_exceptions.md   # Teammate folder wiring modifications log (< 10 lines)
│   ├── QA_SIGN_OFF.md            # Final QA sign-off certification
│   ├── RENDER_DEPLOY.md          # Comprehensive Render free-tier deployment runbook
│   └── RUN_TESTS.md              # Cross-platform test execution manual (PowerShell & Linux)
├── patches/                      # Upstream patches handed to teammates
│   ├── aiml_hemalatha_cross_service_wiring.patch
│   └── backend_mansi_route_alias.patch
├── scripts/                      # Operational utilities and test gates
│   ├── perf_benchmark.py         # Concurrency and latency performance benchmark gate
│   ├── run_suites.py             # Single source of truth isolated test runner
│   ├── security_check.py         # Git secret scan and RBAC boundary verification gate
│   ├── seed_all.py               # Canonical database seed data
│   ├── smoke_test.py             # Cold-start aware warm-up and endpoint verification gate
│   └── wait_for_stack.py         # Stack readiness and database connectivity gate
└── tests/                        # Automated integration test suites
    ├── test_cross_service_rbac.py
    ├── test_e2e_gateway_flow.py
    ├── test_e2e_resume_flow.py
    ├── test_gateway_route_contract.py
    ├── test_m2_*.py              # Milestone 2 functional integration tests
    ├── test_m3_*.py              # Milestone 3 functional integration tests
    └── unit/                     # Isolated unit mocks and compatibility tests
```

---

## 3. Quickstart & Verification Commands

### Execute All Tests via Unified Runner:
```powershell
# Windows PowerShell:
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite all

# Fast CI test suite (no Docker needed):
.\venv311\Scripts\python.exe integration_omkar/scripts/run_suites.py --suite ci --no-docker
```

### Spin Up Fresh Docker Stack:
```powershell
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up --build -d --wait
.\venv311\Scripts\python.exe integration_omkar/scripts/wait_for_stack.py
```
