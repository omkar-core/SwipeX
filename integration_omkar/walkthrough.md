# M2 Walkthrough — How to Demonstrate Milestone 2

> **Auditor**: Omkar (Platform, Testing & Deployment / Integration Lead)  
> **Date Updated**: 2026-09-16  
> **Branch**: `Team-4`  
> **Status**: **M2 COMPLETE — VERIFIED (100%)**  

---

## Prerequisites

```powershell
# 1. Ensure Docker Desktop is running
# 2. From repository root:
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml ps
# All 6 containers should be healthy:
# swipex-frontend (3000), swipex-auth-gateway (8001), swipex-job-data (8002),
# swipex-resume-service (8003), swipex-postgres (5432), swipex-redis (6379)
```

---

## Demonstration Sequence

### 1. Auth Flow (30s)
```
Browser → http://localhost:3000
Register as Job Seeker → Login → DiscoverScreen is presented
```

### 2. Job Discovery Deck & Indicators (30s)
```
DiscoverScreen displays curated SwipeCard deck
Each card shows:
- Title, company name, location, salary range
- Match score & freshness indicator ('Just Now', 'Fresh')
- Competition indicator: applicant count (e.g. 45 applicants) & competition level (LOW/MEDIUM/HIGH)
```

### 3. Swipe Right (Save / Apply) (20s)
```
Click "Save" button or press ArrowRight key
Toast: "Saved {title} at {company}!"
Backend records swipe via POST /api/v1/swipes (201 Created)
Feed advances to next card and excludes the swiped job
```

### 4. Swipe Left (Pass) (15s)
```
Click "Pass" button or press ArrowLeft key
Toast: "Passed on {company}"
Backend records swipe via POST /api/v1/swipes (201 Created)
Feed advances to next card
```

### 5. Multi-Dimensional Search & Filters (30s)
```
1. Keyword Search: Type "Python" in the Keyword Search input in DiscoverScreen → updates feed
2. Salary Range: Adjust salary min/max → deck filters accordingly
3. Work Environment: Toggle 'Remote', 'Hybrid', 'On-site' checkboxes
4. Industry: Select from dropdown
```

### 6. Job Detail Modal (15s)
```
Click on a job card to slide up the full Job Detail Modal
Displays: full description, exact salary boundaries, min/max experience,
required skills, tools, and company culture quotes
```

### 7. Companies & Startups Directory (30s)
```
Click "Companies" tab in TopNav
Browse verified employers and high-growth startups
Toggle "Startups & Fast Growing" pill filter
Search by company name or industry
Click on any company card to open detail modal showing company overview and all active job postings
Click on an opening to view full job details or apply
```

### 8. Resume Upload + ATS Score (30s)
```
Click "Upload Resume" in sidebar / navigation
Upload a sample .txt or .pdf resume
ATS parsing extracts skills and displays real-time ATS match score
```

### 9. AI Recommendations Feed (20s)
```
In DiscoverScreen quick-peek panel, view "AI Recommended Roles"
Each recommendation displays match affinity percentage and skills match
Clicking a recommendation retrieves the job detail using its canonical UUID
```

### 10. Swipe History & Saved Jobs (20s)
```
Navigate to "Applications" screen
View "Saved" roles list
Toggle to "Swipes" tab to inspect chronological record of past right/left decisions
```

### 11. Cross-Service RBAC Enforcement (30s)
```
Logout → Login as Recruiter
Navigate to Recruiter Dashboard
Attempt to swipe candidate deck → blocked (403 Forbidden)
Recruiter is authorized to create/manage job listings (POST /api/v1/jobs)
```

---

## Key API Endpoints to Demonstrate

```bash
# 1. Dedicated Keyword Search
curl "http://localhost:8001/api/v1/jobs/search?q=Python"

# 2. Public Job Feed with Pagination & Filters
curl "http://localhost:8001/api/v1/jobs?page=1&page_size=2&location=India"

# 3. Companies & Startups Directory
curl "http://localhost:8001/api/v1/companies?newly_founded=true"

# 4. Single Company Details with Active Openings
curl "http://localhost:8001/api/v1/companies/<company_uuid>"

# 5. Job Detail with Freshness & Competition Indicators
curl "http://localhost:8001/api/v1/jobs/<job_uuid>"

# 6. Authenticated Candidate Swipe
curl -X POST http://localhost:8001/api/v1/swipes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"job_id":"<job_uuid>","direction":"RIGHT"}'

# 7. Candidate Swipe History
curl http://localhost:8001/api/v1/swipes/history \
  -H "Authorization: Bearer <token>"

# 8. AI Recommendations (with Canonical UUIDs)
curl "http://localhost:8001/api/v1/recommendations?user_id=<user_uuid>" \
  -H "Authorization: Bearer <token>"
```

---

## Docker Stack Architecture

| Container Name | Service | Port | Healthcheck |
|---|---|---|---|
| `swipex-frontend` | React + TypeScript + Vite | 3000 | HTTP 200 |
| `swipex-auth-gateway` | FastAPI Auth & API Gateway | 8001 | HTTP 200 |
| `swipex-job-data` | FastAPI Job & Data Service | 8002 | HTTP 200 |
| `swipex-resume-service` | FastAPI AI/ML & Resume Service | 8003 | HTTP 200 |
| `swipex-postgres` | PostgreSQL 15 | 5432 | `pg_isready` |
| `swipex-redis` | Redis 7 | 6379 | `redis-cli ping` |
