# SwipeX Data Dictionary — Milestone 4 Schema Reference

**Domain Service**: Job & Data Intelligence Service (`data_hanith`)  
**Author**: Data & Backend Engineering (Intern 3)  
**Target Consumers**: Backend Gateway, Intern 4 (Matching & Career Assistance), Database Engineers  
**Date**: October 8, 2026  
**Status**: APPROVED & AUDITED  

---

## 1. Overview & Classification System

This document provides the authoritative Data Dictionary for the SwipeX data layer following Milestone 4 schema extensions.

Fields across all tables are classified into distinct structural tiers:
1. **Existing M1–M3 Fields**: Core tables and columns created during Milestone 2 data ingestion and Milestone 3 resume/enrichment implementation (`jobs`, `companies`, `skills`, `job_skills`, `job_keywords`, `resumes`, `resume_versions`, `ats_scores`, `swipes`, `saved_jobs`).
2. **M4-Added Tables & Fields**: Schema extensions introduced in Milestone 4 (Days 1–5) to support job applications, status transitions, notifications, alert preferences, and daily analytics aggregate snapshots.
3. **Derived / Dynamic Fields**: Computed indicators calculated at query time (e.g. `competition_level`, `is_early_applicant`, `freshness_level`, `conversion_rates`).

---

## 2. Milestone 4 Table Specifications

