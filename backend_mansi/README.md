# Auth & Identity Service

Owner: Intern 1 (Team Lead)

## Day 1 checklist
- [x] Architecture finalized → see `../docs/architecture.md`
- [x] Repo created with service folders → see repo root
- [x] Draft API contracts written → see `../docs/api-contracts.md`
- [x] Plan shared with team

## Day 2 checklist
- [x] Users/Roles schema finalized → `app/models.py`
- [x] Backend skeleton running → `app/main.py`
- [x] JWT/OAuth2 approach decided → `app/security.py`
- [x] Local DB/Redis confirmed working (SQLite fallback verified; swap to Postgres once Intern 5's docker-compose.dev.yml is ready)

## Day 3 checklist
- [x] Register API working → `POST /api/v1/auth/register`
- [x] Login + OAuth2 working → `POST /api/v1/auth/login`, `GET /api/v1/auth/oauth/google`
- [x] Refresh API working → `POST /api/v1/auth/refresh`
- [x] Role rule (RBAC) added & tested → `app/deps.py` (`require_role`), tested in `tests/test_auth.py`

## Day 4 checklist
- [x] RBAC enforced on protected routes → `app/gateway.py` (e.g. only `job_seeker` can POST a swipe)
- [x] Gateway routes to Job Service → `app/gateway.py` proxies `/api/v1/jobs*` and `/api/v1/swipes*` to `JOB_SERVICE_URL`
- [x] Placeholder route for Resume/ATS → `app/gateway.py` proxies `/api/v1/resume*` and `/api/v1/recommendations` to `RESUME_SERVICE_URL`
- [x] Tested with different user roles → `tests/test_auth.py::test_rbac_blocks_wrong_role_on_swipe_gateway_route`

## Run it

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in values — see notes below
uvicorn app.main:app --reload --port 8001
```

Visit `http://localhost:8001/docs` for the interactive Swagger UI — you can
register, log in, and call `/me` with the returned token directly from there.

## Run the tests

```bash
pytest -v
```

Covers: register, duplicate-email rejection, wrong-password rejection,
`/me` requiring a valid token, refresh-token issuing a new access token,
a bogus refresh token being rejected, and — the RBAC test — a recruiter
account correctly getting blocked (403) from the job-seeker-only swipe route.

## About Google OAuth2

The code is fully wired up (`app/main.py`, using Authlib), but to actually
test it you need your own Google credentials:

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (type: Web application)
3. Add `http://localhost:8001/api/v1/auth/oauth/google/callback` as an
   authorized redirect URI
4. Put the Client ID/Secret into your `.env` file
5. Visit `http://localhost:8001/api/v1/auth/oauth/google` in a browser (not
   Swagger — it's a redirect flow) to test the full login

Without these credentials set, the register/login/refresh/me routes still
work fully — only the Google button won't.

## About the Gateway (Day 4)

`app/gateway.py` forwards requests to your teammates' services once they're
running:
- `JOB_SERVICE_URL` (default `http://localhost:8002`) — Intern 2's service
- `RESUME_SERVICE_URL` (default `http://localhost:8003`) — Intern 3's service

Until those services actually exist and are running, these routes will return
a `503 Upstream service unreachable` — that's expected, not a bug. It proves
the Gateway itself is wired correctly and ready the moment those services
come online.

## Design notes

- `User.password_hash` is nullable because Google-OAuth users never set one.
- `RefreshToken` is a separate table (not just a JWT) specifically so refresh
  tokens can be revoked server-side — a JWT alone can't be revoked before it expires.
- RBAC (`require_role`) currently restricts `POST /api/v1/swipes` to
  `job_seeker` only, as an example — extend this per-route as Recruiter/Admin
  features get built.
- Falls back to SQLite automatically if `DATABASE_URL` isn't set (see `app/database.py`),
  so you're not blocked waiting on the shared Postgres container.
