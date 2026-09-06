# SwipeX Milestone 1 — Integration Defect Log

> **Owner**: Integration & Development Engineer (Omkar)  
> **Branch**: `Team-4`  
> **Milestone**: M1 (Foundation, Cross-Service Integration, Contracts & Testing)  
> **Status**: Living Artifact / Continuous Deliverable  

---

## Overview

This defect log tracks all bugs, contract mismatches, schema discrepancies, and integration defects identified, triaged, and resolved during Milestone 1 integration verification.

Each entry records:
- **Defect ID**
- **Date Found**
- **Component / Interface**
- **Severity** (Critical / High / Medium / Low)
- **Defect Description & Root Cause**
- **Responsible Teammate / Module Owner**
- **Resolution / Fix Applied**
- **Commit Hash & Status**
- **Verification Method & Evidence**

---

## Defect Summary Table

| ID | Date Found | Component / Area | Severity | Description Summary | Owner | Status | Fixed in Commit |
|---|---|---|---|---|---|---|---|
| **DEF-001** | 2026-09-06 | Frontend ↔ Job Service | **High** | Swipe direction case mismatch (`right` vs `RIGHT`) causing HTTP 422 | Boomika / Hanith | **Fixed** | `5b8ccf5` |
| **DEF-002** | 2026-09-06 | Frontend ↔ Job Service | **Medium** | Filter CSV parsing failure on `remote` work-mode query param | Hanith / Boomika | **Fixed** | `5b8ccf5` |
| **DEF-003** | 2026-09-06 | Frontend Contexts | **High** | Pre-auth fetch timing flooding console with 401 errors on load | Boomika | **Fixed** | `5b8ccf5` |
| **DEF-004** | 2026-09-06 | Frontend ↔ Auth Service | **High** | Registration role enum mismatch (`candidate` vs `job_seeker`) | Boomika / Mansi | **Fixed** | `5b8ccf5` |
| **DEF-005** | 2026-09-06 | Frontend ↔ Auth Service | **High** | `/auth/me` response shape mismatch causing undefined profile error | Boomika / Mansi | **Fixed** | `5b8ccf5` |
| **DEF-006** | 2026-09-06 | Frontend ↔ Auth Service | **Medium** | Non-existent `/api/v1/profile/me` called instead of `/auth/me` | Boomika / Mansi | **Fixed** | `5b8ccf5` |
| **DEF-007** | 2026-09-06 | Frontend ↔ Resume Service| **Medium** | Mock resume ID (`res_2024_johndoe`) causing 404 on ATS lookup | Boomika / Hemalatha | **Fixed** | `5b8ccf5` |

---

## Detailed Defect Records

### DEF-001: Swipe Direction Casing Mismatch
- **Date Found**: 2026-09-06
- **Component**: `frontend_boomika` (`src/services/api.ts`) ↔ `data_hanith` (`api/routers/jobs.py`)
- **Severity**: **High**
- **Responsible Owner**: Boomika (Frontend) / Hanith (Job/Data)
- **Status**: **Fixed** (Verified Live)
- **Commit**: `5b8ccf5`
- **Description**:
  The frontend swipe interaction sent payloads formatted with lowercase strings, e.g. `{"job_id": "<uuid>", "direction": "right"}`. The backend Pydantic schema in `data_hanith` enforces an Enum `SwipeDirection(str, Enum)` with values `"RIGHT"` and `"LEFT"`. When a user swiped right or left on the discovery deck, the backend rejected the request with `HTTP 422 Unprocessable Entity`:
  ```json
  {"detail":[{"type":"enum","loc":["body","direction"],"msg":"Input should be 'RIGHT' or 'LEFT'","input":"right"}]}
  ```
- **Resolution**:
  In `frontend_boomika/src/services/api.ts`, updated `ApiService.swipeJob` to automatically normalize the direction string to uppercase (`direction: payload.direction.toUpperCase()`) before transmitting over HTTP.
