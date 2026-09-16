# M2 Test Cases

> **Author**: Omkar (Integration & Development)  
> **Date Updated**: 2026-09-16  
> **Branch**: `Team-4`  
> **Total Collected**: 50 tests

---

## Auth Tests (backend_mansi/tests/test_auth.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| AUTH-01 | Register new user | 201 | 201 | PASS |
| AUTH-02 | Duplicate email rejected | 409/422 | 409 | PASS |
| AUTH-03 | Wrong password rejected | 401 | 401 | PASS |
| AUTH-04 | /auth/me requires token | 403 | 403 | PASS |
| AUTH-05 | /auth/me returns correct user | 200 | 200 | PASS |
| AUTH-06 | Refresh token issues new access | 200 | 200 | PASS |
| AUTH-07 | Refresh rejects bogus token | 401 | 401 | PASS |
| AUTH-08 | RBAC blocks wrong role on swipe | 403 | 403 | PASS |

## Gateway Proxy Tests (backend_mansi/tests/test_gateway_proxy.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| GW-01 | Gateway forwards job list | 200 | 200 | PASS |
| GW-02 | Gateway forwards swipe creation | 201 | 201 | PASS |
| GW-03 | Gateway rejects unauth before forwarding | 403 | 403 | PASS |
| GW-04 | Gateway returns 503 when upstream down | 503 | 503 | PASS |
| GW-05 | Gateway forwards resume ATS score | 200 | 200 | PASS |

## M2 Gateway Tests (backend_mansi/tests/test_m2_gateway.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| M2GW-01 | Jobs browsing without login | 200 | 200 | PASS |
| M2GW-02 | Jobs browsing with login | 200 | 200 | PASS |
| M2GW-03 | Job search is public | 200 | 200 | PASS |
| M2GW-04 | Companies listing is public | 200 | 200 | PASS |
| M2GW-05 | Recruiter can create job | 200/201 | 200/201 | PASS |
| M2GW-06 | Job seeker cannot create job | 403 | 403 | PASS |
| M2GW-07 | Create job requires login | 403 | 403 | PASS |
| M2GW-08 | Recommendations forwards to matching | 200 | 200 | PASS |
| M2GW-09 | Recommendations 503 when down | 503 | 503 | PASS |

## Cross-Service RBAC (integration_omkar/tests/test_cross_service_rbac.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| RBAC-01 | Unauth request rejected | 401/403 | 401 | PASS |
| RBAC-02 | Invalid token rejected | 401 | 401 | PASS |
| RBAC-03 | Recruiter blocked from swiping | 403 | 403 | PASS |
| RBAC-04 | Job seeker allowed to swipe | 201 | 201 | PASS |
| RBAC-05 | Recruiter allowed to create job | 200/201/503 | 200/201/503 | PASS |
| RBAC-06 | Job seeker blocked from creating job | 403 | 403 | PASS |
| RBAC-07 | Public browsing (jobs + companies) | 200 | 200 | PASS |

## E2E Gateway Flow (integration_omkar/tests/test_e2e_gateway_flow.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| E2E-01 | Auth registration + login + me | 200 | 200 | PASS |
| E2E-02 | Gateway to job feed + detail | 200 | 200 | PASS |
| E2E-03 | Gateway swipe + history | 201/200 | 201/200 | PASS |

## E2E Resume Flow (integration_omkar/tests/test_e2e_resume_flow.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| RES-01 | Upload → ATS → Recommendations | 200 | 200 | PASS |

## M2 Job Discovery (integration_omkar/tests/test_m2_job_discovery.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| DISC-01 | Public job feed listing | 200 | 200 | PASS |
| DISC-02 | Job pagination sizing | 200 | 200 | PASS |
| DISC-03 | Job detail by ID | 200 | 200 | PASS |
| DISC-04 | Invalid UUID rejected | 400 | 400 | PASS |
| DISC-05 | Non-existent UUID 404 | 404 | 404 | PASS |
| DISC-06 | Freshness fields present | 200 | 200 | PASS |

## M2 Search & Filter (integration_omkar/tests/test_m2_search_and_filter.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| FILT-01 | Filter by location | 200 | 200 | PASS |
| FILT-02 | Filter by work mode | 200 | 200 | PASS |
| FILT-03 | Filter by salary range | 200 | 200 | PASS |
| FILT-04 | Filter by skills | 200 | 200 | PASS |
| FILT-05 | Combined multi-dimensional | 200 | 200 | PASS |
| FILT-06 | Inverted salary rejected | 400 | 400 | PASS |
| FILT-07 | No match returns empty list | 200 | 200 | PASS |

