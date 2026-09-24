# Auth & Gateway — Milestone 3 Sign-off (Backend & Identity / Intern 2)

## What was built

The Gateway now fronts the Resume Service and ATS Scoring, replacing the
Milestone 1 Resume placeholder with the real contract. Resume upload and
parsing are restricted to Job Seekers; ATS scoring is open to any logged-in
role, since a Recruiter checking a candidate's fit is a plausible use case.

## Day-by-day

| Day | Delivered |
|---|---|
| 1 | Drafted OpenAPI contracts for Resume Service and ATS Scoring; extended the Gateway routing plan |
| 2 | `POST /resumes/upload` and `GET /resumes` (list versions), RBAC-restricted to Job Seeker |
| 3 | `POST /resumes/{id}/parse` — triggers Intern 4's extraction module |
| 4 | `POST /ats/score` — blended keyword + semantic match score, missing-skill/keyword detection |
| 5 | AI-generated suggestions folded into the `/ats/score` response; `/recommendations` upgraded (same route, no Gateway change needed since the engine swap is entirely on Intern 4's side) |
| 6 | End-to-end integration pass; Swagger docs finalised for all M3 endpoints |
| 7 | Code freeze; this sign-off |

## Key decisions

**Suggestions live inside `/ats/score`, not a separate endpoint.** One
round trip for the frontend's ATS dashboard instead of two. If suggestions
turn out to need their own caching/async behaviour later, this is easy to
split out without changing the score endpoint's contract.

**ATS scoring isn't role-locked.** Every other new M3 write action (upload,
parse) is Job Seeker only, but scoring is read-like and a Recruiter
checking candidate fit is plausible. Documented in the contract doc so
this is a deliberate choice, not an oversight, and easy to tighten later
if product direction says otherwise.

**`/recommendations` needed zero Gateway changes.** Milestone 2 already
built the route, auth, and identity-header forwarding. Milestone 3's
"upgrade" is entirely Intern 4 swapping their engine's internals — proof
that the Milestone 2 Gateway design was built for this kind of change.

## A production debugging story worth mentioning

While testing this milestone, `GET /api/v1/jobs` started returning a raw,
unhandled `500 Internal Server Error`. Investigation (not guesswork)
showed two layered issues:

1. The Gateway's `_proxy` function only caught `httpx.ConnectError`
   ("can't reach the service at all") but not `httpx.TimeoutException`
   ("reached it, but it took too long") — a slow-but-alive upstream
   crashed the whole request instead of failing gracefully. Fixed: both
   exception types are now caught, returning `503` and `504` respectively,
   and the timeout was raised from 10s to 30s.
2. Once that was fixed, the *same* error persisted — tracked down by
   calling the Job Service directly (bypassing the Gateway entirely) to
   confirm the fault was genuinely upstream, not in Gateway code. Found:
   `data_hanith`'s local database had no data (`sqlite3.OperationalError:
   no such table: jobs`) because the ingestion step requires a large raw
   dataset file that was never shared with the team (too large for git).

This is the kind of bug that looks like "my code is broken" at first
glance but is actually two separate, precisely diagnosed issues — one
real code fix, one environment/data-sharing gap flagged to the right
teammate instead of guessed at.

## Test results

```
~36 passed (22 from M1/M2 + 14 new M3 tests)
```

Covering: resume upload RBAC, upload requiring login, listing and detail
retrieval, parse-trigger RBAC, ATS score response shape, ATS score
requiring login, and — importantly — both the 503 (service down) and 504
(service too slow) paths for `/ats/score`, guarding the timeout-handling
fix described above.

## Known limitations going into Milestone 4

- **Resume/ATS service not yet reachable locally.** Same situation as the
  Matching Engine in Milestone 2 — routes, RBAC, and tests (against
  mocked responses) are all in place; real data flows the moment Intern
  4's service is running on `RESUME_SERVICE_URL`.
- **Open questions for Intern 4**, documented in `docs/m3-api-contracts.md`:
  exact upload field name, whether ATS scoring is sync or needs polling,
  and whether Resume/ATS and the Matching Engine are one service or two
  (affects which port(s) to point the Gateway at).
- **`data_hanith`'s local dataset gap** (see above) — resolved by
  requesting the raw file or a pre-built SQLite database directly from
  the teammate, not a code change.

## Where things live

- Code: `backend_mansi/app/gateway.py`
- Contracts: `backend_mansi/docs/m3-api-contracts.md`
- Tests: `backend_mansi/tests/test_m3_gateway.py`
- Postman: `backend_mansi/postman/SwipeX-M3-Resume-ATS.postman_collection.json`