- **Verification**:
  Tested live with curl/Python against `POST http://localhost:8001/api/v1/swipes`. Submitting uppercase `"RIGHT"` yields `HTTP 201 Created` with a new `swipe_id`. Submitting lowercase `"right"` correctly produces HTTP 422.

---

### DEF-002: Remote / Work-Mode Filter CSV Parsing Error
- **Date Found**: 2026-09-06
- **Component**: `frontend_boomika` (`src/context/JobContext.tsx`) ↔ `data_hanith` (`api/routers/jobs.py`, `db/repositories/job_repository.py`)
- **Severity**: **Medium**
- **Responsible Owner**: Hanith (Job/Data) / Boomika (Frontend)
- **Status**: **Fixed** (Verified Live)
- **Commit**: `5b8ccf5`
- **Description**:
  The frontend filter drawer allows users to select multiple work modes, sending a comma-separated string `?remote=Remote,Hybrid,On-site`. The `data_hanith` endpoint definition previously typed `remote: Optional[bool]`, which failed validation on non-boolean CSV strings. Furthermore, the database query repository only checked `j.work_mode = 'REMOTE'` when `remote_param is True`.
- **Resolution**:
  Updated `data_hanith/api/routers/jobs.py` to accept `remote: Optional[str]` as a comma-separated query string, parse it into a clean list of uppercase work modes (`['REMOTE', 'HYBRID', 'ONSITE']`), and updated `job_repository.py` to use an SQL `IN (...)` clause over `work_mode_param`.
- **Verification**:
  Tested live via `GET http://localhost:8001/api/v1/jobs?remote=Remote,Hybrid`. Queries execute cleanly without 422 errors and filter accurately against PostgreSQL.

---

### DEF-003: Pre-Authentication Context Fetch Timing
- **Date Found**: 2026-09-06
- **Component**: `frontend_boomika` (`src/context/JobContext.tsx`, `src/context/ResumeContext.tsx`)
- **Severity**: **High**
- **Responsible Owner**: Boomika (Frontend)
- **Status**: **Fixed** (Verified Live)
- **Commit**: `5b8ccf5`
- **Description**:
  Upon initial page load at `http://localhost:3000/`, both `JobProvider` and `ResumeProvider` mounted and immediately executed their respective `useEffect` fetch hooks (`fetchJobs()` and `fetchAtsScore()`). Because the user had not yet logged in or registered, no bearer token existed in localStorage, resulting in an immediate cascade of `HTTP 401 Unauthorized` network failures in browser DevTools.
- **Resolution**:
  Imported `useAuth` into `JobContext.tsx` and `ResumeContext.tsx`, adding a pre-flight guard:
  ```typescript
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchJobs();
  }, [isAuthenticated, fetchJobs]);
  ```
- **Verification**:
  Tested in headless browser: opening `http://localhost:3000` loads cleanly with 0 unauthorized requests. Requests to `/api/v1/jobs` trigger only after successful login/registration.

---

### DEF-004: Registration Role Enum Mismatch (`candidate` vs `job_seeker`)
- **Date Found**: 2026-09-06
- **Component**: `frontend_boomika` (`src/types/index.ts`, `src/services/api.ts`, `src/context/AuthContext.tsx`) ↔ `backend_mansi` (`app/models.py`, `app/schemas.py`)
- **Severity**: **High**
- **Responsible Owner**: Boomika (Frontend) / Mansi (Auth/Backend)
- **Status**: **Fixed** (Verified Live)
- **Commit**: `5b8ccf5`
- **Description**:
  The frontend defaulted user roles to `'candidate'`, whereas the backend auth schema `Role` Enum defines roles as:
  `Role.JOB_SEEKER = "job_seeker"`, `Role.RECRUITER = "recruiter"`, `Role.ADMIN = "admin"`.
  When a new user registered, submitting `role: "candidate"` caused an HTTP 422 schema validation rejection from FastAPI.
- **Resolution**:
  Aligned `frontend_boomika/src/types/index.ts` from `export type UserRole = 'candidate' | 'recruiter' | 'admin'` to `export type UserRole = 'job_seeker' | 'recruiter' | 'admin'`. Updated all default registration calls and role checks in `AuthContext.tsx` and `api.ts` to use `'job_seeker'`.
