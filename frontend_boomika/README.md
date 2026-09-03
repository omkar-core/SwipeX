# SwipeX — Frontend & ATS Job Matching Platform

> **Milestone 1 (Frontend & UX) to Milestone 2 (Backend Integration Ready)**  
> Next-generation swipe-based career & job discovery platform built with React 19, TypeScript, Vite, Tailwind CSS, and Framer Motion.

---

## 📸 Reference Screens Implemented

1. **Access Workspace / Login (`Screen 1`)**: Split-screen with dark navy brand hero (`#080E2A`), *"Accelerate Your Trajectory"* typography, Corporate Email, Secure Password + Recover link, Session maintenance, Authenticate action button, and Google OAuth SSO.
2. **Discover / Swipe Screen (`Screen 2`)**: Top navigation with tab indicators, user profile card (*Alex Mercer*), Discovery Filters (Industry dropdown, Salary Target `$120k-$160k`, Work Environment checkboxes), interactive draggable job card (*Nexus Technologies*), Pass/Save action buttons, and Quick Peek panel.
3. **Applications Dashboard (`Screen 3`)**: Left sidebar navigation (*Professional Hub - Tier 1 Talent*), circular 85 ATS Match gauge card (*Senior Product Designer @ Stripe*), vertical Application Timeline (*Interview Scheduled, Application Submitted, Resume Viewed*), Recommended Actions, and Recently Saved cards.
4. **Upload Resume Screen (`Screen 4`)**: Drag & drop dashed upload dropzone, animated document analyzing progress bar, parsed result card (*84/100 Overall Fit Score*, *High Compatibility*), extracted ATS keywords, and ATS Optimization Tips sidebar.

---

## 🔌 API Architecture & Backend Contracts

All REST calls are managed by the unified service in `src/services/api.ts` configured via `src/config/api.ts`.

### Switching from Mock to Real Backend (1-Step Toggle)

In `.env` or your hosting environment:
```env
# 1. Provide your live backend base URL
VITE_BASE_API_URL=http://localhost:8000/api/v1

# 2. Disable the mock layer
VITE_USE_MOCK=false
```

### Complete API Contract Specification

| Domain | Endpoint | Method | Request Payload / Params | Response Status & Shape |
|---|---|---|---|---|
| **Auth** | `/api/v1/auth/register` | `POST` | `{ name, email, password, role }` | `201 { user_id }` |
| **Auth** | `/api/v1/auth/login` | `POST` | `{ email, password }` | `200 { access_token, refresh_token, role }` |
| **Auth** | `/api/v1/auth/oauth/google` | `GET` | *None* | `200 { access_token, role }` |
| **Auth** | `/api/v1/auth/me` | `GET` | Header: `Bearer <token>` | `200 { user_id, name, role, user }` |
| **Jobs** | `/api/v1/jobs` | `GET` | `?type=&location=&remote=&salary_min=&salary_max=&skills=&industry=` | `200 Array<Job>` |
| **Jobs** | `/api/v1/jobs/{job_id}` | `GET` | *Path param* | `200 Job` |
| **Swipes**| `/api/v1/swipes` | `POST` | `{ job_id, direction }` (`direction`: `'left'` \| `'right'` \| `'up'`) | `201 { swipe_id }` |
| **Swipes**| `/api/v1/swipes/history` | `GET` | Header: `Bearer <token>` | `200 Array<{ job_id, direction, swiped_at }>` |
| **Resume**| `/api/v1/resume/upload` | `POST` | `multipart/form-data` with `file` | `201 { resume_id, parsed_skills[] }` |
| **ATS** | `/api/v1/resume/{id}/ats-score` | `GET` | `?job_id={id}` | `200 { match_score, missing_keywords[], generated_by }` |
| **Recs** | `/api/v1/recommendations` | `GET` | `?user_id={id}` | `200 Array<{ job_id, match_percentage, generated_by }>` |

---

## 🧩 Milestone 1 vs Milestone 2 Demarcation

### Milestone 1 (Current State)
- **Authentication**: Form submission required on load. Starts unauthenticated (`isAuthenticated: false`). Real token validation against `getMe()`.
- **Role Gating**: Role support for `candidate` (Job Seeker), `recruiter` (Talent Partner), and `admin` (Platform Administrator) with role switcher and views.
- **Dynamic Heuristic Engine**:
  - `getAtsScore()`: Performs real client-side keyword and skill overlap mathematical calculation comparing resume skills to target job requirements rather than static numbers.
  - `getRecommendations()`: Computes real affinity rankings dynamically against all available jobs based on skill intersection.
- **UI & UX**: 100% pixel-perfect implementation matching all 4 reference screenshots with gesture swipe physics and keyboard arrow support.

### Milestone 2 (Backend Integration Scope)
- Live database persistence (PostgreSQL / MongoDB / Supabase).
- Live neural NLP/LLM resume parsing and server-side ATS vector embedding calculation.
- Live WebSockets for direct recruiter conversations (`Messages` tab).

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Build for production
npm run build
```
