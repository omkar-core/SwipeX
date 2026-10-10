# SwipeX Milestone 4 — Environment Variables & Secrets Inventory
**Project:** AI-Powered Swipe-Based Job Discovery and Personalized Career Intelligence Platform (SwipeX)  
**Branch:** `Team-4`  
**Role:** Intern 5 (Omkar — Platform, Testing, CI/CD & Deployment / Integrator)  
**Status:** Audit Verified & Enforced  
**Date:** October 2026  

---

## 1. Secrets Audit & History Scan Summary

A comprehensive automated and manual security scan was conducted across all tracked files, configurations, and Git commit history.

### A. Tracked Files Audit
Command: `git ls-files | findstr /i "\.env \.pem \.key \.p12 serviceAccount credentials \.db \.sqlite"`
- **Result:**
  - `.env.example` — Master configuration template (allowed).
  - `backend_mansi/.env.example` — Service configuration template (allowed).
  - `frontend_boomika/.env.example` — Frontend configuration template (allowed).
  - `frontend_boomika/.env.test` — Tracked test file in frontend (contains mock URLs and booleans, no secrets; logged as defect **DEF-040**).
  - No `.pem`, `.key`, `.p12`, `*serviceAccount*`, `*credentials*`, `*.db`, or `*.sqlite` files are tracked in the active working tree.

### B. Secrets Classification Table

| # | Location (`file:line`) | Class | Rule / Pattern | Masked Value | Context & Disposition |
|---|---|---|---|---|---|
| 1 | `gateway/nginx.conf:24` | **FALSE POSITIVE** | `generic-api-key` | `800***` (`8000/api/v1/companies/`) | Nginx reverse proxy URL directive in legacy config. Allowlisted in `.gitleaks.toml`. |
| 2 | `gateway/nginx.conf:30` | **FALSE POSITIVE** | `generic-api-key` | `800***` (`8000/api/v1/recommendations/`) | Nginx reverse proxy URL directive in legacy config. Allowlisted in `.gitleaks.toml`. |
| 3 | `Team-3/Domain-1/backend/DAY7_FINAL_SUMMARY.md:618` | **FALSE POSITIVE** | `generic-api-key` | `ATS***` (`ATS/Suggestions`) | Architecture documentation text describing API. Allowlisted in `.gitleaks.toml`. |
| 4 | `Team-3/Domain-1/backend/docs/architecture/milestone-3-sign-off-report.md:53` | **FALSE POSITIVE** | `generic-api-key` | `ATS***` (`ATS/Suggestions`) | Architecture documentation text describing API. Allowlisted in `.gitleaks.toml`. |
| 5 | `frontend_boomika/src/services/applicationService.ts:8` | **FALSE POSITIVE** | `generic-api-key` | `swi***` (`swipex_applications_v4`) | LocalStorage storage key identifier constant. Allowlisted in `.gitleaks.toml`. |
| 6 | `integration_omkar/m1_final_audit.md:144` (commit `4c8921...`) | **DEV PLACEHOLDER** | `generic-api-key` | `eyJ***` (`eyJhbGciOiJIUzI1Ni...`) | Ephemeral dev JWT token from local curl test on localhost in Milestone 1. File replaced in M4. Allowlisted in `.gitleaks.toml`. |
| 7 | `integration_omkar/m1_final_audit.md:145` (commit `4c8921...`) | **DEV PLACEHOLDER** | `generic-api-key` | `2TZ***` (`2TZ4AD09MdtZL6...`) | Ephemeral dev refresh token from local curl test on localhost in Milestone 1. Allowlisted in `.gitleaks.toml`. |
| 8 | `integration_omkar/m1_final_audit.md:150` (commit `4c8921...`) | **DEV PLACEHOLDER** | `jwt` | `eyJ***` (`eyJhbGciOiJIUzI1Ni...`) | Ephemeral dev JWT token stored in `$TOKEN` variable during local test. Allowlisted in `.gitleaks.toml`. |
| 9 | `data_hanith/scripts/validate_day6_qa_performance.py:15` | **DEV PLACEHOLDER** | `POSTGRES_CRED_URI` | `pos***` (`postgres:postgres@127.0.0.1:5432/swipex_job_db`) | Hardcoded local dev fallback DB URI in test script. Logged as defect **DEF-041** and proposed fix patch generated. |
| 10 | `integration_omkar/tests/test_m2_e2e_flow.py:24` | **DEV PLACEHOLDER** | `password` | `Sec***` (`SecurePassword123!`) | Test user fixture password used to register dynamic user in integration test. |

