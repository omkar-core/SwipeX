# SwipeX — Render Cloud Deployment Runbook & Troubleshooting Architecture
**Project:** SwipeX — AI-Powered Swipe-Based Job Discovery & Career Intelligence Platform  
**Owner:** Intern 5 (Omkar — Platform, Testing, CI/CD & Deployment)  
**Target Repository:** `https://github.com/omkar-core/SwipeX-.git` (branch `main`)  
**Audit Date:** October 13, 2026  
**Infrastructure Spec:** [`render.yaml`](../../render.yaml)

---

## 1. Verified Free-Tier Limits & Architecture (October 13, 2026)

| Resource | Allocation | Limits & Constraints | Architectural Handling |
| :--- | :--- | :--- | :--- |
| **Web Services** | 512 MB RAM, Shared CPU | Sleeps after 15 min idle. Cold start ~30–60 s. **Cannot receive private inbound traffic.** | Upstreams wired via public HTTPS URLs. `smoke_test.py` warms up to 600 s. |
| **PostgreSQL** | 1 GB Storage, 256 MB RAM | **Expires 30 days after creation.** Strict limit: **1 free DB per workspace.** | Idempotent migration with `pg_advisory_lock` (ID: 849204) runs on gateway boot. |
| **Key Value (Redis)**| 25 MB RAM, 50 conns | In-memory only; no disk persistence. | Ephemeral token blacklist / session caching. |
| **Static Site** | Unlimited builds, Global CDN | Build-time environment variables only. | SPA rewrite `/* -> /index.html`, `NODE_VERSION: 20.18.0`. |
| **Pre-Deploy Hooks**| Paid plans only | Unavailable on free tier. | Replaced by `entrypoint_render.py` idempotent startup hook. |

---

## 2. Tested Deployment Procedure (Blueprint Method)

### Step 1: Clean Up Old Resources
1. In the Render Dashboard, check if an existing free PostgreSQL database or old manual web service exists.
2. If an older free database exists, **Delete** it (Render strictly permits only **1 free PostgreSQL** instance per workspace).
3. Delete the older standalone `swipex-auth-gateway` service (manual services do not inherit `fromDatabase` environment wiring from Blueprints).

### Step 2: Apply the Blueprint
1. Click **New +** > **Blueprint**.
2. Connect your GitHub repository: `omkar-core/SwipeX-`.
3. Branch: **`main`**.
4. Blueprint File Path: `render.yaml`.
5. Click **Apply**.
   - Render provisions `swipex-omkar-postgres` and `swipex-omkar-redis` first.
   - Once the database is ready, Render provisions the 4 web services in parallel.

### Step 3: Secrets & Variables Input
* Render auto-generates:
  - `JWT_SECRET_KEY`
  - `SESSION_SECRET_KEY`
  - `GATEWAY_SHARED_SECRET`
* Auto-wired via Blueprint:
  - `DATABASE_URL` (Internal connection string from `swipex-omkar-postgres`)
  - `REDIS_URL` (Connection string from `swipex-omkar-redis`)
* `sync: false` variables: **None**. All variables are either auto-generated, auto-wired, or have safe defaults.

### Step 4: Verify Service Logs
Open the logs for `swipex-omkar-gateway` and verify the expected sequence:
```text
Waiting for database connection to postgresql://...
Database TCP port reachable.
Acquiring Postgres advisory lock (849204) to coordinate concurrent migrations...
Postgres advisory lock acquired successfully.
[2/4] Applying canonical schema...
[3/4] Applying Milestone 4 schema extensions...
[4/4] Ensuring baseline curated seed data exists...
Database migration and baseline seeding complete! Exit Code 0.
Postgres advisory lock released.
Starting ASGI application 'backend_mansi.app.main:app' on 0.0.0.0:10000
Application startup complete.
Uvicorn running on http://0.0.0.0:10000
```