- **Verification**:
  Tested live registration of `job_seeker` via browser and curl: returns `HTTP 201 Created` with a new `user_id`.

---

### DEF-005: `/auth/me` Response Shape Mismatch
- **Date Found**: 2026-09-06
- **Component**: `frontend_boomika` (`src/services/api.ts`) ↔ `backend_mansi` (`app/main.py`)
- **Severity**: **High**
- **Responsible Owner**: Boomika (Frontend) / Mansi (Auth/Backend)
- **Status**: **Fixed** (Verified Live)
- **Commit**: `5b8ccf5`
- **Description**:
  Frontend `ApiService.getMe()` typed its expected response as `{ user_id: string, name: string, role: UserRole, user: User }`. However, the backend FastAPI endpoint `GET /api/v1/auth/me` returns a flat payload:
  `{"user_id": "<uuid>", "name": "...", "role": "job_seeker"}`.
  Because the nested `user` object was absent, frontend components attempting to read `data.user.email` or `data.user.avatar` threw runtime errors.
- **Resolution**:
  In `ApiService.login`, cached the login email to `localStorage`. In `ApiService.getMe()`, merged the flat backend response `{ user_id, name, role }` with locally cached identity attributes to construct a fully populated `user` object for frontend state consumers.
- **Verification**:
  Verified via browser navigation to `/profile` following login: user details and profile components render properly without undefined property exceptions.

---

### DEF-006: Non-Existent Profile Route (`/api/v1/profile/me`)
- **Date Found**: 2026-09-06
- **Component**: `frontend_boomika` (`src/services/api.ts`, `src/config/api.ts`) ↔ `backend_mansi` Gateway
- **Severity**: **Medium**
- **Responsible Owner**: Boomika (Frontend) / Mansi (Auth/Backend)
- **Status**: **Fixed** (Verified Live)
- **Commit**: `5b8ccf5`
- **Description**:
  `ProfileApiService.getProfile()` attempted to request `GET /api/v1/profile/me`. No `/profile/me` route exists on the API Gateway; the gateway only defines `GET /api/v1/auth/me`. The call resulted in `HTTP 404 Not Found`.
- **Resolution**:
  Redirected `API_ENDPOINTS.PROFILE.ME` to use `/api/v1/auth/me` and updated `ProfileApiService.getProfile()` to build the `UserProfile` object using the verified `/auth/me` response merged with local profile preferences.
- **Verification**:
  Verified in live browser: profile view loads successfully with HTTP 200 returned from `/api/v1/auth/me`.

---

### DEF-007: Mock Initial Resume ID Causing 404 in Resume Service
- **Date Found**: 2026-09-06
- **Component**: `frontend_boomika` (`src/data/mockData.ts`, `src/context/ResumeContext.tsx`) ↔ `aiml_hemalatha` Resume Service
- **Severity**: **Medium**
- **Responsible Owner**: Boomika (Frontend) / Hemalatha (AI/ML)
- **Status**: **Fixed** (Verified Live)
- **Commit**: `5b8ccf5`
- **Description**:
  `MOCK_INITIAL_RESUME` in `mockData.ts` was initialized with a dummy `resume_id: "res_2024_johndoe"`. When a user logged in, `ResumeContext` attempted to query `GET /api/v1/resume/res_2024_johndoe/ats-score`. The backend resume service had no record of this mock ID and correctly returned `HTTP 404 Not Found: Resume not found`.
- **Resolution**:
  Updated `MOCK_INITIAL_RESUME` to initialize `resume_id: ""` (empty). Updated `ResumeContext.tsx` to guard `fetchAtsScore()`: if `!resume.resume_id`, it does not fire an HTTP request to the resume service and instead resets ATS state to zero until an actual resume file is uploaded.
- **Verification**:
  Verified live in browser: clean initial login exhibits 0 failed ATS queries. When a real file is uploaded, a genuine `resume_id` UUID is issued by `POST /api/v1/resume/upload` and used for subsequent ATS score calculations.
