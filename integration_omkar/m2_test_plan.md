# M2 Test Plan

> **Author**: Omkar (Integration & Development)  
> **Date Updated**: 2026-09-16  
> **Branch**: `Team-4`

---

## Scope

End-to-end testing of Milestone 2 features via the live Docker stack, covering:

1. **Auth flow** — registration, login, JWT, /auth/me, refresh, RBAC
2. **Job discovery** — feed listing, pagination, detail by UUID, freshness fields
3. **Search & filters** — keyword, location, remote, salary, skills, combinations
4. **Swipe system** — record swipe, duplicate protection, invalid input, history, feed exclusion
5. **Company API** — listing, pagination, filters (newly_founded, industry), detail, job listings
6. **Competition indicators** — applicant_count, competition_level per job; freshness_level
7. **RBAC** — job seeker vs recruiter vs unauthenticated access
8. **Resume & ATS** — upload, ATS score, recommendations chain
9. **Matching engine** — recommendations via gateway, job ID UUID compatibility
10. **Cross-service integration** — auth→gateway→job→swipe→resume chain
11. **Code quality** — flake8, TypeScript build
12. **Regression** — M1 features still work

## Out of Scope

- Production deployment (N/A for M2)
- AI/ML model development
- Frontend feature development (validate only)
- `/jobs/search` keyword endpoint (DEF-012, blocked pending Hanith fix)
- Recommendation UUID compatibility (DEF-015, blocked pending Hemath fix)
- Frontend recommendations/history/search wiring (DEF-016, blocked pending Boomika fix)

## Test Suites

| Suite File | Purpose | Tests |
|---|---|---|
| `test_m2_job_discovery.py` | Public job feed, pagination, detail, freshness | 6 |
| `test_m2_search_and_filter.py` | All filter types + combinations | 7 |
| `test_m2_swipe_system.py` | RIGHT/LEFT swipe, duplicate, history, exclusion | 6 |
| `test_m2_company_api.py` | Company listing, filters, detail, schema | 9 |
| `test_m2_competition_freshness.py` | Competition/freshness field validation | 8 |
| `test_m2_matching_engine.py` | Recommendation endpoint, auth guard | 2 |
| `test_m2_e2e_flow.py` | Complete candidate journey E2E | 1 |
| `test_cross_service_rbac.py` | RBAC: seeker/recruiter/unauth | 7 |
| `test_e2e_gateway_flow.py` | Auth + gateway + job + swipe chain | 3 |
| `test_e2e_resume_flow.py` | Upload + ATS + recommendations | 1 |
| **Total** | | **50 tests** |

## Approach

- **Live API testing** via httpx against Docker stack (localhost:8001)
- **Automated pytest suite** (integration_omkar/tests/)
- **Manual browser validation** for frontend (localhost:3000)
- **Docker Compose validation** for infrastructure
- **Flake8 + TypeScript build** for code quality
