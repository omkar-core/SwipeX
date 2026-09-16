# Auth & Gateway — Milestone 2 Sign-off (Backend & Identity / Intern 2)

## What was built

The API Gateway now fronts every Milestone 2 backend service: Auth, Job,
Swipe, Search, Company, and the Matching Engine. Authentication and
role-based access control happen once, at the Gateway, before any request
reaches a downstream service.

## Day-by-day

| Day | Delivered |
|---|---|
| 1 | Drafted OpenAPI contracts for Job/Swipe/Search/Company endpoints; extended the Gateway routing plan; reviewed the schema with Intern 3 |
| 2 | Live `GET /jobs` and `GET /jobs/{id}` through the Gateway; `POST /swipes` with Job Seeker RBAC; routes registered |
| 3 | `GET /jobs/search` and `GET /companies` + `/companies/{id}`; browsing switched to optional auth so anonymous users can browse; RBAC enforced on write paths |
| 4 | Freshness/competition fields exposed via passthrough; Matching Engine route registered; minimal Recruiter job-posting CRUD stub (`POST`/`PUT /jobs`) |
| 5 | All M2 services reachable behind one Gateway; identity-header forwarding added; Postman collection rebuilt for M2 |
| 6 | End-to-end integration pass; Swagger/OpenAPI docs finalised for all M2 endpoints |
| 7 | Code freeze; this sign-off summary |

## Key decisions

**Browsing is public, actions are not.** `GET /jobs`, `/jobs/search`,
`/companies` accept an optional token. Anonymous visitors can browse the
catalog; logged-in Job Seekers get a personalised feed with previously
swiped jobs filtered out. Swiping, job posting, and recommendations all
require a valid token, and the first two are role-restricted.

**Swipe direction normalised at the Gateway.** The frontend and our public
contract use lowercase `right`/`left`; Intern 3's database CHECK constraint
only accepts `RIGHT`/`LEFT`. Rather than forcing a change on either side,
the Gateway upper-cases the value before forwarding. This was caught during
Day 3 contract review with Intern 3, before it could surface as a confusing
production error.

**Identity forwarded as headers, not re-parsed.** Downstream services get
`X-User-Id` and `X-User-Role` from the Gateway (plus an optional shared
secret), so they don't each need to decode and validate JWTs themselves.

**Route ordering matters.** `/jobs/search` is declared before
`/jobs/{job_id}` — FastAPI matches in definition order, so without this the
wildcard route would treat "search" as a job ID. Covered by a regression
test.

## Test results

```
22 passed
```

Covering: registration, login, refresh, `/me`, RBAC role-blocking, Gateway
proxy forwarding, graceful 503 when an upstream is down, public browsing
without a token, swipe direction normalisation, identity-header injection,
Recruiter-only job posting, and Matching Engine forwarding.

## Known limitations going into Milestone 3

- **Matching Engine not yet live.** `GET /api/v1/recommendations` returns
  503 until Intern 4's service runs on port 8004. Route, auth, and header
  forwarding are already in place; no Gateway change needed when it lands.
- **Company endpoints depend on Intern 3.** The Gateway routes exist and are
  tested against mocks; they return real data once `/api/v1/companies` is
  served on their side.
- **Recruiter job posting is a stub.** RBAC and routing are real; the
  create/update logic lives in the Job Service and is minimal by design
  (per the Day 4 brief — "seed realistic flow").
- **Google OAuth untested in CI.** Working locally with real credentials,
  but credentials are deliberately not committed, so CI can't exercise it.
- **`GATEWAY_SHARED_SECRET` must match** between this service and
  data_hanith, or set `TRUST_GATEWAY_HEADERS=true` on their side for local
  dev. Worth confirming before the Milestone 3 integration round.

## Where things live

- Code: `backend_mansi/app/` — `gateway.py` (routing + RBAC), `deps.py`
  (auth dependencies), `main.py` (auth endpoints)
- Contracts: `backend_mansi/docs/m2-api-contracts.md`
- Tests: `backend_mansi/tests/` — 22 tests across 3 files
- Postman: `backend_mansi/postman/SwipeX-M2-Gateway.postman_collection.json`
- Live docs: `http://localhost:8001/docs` (Swagger, auto-generated)