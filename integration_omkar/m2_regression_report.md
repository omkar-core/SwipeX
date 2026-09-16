# M2 Regression Report

> **Author**: Omkar (Platform, Testing & Deployment / Integration Lead)  
> **Date Updated**: 2026-09-16  
> **Branch**: `Team-4`  
> **Status**: **ZERO REGRESSIONS · ALL GAPS RESOLVED**  

---

## M1 Feature Regression

| M1 Feature | Test | Status | Evidence |
|---|---|---|---|
| Auth registration | POST /auth/register | PASS | 201, user_id returned |
| Auth login | POST /auth/login | PASS | 200, access_token issued |
| /auth/me | GET /auth/me | PASS | 200, correct user data |
| Duplicate email | POST /auth/register (dup) | PASS | 409/422 rejected |
| Wrong password | POST /auth/login (bad pw) | PASS | 401 rejected |
| Invalid JWT | GET /auth/me (bad token) | PASS | 401 rejected |
| Refresh token | POST /auth/refresh | PASS | 200, new access_token |
| RBAC swipe | POST /swipes (recruiter) | PASS | 403 forbidden |
| Resume upload | POST /resume/upload | PASS | 200, resume_id |
| ATS score | GET /resume/{id}/ats-score | PASS | 200, match_score |
| Job feed | GET /jobs | PASS | 200, 5 jobs |
| Job detail | GET /jobs/{uuid} | PASS | 200, full detail |

**No M1 regressions detected.**

---

## M2 Feature Verification

| M2 Feature | Test | Status | Notes |
|---|---|---|---|
| Pagination | GET /jobs?page=1&page_size=2 | PASS | Paginated slices validated |
| Pagination bounds | page=0, page_size=101 | PASS | 422 validation error |
| Feed exclusion | Swipe then GET /jobs | PASS | Swiped jobs excluded |
| Duplicate swipe | POST /swipes (dup) | PASS | 409 conflict |
| Swipe history | GET /swipes/history | PASS | 200, chronological list |
| Filter location | ?location=Bangalore | PASS | Substring match |
| Filter remote | ?remote=Remote,Hybrid,On-site | PASS | CSV parsed |
| Filter salary | ?salary_min/max | PASS | Overlap filtered |
| Filter skills | ?skills=Python | PASS | Match-any OR semantics |
| Inverted salary | ?salary_min>salary_max | PASS | 400 rejected |
| Dedicated keyword search | GET /jobs/search?q=... | PASS | DEF-012 FIXED ✅ |
| Recommendations | GET /recommendations | PASS | 200 with user_id |
| Recommendation UUIDs | uuid.UUID(rec['job_id']) | PASS | DEF-015 FIXED ✅ |
| Resume + ATS chain | upload → ats → recs | PASS | Full pipeline works |
| Companies list | GET /companies | PASS | DEF-011 FIXED ✅ |
| Company detail | GET /companies/{uuid} | PASS | 200 with active jobs[] |
| Competition fields | applicant_count, competition_level | PASS | DEF-014 FIXED ✅ |
| Freshness level | freshness_level | PASS | FRESH/RECENT/AGING/STALE |
| Recruiter POST /jobs | POST /jobs (recruiter) | PASS | Gateway RBAC — DEF-013 FIXED ✅ |
| Job seeker blocked | POST /jobs (seeker) | PASS | 403 |
| Frontend Companies View | CompaniesScreen & TopNav | PASS | DEF-016 FIXED ✅ |
| Frontend Search Input | DiscoverScreen query input | PASS | DEF-016 FIXED ✅ |
| Frontend Recommendations | DiscoverScreen recommendations | PASS | DEF-016 FIXED ✅ |
| Frontend Swipe History | ApplicationsScreen history view | PASS | DEF-016 FIXED ✅ |

---

## Test Suite Summary (2026-09-16)

| Suite | Collected | Passed | Failed | Errors |
|---|---|---|---|---|
| `backend_mansi` | 22 | 22 | 0 | 0 |
| `integration_omkar` | **52** | 52 | 0 | 0 |
| `aiml_hemalatha` | 9 | 9 | 0 | 0 |
| **Total Automated Tests** | **83** | **83** | **0** | **0** |

---

## Open Regression Items

| DEF | Description | Status |
|---|---|---|
| DEF-012 | `/jobs/search` keyword endpoint | **RESOLVED & VERIFIED** ✅ |
| DEF-015 | Recommendation job_ids are canonical UUIDs | **RESOLVED & VERIFIED** ✅ |
| DEF-016 | Frontend search / companies / recommendations / history wired | **RESOLVED & VERIFIED** ✅ |

**Zero open regression items. Zero open defect blockers.**
