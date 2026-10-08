# SwipeX Operational & Maintenance Guide — Milestone 4

**Domain Service**: Job & Data Intelligence Service (`data_hanith`)  
**Author**: Data & Backend Engineering (Intern 3)  
**Target Audience**: DevOps Engineers, Database Administrators, System Integrators  
**Date**: October 8, 2026  
**Status**: APPROVED & AUDITED  

---

## 1. Executive Summary & Architecture

Milestone 4 extends the SwipeX Job & Data Intelligence platform with production-grade application tracking, multi-channel notification capabilities, user alert preferences, and cumulative daily analytics aggregation. 

### Core Components
1. **Database Layer**: PostgreSQL 15+ (Production) and SQLite 3 (Local/Testing). Supports 18 tables across Milestones 1–4.
2. **Repository Layer**: `ApplicationRepository`, `JobRepository`, `NotificationRepository`, `AnalyticsRepository`. Includes atomic SQL counter updates and Redis cache management.
3. **Indicator & Classification Engine**: Reference clock provider (`get_reference_time()`), deterministic competition formula (`HIGH`, `MEDIUM`, `LOW`), early-applicant NULL semantics (`TRUE`, `FALSE`, `NULL`), and strict company classification (`STARTUP`, `MNC`, `OTHER`).
4. **Analytics Pipeline**: Daily snapshot generator script (`generate_daily_analytics_snapshots.py`) producing cumulative end-of-day aggregate snapshots for pipeline funnels, resume performance, skills-in-demand, and category hiring trends.
5. **Caching System**: Redis key-value cache (TTL = 600s / 10m) with automatic cache invalidation on application updates and graceful fallback to DB when Redis is offline.

---

## 2. Database Migration & Rollback Procedures

