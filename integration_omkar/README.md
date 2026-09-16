# SwipeX — Integration & Development Workspace (`integration_omkar`)

> **Milestone 2 — Platform, Testing & Multi-Service Integration**  
> **Team**: Team-4  
> **Role Owner**: Integration & Development Engineer (`integration_omkar`)  
> **Branch**: `Team-4`

---

## 1. Purpose & Responsibilities

The `integration_omkar` domain is responsible for unifying the disparate microservices developed by Team-4 teammates into one coherent, robust, and verifiable system increment across **Milestone 1 & 2**:
- **Multi-Service Docker Containerization**: Isolated, reproducible Dockerfiles for Auth/Gateway, Job Service, Resume/ATS Service, and Frontend.
- **Local Orchestration (`docker-compose.dev.yml`)**: Single-command boot for PostgreSQL, Redis, 3 backend FastAPI microservices, and the React web app.
- **Database & Cache Orchestration**: Multi-database initialization (`swipex_auth` and `swipex_job`) and Redis cache connection with graceful SQL fallback.
- **Cross-Service End-to-End Testing**: Automated live test harness validating the full workflow (Register -> Login -> Browse Jobs -> Swipe -> Swipe History -> Resume Upload -> ATS Score -> Recommendations) without downstream mocks.
- **Continuous Integration (CI)**: Automated GitHub Actions pipeline verifying builds and test passes on every PR.

---

## 2. System Architecture & Port Mapping

```text
                                +---------------------------+
                                |      Browser / Client     |
                                +-------------+-------------+
                                              |
                                              | HTTP (Port 3000)
                                              v
                                +---------------------------+
                                |      frontend_boomika     |
                                |   (Vite React 19 Client)  |
                                +-------------+-------------+
                                              |
                                              | REST Calls (/api/v1)
                                              v
                                +---------------------------+
                                |       backend_mansi       |
                                |   Auth & API Gateway      |
                                |        (Port 8001)        |
                                +------+--------------+-----+
                                       |              |
                      +----------------+              +----------------+
                      | Proxy /jobs, /swipes                           | Proxy /resume, /recommendations
                      v                                                v
        +---------------------------+                    +---------------------------+
        |        data_hanith        |                    |      aiml_hemalatha       |
        |  Job & Data Intelligence  |                    |  Resume & Career (ATS v0) |
        |        (Port 8002)        |                    |        (Port 8003)        |
        +-------------+-------------+                    +---------------------------+
                      |
          +-----------+-----------+
          |                       |
          v                       v
+-------------------+   +-------------------+
|  PostgreSQL 15    |   |      Redis 7      |
|    (Port 5432)    |   |    (Port 6379)    |
| (swipex_auth/job) |   |    (Cache/Feed)   |
+-------------------+   +-------------------+
```

### Service Port Map

| Container Name | Service | Technology | Internal Port | Host Port | Healthcheck / Docs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `swipex-frontend` | Web UI | React 19 + Vite | 3000 | `3000` | `http://localhost:3000` |
| `swipex-auth-gateway`| Auth & API Gateway | FastAPI | 8001 | `8001` | `http://localhost:8001/docs` |
| `swipex-job-data` | Job & Data Intelligence| FastAPI | 8002 | `8002` | `http://localhost:8002/docs` |
| `swipex-resume-service`| Resume & ATS Service | FastAPI | 8003 | `8003` | `http://localhost:8003/docs` |
| `swipex-postgres` | Relational DB | PostgreSQL 15 | 5432 | `5432` | `pg_isready` |
| `swipex-redis` | Cache & Feed Session | Redis 7 | 6379 | `6379` | `redis-cli ping` |

---

## 3. Prerequisites

Ensure you have the following installed on your host machine:
- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Python** (v3.10+; 3.11 recommended)
- **Node.js** (v18+ or v20+) and **npm**

---

## 4. Quick Start (Single Command)

### Step 1: Clone & Configure Environment
Navigate to the repository root and create your `.env` file:
```bash
cp .env.example .env
```

