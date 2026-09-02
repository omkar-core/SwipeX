# Auth & Identity Service — Milestone 1 Summary (Day 7 Sign-off)

Owner: Intern 1 (Team Lead) — Mansi

## What was built

A working Authentication & Identity service, acting as the API Gateway for
SwipeX. Covers registration, login (email/password + Google OAuth2), JWT
issuing and refresh, role-based access control (RBAC), and routing to the
Job/Swipe and Resume/ATS services.

## Day-by-day summary

| Day | Delivered |
|---|---|
| 1 | Locked system architecture, created the repo with per-domain folders, drafted the API contracts for all 3 backend services |
| 2 | Designed the Users/Roles database schema, got a running backend skeleton, decided the JWT + OAuth2 approach |
| 3 | Real working register/login/refresh/me logic; Google OAuth2 flow wired up (needs credentials to fully test) |
| 4 | RBAC enforcement; Gateway proxy routes to Job/Swipe and Resume/ATS services |
| 5 | Postman collection covering every endpoint; integration tests proving the Gateway correctly forwards requests (using mocked upstream services, since Job/Resume services aren't deployed yet) |
| 6 | Full test suite (13 tests, all passing); Swagger docs polished with summaries/descriptions on every route; bug log documenting and fixing a `bcrypt`/`passlib` compatibility issue found during testing |
| 7 | Code freeze, this summary, final sign-off |

## Test results (as of code freeze)

```
13 passed
```
Covers: registration, login, duplicate-email rejection, wrong-password
rejection, protected-route auth, refresh tokens, RBAC role-blocking, and
Gateway proxy forwarding (including graceful failure when an upstream
service is down).

## Known limitations going into Milestone 2

- Google OAuth2 is code-complete but not yet tested end-to-end (requires
  Google Cloud credentials not committed to the repo).
- Gateway routes to Job/Swipe and Resume/ATS services are verified against
  *mocked* responses, not the real services — Intern 2 and Intern 3's
  services weren't deployed during this milestone. A manual smoke test
  against the real services is the first thing to do once they're live.
- No production deployment — explicitly out of scope for Milestone 1 per
  the project charter.

## Where things live

- Code: `backend_mansi/` (this service), on the `Team-4` branch
- API contracts: `docs/api-contracts.md`
- Architecture: `docs/architecture.md`
- Testing details: `docs/testing.md`
- Postman collection: `postman/SwipeX-Auth-Gateway.postman_collection.json`
