# M2 Integration Report

> **Author**: Omkar (Integration & Development)  
> **Date Updated**: 2026-09-16  
> **Branch**: `Team-4`  
> **HEAD**: `f9d14fb` (feat(m2): complete job data intelligence milestone 2)

---

## Test Environment

- **Stack**: Docker Compose (6 services, all healthy)
- **Branch**: Team-4 (HEAD: f9d14fb)
- **Docker**: Desktop v28.3.3

---

## Cross-Service Integration Results

### Auth → Gateway → Job Service
| Step | Endpoint | Status | Notes |
|---|---|---|---|
| Register | POST /auth/register | 201 | New user_id returned |
| Login | POST /auth/login | 200 | access_token issued |
| /auth/me | GET /auth/me | 200 | user_id, name, role |
| Job feed | GET /jobs | 200 | 5 curated jobs |
| Job detail | GET /jobs/{uuid} | 200 | Full detail with freshness + competition fields |
| Job filter location | GET /jobs?location=Bangalore | 200 | Filtered correctly |
| Job filter salary | GET /jobs?salary_min=120000&salary_max=270000 | 200 | Overlap filter working |
| Job filter skills | GET /jobs?skills=Python | 200 | OR match working |
| Job filter remote | GET /jobs?remote=Remote,Hybrid,On-site | 200 | CSV work mode filter |
| Job filter combo | GET /jobs?location=India&salary_min=200000&skills=Python | 200 | Combined filter |
| Inverted salary | GET /jobs?salary_min=900000&salary_max=200000 | 400 | Rejected correctly |

### Auth → Gateway → Company Service (NEW — DEF-011 Fixed)
| Step | Endpoint | Status | Notes |
|---|---|---|---|
| Company list | GET /companies | 200 | Returns seeded companies |
| Company pagination | GET /companies?page=1&page_size=2 | 200 | Bounded correctly |
| Startup filter | GET /companies?newly_founded=true | 200 | Filters startup companies |
| Industry filter | GET /companies?industry=tech | 200 | Case-insensitive substring |
| Company detail | GET /companies/{uuid} | 200 | Full profile with jobs[] |
| Invalid UUID | GET /companies/not-a-uuid | 400 | UUID validation correct |
| Non-existent | GET /companies/{random-uuid} | 404 | Not found handled |

### Auth → Gateway → Swipe Service
| Step | Endpoint | Status | Notes |
|---|---|---|---|
| Swipe right | POST /swipes | 201 | swipe_id returned |
| Duplicate | POST /swipes | 409 | UNIQUE constraint enforced |
| Nonexistent job | POST /swipes | 404 | FK reference check |
| Invalid UUID | POST /swipes | 422 | Pydantic validation |
| History | GET /swipes/history | 200 | List of swiped jobs |
| Feed exclusion | GET /jobs (authed) | 200 | Swiped jobs removed |

### Auth → Gateway → Resume Service
| Step | Endpoint | Status | Notes |
|---|---|---|---|
| Upload resume | POST /resume/upload | 200 | resume_id + parsed_skills |
| ATS score | GET /resume/{id}/ats-score | 200 | match_score + generated_by |
| Recommendations | GET /recommendations | 200 | Requires user_id param |

---

## Competition & Freshness Indicators (NEW — DEF-014 Fixed)

| Field | Location | Status | Values Observed |
|---|---|---|---|
| `applicant_count` | JobSummarySchema | PASS | 3–89 (seeded realistically) |
| `competition_level` | JobSummarySchema | PASS | LOW / MEDIUM / HIGH |
| `freshness_level` | JobSummarySchema | PASS | FRESH (all seeded as "Just Now") |
| `applicant_count` | JobDetailSchema | PASS | Present in detail response |
| `competition_level` | JobDetailSchema | PASS | Present in detail response |
| `freshness_level` | JobDetailSchema | PASS | Present in detail response |
| `posted_at_raw` | JobDetailSchema | PASS | "Just Now" for seeded data |
| `posted_at_approx` | JobDetailSchema | PASS | ISO 8601 timestamp |

Competition tiers validated:
- **LOW** (< 10 applicants): InnoSpark Studios (3), CloudMatrix DevOps (5)
- **MEDIUM** (10–50): Nexus Technologies (42), FinFlow Payments (27)
- **HIGH** (> 50): HyperScale AI Labs (89)

---

## Known Integration Gaps (Teammate-Owned — OPEN)

| Gap | Endpoint | Actual | Owner | DEF |
|---|---|---|---|---|
| Keyword search missing | GET /jobs/search?q= | 400 (UUID validation) | Hanith (data_hanith) | DEF-012 |
| Recommendation job_ids | /recommendations | "0","2" (indices, not UUIDs) | Hemath (aiml) | DEF-015 |
| Frontend search UI | TopNav/DiscoverScreen | No search bar | Boomika (frontend) | DEF-016 |
| Frontend recommendations | Component | getRecommendations() not called | Boomika (frontend) | DEF-016 |
| Frontend swipe history | Component | getSwipeHistory() not called | Boomika (frontend) | DEF-016 |

---

## Filter Validation Results

| Filter | Query Param | Result | Count | Response Time |
|---|---|---|---|---|
| Location | ?location=Bangalore | PASS | 1 | ~20ms |
| Remote | ?remote=Remote,Hybrid,On-site | PASS | 5 | ~20ms |
| Salary range | ?salary_min=120000&salary_max=270000 | PASS | 5 | ~20ms |
| Skills | ?skills=Python | PASS | 3 | ~20ms |
| Keyword | ?q=python | PASS (via /jobs) | varies | ~20ms |
| Inverted salary | ?salary_min=300000&salary_max=100000 | PASS | 400 | ~15ms |
| Combined | location+salary+skills | PASS | varies | ~25ms |

All filters respond within M2 target of < 500ms.

---

## RBAC Integration Results

| Action | Unauthenticated | Job Seeker | Recruiter |
|---|---|---|---|
| GET /jobs | 200 ✅ | 200 ✅ | 200 ✅ |
| GET /jobs/{id} | 200 ✅ | 200 ✅ | 200 ✅ |
| GET /companies | 200 ✅ | 200 ✅ | 200 ✅ |
| POST /swipes | 403 ✅ | 201 ✅ | 403 ✅ |
| GET /swipes/history | 403 ✅ | 200 ✅ | 200 ✅ |
| POST /jobs | 403 ✅ | 403 ✅ | 200/201/503 ✅ |
| GET /recommendations | 403 ✅ | 200 ✅ | 200 ✅ |