## M2 Swipe System (integration_omkar/tests/test_m2_swipe_system.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| SWIPE-01 | Record right swipe | 201 | 201 | PASS |
| SWIPE-02 | Record left swipe | 201 | 201 | PASS |
| SWIPE-03 | Duplicate swipe conflict | 409 | 409 | PASS |
| SWIPE-04 | Non-existent job 404 | 404 | 404 | PASS |
| SWIPE-05 | Swipe history retrieval | 200 | 200 | PASS |
| SWIPE-06 | Swiped job feed exclusion | 200 | 200 | PASS |

## M2 Company API (integration_omkar/tests/test_m2_company_api.py)

> DEF-011 verification — Companies router added by Hanith, commit `f9d14fb`

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| COMP-01 | Company listing returns 200 | 200 | 200 | PASS |
| COMP-02 | Company listing schema fields | present | present | PASS |
| COMP-03 | Company pagination sizing | ≤ page_size | ≤ page_size | PASS |
| COMP-04 | Startup filter (newly_founded=true) | is_newly_founded=true | is_newly_founded=true | PASS |
| COMP-05 | Industry filter (substring) | industry contains query | matches | PASS |
| COMP-06 | Company detail by UUID | 200 with jobs[] | 200 | PASS |
| COMP-07 | Company detail job_count consistency | job_count ≥ jobs[] length | consistent | PASS |
| COMP-08 | Invalid UUID rejected | 400/422 | 400 | PASS |
| COMP-09 | Non-existent company UUID 404 | 404 | 404 | PASS |

## M2 Competition & Freshness Indicators (integration_omkar/tests/test_m2_competition_freshness.py)

> DEF-014 verification — Competition fields added by Hanith, commit `f9d14fb`

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| IND-01 | Competition fields in job summary | present | present | PASS |
| IND-02 | Competition level valid tier | LOW/MEDIUM/HIGH | valid | PASS |
| IND-03 | Applicant count non-negative int | ≥ 0 | ≥ 0 | PASS |
| IND-04 | Freshness level valid tier | FRESH/RECENT/AGING/STALE | valid | PASS |
| IND-05 | Competition fields in job detail | present | present | PASS |
| IND-06 | HIGH competition: applicant_count > 50 | > 50 | > 50 | PASS |
| IND-07 | LOW competition: applicant_count < 10 | < 10 | < 10 | PASS |
| IND-08 | Freshness fields API-exposed | in response | present | PASS |

## M2 Matching Engine (integration_omkar/tests/test_m2_matching_engine.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| REC-01 | Recommendations authenticated flow | 200 | 200 | PASS |
| REC-02 | Recommendations unauthenticated rejected | 403 | 403 | PASS |

## M2 End-to-End Flow (integration_omkar/tests/test_m2_e2e_flow.py)

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| M2E2E-01 | Complete candidate journey | All steps 200/201 | All steps pass | PASS |

---

## Live API Probe Summary

| Category | Passed | Failed | Notes |
|---|---|---|---|
| Auth (3) | 3 | 0 | |
| Job API (10) | 10 | 0 | |
| Search keyword | 0 | 1 | DEF-012 OPEN — /jobs/search → 400 |
| Filters (5) | 5 | 0 | |
| Swipes (8) | 8 | 0 | |
| History + Exclusion (2) | 2 | 0 | |
| RBAC (4) | 4 | 0 | |
| Companies (9) | 9 | 0 | DEF-011 FIXED ✅ |
| Competition fields (8) | 8 | 0 | DEF-014 FIXED ✅ |
| Recruiter POST /jobs | 1 | 0 | DEF-013 FIXED ✅ (gateway RBAC) |
| Matching (2) | 2 | 0 | DEF-015 OPEN (job_id UUID mismatch) |
| Frontend | 0 | 3 | DEF-016 OPEN (search/recs/history not wired) |
| **Total** | **52** | **5** | *(3 are OPEN teammate defects)* |

---

## AI/ML Suite (aiml_hemalatha/tests/)

| ID | Test | Status |
|---|---|---|
| ATS-01 | All skills match | PASS |
| ATS-02 | Partial skills match | PASS |
| ATS-03 | No skills match | PASS |
| ATS-04 | Empty required skills | PASS |
| ATS-05 | Case insensitive matching | PASS |
| REC-01 | Recommendations rank highest match first | PASS |
| REC-02 | Recommendation contains matched skills | PASS |
| REC-03 | Recommendation limit | PASS |
| REC-04 | No matching skills | PASS |

---

## Open Defect Tracking (Retest Required)

| DEF | Severity | Owner | Block |
|---|---|---|---|
| DEF-012 | HIGH | Hanith | /jobs/search keyword route not yet in data_hanith |
| DEF-015 | MEDIUM | Hemath | Recommendation job_ids are DataFrame indices not UUIDs |
| DEF-016 | MEDIUM | Boomika | getRecommendations/getSwipeHistory/search not wired in UI |