### Step 5: Configure GitHub Variables & Verify CI
1. In the Render Dashboard, copy each service's actual public URL from the header.
2. Go to GitHub repo: `https://github.com/omkar-core/SwipeX-` > **Settings** > **Secrets and variables** > **Actions** > **Variables** tab.
3. Add Repository Variables:
   - `RENDER_BASE_URL` = `https://swipex-omkar-gateway.onrender.com` (Required)
   - `RENDER_JOB_URL` = `https://swipex-omkar-jobs.onrender.com` (Optional)
   - `RENDER_RESUME_URL` = `https://swipex-omkar-resume.onrender.com` (Optional)
   - `RENDER_FRONTEND_URL` = `https://swipex-omkar-web.onrender.com` (Optional)
4. Go to **Actions** > Select the latest workflow run > Click **Re-run failed jobs**. The smoke test will run and report green!

---

## 3. Manual Fallback Procedure (If Blueprint is Blocked)

If the Blueprint Apply fails or is blocked, create the resources manually in this exact order:

### Order of Creation:
1. `swipex-omkar-postgres` (PostgreSQL)
2. `swipex-omkar-redis` (Key Value)
3. `swipex-omkar-jobs` (Web Service)
4. `swipex-omkar-resume` (Web Service)
5. `swipex-omkar-gateway` (Web Service)
6. `swipex-omkar-web` (Static Site)

---

### Resource 1: PostgreSQL Database
* **Name:** `swipex-omkar-postgres`
* **Database Name:** `swipex_auth`
* **User:** `swipex`
* **Region:** `oregon`
* **Plan:** `Free`

---

### Resource 2: Redis Key-Value Store
* **Name:** `swipex-omkar-redis`
* **Region:** `oregon`
* **Plan:** `Free`

---

### Resource 3: Job & Data Intelligence Service
* **Name:** `swipex-omkar-jobs`
* **Region:** `oregon`
* **Plan:** `Free`
* **Runtime:** `Python`
* **Build Command:** `pip install --upgrade pip && pip install --prefer-binary -r data_hanith/requirements.txt -r integration_omkar/requirements-prod.txt`
* **Start Command:** `python integration_omkar/deploy/entrypoint_render.py --app data_hanith.main:app`
* **Health Check Path:** `/health`
* **Environment Variables:**
  - `PYTHON_VERSION`: `3.11.9`
  - `DATABASE_URL`: *(Copy Internal Connection String from `swipex-omkar-postgres`)*
  - `JOB_DATABASE_URL`: *(Same as DATABASE_URL)*
  - `GATEWAY_SHARED_SECRET`: `swipex-secure-cluster-secret-2026`
  - `TRUST_GATEWAY_HEADERS`: `true`

---

### Resource 4: Resume & AI Career Intelligence Service
* **Name:** `swipex-omkar-resume`
* **Region:** `oregon`
* **Plan:** `Free`
* **Runtime:** `Python`
* **Build Command:** `pip install --upgrade pip && pip install --prefer-binary -r aiml_hemalatha/requirements.txt -r integration_omkar/requirements-prod.txt`
* **Start Command:** `python integration_omkar/deploy/entrypoint_render.py --app aiml_hemalatha.app.main:app`
* **Health Check Path:** `/health`
* **Environment Variables:**
  - `PYTHON_VERSION`: `3.11.9`
  - `JOB_SERVICE_URL`: `https://swipex-omkar-jobs.onrender.com`

---

### Resource 5: Auth Service & API Gateway
* **Name:** `swipex-omkar-gateway`
* **Region:** `oregon`
* **Plan:** `Free`
* **Runtime:** `Python`
* **Build Command:** `pip install --upgrade pip && pip install --prefer-binary -r backend_mansi/requirements.txt -r data_hanith/requirements.txt -r integration_omkar/requirements-prod.txt`
* **Start Command:** `python integration_omkar/deploy/entrypoint_render.py --app backend_mansi.app.main:app`
* **Health Check Path:** `/health`
* **Environment Variables:**
  - `PYTHON_VERSION`: `3.11.9`
  - `DATABASE_URL`: *(Copy Internal Connection String from `swipex-omkar-postgres`)*
  - `REDIS_URL`: *(Copy Internal Connection String from `swipex-omkar-redis`)*
  - `RUN_MIGRATION`: `true`
  - `JWT_SECRET_KEY`: *(Generate random 32-character string)*
  - `SESSION_SECRET_KEY`: *(Generate random 32-character string)*
  - `GATEWAY_SHARED_SECRET`: `swipex-secure-cluster-secret-2026`
  - `JOB_SERVICE_URL`: `https://swipex-omkar-jobs.onrender.com`
  - `RESUME_SERVICE_URL`: `https://swipex-omkar-resume.onrender.com`
  - `MATCHING_ENGINE_URL`: `https://swipex-omkar-resume.onrender.com`
  - `CORS_ORIGINS`: `https://swipex-omkar-web.onrender.com`

