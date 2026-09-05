# Milestone 1 — Sign-Off Note (Integration & Development)

> **Owner**: Integration & Development Engineer (intern)
> **Branch**: `Team-4`
> **Date**: 2026-09-05
> **Scope**: Milestone 1 only — platform, testing, deployment (test) role.

## What was tested

1. **Local Docker stack** — `docker compose -f docker-compose.dev.yml up --build`
   - All 6 services booted cleanly with no errors: PostgreSQL, Redis, Job Service (8002), Resume Service (8003), Auth/Gateway (8001), Frontend (3000).
   - All containers healthy (frontend healthcheck added this milestone).
2. **Live E2E suite** (`integration_omkar/tests/`) against the running stack — **8/8 passed**:
   - Gateway flow (register → login → /me → jobs feed/detail → swipes → history → feed exclusion).
   - Resume flow (upload → skill parse → ATS score → recommendations).
   - Cross-service RBAC (401 unauthenticated/invalid token, 403 recruiter, 201 seeker).
3. **Teammate unit suites**: `backend_mansi/tests/` 13/13 passed; `aiml_hemalatha/tests/` 9/9 passed.

## What was fixed

- **CI `data_hanith` tests never gated CI** — the old step appended `|| echo "::warning::…"` and ran
  `pytest --timeout=120` without `pytest-timeout` installed, so it errored on the unrecognized flag and
  was silently swallowed. Replaced with a real gate: full suite runs (and fails CI) when the raw dataset
  is present; otherwise it collects the suite and reports an explicit skip notice.
- **`bcrypt<4.0.0` pin** — confirmed absent from `.github/workflows/ci.yml` (no conflict with
  `backend_mansi/requirements.txt` `bcrypt==4.0.1`; verified install + auth tests pass with 4.0.1).
- **Repo audit** — no stray integration-owned files outside `integration_omkar/`; teammate folders untouched.

## New (this milestone)

- **Automated cross-team integration check** in `.github/workflows/ci.yml` (`integration-check` job):
  triggers on any push/PR touching `backend_mansi/`, `aiml_hemalatha/`, `frontend_boomika/`,
  `data_hanith/`, `docker-compose.dev.yml`, or `integration_omkar/`; rebuilds the full stack from
  scratch, runs the shared unit + E2E + RBAC suite, reports exactly which service broke, and posts a
  pass/fail job summary. **Builds and tests only — no deployment.**

## Known limitation (teammate data)

- **`data_hanith` root `tests/` cannot fully execute in CI**: the suite requires the raw dataset
  `data/raw/indian-job-market-dataset-2025.xlsx` (97,929 rows), which is not committed to the repo.
  Until a teammate vendors it, CI collects the suite (import check passes) and marks it SKIPPED.
  Flagged for `data_hanith` — note, no files edited.

## Deployment confirmation

- **NO production/cloud deployment activity occurred** (no AWS/Azure/anything). Local Docker build/test
  validation only, inside this repository and the CI runner.
- **No push performed** — committed locally on `Team-4` awaiting review.