### Step 2: Boot All Services
Build and start all 6 containers using Docker Compose:
```bash
docker compose -f docker-compose.dev.yml up --build -d
```

### Step 3: Wait for Services Health
Run the health poller script to ensure all services are ready:
```bash
python integration_omkar/scripts/wait_for_services.py
```

### Step 4: Access the Application
- **Frontend App**: Open [http://localhost:3000](http://localhost:3000)
- **Gateway Swagger Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **Job Service Swagger Docs**: [http://localhost:8002/docs](http://localhost:8002/docs)
- **Resume Service Swagger Docs**: [http://localhost:8003/docs](http://localhost:8003/docs)

### Stopping the Stack
To stop and clean up containers:
```bash
docker compose -f docker-compose.dev.yml down
```

---

## 5. Database Setup & Seeding

The PostgreSQL container automatically runs [`docker/postgres-init/01-init-databases.sql`](docker/postgres-init/01-init-databases.sql) on its first boot, creating:
1. `swipex_auth` — users and refresh tokens.
2. `swipex_job` — companies, jobs, skills, job_skills, and swipes.

### Seeding Curated Job Data (Instantaneous)
To load curated starter jobs (Nexus Technologies, FinFlow Payments, HyperScale AI Labs) for testing:
```bash
python integration_omkar/scripts/seed_all.py
```

### Full Dataset 1 Ingestion (Optional)
To ingest all 97,929 Indian job market postings into PostgreSQL:
```bash
python data_hanith/scripts/ingest_dataset1.py
```

---

## 6. Running Tests

### 1. Live End-to-End (E2E) Integration Tests
The E2E test suite validates real HTTP interaction through the live Gateway without mocking downstream services:
```bash
pip install -r integration_omkar/requirements.txt
pytest integration_omkar/tests/ -v
```

This tests:
- `test_e2e_gateway_flow.py`: Registration, Login, Token validation, Job listing & detail proxying, Right/Left swipes, Duplicate swipe prevention (409 Conflict), Swipe history, Swiped job feed exclusion.
- `test_e2e_resume_flow.py`: Resume file upload, Skill extraction, Heuristic ATS score calculation, Job recommendations.
- `test_cross_service_rbac.py`: Role restriction enforcement (`job_seeker` vs `recruiter`), unauthenticated block (401), invalid token rejection.

### 2. Teammate Domain Unit Tests
- **Auth Service (`backend_mansi`)**:
  ```bash
  pytest backend_mansi/tests/ -v
  ```
- **Job Service (`data_hanith`)**:
  ```bash
  pytest tests/ -v
  ```
- **Resume Service (`aiml_hemalatha`)**:
  ```bash
  cd aiml_hemalatha && pytest tests/ -v && cd ..
  ```

### 3. Frontend Build Validation
```bash
cd frontend_boomika
npm install
npm run build
```

---

## 7. Continuous Integration (CI)

The GitHub Actions workflow is defined in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). On every push or PR to `Team-4`, it validates:
1. PostgreSQL & Redis container startup.
2. `backend_mansi` unit test suite (auth & gateway).
3. `aiml_hemalatha` unit test suite (ATS & recommendations).
4. `data_hanith` domain tests (job & swipe API, Redis cache) — requires raw dataset file; emits warning if absent.
5. `frontend_boomika` dependency installation and TypeScript/Vite production build.

---

## 8. Known Limitations & Milestone 2 Roadmap

1. **Heuristic v0 AI/ATS**: As specified in the Milestone 1 SRS, the Resume and Recommendation endpoints use deterministic skill/keyword overlap matching (`"generated_by": "heuristic-v0"`). Neural embeddings and ML models are scheduled for Milestone 2 & 3.
2. **Google OAuth2**: Requires valid Google Cloud credentials in `.env` (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`). Email/password registration and login function 100% locally without external dependencies.
3. **Dataset 1 Scope**: In `data_hanith`, raw dataset fields `work_mode`, `job_type`, and `company_type` are NULL in the source Excel file, so filtering strictly by `remote=true` on raw Dataset 1 returns zero results.

---

# Milestone 2 — Swipe System, Job Discovery & Integration

## 1. M2 Overview
Milestone 2 establishes full cross-service integration for the Swipe System, Public & Authenticated Job Discovery, Multi-Dimensional Search & Filtering, and Heuristic Matching Engine Recommendations.

## 2. M2 Architecture & Services

| Service Container | Directory | Internal Port | External Port | Functionality |
|---|---|---|---|---|
| `swipex-auth-gateway` | `backend_mansi` | 8001 | `8001` | Auth, Identity, Token issuance, RBAC & Gateway proxying |
| `swipex-job-data` | `data_hanith` | 8002 | `8002` | Job listings, company data, swipes, feed exclusion & Redis cache |
| `swipex-resume-service` | `aiml_hemalatha` | 8003 | `8003` | ATS resume parsing & heuristic recommendation matching engine |
| `swipex-frontend` | `frontend_boomika` | 3000 | `3000` | React 18 + Vite swipe deck UI & candidate dashboard |
| `swipex-postgres` | PostgreSQL 15 | 5432 | `5432` | Relational storage (`swipex_auth` and `swipex_job`) |
| `swipex-redis` | Redis 7 | 6379 | `6379` | User swipe caching & feed result acceleration |

## 3. M2 Test Execution Runbook

### Run all M2 Automated Integration Tests:
```bash
pytest integration_omkar/tests/ -v --tb=short
```

### Run Service Unit Test Suites:
```bash
pytest backend_mansi/tests/ -v
pytest aiml_hemalatha/tests/ -v
```

### Build Frontend Application:
```bash
cd frontend_boomika && npm run build
```

## 4. Milestone 2 Documentation

- [M2 Final Report](M2_FINAL_REPORT.md) — acceptance verdict, SRS/FR matrices, live website evidence, CI failure resolution, test & quality results, M1 regression
- [Integration Defect Log](defect_log.md) — all M2 defects (DEF-008 … DEF-016) with status FIXED & VERIFIED
- [M1 Sign-off](m1_signoff.md) — Milestone 1 integration record (historical)

## 5. Milestone 2 Demo Sequence (for presentation)

1. Open `http://localhost:3000`; register a **Job Seeker** (instant JWT session; `/auth/me` in DevTools).
2. **DiscoverScreen**: swipe deck shows title, company, location, salary, freshness badge, competition tier; click a card for the Job Detail Modal; use Save/Pass (Arrow keys) — recorded via `POST /api/v1/swipes` (201); swiped jobs disappear from next feed.
3. **Search & filters**: keyword input (e.g. "Python"), salary min/max, work-environment toggles (Remote/Hybrid/On-site), industry — feed filters live. Dedicated endpoint: `curl "http://localhost:8001/api/v1/jobs/search?q=Python"`.
4. **Companies** tab: filtered grid, "Startups & Fast Growing" pill (`newly_founded=true`), company search, detail modal with active openings.
5. **Resume Upload**: upload `.txt`/`.pdf` → extracted skills + ATS match score gauge.
6. **AI Recommendations** panel (DiscoverScreen): affinity scores; clicking a role opens its detail via canonical UUID.
7. **Applications** screen: "Saved" roles + "Swipes" toggle = chronological right/left decisions.
8. **RBAC**: logout → login as **Recruiter** → swipe blocked (403 Forbidden), recruiter job-posting route (`POST /api/v1/jobs`) reachable.
9. **Quality gates**: `pytest integration_omkar/tests/` → 52/52; `pytest backend_mansi/tests/` → 28/28; `pytest aiml_hemalatha/tests/` → 9/9; `npm run build` → exit 0.

## 6. Deployment Boundary

Milestone 2 strictly maintains local container orchestration and CI automation. No production cloud deployment or packaging is introduced.

