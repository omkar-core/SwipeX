# M2 Demo Checklist

> **Author**: Omkar (Platform, Testing & Deployment / Integration Lead)  
> **Date Updated**: 2026-09-16  
> **Status**: Ready for Presentation & Evaluation  

---

## Pre-Demo Setup

- [ ] Docker Desktop running
- [ ] `docker compose -f docker-compose.dev.yml up --build -d` executed
- [ ] All 6 containers healthy: `docker compose -f docker-compose.dev.yml ps`
- [ ] Frontend accessible at `http://localhost:3000`
- [ ] Gateway accessible at `http://localhost:8001`

---

## Demo Flow

### 1. Authentication & Session (1 min)
- [ ] Open `http://localhost:3000`
- [ ] Register new Job Seeker (`name`, `email`, `password`)
- [ ] Verify instant login and JWT session initialization
- [ ] Inspect `/auth/me` response in DevTools

### 2. Job Discovery Feed & Indicators (2 min)
- [ ] Present DiscoverScreen swipe card deck
- [ ] Point out job title, company, location, and salary boundaries
- [ ] Highlight Freshness indicator (`Just Now` / `Fresh`)
- [ ] Highlight Competition indicator (`applicant_count` and `LOW/MEDIUM/HIGH` competition tier)
- [ ] Click card to expand full Job Detail Modal (showing full overview, experience requirements, tools, culture)

### 3. Swipe Mechanics & Feed Exclusion (2 min)
- [ ] Click "Save" (or press ArrowRight) → verify toast and swipe recorded via `POST /api/v1/swipes`
- [ ] Click "Pass" (or press ArrowLeft) on next job → verify toast
- [ ] Verify deck advances smoothly
- [ ] Demonstrate feed exclusion: refresh or query feed to verify swiped jobs do not reappear

### 4. Search & Multi-Dimensional Filters (2 min)
- [ ] Type keyword (e.g. "Python" or "Full Stack") in Keyword Search input → feed filters live
- [ ] Demonstrate dedicated endpoint: `curl "http://localhost:8001/api/v1/jobs/search?q=Python"`
- [ ] Adjust Salary Target min/max boundaries
- [ ] Toggle Work Environment checkboxes (Remote, Hybrid, On-site)
- [ ] Filter by Industry dropdown

### 5. Companies & Startups Directory (2 min)
- [ ] Click "Companies" tab in TopNav
- [ ] Display verified companies grid
- [ ] Toggle "Startups & Fast Growing" filter pill (`newly_founded=true`)
- [ ] Use company search filter input
- [ ] Click a company card to open detail modal showing company overview and active job postings
- [ ] Click an active opening to inspect job details

### 6. Resume Upload & ATS Match Engine (2 min)
- [ ] Navigate to "Upload Resume" screen
- [ ] Upload sample resume (`.txt` or `.pdf`)
- [ ] View extracted skills list
- [ ] Inspect computed ATS match score gauge

### 7. AI Recommendations with Canonical UUIDs (2 min)
- [ ] Return to DiscoverScreen
- [ ] Point out "AI Recommended Roles" feed in right panel
- [ ] Show affinity match scores
- [ ] Click recommended role → open details modal (verifying canonical UUID compatibility with Job Service)

### 8. Swipe Decisions & Application History (1 min)
- [ ] Navigate to "Applications" screen
- [ ] View saved roles list
- [ ] Toggle to "Swipes" tab to show chronological record of right/left swipe decisions

### 9. Role-Based Access Control (RBAC) (2 min)
- [ ] Logout of Candidate account
- [ ] Login as Recruiter
- [ ] Present Recruiter Dashboard
- [ ] Attempt to swipe candidate deck → demonstrate blocked with 403 Forbidden
- [ ] Demonstrate Recruiter access to job posting routes (`POST /api/v1/jobs`)

### 10. Automated Test Suite & Code Quality (1 min)
- [ ] Show 52/52 integration tests passing: `pytest integration_omkar/tests/`
- [ ] Show 22/22 gateway unit tests passing: `pytest backend_mansi/tests/`
- [ ] Show 9/9 AI/ML tests passing: `pytest aiml_hemalatha/tests/`
- [ ] Show clean frontend build: `npm run build`

---

## Post-Demo Cleanup

- [ ] `docker compose -f docker-compose.dev.yml down`
- [ ] Confirm zero unresolved M2 blockers
