# Auth Service — Testing & QA (Day 6)

Day 6 checklist: "End-to-end backend test done", "QA-reported bugs fixed",
"Swagger/API docs updated"

## Running the full test suite

```bash
cd backend_mansi
pytest -v
```

Two test files:
- `tests/test_auth.py` — register, login, duplicate email, wrong password,
  `/me` auth, refresh tokens, RBAC role-blocking (8 tests)
- `tests/test_gateway_proxy.py` — proves the Gateway correctly forwards
  requests to the Job and Resume services, enforces auth before forwarding,
  and fails gracefully (503) when an upstream service is down (5 tests)

**13 tests total.** Requires `respx` — add it to `requirements.txt` if not
already there: `pip install respx==0.21.1`

## Known limitations (documented, not hidden)

- Google OAuth2 login is code-complete but untested end-to-end — it
  requires real Google Cloud credentials (see main README) which aren't
  committed to the repo for security reasons. Manual test needed once
  credentials are available.
- The Gateway's proxy routes to Job/Resume services are tested against
  *mocked* upstreams (see `test_gateway_proxy.py`) since Intern 2 and
  Intern 3's services aren't deployed yet. Once they are, re-run a manual
  smoke test against the real services (see Postman collection).

## API Documentation (Swagger)

FastAPI auto-generates interactive docs from the route definitions —
no separate doc-writing needed. Once the server is running:

- **Swagger UI:** http://localhost:8001/docs — try every endpoint directly
  in the browser, including authenticated ones (use the "Authorize" button)
- **ReDoc (read-only reference):** http://localhost:8001/redoc
- **Raw OpenAPI spec:** http://localhost:8001/openapi.json — importable
  into other tools

## Bug log

| # | Reported by | Issue | Status |
|---|---|---|---|
| 1 | Self (during Day 3/4 testing) | `passlib` + newer `bcrypt` versions raise `ValueError: password cannot be longer than 72 bytes` on every hash, even short passwords — a known compatibility bug, not a real password-length issue | Fixed — pinned `bcrypt==4.0.1` in `requirements.txt` |

*(Add rows here as Intern 5 reports issues during QA.)*
