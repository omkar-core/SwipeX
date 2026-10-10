# SwipeX — Milestone 4 Production Deployment Runbook

**Document Owner:** Intern 5 (Platform, Testing & Deployment / Integration Lead)  
**Milestone:** 4 Final Release  
**Target Environment:** Local Docker Compose & Render Production Cloud  
**Status:** Approved & Validated ✅  

---

## 1. System Overview & Deployment Architecture

SwipeX is architected as an integrated microservice platform composed of:
1. **Frontend Web Client** (`frontend_boomika`): React 19 + TypeScript + Vite + Tailwind CSS Single Page Application (SPA).
2. **Auth Service & API Gateway** (`backend_mansi`): FastAPI ASGI server providing RBAC, JWT tokens, Google OAuth2, WebSocket notifications (`/api/v1/notifications/ws`), Application Tracking System (ATS), Job Competition tracking, and Analytics dashboards.
3. **Job & Data Intelligence Service** (`data_hanith`): FastAPI ASGI service managing job postings, company profiles, swipe recording, and search/filtering.
4. **Resume & Career Intelligence Service** (`aiml_hemalatha`): FastAPI service providing multi-format resume parsing (PDF/DOCX), ATS compatibility scoring, gap analysis, and AI job recommendations.
5. **Data Layer**: PostgreSQL 15 relational database, Redis 7 caching and Pub/Sub broker, with persistent disk volumes for uploaded resumes.

---

## 2. Prerequisites

### Local Development / Evaluation
- **Docker**: Engine 24+ and Docker Compose v2.20+
- **Node.js**: v20 LTS (`node --version >= 20.0.0`) and `npm >= 10.0.0`
- **Python**: v3.11.x (`python --version == 3.11.*`)

### Render Cloud Deployment
- Render account with access to Blueprint creation or manual Web Service creation.
- GitHub repository access for automated CI/CD branch tracking (`Team-4` / `main`).
- Configured PostgreSQL instance (Render Managed PostgreSQL or external URI).

---

## 3. Environment Variables Reference

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable Name | Scope | Default / Value | Description |
|---|---|---|---|
| `DATABASE_URL` | Gateway & Job | `postgresql://swipex:swipex@postgres:5432/swipex_auth` | Primary PostgreSQL database connection string |
| `JWT_SECRET_KEY` | Gateway | *(Generated strong random key)* | Secret used to sign and verify HMAC-SHA256 JWT tokens |
| `SESSION_SECRET_KEY` | Gateway | *(Generated random key)* | Session cookie encryption secret for OAuth flows |
| `GATEWAY_SHARED_SECRET` | All Backend | `swipex-internal-gateway-secret` | Shared secret header (`X-Gateway-Secret`) for upstream verification |
| `JOB_SERVICE_URL` | Gateway & Resume | `http://job-data-service:8002` | Network URI for Job Intelligence Service |
| `RESUME_SERVICE_URL` | Gateway | `http://resume-service:8003` | Network URI for Resume Intelligence Service |
| `MATCHING_ENGINE_URL` | Gateway | `http://resume-service:8003` | Recommendation engine endpoint |
| `REDIS_HOST` | Job Service | `redis` | Hostname of Redis cache |
| `REDIS_PORT` | Job Service | `6379` | Port for Redis cache |
| `VITE_BASE_API_URL` | Frontend | `http://localhost:8001/api/v1` | Public API Gateway base URL |
| `VITE_WS_URL` | Frontend | `ws://localhost:8001/api/v1/notifications/ws` | WebSocket URL for real-time notifications |
| `VITE_USE_MOCK` | Frontend | `false` | Disables mock adapter and routes traffic to live backend |
| `CORS_ORIGINS` | Gateway | `*` or deployed frontend URL | Allowed CORS origins for security compliance |

---

## 4. Local Docker Compose Deployment

### Step 1: Validate Compose Configuration
```powershell
docker compose -f docker-compose.dev.yml config
```

### Step 2: Build and Start Containers
```powershell
docker compose -f docker-compose.dev.yml up --build -d
```

### Step 3: Verify Service Health
```powershell
docker compose -f docker-compose.dev.yml ps
```
Expected healthy services:
- `swipex-postgres` (`5432:5432`, healthy)
- `swipex-redis` (`6379:6379`, healthy)
- `swipex-job-data` (`8002:8002`, running)
- `swipex-resume-service` (`8003:8003`, running)
- `swipex-auth-gateway` (`8001:8001`, running)
- `swipex-frontend` (`3000:3000`, running)

### Step 4: Inspect Live Logs
```powershell
# Follow all service logs
docker compose -f docker-compose.dev.yml logs -f --tail=100

# Inspect specific service
docker compose -f docker-compose.dev.yml logs auth-gateway --tail=100
```

### Step 5: Shutting Down Safely
```powershell
# Stop containers without wiping data volumes
docker compose -f docker-compose.dev.yml down
```
*(Never pass `-v` unless an explicit complete database purge is requested).*