---

### Resource 6: Frontend Web Client (Static Site)
* **Name:** `swipex-omkar-web`
* **Region:** `oregon`
* **Plan:** `Free`
* **Root Directory:** `frontend_boomika`
* **Build Command:** `npm ci && npm run build`
* **Publish Directory:** `dist`
* **Redirects/Rewrites:**
  - Type: `Rewrite` | Source: `/*` | Destination: `/index.html`
* **Environment Variables:**
  - `NODE_VERSION`: `20.18.0`
  - `VITE_BASE_API_URL`: `https://swipex-omkar-gateway.onrender.com/api/v1`
  - `VITE_API_URL`: `https://swipex-omkar-gateway.onrender.com`
  - `VITE_WS_URL`: `wss://swipex-omkar-gateway.onrender.com/api/v1/notifications/ws`
  - `VITE_USE_MOCK`: `false`

---

## 4. Troubleshooting Decision Table

| Symptom / Error Message | Root Cause | Concrete Action Required |
| :--- | :--- | :--- |
| `build: pydantic-core / maturin / cargo error` | Unpinned Python 3.14 on Render default image | Pin `PYTHON_VERSION: 3.11.9` in `render.yaml` and `.python-version`. Use `--prefer-binary`. |
| `build (static): Node / Vite engine error` | Unpinned or outdated Node.js runtime | Pin `NODE_VERSION: 20.18.0` in `render.yaml` static site envVars. |
| `start: "No database URL configured ... (none)"` | Service created manually without Blueprint env wiring | Re-create service via Blueprint, or add `DATABASE_URL` (Internal Connection String) in service Environment tab. |
| `start: DB connection refused / host not found` | Region mismatch or database still provisioning | Ensure database and web services are in `oregon`. Use **Internal** DB URL, not External URL. |
| `start: "No open ports detected"` | Port binding took too long or crashed | Verify entrypoint binds `0.0.0.0:$PORT`. Check service logs for startup traceback. |
| `runtime: relation "jobs" does not exist` | Database migrations did not run | Verify `RUN_MIGRATION: "true"` on gateway. Check logs for advisory lock acquisition and migration output. |
| `URL: x-render-routing: no-server` | Wrong hostname or service suffix added | Copy actual hostname from Render Dashboard header and update GitHub Actions `RENDER_BASE_URL`. |
| `gateway: 502 / 504 on first request` | Downstream microservice (Jobs / Resume) was sleeping | Allow 30–60s for cold-start wake-up. Verify `JOB_SERVICE_URL` and `RESUME_SERVICE_URL` are correct. |
| `browser: CORS blocked by policy` | Gateway `CORS_ORIGINS` missing frontend domain | Update `CORS_ORIGINS` on `swipex-omkar-gateway` with the exact frontend domain. |
| `browser: network calls go to localhost` | Frontend baked localhost at build time | Update `VITE_BASE_API_URL` in static site Environment tab and click **Manual Deploy** > **Clear build cache & deploy**. |
| `browser: 404 Not Found on page refresh` | SPA client-side routing rewrite missing | Add rewrite rule in static site settings: `/* -> /index.html` (Rewrite). |
| `Blueprint Apply fails: free DB limit reached` | Multiple free databases in workspace | Delete older unused free database from Render Dashboard (limit 1 free PostgreSQL DB per workspace). |