### 2.1 Distinction: Dry-Run DDL vs Actual Production Migration
- **DDL Dry-Run / Idempotency Validation**: Execution of `apply_m4_migration.py` or running DDL scripts against a local SQLite/Postgres test instance. Validates syntax, foreign key constraints, indexes, and idempotent execution (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- **Actual Production Migration**: Execution of `004_m4_schema_extension.sql` against a live PostgreSQL 15+ server via `psql` or production migration runner after backing up existing data.

### 2.2 Execution Steps for Migration
To apply the Milestone 4 schema migration:

**Option A: Python Migration Script (Recommended)**
```bash
python data_hanith/scripts/apply_m4_migration.py --db-path "path/to/swipex.db"
```

**Option B: PostgreSQL CLI (`psql`)**
```bash
psql -h <PG_HOST> -p <PG_PORT> -U <PG_USER> -d swipex_prod -f data_hanith/db/migrations/004_m4_schema_extension.sql
```

### 2.3 Rollback Execution Steps
If a rollback is required during deployment:

```bash
psql -h <PG_HOST> -p <PG_PORT> -U <PG_USER> -d swipex_prod -f data_hanith/db/migrations/004_m4_rollback.sql
```

> [!WARNING]
> Rolling back the M4 schema will permanently drop all 8 M4 tables (`applications`, `application_status_events`, `resume_version_views`, `notifications`, `notification_deliveries`, `alert_preferences`, `daily_application_analytics`, `daily_hiring_trend_analytics`) and their associated data. Always perform a full database backup prior to migration.

---

## 3. Data Integrity & Business Rules

### 3.1 Competition Level Calculation
Competition is calculated dynamically using both **applicant count** ($A$) and **job age** ($Age$ in days since `posted_at_approx`):

- **HIGH**: $A \ge 50$ OR ($A \ge 20$ AND $Age \le 7$)
- **LOW**: $A < 10$ OR ($A < 20$ AND $Age > 30$)
- **MEDIUM**: Everything else

If `posted_at_approx` is `NULL`, $Age$ is treated as $0$.

### 3.2 Early Applicant Logic & NULL Semantics
An applicant is considered early if applied within 48 hours ($2.0$ days) of job posting:
- **`TRUE`**: `posted_at_approx` is present AND `applied_at` - `posted_at_approx` $\le 48$ hours.
- **`FALSE`**: `posted_at_approx` is present AND `applied_at` - `posted_at_approx` $> 48$ hours.
- **`NULL`**: `posted_at_approx` is `NULL` (posting timestamp unavailable).

### 3.3 Strict Company Classification
Company classification (`classify_company_type()`) maps `companies.company_type` values to standard categories:
- **`STARTUP`**: Case-insensitive substring match containing `"STARTUP"`.
- **`MNC`**: Case-insensitive substring match containing `"MNC"` or `"MULTINATIONAL"`.
- **`OTHER`**: All other company types (`Corporate`, `Conglomerate`, `Enterprise`, `Private`, `Public`, `NULL`).

---

## 4. Daily Analytics Snapshot Generator Cron Setup

Analytics tables (`daily_application_analytics` and `daily_hiring_trend_analytics`) are populated daily via a scheduled job.

### 4.1 CLI Command Syntax
```bash
# Generate snapshots for today (using reference clock)
python -m data_hanith.scripts.generate_daily_analytics_snapshots

# Backfill or re-run snapshots for a specific historical date
python -m data_hanith.scripts.generate_daily_analytics_snapshots --date 2026-10-07 --force
```

### 4.2 Crontab Configuration Example
Schedule the snapshot generator to execute daily at 00:05 UTC:
```cron
5 0 * * * cd /path/to/project && /usr/bin/python3 -m data_hanith.scripts.generate_daily_analytics_snapshots >> /var/log/swipex/analytics_cron.log 2>&1
```

---

## 5. Redis Caching & Invalidation Strategy

### 5.1 Caching Configuration
- **Cache TTL**: 600 seconds (10 minutes).
- **Cache Keys**:
  - `job:{job_id}` $\rightarrow$ Cached JSON payload of job details and indicators.
  - `user:{user_id}:applications` $\rightarrow$ Cached list of user applications.
  - `job:{job_id}:analytics` $\rightarrow$ Cached job aggregate statistics.

### 5.2 Cache Invalidation Rules
- On **`create_application(user_id, job_id)`**:
  - Invalidate `job:{job_id}` (applicant count incremented).
  - Invalidate `user:{user_id}:applications`.
- On **`update_application_status(application_id, new_status)`**:
  - Invalidate `user:{user_id}:applications`.
  - Invalidate `job:{job_id}:analytics`.

### 5.3 Fallback Mechanism
If the Redis server is offline or fails to respond, repositories automatically log a warning and fallback to reading/writing directly from PostgreSQL / SQLite without raising user-facing errors.

---

## 6. Backup, Recovery & Integrity Auditing

### 6.1 Database Backup Verification
The disaster recovery verification tool inspects all 18 tables across M1–M4 and ensures table structure and row counts match pre-migration states:

```bash
python data_hanith/scripts/validate_day5_backup_restore.py --db-path "path/to/swipex.db"
```

### 6.2 Full System Table Inventory (18 Tables)
1. `jobs` (M2)
2. `companies` (M2)
3. `skills` (M2)
4. `job_skills` (M2)
5. `job_keywords` (M2)
6. `resumes` (M3)
7. `resume_versions` (M3)
8. `ats_scores` (M3)
9. `swipes` (M3)
10. `saved_jobs` (M3)
11. `applications` (M4 Day 1)
12. `application_status_events` (M4 Day 1)
13. `resume_version_views` (M4 Day 1)
14. `notifications` (M4 Day 1)
15. `notification_deliveries` (M4 Day 1)
16. `alert_preferences` (M4 Day 1)
17. `daily_application_analytics` (M4 Day 1/3)
18. `daily_hiring_trend_analytics` (M4 Day 1/3)

---

## 7. Troubleshooting & Verification

| Issue | Potential Cause | Resolution |
| :--- | :--- | :--- |
| `is_early_applicant` returning `FALSE` instead of `NULL` | Job `posted_at_approx` was initialized with default date string instead of `NULL`. | Ensure database `posted_at_approx` column is explicitly set to `NULL` for jobs missing post timestamps. |
| `applicant_count` mismatch under high concurrency | Non-atomic write operations. | Ensure `ApplicationRepository.create_application()` relies on atomic SQL counter `UPDATE jobs SET applicant_count = applicant_count + 1`. |
| Analytics snapshot generator skips date | Snapshot already exists for date. | Run generator with `--force` flag to overwrite existing daily snapshot records. |
