# SwipeX — Milestone 4 API Contracts & Documentation

**Owner:** Intern 2 (Backend & Identity Management)  
**Status:** Frozen & Verified  
**Milestone Scope:** Smart Notifications & Alerts, Application Tracking System, Real-Time Job Freshness & Competition Tracking, Analytics Dashboards (Job Seeker, Recruiter, Admin), Security Hardening & Rate Limiting.

---

## 1. Notification & Alert Service

Base Path: `/api/v1/notifications`

| Method | Path | Auth / Role | Description | Request Payload | Response |
|---|---|---|---|---|---|
| `GET` | `/api/v1/notifications` | Bearer (Any) | List user notifications | Query: `unread_only=bool`, `limit=int`, `offset=int` | `200 [{ id, title, message, type, channel, is_read, metadata_json, created_at }]` |
| `GET` | `/api/v1/notifications/unread-count` | Bearer (Any) | Unread badge count | — | `200 { unread_count: int }` |
| `PATCH` | `/api/v1/notifications/{id}/read` | Bearer (Any) | Mark single notification as read | — | `200 Notification` |
| `POST` | `/api/v1/notifications/mark-all-read` | Bearer (Any) | Mark all user notifications as read | — | `200 { message: str }` |
| `GET` | `/api/v1/notifications/preferences` | Bearer (Any) | Get user alert preferences | — | `200 AlertPreferenceResponse` |
| `PUT` | `/api/v1/notifications/preferences` | Bearer (Any) | Update user alert preferences | `{ instant_job, startup_hiring, high_match, low_competition, email_enabled, push_enabled, in_app_enabled, match_threshold, quiet_hours_start, quiet_hours_end }` | `200 AlertPreferenceResponse` |
| `POST` | `/api/v1/notifications/trigger` | Bearer (Self / Admin) | Trigger alert notification | `{ user_id, title, message, type, channel, metadata }` | `200 Notification` |
| `WS` | `/api/v1/notifications/ws` | Token query param | Real-time WebSocket connection | Query: `?token=<JWT>` | Streaming JSON events `{ event, data }` |

---

## 2. Application Tracking System (ATS)

Base Path: `/api/v1/applications`

| Method | Path | Auth / Role | Description | Request Payload | Response |
|---|---|---|---|---|---|
| `POST` | `/api/v1/applications` | Bearer (`job_seeker`) | Apply or save job | `{ job_id, job_title, company_name, status, notes }` | `201 ApplicationResponse` |
| `GET` | `/api/v1/applications` | Bearer (Any) | List user applications or job applicants | Query: `status=str`, `job_id=str`, `limit=int`, `offset=int` | `200 [ApplicationResponse]` |
| `GET` | `/api/v1/applications/{id}` | Bearer (Owner / Recruiter / Admin) | Get application details & timeline | — | `200 ApplicationResponse (includes history[])` |
| `PATCH` | `/api/v1/applications/{id}/status` | Bearer (`recruiter`, `admin`) | Update applicant status (triggers candidate alert) | `{ status: "shortlisted" \| "interview" \| "rejected", notes: str }` | `200 ApplicationResponse` |
| `DELETE` | `/api/v1/applications/{id}` | Bearer (Owner / Admin) | Withdraw application | — | `200 { message: str }` |

---

## 3. Job Freshness & Competition Tracking

Base Path: `/api/v1/jobs`

| Method | Path | Auth / Role | Description | Request Payload | Response |
|---|---|---|---|---|---|
| `GET` | `/api/v1/jobs/{job_id}/competition` | Optional Auth | Competition stats for job card | — | `200 { job_id, applicant_count, competition_level: "Low"\|"Medium"\|"High", early_applicant: bool, posted_time: str }` |
| `POST` | `/api/v1/jobs/competition-batch` | Optional Auth | Batch lookup for job cards | `[ "job-1", "job-2" ]` | `200 { competition: { "job-1": CompetitionInfoResponse } }` |
| `GET` | `/api/v1/jobs/competition-filter` | Optional Auth | Filter low-competition or early jobs | Query: `level=Low`, `early_only=true` | `200 { matched_jobs: [], total_count: int }` |

---

## 4. Analytics & Dashboard Service

Base Path: `/api/v1/analytics`

| Method | Path | Auth / Role | Description | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/analytics/job-seeker` | Bearer (`job_seeker`) | Job seeker application funnel, resume performance, skill gaps, recommendation insights | `200 JobSeekerAnalyticsResponse` |
| `GET` | `/api/v1/analytics/recruiter` | Bearer (`recruiter`, `admin`) | Recruiter job performance, applicant distribution, status funnel | `200 RecruiterAnalyticsResponse` |
| `GET` | `/api/v1/analytics/admin` | Bearer (`admin`) | Platform-wide user stats, application distribution, system health | `200 AdminAnalyticsResponse` |
| `GET` | `/api/v1/analytics/hiring-trends` | Optional Auth | Hiring trends, top in-demand skills, startup vs MNC activity | `200 HiringTrendsResponse` |
