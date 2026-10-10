# Milestone 4 Cross-Team Defect & Integration Log
**Project:** SwipeX — AI-Powered Swipe-Based Job Discovery & Career Intelligence Platform  
**Owner:** Intern 5 (Omkar — Platform, Testing, CI/CD & Deployment)  
**Branch:** `Team-4`  
**Date:** October 2026

---

## Defect Summary Matrix

| Defect ID | Severity | Priority | Title | Component / Owner | Resolution Status |
|---|---|---|---|---|---|
| **DEF-011** | Critical / Blocker | P0 | Relation `jobs` / `swipes` does not exist on fresh stack startup | DB & Data / Hanith (Intern 3) | Resolved via `db-migrate` & `migrate_and_seed.py` |
| **DEF-012** | High | P1 | Gateway 404 for Resume upload routes (`/api/v1/resume/upload`) | Gateway / Mansi (Intern 2) | Resolved via route alias in Gateway & AIML |
| **DEF-013** | High | P1 | Dynamic JWT user & Job UUID lookup 404 in Recommendations & ATS scoring | AI/ML / Hemalatha (Intern 4) | Resolved via `JOB_SERVICE_URL` fallback & user fallback |
| **DEF-014** | High | P1 | Top-level `app` Python package namespace collision across test suites | Platform / Omkar (Intern 5) | Resolved via isolated subprocess runner `run_suites.py` |
| **DEF-015** | High | P1 | MinIO Docker Hub pull access denied in GitHub Actions CI | DevOps / Omkar (Intern 5) | Resolved by pinning `quay.io/minio/minio:RELEASE.2024-11-07T00-52-49Z` |
| **DEF-016** | Medium | P2 | Job 1 applicant count (45) failed strict `applicant_count > 50` HIGH competition threshold | Data & Seed / Hanith (Intern 3) | Resolved by updating seed count to 55 in `seed_all.py` |

---

## Detailed Root Cause Analysis & Resolutions

### DEF-011: Undefined Postgres Tables on Fresh Stack Startup
- **Severity:** Blocker (P0)
- **Component:** `data_hanith/db`, `docker-compose.dev.yml`
- **Observed Behavior:** ~35 of 48 live integration tests threw HTTP 500 (`psycopg2.errors.UndefinedTable: relation "jobs" does not exist`).
- **Root Cause:** In fresh Docker runs (e.g. after `docker compose down -v`), Postgres starts with an empty database. No migration or seeding script was configured to execute before the application services received traffic.
- **Resolution:** Implemented `integration_omkar/deploy/migrate_and_seed.py` and `integration_omkar/docker/Dockerfile.migrate`. Added a dedicated one-shot `db-migrate` container in `docker-compose.dev.yml` that waits for Postgres health, applies Hanith's `schema.sql` and `apply_m4_migration.py`, seeds curated data idempotently, and exits 0. All downstream web services depend on `db-migrate: condition: service_completed_successfully`.

### DEF-012: Gateway 404 for Resume Upload Routes
- **Severity:** High (P1)
- **Component:** `backend_mansi/app/gateway.py`, `aiml_hemalatha/app/main.py`
- **Observed Behavior:** Gateway returned HTTP 404 for `POST /api/v1/resume/upload`.
- **Root Cause:** Frozen Milestone 3 contract uses plural `/api/v1/resumes/upload`, but legacy client calls and earlier tests invoked singular `/api/v1/resume/upload`.
- **Resolution:** Added `@router.post("/api/v1/resume/upload")` alias in `backend_mansi/app/gateway.py` and `@app.post("/api/v1/resume/upload")` alias in `aiml_hemalatha/app/main.py`. Both endpoints now resolve properly with zero contract breakage. Handed patch to owners in `integration_omkar/patches/backend_mansi_route_alias.patch`.

### DEF-013: AI/ML Recommendations & ATS Score 404 for Dynamic Users and Jobs
- **Severity:** High (P1)
- **Component:** `aiml_hemalatha/app/main.py`
- **Observed Behavior:** Authenticated users generated dynamically during E2E tests threw HTTP 404 `User not found` in `/api/v1/recommendations`. Requesting ATS scoring for a job UUID ingested from `data_hanith` failed with `Job not found`.
- **Root Cause:** `aiml_hemalatha` previously only recognized hardcoded in-memory test dictionaries (`TEST_USERS` and static sample jobs) rather than querying cross-service contracts.
- **Resolution:** Added dynamic authenticated user profile fallback in `recommendations`, and added inter-service HTTP query fallback (`JOB_SERVICE_URL/api/v1/jobs/{job_id}`) in `get_ats_score`. Generated patch `integration_omkar/patches/aiml_hemalatha_cross_service_wiring.patch`.

### DEF-014: Pytest Namespace Collision Across Services
- **Severity:** High (P1)
- **Component:** Test Execution Architecture
- **Observed Behavior:** Running `pytest` across the repo in a single command failed with `ModuleNotFoundError: No module named 'app.ats'` or `'app.recommendations'`.
- **Root Cause:** Both `backend_mansi` and `aiml_hemalatha` define a top-level package named `app`. When imported into a single Python process, Python's module cache registers the first `app` and subsequent imports fail.
- **Resolution:** Built `integration_omkar/scripts/run_suites.py`, running every service's test suite in an isolated subprocess with its dedicated `PYTHONPATH` and working directory. Made unit tests dynamically load isolated module pointers.

### DEF-015: MinIO Docker Hub Pull Access Denied in CI
- **Severity:** High (P1)
- **Component:** CI/CD & Docker Configuration
- **Observed Behavior:** GitHub Actions workflow crashed with `minio Error pull access denied for minio/minio`.
- **Root Cause:** Docker Hub rate limiting and registry access restrictions on `minio/minio:latest`.
- **Resolution:** Pinned MinIO to `quay.io/minio/minio:RELEASE.2024-11-07T00-52-49Z` in `docker-compose.dev.yml`. Pinned all other base images (`postgres:15-alpine`, `redis:7-alpine`, `chromadb:0.5.5`).

### DEF-016: Competition Freshness Calculation Threshold
- **Severity:** Medium (P2)
- **Component:** `integration_omkar/scripts/seed_all.py`
- **Observed Behavior:** Test `test_m2_high_competition_applicant_count_gt_50` asserted `applicant_count > 50` for `HIGH` competition jobs. Job 1 had applicant count 45.
- **Root Cause:** Seed applicant count was 45 (which fell into MEDIUM or border classification depending on date formula).
- **Resolution:** Adjusted Job 1 applicant count to 55 and Job 5 to 15 in `seed_all.py`, ensuring mathematical clarity and consistency across competition levels.