### 2.1 `applications` (Job Applications)
- **Status**: M4-Added Table (Day 1)
- **Purpose**: Stores active job application records linking candidate users to job postings.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: 
  - `job_id` $\rightarrow$ `jobs(id)` ON DELETE CASCADE
  - `resume_version_id` $\rightarrow$ `resume_versions(id)` ON DELETE SET NULL

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY`, Default UUIDv4 | Unique application identifier. *(M4-Added)* |
| `user_id` | `UUID` / `TEXT` | NO | `idx_applications_user_id` | Candidate user ID. *(M4-Added)* |
| `job_id` | `UUID` / `TEXT` | NO | `REFERENCES jobs(id) ON DELETE CASCADE` | Applied job ID. *(M4-Added)* |
| `resume_version_id` | `UUID` / `TEXT` | YES | `REFERENCES resume_versions(id) ON DELETE SET NULL` | Resume version used for application. *(M4-Added)* |
| `status` | `VARCHAR(50)` / `TEXT` | NO | Default `'APPLIED'`, `CHECK (status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'WITHDRAWN'))` | Current application pipeline status. *(M4-Added)* |
| `applied_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Application submission timestamp. *(M4-Added)* |
| `updated_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Application status updated timestamp. *(M4-Added)* |

- **Indexes & Constraints**:
  - `PRIMARY KEY (id)`
  - `uq_user_job_application UNIQUE (user_id, job_id)` (Prevents duplicate applications).
  - `idx_applications_user_id ON applications(user_id)`
  - `idx_applications_job_id ON applications(job_id)`
  - `idx_applications_status ON applications(status)`
  - `idx_applications_applied_at ON applications(applied_at DESC)`
  - `idx_applications_resume_ver ON applications(resume_version_id)`
  - `idx_applications_user_status ON applications(user_id, status)` (Compound index for funnel queries).

---

### 2.2 `application_status_events` (Status Audit Trail)
- **Status**: M4-Added Table (Day 1)
- **Purpose**: Audit log recording every status transition event for an application over its lifecycle.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: `application_id` $\rightarrow$ `applications(id)` ON DELETE CASCADE

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY`, Default UUIDv4 | Status event identifier. *(M4-Added)* |
| `application_id` | `UUID` / `TEXT` | NO | `REFERENCES applications(id) ON DELETE CASCADE` | Target application ID. *(M4-Added)* |
| `previous_status` | `VARCHAR(50)` / `TEXT` | YES | — | Status prior to transition (`NULL` for initial APPLIED event). *(M4-Added)* |
| `new_status` | `VARCHAR(50)` / `TEXT` | NO | `CHECK (new_status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'WITHDRAWN'))` | New status following transition. *(M4-Added)* |
| `actor_id` | `UUID` / `TEXT` | YES | — | User ID of actor initiating change. *(M4-Added)* |
| `actor_role` | `VARCHAR(50)` / `TEXT` | YES | Default `'SYSTEM'` | Role of actor (`JOB_SEEKER`, `RECRUITER`, `SYSTEM`). *(M4-Added)* |
| `notes` | `TEXT` | YES | — | Optional status change notes. *(M4-Added)* |
| `changed_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Status change timestamp. *(M4-Added)* |

- **Indexes**:
  - `PRIMARY KEY (id)`
  - `idx_app_status_events_app_id ON application_status_events(application_id)`
  - `idx_app_status_events_changed_at ON application_status_events(changed_at DESC)`

---

### 2.3 `resume_version_views` (Resume Performance Views)
- **Status**: M4-Added Table (Day 1)
- **Purpose**: Records view events when a recruiter or system process inspects a candidate's resume version.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: 
  - `resume_version_id` $\rightarrow$ `resume_versions(id)` ON DELETE CASCADE
  - `job_id` $\rightarrow$ `jobs(id)` ON DELETE SET NULL

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY`, Default UUIDv4 | Unique view event identifier. *(M4-Added)* |
| `resume_version_id` | `UUID` / `TEXT` | NO | `REFERENCES resume_versions(id) ON DELETE CASCADE` | Target resume version ID. *(M4-Added)* |
| `viewer_user_id` | `UUID` / `TEXT` | NO | `idx_rv_views_viewer` | User ID of viewer. *(M4-Added)* |
| `job_id` | `UUID` / `TEXT` | YES | `REFERENCES jobs(id) ON DELETE SET NULL` | Related job ID (if viewed in context of a job). *(M4-Added)* |
| `viewed_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | View timestamp. *(M4-Added)* |

- **Indexes**:
  - `PRIMARY KEY (id)`
  - `idx_rv_views_version ON resume_version_views(resume_version_id)`
  - `idx_rv_views_viewer ON resume_version_views(viewer_user_id)`

---

### 2.4 `notifications` (User Notification Engine)
- **Status**: M4-Added Table (Day 1)
- **Purpose**: System and event notification records generated for users.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: 
  - `related_job_id` $\rightarrow$ `jobs(id)` ON DELETE SET NULL
  - `related_application_id` $\rightarrow$ `applications(id)` ON DELETE SET NULL

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY`, Default UUIDv4 | Notification ID. *(M4-Added)* |
| `user_id` | `UUID` / `TEXT` | NO | `idx_notifications_user_id` | Recipient user ID. *(M4-Added)* |
| `notification_type` | `VARCHAR(50)` / `TEXT` | NO | `CHECK (notification_type IN ('INSTANT_JOB', 'STARTUP_HIRING', 'HIGH_MATCH', 'LOW_COMPETITION', 'APPLICATION_STATUS_CHANGE', 'SYSTEM'))` | Notification category. *(M4-Added)* |
| `title` | `VARCHAR(255)` / `TEXT` | NO | — | Brief notification title. *(M4-Added)* |
| `message` | `TEXT` | NO | — | Main notification message body. *(M4-Added)* |
| `payload` | `JSONB` / `TEXT` | YES | — | Additional structured context payload. *(M4-Added)* |
| `related_job_id` | `UUID` / `TEXT` | YES | `REFERENCES jobs(id) ON DELETE SET NULL` | Associated job ID. *(M4-Added)* |
| `related_application_id` | `UUID` / `TEXT` | YES | `REFERENCES applications(id) ON DELETE SET NULL` | Associated application ID. *(M4-Added)* |
| `is_read` | `BOOLEAN` / `INTEGER` | NO | Default `FALSE` / `0` | Read status flag. *(M4-Added)* |
| `created_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Creation timestamp. *(M4-Added)* |
| `read_at` | `TIMESTAMPTZ` / `TEXT` | YES | — | Timestamp when user marked notification read. *(M4-Added)* |

- **Indexes**:
  - `PRIMARY KEY (id)`
  - `idx_notifications_user_id ON notifications(user_id)`
  - `idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE`
  - `idx_notifications_created_at ON notifications(created_at DESC)`

---

### 2.5 `notification_deliveries` (Multi-Channel Dispatch Audit)
- **Status**: M4-Added Table (Day 1)
- **Purpose**: Tracks delivery attempts across channels (`IN_APP`, `EMAIL`, `PUSH`) for each notification.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: `notification_id` $\rightarrow$ `notifications(id)` ON DELETE CASCADE

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY`, Default UUIDv4 | Delivery record ID. *(M4-Added)* |
| `notification_id` | `UUID` / `TEXT` | NO | `REFERENCES notifications(id) ON DELETE CASCADE` | Foreign key to parent notification. *(M4-Added)* |
| `channel` | `VARCHAR(50)` / `TEXT` | NO | `CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH'))` | Delivery channel type. *(M4-Added)* |
| `status` | `VARCHAR(50)` / `TEXT` | NO | Default `'PENDING'`, `CHECK (status IN ('PENDING', 'SENT', 'FAILED'))` | Delivery status. *(M4-Added)* |
| `sent_at` | `TIMESTAMPTZ` / `TEXT` | YES | — | Timestamp when dispatch succeeded. *(M4-Added)* |
| `error_message` | `TEXT` | YES | — | Error details if delivery failed. *(M4-Added)* |
| `created_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Record creation timestamp. *(M4-Added)* |

- **Indexes**:
  - `PRIMARY KEY (id)`
  - `idx_notif_deliv_notif_id ON notification_deliveries(notification_id)`
  - `idx_notif_deliv_status ON notification_deliveries(status)`

---

### 2.6 `alert_preferences` (User Alert Settings)
- **Status**: M4-Added Table (Day 1)
- **Purpose**: Stores candidate preference settings for job notification alerts, threshold settings, and quiet hours.
- **Primary Key**: `id` (UUID string)

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY`, Default UUIDv4 | Settings record ID. *(M4-Added)* |
| `user_id` | `UUID` / `TEXT` | NO | `UNIQUE`, `idx_alert_preferences_user_id` | Owner candidate user ID. *(M4-Added)* |
| `instant_job` | `BOOLEAN` / `INTEGER` | NO | Default `TRUE` / `1` | Instant job alert toggle. *(M4-Added)* |
| `startup_hiring` | `BOOLEAN` / `INTEGER` | NO | Default `TRUE` / `1` | Startup hiring alert toggle. *(M4-Added)* |
| `high_match` | `BOOLEAN` / `INTEGER` | NO | Default `TRUE` / `1` | High match job alert toggle. *(M4-Added)* |
| `low_competition` | `BOOLEAN` / `INTEGER` | NO | Default `TRUE` / `1` | Low competition job alert toggle. *(M4-Added)* |
| `channel_in_app` | `BOOLEAN` / `INTEGER` | NO | Default `TRUE` / `1` | In-app channel toggle. *(M4-Added)* |
| `channel_email` | `BOOLEAN` / `INTEGER` | NO | Default `TRUE` / `1` | Email channel toggle. *(M4-Added)* |
| `channel_push` | `BOOLEAN` / `INTEGER` | NO | Default `FALSE` / `0` | Push channel toggle. *(M4-Added)* |
| `match_threshold` | `NUMERIC(5,2)` / `REAL` | NO | Default `70.00`, `CHECK (threshold >= 0 AND threshold <= 100)` | Minimum match score threshold. *(M4-Added)* |
| `quiet_hours_enabled` | `BOOLEAN` / `INTEGER` | NO | Default `FALSE` / `0` | Quiet hours toggle. *(M4-Added)* |
| `quiet_hours_start` | `TIME` / `TEXT` | YES | — | Quiet hours start time. *(M4-Added)* |
| `quiet_hours_end` | `TIME` / `TEXT` | YES | — | Quiet hours end time. *(M4-Added)* |
| `created_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Preference creation timestamp. *(M4-Added)* |
| `updated_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Preference update timestamp. *(M4-Added)* |

