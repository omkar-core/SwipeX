# SwipeX — Milestone 3 API Contracts (Backend & Identity / Intern 2)

Drafted Day 1. Frozen so Intern 1 (Frontend) and Intern 4 (AI/ML) can build
against these shapes. Replaces the Milestone 1 Resume placeholder routes
with the real contract.

All routes sit behind the API Gateway (`backend_mansi`, port 8001).

## Resume Service

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/resumes/upload` | Job Seeker | Multipart file upload (PDF/DOCX). Returns `{ resume_id, version }` |
| GET | `/api/v1/resumes` | Required | Lists the logged-in user's resume versions |
| GET | `/api/v1/resumes/{resume_id}` | Required | One resume's detail, including parsed data once available |
| POST | `/api/v1/resumes/{resume_id}/parse` | Job Seeker | Triggers Intern 4's text/skill-extraction module. Returns `{ parsed_text, extracted_skills[] }` |

## ATS Scoring

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/ats/score` | Required | Body: `{ resume_id, job_id }`. Returns `{ match_score, missing_keywords[], missing_skills[], suggestions[] }` |

**Design choice:** AI-generated suggestions are returned as part of the
`/ats/score` response (per the Day 5 brief: "AI-suggestions endpoint (or
extend /ats/score)") rather than a separate endpoint — one round trip
instead of two for the frontend's ATS dashboard.

**Threshold behaviour (per project charter):** when `match_score` falls
below 80, `missing_keywords` and `missing_skills` should be populated;
above 80, they may be empty arrays. Enforced on Intern 4's side, not the
Gateway.

## Recommendations (upgraded, same route as Milestone 2)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/recommendations` | Required | No path change — Intern 4 upgrades the underlying engine from M2's heuristic to a semantic-similarity blend. Gateway code is unaffected. |

## RBAC summary

| Action | Job Seeker | Recruiter | Admin |
|---|---|---|---|
| Upload resume | ✅ | ❌ (403) | ❌ |
| List/view own resumes | ✅ | — | — |
| Trigger resume parse | ✅ | ❌ (403) | ❌ |
| Get ATS score | ✅ | ✅ | ✅ |

ATS scoring is intentionally **not** role-locked to Job Seeker — a
Recruiter viewing how well a candidate's resume matches their job posting
is a plausible use case. Flagged here in case product direction says
otherwise; easy one-line change in `gateway.py` if so.

## Still to confirm with Intern 4 (aiml_hemalatha) before Day 3-4

- [ ] Exact multipart field name expected by `/resumes/upload` (defaulting
      to `file` — confirm matches their FastAPI param name)
- [ ] Whether `/ats/score` is synchronous (returns the score immediately)
      or needs polling (e.g. semantic embedding takes a few seconds) — if
      async, the Gateway contract needs a status-check pattern instead
- [ ] Confirm `missing_skills` vs `missing_keywords` are genuinely distinct
      fields on their side, not the same thing under two names

## Service ports (unchanged from Milestone 2)

| Service | Port | Owner |
|---|---|---|
| Auth + Gateway | 8001 | Intern 2 (backend_mansi) |
| Job & Data | 8002 | Intern 3 (data_hanith) |
| Resume/ATS | 8003 | Intern 4 (aiml_hemalatha) |
| Matching Engine | 8004 | Intern 4 (aiml_hemalatha) — or same service as Resume/ATS; confirm |