---

## 5. Render Production Deployment Procedure

Render deployment is automated using the repository's `render.yaml` Blueprint.

### Option A: Blueprint Deployment (Recommended)
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** &rarr; **Blueprint**.
3. Connect repository: `AI-Powered-Swipe-Based-Job-Discovery-and-Personalized-Career-Intelligence-Platform`.
4. Select target branch: `Team-4` (or approved release branch `main`).
5. Render detects `render.yaml` and provisions:
   - `swipex-postgres` (PostgreSQL Database)
   - `swipex-frontend` (Static Site CDN)
   - `swipex-auth-gateway` (Web Service with WebSocket support)
   - `swipex-job-service` (Web Service)
   - `swipex-resume-service` (Web Service)
6. Click **Apply**.
7. Once deployed, copy the generated service URLs and verify the environment variables:
   - On `swipex-frontend`: Set `VITE_BASE_API_URL` to `https://swipex-auth-gateway.onrender.com/api/v1` and `VITE_WS_URL` to `wss://swipex-auth-gateway.onrender.com/api/v1/notifications/ws`.
   - On `swipex-auth-gateway`: Set `CORS_ORIGINS` to `https://swipex-frontend.onrender.com`.

### Option B: Individual Service Setup
If provisioning services individually without Blueprints:
1. **Database**: Create a Render PostgreSQL database named `swipex-postgres`.
2. **Frontend**: Create a **Static Site**:
   - Root Directory: `frontend_boomika`
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`
   - Add Rewrite Rule: `/*` &rarr; `/index.html`
3. **Auth Gateway**: Create a **Web Service**:
   - Root Directory: `backend_mansi`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/health`
4. **Job Service**: Create a **Web Service**:
   - Root Directory: `data_hanith`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/health`
5. **Resume Service**: Create a **Web Service**:
   - Root Directory: `aiml_hemalatha`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/health`

---

## 6. Post-Deployment Verification & Smoke Tests

After services report live, execute the following smoke tests:

### 1. Health Check Verification
```bash
curl -f https://swipex-auth-gateway.onrender.com/health
curl -f https://swipex-job-service.onrender.com/health
curl -f https://swipex-resume-service.onrender.com/health
```
All must respond with HTTP 200 and `{"status": "ok"}` or `{"status": "healthy"}`.

### 2. User Authentication Smoke Test
```bash
# Register test candidate
curl -X POST https://swipex-auth-gateway.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Smoke Test", "email": "smoke@swipex.careers", "password": "SmokePassword123!", "role": "job_seeker"}'

# Login test candidate
curl -X POST https://swipex-auth-gateway.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "smoke@swipex.careers", "password": "SmokePassword123!"}'
```

### 3. Real-Time WebSocket Verification
Using any WebSocket client (e.g. `wscat` or browser DevTools):
```bash
wscat -c "wss://swipex-auth-gateway.onrender.com/api/v1/notifications/ws?token=<ACCESS_TOKEN>"
```
Verify successful upgrade to 101 Switching Protocols.

### 4. Job Competition & ATS Smoke Test
```bash
# Query job competition
curl https://swipex-auth-gateway.onrender.com/api/v1/jobs/competition-filter?level=Low

# Query hiring trends
curl https://swipex-auth-gateway.onrender.com/api/v1/analytics/hiring-trends
```

---

## 7. Rollback & Disaster Recovery Procedures

### Instant Render Rollback
1. Navigate to the service on the Render Dashboard.
2. Under the **Deploys** tab, locate the previous known-good deployment.
3. Click the **...** menu next to the previous deploy and select **Rollback to this deploy**.
4. Render immediately switches traffic to the previous release build.

### Database Migration Rollback
If a schema migration must be rolled back:
1. Connect to PostgreSQL using `psql` with `DATABASE_URL`.
2. Apply the idempotent rollback script:
   ```bash
   psql $DATABASE_URL -f data_hanith/db/migrations/004_m4_rollback.sql
   ```
3. Verify table drop or state restore:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema='public';
   ```

---

## 8. Troubleshooting Guide

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| HTTP 503 from Gateway on `/api/v1/jobs` | Downstream Job Service unreachable | Verify `JOB_SERVICE_URL` environment variable and ensure `swipex-job-service` health check passes. |
| HTTP 504 on Resume Upload / Parsing | Parsing took longer than client timeout | Confirm file size is under 5MB. Ensure `aiml_hemalatha` container is allocated at least 512MB RAM. |
| WebSocket connection fails (`403` or closed) | Missing or expired JWT token | Ensure token query parameter is formatted as `?token=<JWT>` and not expired. |
| CORS Error in Browser Console | Origin mismatch | Update `CORS_ORIGINS` in Gateway environment to match the exact frontend URL (including `https://`). |
| Database connection refused | PostgreSQL still starting or credentials incorrect | Ensure `DATABASE_URL` matches connection string and that PostgreSQL container has completed initialization. |
