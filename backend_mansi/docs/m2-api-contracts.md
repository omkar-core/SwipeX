# SwipeX — Milestone 2 API Contracts (Backend & Identity / Intern 2)

Drafted Day 1, updated Day 3 with the confirmed field list from Intern 3
(Job & Data Intelligence). Frozen so Intern 1 (Frontend) and Intern 4
(Matching Engine) can build against these shapes.

All routes below sit behind the API Gateway (`backend_mansi`, port 8001).

**Auth column:** Public = optional token (richer results if logged in) ·
Required = must be logged in · Recruiter / Job Seeker = role-restricted.

## Job Service

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/jobs` | Public | Paginated. Query: `page`, `page_size`, `type`, `location`, `remote`, `salary_min`, `salary_max`, `skills`. Logged-in Job Seekers get previously-swiped jobs excluded automatically (handled by Intern 3). |
| GET | `/api/v1/jobs/search` | Public | Keyword search on title + job_description, plus the filters above. Query: `q`, `location`, `job_type`, `salary_min`, `salary_max`, `experience_level`, `skills` |
| GET | `/api/v1/jobs/{job_id}` | Public | Full job detail incl. company + freshness/competition |
| POST | `/api/v1/jobs` | Recruiter | Create a job posting (Day 4 stub) |
| PUT | `/api/v1/jobs/{job_id}` | Recruiter | Update a job posting (Day 4 stub) |

**Job fields available** (confirmed by Intern 3, 97,929 jobs seeded):
`job_id`, `title`, `job_description`, `company_id`, `location`, `work_mode`,
`job_type`, `min_salary`, `max_salary`, `min_experience`, `max_experience`,
`skills`, `applicant_count`, `competition_level`, `freshness_level`

## Swipe Service

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/swipes` | Job Seeker | Body: `{ job_id, direction }` |
| GET | `/api/v1/swipes/history` | Required | The logged-in user's past swipes |

**Swipe fields:** `user_id`, `job_id`, `direction`, `created_at`.
Unique constraint on `(user_id, job_id)` — swiping the same job twice
returns `409 Conflict`.

### Direction casing — resolved at the Gateway

The public API accepts **lowercase** `"right"` / `"left"` (what the
frontend sends). Intern 3's database has a CHECK constraint allowing only
**uppercase** `RIGHT` / `LEFT`.

**The Gateway normalises to uppercase before forwarding** (see
`gateway_create_swipe` in `app/gateway.py`). Neither the frontend nor the
Job Service had to change. Frontend: keep sending lowercase.

## Company & Startup Listings

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/companies` | Public | Paginated list |
| GET | `/api/v1/companies/{company_id}` | Public | Company detail |

**Company fields available** (confirmed by Intern 3, 18,328 companies):
`company_id`, `name`, `company_type`, `industry`, `size`, `about`,
`is_newly_founded`, active job count

## Matching Engine / Recommendations (owner: Intern 4)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/recommendations` | Required | Personalized ranked feed (heuristic v0; real ML model is Milestone 3) |

Returns `503 Upstream service unreachable` until Intern 4's service runs on
`MATCHING_ENGINE_URL` (default `http://localhost:8004`). The route, auth,
and identity-header forwarding are already in place — no Gateway changes
needed when their service lands.

## Identity forwarding to downstream services

For every authenticated request, the Gateway injects:

- `Authorization: Bearer <token>` — passed through unchanged
- `X-User-Id` — the authenticated user's ID
- `X-User-Role` — `job_seeker` / `recruiter` / `admin`
- `X-Gateway-Secret` — only if `GATEWAY_SHARED_SECRET` is set in env

Intern 3's `dependencies.py` validates `X-Gateway-Secret` against its own
`GATEWAY_SHARED_SECRET`. **Both services must share the same value** — set
it in both `.env` files before integration testing, or set
`TRUST_GATEWAY_HEADERS=true` on their side for local dev.

## Service ports

| Service | Port | Owner |
|---|---|---|
| Auth + Gateway | 8001 | Intern 2 (backend_mansi) |
| Job & Data | 8002 | Intern 3 (data_hanith) |
| Resume/ATS | 8003 | (Milestone 1 placeholder) |
| Matching Engine | 8004 | Intern 4 (aiml_hemalatha) |