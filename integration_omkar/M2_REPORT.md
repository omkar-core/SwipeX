# SwipeX Milestone 2 — Job Discovery & Swipe Matching Integration Report

> **Project:** SwipeX — AI-Powered Swipe-Based Job Discovery & Career Intelligence Platform  
> **Role:** Intern 5 (Omkar — Platform, Testing, CI/CD & Deployment / Integrator)  
> **Working Branch:** `Team-4`  
> **Scope:** Milestone 2 Deliverables — Job Discovery, Swipe Matching, Search & Cross-Service RBAC Integration  
> **Status:** **COMPLETE & VERIFIED (100% PASS)**

---

## 1. Milestone 2 Integration Mission & Role Definition

In Milestone 2, the team delivered core functional workflows: job listing, company directories, multi-dimensional search, swipe interactions (Like/Pass), and swipe history. Intern 5’s responsibility was to **integrate and validate these cross-service workflows**, ensuring the Auth Gateway accurately routed requests to the Job Data Service and Matching Engine, enforcing role-based access control (RBAC), verifying caching behavior, and authoring automated integration test suites.

Intern 5 strictly maintained the boundary of the Integrator role: no business logic was authored inside teammate directories. All verification was achieved through gateway wiring, Docker orchestration, and automated end-to-end test cases.

---

## 2. Platform & Integration Deliverables Accomplished

### 2.1 API Gateway Reverse Proxy Integration for Jobs & Companies
- Integrated the Auth Gateway (`backend_mansi` on port 8001) with the Job Data Service (`data_hanith` on port 8002):
  - `GET /api/v1/jobs`: Public job listing with pagination and optional authentication.
  - `GET /api/v1/jobs/{job_id}`: Full job specification lookup; validates UUID formats, returning 400 for malformed IDs and 404 for missing jobs.
  - `GET /api/v1/jobs/search`: Multi-dimensional filtering by keyword (`q=`), location, work mode, salary range, and required skills.
  - `GET /api/v1/companies`: Company directory with industry filtering, size brackets, and startup flags.
  - `GET /api/v1/companies/{company_id}`: Company profile with associated active job postings.

### 2.2 Swipe System Integration & Feed Exclusion Caching
- Wired and verified the swipe interaction lifecycle:
  - `POST /api/v1/swipes`: Records `RIGHT` (like/apply) and `LEFT` (pass) swipe actions for authenticated candidates.
  - **Swipe Idempotency:** Verified that duplicate swipes on the same job return HTTP 409 Conflict via the unique database constraint `uq_user_job_swipe`.
  - **Feed Exclusion:** Verified that once a user records a swipe, subsequent requests to `GET /api/v1/jobs` exclude the swiped job using Redis-backed set caching (`swipes:user:{user_id}`).
  - **Swipe History:** Validated `GET /api/v1/swipes/history` returning paginated, reverse-chronological history.

### 2.3 Cross-Service Role-Based Access Control (RBAC) Verification
- Created and executed `integration_omkar/tests/test_cross_service_rbac.py` enforcing strict security boundaries across services:
  - **Guest Browsing:** Unauthenticated users can view public job feeds and company directories.
  - **Candidate Actions:** Authenticated job seekers (`role: job_seeker`) can swipe, view history, and view recommendations.
  - **Recruiter Restrictions:** Recruiters (`role: recruiter`) are blocked from swiping on jobs (HTTP 403 Forbidden).
  - **Candidate Restrictions:** Job seekers are blocked from creating job listings or modifying company records (HTTP 403 Forbidden).
  - **Token Integrity:** Expired or malformed bearer tokens return HTTP 401 Unauthorized across all protected endpoints.

### 2.4 Freshness & Competition Calculation Verification
- Validated calculation logic exposed via the API Gateway:
  - **Competition Levels:** Verified tier classification (`LOW`, `MEDIUM`, `HIGH`) based on `applicant_count` thresholds.
  - **Posting Freshness:** Verified freshness classification (`FRESH`, `RECENT`, `OLDER`) based on posting timestamps.

### 2.5 Automated M2 Integration Test Suite Authoring
- Developed automated test modules in `integration_omkar/tests/`:
  - `test_m2_e2e_flow.py`: Full candidate journey (Register -> Login -> Browse -> Search -> Swipe -> History).
  - `test_m2_job_discovery.py`: Feed pagination, field validation, and detail retrieval.
  - `test_m2_swipe_system.py`: Swipe mechanics, idempotency, and exclusion.
  - `test_m2_search_and_filter.py`: Keyword, salary, location, and composite query testing.
  - `test_m2_company_api.py`: Company directory, startup filter, and active jobs.
  - `test_m2_competition_freshness.py`: Freshness levels and competition tiers.
  - `test_m2_matching_engine.py`: Heuristic matching and rule-based affinity rankings.

---

## 3. Integration Testing Evidence & Compliance Matrix

| Requirement | Scope | Test File | Result | Status |
|---|---|---|---|---|
| **Job Discovery Feed** | List & detail retrieval | `test_m2_job_discovery.py` | 6 / 6 passed | **PASS** |
| **Swipe System** | Record, history & idempotency | `test_m2_swipe_system.py` | 7 / 7 passed | **PASS** |
| **Search & Filter** | Multi-dimensional query engine | `test_m2_search_and_filter.py` | 7 / 7 passed | **PASS** |
| **Company Directory** | Startup & industry directory | `test_m2_company_api.py` | 7 / 7 passed | **PASS** |
| **Freshness & Competition**| Applicant tiers & time badges | `test_m2_competition_freshness.py` | 8 / 8 passed | **PASS** |
| **Matching Engine** | Heuristic match scoring | `test_m2_matching_engine.py` | 6 / 6 passed | **PASS** |
| **Cross-Service RBAC** | Role permissions & boundaries | `test_cross_service_rbac.py` | 7 / 7 passed | **PASS** |
| **End-to-End User Journey**| Complete user session flow | `test_m2_e2e_flow.py` | 7 / 7 passed | **PASS** |
| **Total Automated M2 Tests**| All integration test modules | `integration_omkar/tests/` | **55 / 55 passed** | **PASS** |

---

## 4. Defect Resolutions & Upstream Coordination

- **DEF-011 (Company Detail Active Jobs):** Identified missing `active_jobs` array in `GET /api/v1/companies/{id}`. Logged defect and coordinated with Data owner (Hanith) to ensure company queries joined active listings.
- **DEF-012 (Search Query Empty Parameter):** Empty query parameter `/jobs/search?q=` returned 500 error instead of default listing. Coordinated contract handling to return all jobs gracefully.
- **DEF-014 (Freshness Format Standardization):** Standardized timestamp formats to ISO-8601 strings across job responses to ensure frontend date parsers did not throw NaN errors.
- **DEF-016 (Competition Seed Thresholds):** Resolved threshold boundary in seed data so that Job 1 applicant count (55) cleanly qualified for `HIGH` competition (`> 50`), ensuring zero ambiguity in automated assertions.

---

## 5. Milestone 2 Summary

Milestone 2 integration was completed with 55/55 passing integration tests and zero open defects. The job browsing, searching, and swipe matching pipeline operated reliably across the multi-container Docker environment, all API contracts were honored, and cross-service security boundaries were validated.
