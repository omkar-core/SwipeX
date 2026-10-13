# SwipeX — Render Cloud Deployment Runbook & Free Tier Architecture
**Project:** SwipeX — AI-Powered Swipe-Based Job Discovery & Career Intelligence Platform  
**Owner:** Intern 5 (Omkar — Platform, Testing, CI/CD & Deployment)  
**Branch:** `Team-4` (push target: `origin main`)  
**Date of Audit & Verification:** October 13, 2026  
**Infrastructure-as-Code Spec:** [`render.yaml`](../../render.yaml)

---

## QUICK FIX — Render Service "No database URL configured" (DEF-044)

> **Root cause confirmed:** The Render service (`swipex-auth-gateway`) was created **manually** in the
> Dashboard. Manually-created services **do not** inherit env vars wired in `render.yaml` via
> `fromDatabase`. The Blueprint was never applied, so `DATABASE_URL` was never injected.

### Option A — Re-create as Blueprint (Recommended)

1. In the Render Dashboard → locate `swipex-auth-gateway` → **Delete** it (Settings → Delete Service).
2. Click **New + → Blueprint**.
3. Connect repo: `omkar-core/SwipeX-` (or the upstream `springboardmentor54321v/...`).
4. Branch: **`main`** (Render tracks `main`; ensure the fixed commit has been pushed — see Step 6).
5. Render will parse `render.yaml` and show all 6 components.  
   Verify you see: `swipex-postgres`, `swipex-redis`, `swipex-frontend`, `swipex-auth-gateway`,  
   `swipex-job-service`, `swipex-resume-service`.
6. Click **Apply**. Render provisions the database first, then wires `DATABASE_URL` automatically.

### Option B — Keep Manual Service, Add DATABASE_URL Manually

If you prefer not to delete the service:

1. Render Dashboard → select the `swipex-postgres` database → **Connect** tab.
2. Copy the **Internal Connection String** (format: `postgres://user:pass@dpg-xxx-a/dbname`).  
   ⚠️ Use INTERNAL (no `.render.com` in the host) — both service and DB must be in `oregon`.
3. Render Dashboard → `swipex-auth-gateway` → **Environment** tab → **Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: *(paste the internal connection string — keep this secret, never share it)*
4. Click **Save Changes**. The service restarts automatically.

**Variable names to set (names only — never paste passwords here or in chat):**

| Variable | How Provisioned |
|---|---|
| `DATABASE_URL` | Blueprint `fromDatabase` auto-wired **OR** manually from DB Connect tab |
| `JOB_DATABASE_URL` | Blueprint auto-wired on `swipex-job-service` only |
| `REDIS_URL` | Blueprint `fromService` auto-wired |
| `JWT_SECRET_KEY` | Blueprint `generateValue: true` (auto-generated) |
| `SESSION_SECRET_KEY` | Blueprint `generateValue: true` (auto-generated) |
| `GATEWAY_SHARED_SECRET` | Blueprint `generateValue: true` (auto-generated) |
| `PORT` | Injected by Render runtime (do not set manually) |
| `RUN_MIGRATION` | Set to `"true"` in `render.yaml` on gateway service only |

---

## 1. Which Repo/Branch Render Must Deploy From

| | Value |
|---|---|
| **GitHub repo Render tracks** | `omkar-core/SwipeX-` (origin) |
| **Branch** | `main` |
| **render.yaml location** | Repository root (`render.yaml`) |
| **After I say push** | `git push origin Team-4:main` |

> ⚠️ If the upstream `springboardmentor54321v/...` repo is what Render is connected to,
> push there instead: `git push upstream Team-4:main`.

---

## 2. Verified Render Free Tier Limits (October 13, 2026)

