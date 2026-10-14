"""
render_manual_guide.py - Deterministic Generator for MANUAL_RENDER_SETUP.md
Owned by Intern 5 (Platform, Testing & Deployment).

Reads render.yaml and verified facts to generate a copy-paste setup guide.
Ensures zero drift between render.yaml Blueprint specification and manual dashboard instructions.
"""
import os
import yaml

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RENDER_YAML_PATH = os.path.join(BASE_DIR, "render.yaml")
OUTPUT_MD_PATH = os.path.join(BASE_DIR, "integration_omkar", "docs", "MANUAL_RENDER_SETUP.md")


def load_render_spec() -> dict:
    with open(RENDER_YAML_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def generate_manual_guide_markdown(spec: dict) -> str:
    db_spec = spec["databases"][0]
    services = {s["name"]: s for s in spec["services"]}

    web_svc = services.get("swipex-omkar-web", {})
    gateway_svc = services.get("swipex-omkar-gateway", {})
    jobs_svc = services.get("swipex-omkar-jobs", {})
    resume_svc = services.get("swipex-omkar-resume", {})

    content = f"""# SwipeX — Render Production Manual Setup Guide
**Author:** Intern 5 (Platform, Testing & Deployment)  
**Target Repository:** `https://github.com/omkar-core/SwipeX.git` (Branch: `main`)  
**Region:** `oregon` (All services and database MUST be in the same region)  
**Auto-Generated From:** [`render.yaml`](../../render.yaml) (Zero-drift specification)

---

## Architecture & Creation Order Overview

```
                      [Global CDN: Static Site]
                       swipex-omkar-web (dist)
                                  │
                                  ▼
                   [API Gateway / Auth Service]
                  swipex-bpgb.onrender.com (Live)
                        (RUN_MIGRATION=true)
                          │             │
              ┌───────────┘             └───────────┐
              ▼                                     ▼
     [Jobs Service]                         [Resume & AIML]
   swipex-omkar-jobs                      swipex-omkar-resume
   (Reads DATABASE_URL)                 (Pure CPU In-Memory)
              │                                     │
              └───────────┐             ┌───────────┘
                          ▼             ▼
              [Shared PostgreSQL: {db_spec['name']}]
```

> [!IMPORTANT]
> **Free Tier Database Expiration:** Render free PostgreSQL databases expire 30 days after creation.
> **Internal Network URLs:** Always use the database's **Internal Database URL** (`postgresql://...`) for backend web services to avoid egress latency and public traffic charges.

---

## Step 0: PostgreSQL Database ({db_spec['name']})
- **Status:** Existing (Active).
- **Service Name:** `{db_spec['name']}`
- **Database Name:** `{db_spec['databaseName']}`
- **User:** `{db_spec['user']}`
- **Plan:** `{db_spec['plan'].capitalize()}`
- **Region:** `{db_spec['region']}`
- **Connection String:** Navigate to **Postgres > Connect > Internal Database URL** (Copy this value for Step 1 & Step 2).

---

## Step 1: Auth Service & API Gateway (`{gateway_svc.get('name')}`)
- **Status:** **LIVE** at `https://swipex-bpgb.onrender.com`
- **Missing Settings to Add in Render Dashboard:**
  1. **Health Check Path:** `{gateway_svc.get('healthCheckPath', '/health')}`
  2. **Environment Variables to Add (once downstream services exist):**
     - `JOB_SERVICE_URL`: Set to the live Jobs web service URL (e.g. `https://swipex-omkar-jobs.onrender.com`).
     - `RESUME_SERVICE_URL`: Set to the live Resume web service URL (e.g. `https://swipex-omkar-resume.onrender.com`).
     - `MATCHING_ENGINE_URL`: Set to the live Resume web service URL (e.g. `https://swipex-omkar-resume.onrender.com`).
     - `CORS_ORIGINS`: Set to your frontend static site URL (e.g. `https://swipex-omkar-web.onrender.com`).

---

## Step 2: Jobs Service (`{jobs_svc.get('name')}`)
Create as **New > Web Service**:
- **Repository:** `https://github.com/omkar-core/SwipeX.git`
- **Branch:** `main`
- **Root Directory:** *(leave blank)*
- **Runtime:** `Python 3`
- **Instance Type:** `Free`
- **Region:** `Oregon`
- **Build Command:**
  ```bash
  {jobs_svc.get('buildCommand')}
  ```
- **Start Command:**
  ```bash
  {jobs_svc.get('startCommand')}
  ```
- **Health Check Path:** `{jobs_svc.get('healthCheckPath', '/health')}`
- **Environment Variables:**
  - `PYTHON_VERSION`: `3.11.9`
  - `DATABASE_URL`: *(Paste the Internal Database URL from Step 0)*
  - `GATEWAY_SHARED_SECRET`: *(Same token used in Gateway)*
  - `TRUST_GATEWAY_HEADERS`: `true`
  - *(DO NOT set RUN_MIGRATION=true on Jobs service; migrations are handled solely by Gateway)*

---

## Step 3: Resume & Career Intelligence Service (`{resume_svc.get('name')}`)
Create as **New > Web Service**:
- **Repository:** `https://github.com/omkar-core/SwipeX.git`
- **Branch:** `main`
- **Root Directory:** *(leave blank)*
- **Runtime:** `Python 3`
- **Instance Type:** `Free`
- **Region:** `Oregon`
- **Build Command:**
  ```bash
  {resume_svc.get('buildCommand')}
  ```
- **Start Command:**
  ```bash
  {resume_svc.get('startCommand')}
  ```
- **Health Check Path:** `{resume_svc.get('healthCheckPath', '/health')}`
- **Database Dependency:** **None** (pure in-memory NLP & ChromaDB vector store; no PostgreSQL required).
- **Environment Variables:**
  - `PYTHON_VERSION`: `3.11.9`
  - `JOB_SERVICE_URL`: `https://swipex-omkar-jobs.onrender.com`

---

## Step 4: Frontend Static Site (`{web_svc.get('name')}`)
Create as **New > Static Site**:
- **Repository:** `https://github.com/omkar-core/SwipeX.git`
- **Branch:** `main`
- **Root Directory:** `{web_svc.get('rootDir')}`
- **Build Command:**
  ```bash
  {web_svc.get('buildCommand')}
  ```
- **Publish Directory:** `{web_svc.get('staticPublishPath')}`
- **Redirects / Rewrites:**
  - Type: `Rewrite`
  - Source: `/*`
  - Destination: `/index.html`
- **Environment Variables:**
  - `NODE_VERSION`: `20.18.0`
  - `VITE_BASE_API_URL`: `https://swipex-bpgb.onrender.com/api/v1`
  - `VITE_WS_URL`: `wss://swipex-bpgb.onrender.com/ws/notifications`
  - `VITE_USE_MOCK`: `false`

> [!NOTE]
> Vite embeds `VITE_*` variables into javascript bundles at **BUILD TIME**. If you change the Gateway URL later, you must trigger a manual **Clear build cache & deploy** on the Static Site.

---

## Step 5: Secret Generation Guide
To generate cryptographically secure tokens locally for Render environment variables, run:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
Required Secrets (names only):
1. `JWT_SECRET_KEY` (Auth token signing)
2. `SESSION_SECRET_KEY` (Session middleware encryption)
3. `GATEWAY_SHARED_SECRET` (Inter-service authentication header `X-Gateway-Secret`)

---

## Step 6: Post-Creation URL Wiring
After all services have been provisioned and URLs are assigned:
1. **In Gateway Dashboard:**
   - Set `JOB_SERVICE_URL` -> Jobs URL.
   - Set `RESUME_SERVICE_URL` -> Resume URL.
   - Set `MATCHING_ENGINE_URL` -> Resume URL.
   - Set `CORS_ORIGINS` -> Static Site URL.
2. **In Static Site Dashboard:**
   - Set `VITE_BASE_API_URL` -> `https://swipex-bpgb.onrender.com/api/v1`
   - Trigger **Manual Deploy > Clear build cache & deploy**.

---

## Step 7: Live Verification Checklist
Open each URL in your browser or run the automated checker:
1. Gateway Health: `https://swipex-bpgb.onrender.com/health` -> `HTTP 200 {{"status":"healthy"}}`
2. Gateway Docs: `https://swipex-bpgb.onrender.com/docs` -> `HTTP 200 (Swagger UI)`
3. Jobs Route via Gateway: `https://swipex-bpgb.onrender.com/api/v1/jobs` -> `HTTP 200 (JSON job list)`
4. Frontend App: `https://swipex-omkar-web.onrender.com` -> `HTTP 200 (SwipeX Web UI loaded)`

---

## Step 8: Production Troubleshooting Matrix

| Symptom / Error | Root Cause | Verified Fix |
|---|---|---|
| `GET /` returns `404 {{"detail":"Not Found"}}` | Normal FastAPI behavior; no root `/` route defined. | Use `/health` or `/docs` to probe health. |
| Host does not exist (`no-server`) | Typo in service hostname or service deleted. | Verify exact URL in Render dashboard. |
| `HTTP 502 / 504 Gateway Timeout` on first call | Downstream service is cold-starting from sleep. | Render free-tier spins down after 15 min idle; wait ~60s and retry. |
| `psycopg2.errors.UndefinedTable: relation "jobs" does not exist` | Database migration did not execute. | Ensure `RUN_MIGRATION=true` is set on Gateway and inspect deployment logs. |
| Browser CORS Error (`No 'Access-Control-Allow-Origin'`) | Gateway `CORS_ORIGINS` does not match frontend domain. | Update `CORS_ORIGINS` in Gateway Environment to match static site domain. |
| Frontend displays mock data / calls `localhost` | `VITE_*` variable was unset during build. | Set `VITE_BASE_API_URL` and `VITE_USE_MOCK=false`, then redeploy with cache cleared. |

---

## Alternative: Declarative Blueprint Deployment (`render.yaml`)
If you prefer Infrastructure-as-Code over manual point-and-click:
1. In Render Dashboard, click **New > Blueprint**.
2. Connect `https://github.com/omkar-core/SwipeX.git`.
3. Render reads [`render.yaml`](../../render.yaml) and provisions all 4 services, PostgreSQL, environment variables, and rewrite rules automatically in one transaction.
"""
    return content


def write_manual_guide():
    spec = load_render_spec()
    guide = generate_manual_guide_markdown(spec)
    os.makedirs(os.path.dirname(OUTPUT_MD_PATH), exist_ok=True)
    with open(OUTPUT_MD_PATH, "w", encoding="utf-8") as f:
        f.write(guide)
    print(f"[GUIDE] Successfully generated {OUTPUT_MD_PATH}")


if __name__ == "__main__":
    write_manual_guide()