- **Real Production Secrets Committed:** **0**
- **Dev Placeholders / Test Fixtures:** **5**
- **False Positives:** **5**

---

## 2. Complete Environment Variable Inventory

This table records **EVERY** variable read or consumed by any service in the SwipeX platform.

| VARIABLE | Service | Required? | Secret? (Y/N) | Dev Default | Local `.env` | Docker Compose | GitHub Secret | GitHub Variable | Render Location |
|---|---|---|---|---|---|---|---|---|---|
| `DATABASE_URL` | Gateway & Job | **Yes** | **Y** | `postgresql://swipex:swipex@postgres:5432/swipex_auth` | Yes | Yes (`${AUTH_DATABASE_URL:-...}`) | No | No | `fromDatabase: name: swipex-postgres, property: connectionString` |
| `AUTH_DATABASE_URL` | Auth / Gateway | **Yes** | **Y** | `postgresql://swipex:swipex@postgres:5432/swipex_auth` | Yes | Yes (`${AUTH_DATABASE_URL:-...}`) | No | No | `fromDatabase: name: swipex-postgres, property: connectionString` |
| `JOB_DATABASE_URL` | Job Service | **Yes** | **Y** | `postgresql://swipex:swipex@postgres:5432/swipex_job` | Yes | Yes (`${JOB_DATABASE_URL:-...}`) | No | No | `fromDatabase: name: swipex-postgres, property: connectionString` |
| `POSTGRES_USER` | Postgres DB | **Yes** | N | `swipex` | Yes | Yes (`${POSTGRES_USER:-swipex}`) | No | No | Blueprint DB setting |
| `POSTGRES_PASSWORD` | Postgres DB | **Yes** | **Y** | `swipex` | Yes | Yes (`${POSTGRES_PASSWORD:-swipex}`) | No | No | Managed by Render DB |
| `POSTGRES_HOST` | Postgres DB | No | N | `postgres` | Yes | N/A | No | No | Managed by Render DB |
| `POSTGRES_PORT` | Postgres DB | No | N | `5432` | Yes | N/A | No | No | Managed by Render DB |
| `REDIS_URL` | Gateway / Job | **Yes** | **Y** | `redis://redis:6379/0` | Yes | Yes | No | No | `fromService: type: keyvalue, name: swipex-redis, property: connectionString` |
| `REDIS_HOST` | Job Service | No | N | `redis` | Yes | Yes | No | No | N/A (uses `REDIS_URL`) |
| `REDIS_PORT` | Job Service | No | N | `6379` | Yes | Yes | No | No | N/A (uses `REDIS_URL`) |
| `REDIS_PASSWORD` | Job Service | No | **Y** | `""` | Yes | N/A | No | No | Managed via `REDIS_URL` |
| `REDIS_DB` | Job Service | No | N | `0` | Yes | N/A | No | No | Managed via `REDIS_URL` |
| `REDIS_TIMEOUT` | Job Service | No | N | `5` | Yes | N/A | No | No | Dashboard / Default |
| `JWT_SECRET_KEY` | Auth Gateway | **Yes** | **Y** | `dev-jwt-secret-key-swipex-team4-2026-integration` | Yes | Yes (`${JWT_SECRET_KEY:-...}`) | No | No | Blueprint: `generateValue: true` |
| `SESSION_SECRET_KEY` | Auth Gateway | **Yes** | **Y** | `dev-session-secret-key-swipex-team4-2026-oauth` | Yes | Yes (`${SESSION_SECRET_KEY:-...}`) | No | No | Blueprint: `generateValue: true` |
| `GATEWAY_SHARED_SECRET`| Gateway / Job | No (Rec.) | **Y** | `swipex-internal-gateway-secret` | Yes | Yes (`${GATEWAY_SHARED_SECRET:-...}`) | No | No | Blueprint: `generateValue: true` / `fromService` |
| `TRUST_GATEWAY_HEADERS`| Job Service | No | N | `true` | Yes | Yes | No | No | Blueprint: `value: "true"` |
| `JOB_SERVICE_URL` | Gateway & AI | **Yes** | N | `http://job-data-service:8002` | Yes | Yes | No | No | Blueprint: `https://swipex-job-service.onrender.com` |
| `RESUME_SERVICE_URL` | Gateway | **Yes** | N | `http://resume-service:8003` | Yes | Yes | No | No | Blueprint: `https://swipex-resume-service.onrender.com` |
| `MATCHING_ENGINE_URL`| Gateway | **Yes** | N | `http://resume-service:8003` | Yes | Yes | No | No | Blueprint: `https://swipex-resume-service.onrender.com` |
| `CORS_ORIGINS` | Gateway | **Yes** | N | `*` | Yes | Yes | No | No | Blueprint: `https://swipex-frontend.onrender.com` |
| `PORT` | All Web Svcs | No | N | `8001` / `8002` / `8003` | Yes | N/A (Port mapped) | No | No | Render dynamically injects `$PORT` (10000) |
| `HOST` | All Web Svcs | No | N | `0.0.0.0` | Yes | N/A | No | No | Service default |
| `RUN_MIGRATION` | Gateway | No | N | `false` | No | No | No | No | Blueprint: `value: "true"` |
| `GOOGLE_CLIENT_ID` | Auth (OAuth) | No | N | `""` | Yes | Yes (`${GOOGLE_CLIENT_ID:-}`) | No | Yes (Opt) | Render Dashboard envVar |
| `GOOGLE_CLIENT_SECRET`| Auth (OAuth) | No | **Y** | `""` | Yes | Yes (`${GOOGLE_CLIENT_SECRET:-}`) | Yes (Opt) | No | Render Dashboard secret (`sync: false`) |
| `MAX_REQUESTS_PER_MINUTE` | Gateway | No | N | `120` | Yes | N/A | No | No | Render Dashboard / Default |
| `EARLY_APPLICANT_WINDOW_HOURS` | Job Service | No | N | `48` | Yes | Yes | No | No | Render Dashboard / Default |
| `SWIPEX_USE_LIVE_CLOCK`| Job Service | No | N | `false` | Yes | Yes | No | No | Render Dashboard / Default |
| `SWIPEX_REF_TIMESTAMP` | Job Service | No | N | `2025-01-01T00:00:00Z` | Yes | Yes | No | No | Render Dashboard / Default |
| `RAW_DATASET1_PATH` | Job Service | No | N | `data/raw/indian-job-market-dataset-2025 processed.xlsx` | Yes | N/A | No | No | Baked into repo data directory |
| `SWIPEX_AUTH_MODE` | Job Service | No | N | `relaxed` | Yes | Yes (`SWIPEX_AUTH_MODE=relaxed`) | No | No | Render Dashboard / Default |
| `RESUME_STORAGE_DIR` | Job Service | No | N | `uploads/resumes` | Yes | N/A | No | No | Render Dashboard / Default |
| `RESUME_UPLOAD_DIR` | Resume Svc | No | N | `uploads/resumes` | Yes | Yes | No | No | Render Dashboard / Default |
| `MAX_RESUME_SIZE_MB`| Resume Svc | No | N | `5` | Yes | N/A | No | No | Render Dashboard / Default |
| `MINIO_ROOT_USER` | MinIO S3 | No | N | `swipex_minio` | Yes | Yes | No | No | N/A (Optional local profile) |
| `MINIO_ROOT_PASSWORD`| MinIO S3 | No | **Y** | `swipex_minio_dev_password` | Yes | Yes (`${MINIO_ROOT_PASSWORD:-...}`) | No | No | N/A (Optional local profile) |
| `MINIO_HOST` | MinIO S3 | No | N | `localhost` | Yes | Yes | No | No | N/A |
| `MINIO_PORT` | MinIO S3 | No | N | `9000` | Yes | Yes | No | No | N/A |
| `MINIO_CONSOLE_PORT`| MinIO S3 | No | N | `9001` | Yes | Yes | No | No | N/A |
| `MINIO_BUCKET_NAME` | MinIO S3 | No | N | `swipex-resumes` | Yes | Yes | No | No | N/A |
| `MINIO_USE_SSL` | MinIO S3 | No | N | `false` | Yes | Yes | No | No | N/A |
| `CHROMADB_HOST` | ChromaDB | No | N | `localhost` | Yes | Yes | No | No | N/A (Optional local profile) |
| `CHROMADB_PORT` | ChromaDB | No | N | `8004` | Yes | Yes | No | No | N/A |
| `SMTP_HOST` | Alerts / M4 | No | N | `smtp.mailtrap.io` | Yes | N/A | No | No | Render Dashboard |
| `SMTP_PORT` | Alerts / M4 | No | N | `2525` | Yes | N/A | No | No | Render Dashboard |
| `SMTP_USER` | Alerts / M4 | No | N | `""` | Yes | N/A | No | No | Render Dashboard |
| `SMTP_PASSWORD` | Alerts / M4 | No | **Y** | `""` | Yes | N/A | Yes (Opt) | No | Render Dashboard secret (`sync: false`) |
| `VAPID_PUBLIC_KEY` | Web Push | No | N | `""` | Yes | N/A | No | Yes (Opt) | Render Dashboard |
| `VAPID_PRIVATE_KEY` | Web Push | No | **Y** | `""` | Yes | N/A | Yes (Opt) | No | Render Dashboard secret (`sync: false`) |
| `VAPID_CLAIMS_EMAIL`| Web Push | No | N | `admin@swipex.careers` | Yes | N/A | No | No | Render Dashboard |
| `VITE_BASE_API_URL` | Frontend | **Yes** | N | `http://localhost:8001/api/v1` | Yes | Yes | No | No | Blueprint: `https://swipex-auth-gateway.onrender.com/api/v1` |
| `VITE_WS_URL` | Frontend | **Yes** | N | `ws://localhost:8001/api/v1/notifications/ws` | Yes | Yes | No | No | Blueprint: `wss://swipex-auth-gateway.onrender.com/api/v1/notifications/ws` |
| `VITE_USE_MOCK` | Frontend | No | N | `false` | Yes | Yes | No | No | Blueprint: `value: "false"` |
| `VITE_SHOW_DEV_TOOLS`| Frontend | No | N | `false` | Yes | N/A | No | No | Render Dashboard |
| `VITE_ENABLE_PUSH` | Frontend | No | N | `false` | Yes | N/A | No | No | Render Dashboard |
| `VITE_FIREBASE_API_KEY`| Frontend | No | N | `""` | Yes | N/A | No | Yes (Opt) | Render Dashboard (Public Web App Config) |
| `VITE_FIREBASE_PROJECT_ID`| Frontend | No | N | `""` | Yes | N/A | No | Yes (Opt) | Render Dashboard |
| `VITE_FIREBASE_VAPID_KEY`| Frontend | No | N | `""` | Yes | N/A | No | Yes (Opt) | Render Dashboard (Public Client Key) |
| `RENDER_DEPLOY_HOOK_GATEWAY` | GitHub Actions | No | **Y** | N/A | N/A | N/A | **Yes** (`secrets.RENDER_DEPLOY_HOOK_GATEWAY`) | No | Render Deploy Hook URL |
| `RENDER_DEPLOY_HOOK_JOB` | GitHub Actions | No | **Y** | N/A | N/A | N/A | **Yes** (`secrets.RENDER_DEPLOY_HOOK_JOB`) | No | Render Deploy Hook URL |
| `RENDER_DEPLOY_HOOK_RESUME`| GitHub Actions | No | **Y** | N/A | N/A | N/A | **Yes** (`secrets.RENDER_DEPLOY_HOOK_RESUME`) | No | Render Deploy Hook URL |
| `RENDER_DEPLOY_HOOK_FRONTEND`| GitHub Actions | No | **Y** | N/A | N/A | N/A | **Yes** (`secrets.RENDER_DEPLOY_HOOK_FRONTEND`) | No | Render Deploy Hook URL |
| `RENDER_BASE_URL` | GitHub Actions | No | N | `https://swipex-auth-gateway.onrender.com` | N/A | N/A | No | **Yes** (`vars.RENDER_BASE_URL`) | Render service public URL |