| Resource | Allocation | Limits | Mitigation |
|---|---|---|---|
| Web Services | 512 MB RAM, 0.1 CPU | Sleeps after 15 min inactivity. Cold start 50–120 s. | `smoke_test.py` polls with 120 s timeout. |
| **PostgreSQL** | 1 GB SSD, 256 MB RAM, **PostgreSQL 16** | **Expires 30 days after creation**. 14-day grace. No pooling or backups. One DB per workspace. | Idempotent `migrate_and_seed.py` re-initializes a replacement DB in seconds. |
| Key Value (Redis) | 25 MB RAM, 50 connections | No disk persistence. | Used for ephemeral JWT blocklist only. |
| Static Site | Unlimited builds, 100 GB bandwidth/month | — | Configured with SPA rewrite + security headers. |
| Pre-Deploy Commands | Paid plans only | Not available on free tier. | Replaced by `entrypoint_render.py` which runs migration on startup. |

---

## 3. Infrastructure-as-Code Architecture (`render.yaml`)

```
databases:
  swipex-postgres  (plan: free, region: oregon, PostgreSQL 16)

keyvalue:
  swipex-redis     (plan: free, region: oregon)

web (static):
  swipex-frontend  (frontend_boomika, npm ci && npm run build, dist/)

web (python):
  swipex-auth-gateway   <- DATABASE_URL wired, RUN_MIGRATION=true (migrator)
  swipex-job-service    <- DATABASE_URL + JOB_DATABASE_URL wired
  swipex-resume-service <- no DB (aiml_hemalatha does not read DATABASE_URL)
```

All Python services: region `oregon`, Python 3.11.9, `--prefer-binary`.

---

## 4. Step-by-Step Deploy (After Code Is Pushed)

1. **Push code** (only after I say "push"):
   ```
   git push origin Team-4:main
   ```
2. **Apply Blueprint** (if not already done): New + → Blueprint → connect repo → branch `main` → Apply.
3. **Wait** for Render to provision `swipex-postgres` first (~60 s), then services deploy.
4. **Check logs** on `swipex-auth-gateway`:
   - Should see: `Normalized DATABASE_URL scheme: postgres:// -> postgresql://`
   - Should see: `Database TCP port reachable on attempt N.`
   - Should see: `Database migration step completed successfully.`
   - Should see: `Started server process`
5. **Verify**:
   - `GET https://swipex-auth-gateway.onrender.com/health` → HTTP 200
   - `GET https://swipex-auth-gateway.onrender.com/api/v1/jobs` → HTTP 200 (5 curated jobs or empty list)
   - `GET https://swipex-job-service.onrender.com/health` → HTTP 200
   - `GET https://swipex-resume-service.onrender.com/health` → HTTP 200

---

## 5. Known Free-Tier Constraints & Warnings

- **Postgres expires 30 days after creation.** When it expires, re-create the database (Dashboard → Databases → New → Free), then update `DATABASE_URL` on all services (or delete+re-Blueprint).
- **Cold start 50–120 s.** First request after inactivity will be slow. This is expected.
- **512 MB RAM limit.** Verified working set ~18 MB RSS per service. No action needed.
- **One database per free workspace.** All three Python services share the same `swipex-postgres` instance.
- **Missing dataset (DEF-045):** `data/raw/indian-job-market-dataset-2025.xlsx` is not in the repo. The seed step logs a warning and the app starts with 5 curated jobs. Contact Hanith (Intern 3) for the full dataset.
- **Limits verified:** October 13, 2026 — [render.com/docs/free](https://render.com/docs/free).

---

## 6. Rollback

**Instant (recommended):** Dashboard → service → Deploys tab → previous healthy commit → `...` → Rollback to this deploy. Traffic switches in < 15 s.

**Git rollback:**
```bash
git revert HEAD --no-edit
git push origin main
```

---

## 7. Python Version & Wheel Parity (DEF-043)

All Python services are pinned to **Python 3.11.9** (`PYTHON_VERSION: 3.11.9` in `render.yaml` + `.python-version` at repo root). All locked dependencies including `pydantic-core==2.23.4`, `pandas==3.0.5`, `numpy==2.4.6` have 100% prebuilt `manylinux` wheel coverage on 3.11.9 — no source compilation required.

---

## 8. render-config Test Suite

Run locally to validate render.yaml and compose config before pushing:
```bash
python integration_omkar/scripts/run_suites.py --suite render-config
docker compose -f docker-compose.dev.yml config
```
Both must exit 0.