- **Indexes**:
  - `PRIMARY KEY (id)`
  - `idx_alert_preferences_user_id ON alert_preferences(user_id)`

---

### 2.7 `daily_application_analytics` (Job Application Daily Snapshots)
- **Status**: M4-Added Table (Day 1 / Day 3)
- **Purpose**: Cumulative end-of-day aggregate snapshot recording application pipeline distribution per job.
- **Primary Key**: `(snapshot_date, job_id)`
- **Foreign Keys**: 
  - `company_id` $\rightarrow$ `companies(id)` ON DELETE CASCADE
  - `job_id` $\rightarrow$ `jobs(id)` ON DELETE CASCADE

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `snapshot_date` | `DATE` / `TEXT` | NO | `PRIMARY KEY (snapshot_date, job_id)` | Snapshot evaluation date (`YYYY-MM-DD`). *(M4-Added)* |
| `company_id` | `UUID` / `TEXT` | NO | `REFERENCES companies(id) ON DELETE CASCADE` | Associated company ID. *(M4-Added)* |
| `job_id` | `UUID` / `TEXT` | NO | `REFERENCES jobs(id) ON DELETE CASCADE` | Associated job ID. *(M4-Added)* |
| `total_applications` | `INTEGER` | NO | Default `0` | Cumulative total applications. *(M4-Added)* |
| `applied_count` | `INTEGER` | NO | Default `0` | Applications in APPLIED status. *(M4-Added)* |
| `shortlisted_count` | `INTEGER` | NO | Default `0` | Applications in SHORTLISTED status. *(M4-Added)* |
| `interview_count` | `INTEGER` | NO | Default `0` | Applications in INTERVIEW status. *(M4-Added)* |
| `rejected_count` | `INTEGER` | NO | Default `0` | Applications in REJECTED status. *(M4-Added)* |
| `withdrawn_count` | `INTEGER` | NO | Default `0` | Applications in WITHDRAWN status. *(M4-Added)* |
| `updated_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Snapshot generation timestamp. *(M4-Added)* |

- **Indexes**:
  - `PRIMARY KEY (snapshot_date, job_id)`
  - `idx_daily_app_analytics_company ON daily_application_analytics(company_id, snapshot_date)`
  - `idx_daily_app_analytics_date ON daily_application_analytics(snapshot_date DESC)`

---

### 2.8 `daily_hiring_trend_analytics` (Skill & Category Hiring Trends)
- **Status**: M4-Added Table (Day 1 / Day 3)
- **Purpose**: Daily aggregate snapshot recording hiring activity, job postings, application volume, and average salaries by company category and skill.
- **Primary Key**: `(snapshot_date, company_type_category, skill_id)`
- **Foreign Keys**: `skill_id` $\rightarrow$ `skills(id)` ON DELETE CASCADE

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `snapshot_date` | `DATE` / `TEXT` | NO | `PRIMARY KEY (snapshot_date, company_type_category, skill_id)` | Snapshot evaluation date (`YYYY-MM-DD`). *(M4-Added)* |
| `company_type_category` | `VARCHAR(50)` / `TEXT` | NO | — | Company classification (`STARTUP`, `MNC`, `OTHER`). *(M4-Added)* |
| `skill_id` | `UUID` / `TEXT` | NO | `REFERENCES skills(id) ON DELETE CASCADE` | Associated skill ID. *(M4-Added)* |
| `jobs_posted_count` | `INTEGER` | NO | Default `0` | Total jobs posted requiring this skill. *(M4-Added)* |
| `applications_received_count` | `INTEGER` | NO | Default `0` | Total applications for jobs requiring this skill. *(M4-Added)* |
| `avg_min_salary` | `NUMERIC(12,2)` / `REAL` | YES | — | Average minimum salary for jobs with this skill. *(M4-Added)* |
| `avg_max_salary` | `NUMERIC(12,2)` / `REAL` | YES | — | Average maximum salary for jobs with this skill. *(M4-Added)* |
| `updated_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Snapshot generation timestamp. *(M4-Added)* |

- **Indexes**:
  - `PRIMARY KEY (snapshot_date, company_type_category, skill_id)`
  - `idx_hiring_trends_date_cat ON daily_hiring_trend_analytics(snapshot_date DESC, company_type_category)`
  - `idx_hiring_trends_skill ON daily_hiring_trend_analytics(skill_id)`