---

## 3. Discrepancy & Coverage Analysis

### A. Variables read in code but previously missing from `.env.example`:
The following 8 variables were found to be referenced in service source code but omitted from root `.env.example`:
1. `REDIS_PASSWORD` (read by `data_hanith/config.py`)
2. `REDIS_DB` (read by `data_hanith/config.py`)
3. `REDIS_TIMEOUT` (read by `data_hanith/config.py`)
4. `SWIPEX_AUTH_MODE` (read by `data_hanith/auth_middleware.py`)
5. `RESUME_STORAGE_DIR` (read by `data_hanith/main.py`)
6. `VITE_SHOW_DEV_TOOLS` (read by `frontend_boomika/src/components/common/Header.tsx`)
7. `VITE_ENABLE_PUSH` (read by `frontend_boomika/src/services/pushService.ts`)
8. `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_VAPID_KEY` (read by `frontend_boomika/src/services/pushService.ts`)

*Remediation:* Root `.env.example` has been updated to include all of these variables with safe dev-only defaults and explanatory comments.

### B. Variables in `.env.example` not directly read by application runtime code:
1. `HOST` — Standard Docker/Uvicorn binding host, consumed by startup commands and scripts.
2. `PORT` — Service port identifier, overridden in production by Render's `$PORT`.
3. `POSTGRES_HOST`, `POSTGRES_PORT` — Helper connection components parsed into `DATABASE_URL`.
4. `CHROMADB_HOST`, `CHROMADB_PORT`, `MINIO_*` — Storage adapter configs reserved for enterprise profile activation.

All retain valid architectural purpose and are documented accordingly.

---

## 4. Public Bundle (`VITE_*`) Security Verification
Vite bakes variables prefixed with `VITE_` directly into the public client-side JavaScript bundle during `npm run build`:
- `VITE_BASE_API_URL`: Points to API Gateway public route (`https://swipex-auth-gateway.onrender.com/api/v1`). **Safe (Public URL).**
- `VITE_WS_URL`: Points to WebSocket endpoint (`wss://swipex-auth-gateway.onrender.com/api/v1/notifications/ws`). **Safe (Public URL).**
- `VITE_USE_MOCK`: Boolean toggle for in-memory mock store. **Safe (Public Config).**
- `VITE_SHOW_DEV_TOOLS`: Boolean toggle for debugging UI. **Safe (Public Config).**
- `VITE_ENABLE_PUSH`: Boolean toggle for web push. **Safe (Public Config).**
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_VAPID_KEY`: Standard Firebase Web SDK client identifiers designed by Google for public client identification. **Safe (No private service account keys or private secrets baked).**

**Audit Verdict:** Zero secrets are exposed in client-side Vite bundles.

---

## 5. Security Summary & Production Placement Matrix

| Target System | Secret Variables | Public Configuration Variables |
|---|---|---|
| **Local `.env`** (Untracked) | Dev placeholders (`swipex`, `dev-jwt-secret-key-123456789`, etc.) | Service URLs pointing to `localhost` or Docker container names |
| **Render Dashboard** | `GOOGLE_CLIENT_SECRET`, `SMTP_PASSWORD`, `VAPID_PRIVATE_KEY` (Set with `sync: false`) | `GOOGLE_CLIENT_ID`, `VAPID_PUBLIC_KEY`, `SMTP_HOST` |
| **Render Blueprint** (`render.yaml`) | `JWT_SECRET_KEY` (`generateValue: true`), `SESSION_SECRET_KEY` (`generateValue: true`), `GATEWAY_SHARED_SECRET` (`generateValue: true`), `DATABASE_URL` (`fromDatabase`), `REDIS_URL` (`fromService`) | `JOB_SERVICE_URL`, `RESUME_SERVICE_URL`, `CORS_ORIGINS`, `TRUST_GATEWAY_HEADERS`, `RUN_MIGRATION` |
| **GitHub Actions Secrets** | `RENDER_DEPLOY_HOOK_GATEWAY`, `RENDER_DEPLOY_HOOK_JOB`, `RENDER_DEPLOY_HOOK_RESUME`, `RENDER_DEPLOY_HOOK_FRONTEND` | None |
| **GitHub Actions Variables** | None | `RENDER_BASE_URL` |
