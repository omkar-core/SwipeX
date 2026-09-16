# SwipeX Milestone 2 — Final Architecture & QA Validation Report

**Domain:** Job & Data Intelligence (Intern 3)
**Service Directory:** `data_hanith`
**Database Engine:** PostgreSQL 18.4 (`swipex_job_db` on `127.0.0.1:5432`)
**Status:** MILESTONE 2 COMPLETE & VERIFIED

---

## 1. Architectural Overview & Environment

The **Job & Data Intelligence Service** (`data_hanith`) serves as the core market data engine for SwipeX, providing job catalog search, company details, skill mappings, swipe action recording, and personalized job feed delivery with feed exclusion caching.

### 1.1 Tech Stack & Dependencies
- **Language & Framework**: Python 3.14 / FastAPI (ASGI)
- **Primary Database**: PostgreSQL 18.4 (Durable SQL relational source of truth)
- **ORM / Query Builder**: SQLAlchemy Core & ORM
- **Cache Engine**: Redis 6+ (User swiped job set store & feed response caching with automatic SQL fallback)
- **Security & RBAC**: JWT Bearer token parsing & trusted API Gateway header verification (`X-User-Id`, `X-User-Role`, `X-Gateway-Secret`)

---

## 2. Database Schema, Constraints & Indexes

The PostgreSQL database schema consists of 6 relational tables:

### 2.1 Table Definitions & Metrics
1. **`jobs`** (97,929 rows):
   - Primary Key: `id` (`UUID`)
   - Mandatory Link: `company_id` (`UUID` -> `companies(id)`)
   - Key Attributes: `title`, `job_description`, `min_salary`, `max_salary`, `currency`, `min_experience`, `max_experience`, `raw_experience_str`, `location`, `work_mode`, `job_type`, `posted_at_raw`, `posted_at_approx`, `applicant_count`, `competition_level`.
   - Constraint: `CONSTRAINT chk_job_competition CHECK (competition_level IN ('LOW', 'MEDIUM', 'HIGH'))`.
2. **`companies`** (18,328 rows):
   - Primary Key: `id` (`UUID`)
   - Attributes: `name`, `raw_company_id`, `company_type`, `aggregate_rating`, `reviews_count`, `about`, `size`, `industry`, `is_newly_founded`.
3. **`skills`** (44,078 rows):
   - Primary Key: `id` (`UUID`)
   - Unique Lower Constraint: `CONSTRAINT uq_skills_name_lower UNIQUE (LOWER(name))`.
4. **`job_skills`** (755,099 rows):
   - Junction Table: `(job_id, skill_id)` ON DELETE CASCADE.
5. **`swipes`** (Accumulated development/test data; preserved):
   - Unique User-Job Constraint: `CONSTRAINT uq_user_job_swipe UNIQUE (user_id, job_id)`.
   - Direction Constraint: `CONSTRAINT chk_swipe_direction CHECK (direction IN ('RIGHT', 'LEFT'))`.
6. **`saved_jobs`** (0 rows):
   - Unique Bookmark Constraint: `CONSTRAINT uq_user_saved_job UNIQUE (user_id, job_id)`.

### 2.2 Indexing Strategy
- **B-Tree Indexes**: `idx_jobs_company_id`, `idx_job_skills_job_id`, `idx_job_skills_skill_id`, `idx_swipes_user_id`, `idx_jobs_posted_at`, `idx_jobs_location`, `idx_jobs_min_salary`, `idx_jobs_max_salary`, `idx_jobs_competition`, `idx_companies_name`, `idx_companies_newly_founded`, `idx_companies_industry`.
- **Trigram GIN Indexes (`pg_trgm`)**: `idx_jobs_title_trgm`, `idx_jobs_description_trgm`, `idx_companies_name_trgm`.

---

## 3. Implementation Heuristics & Rules

### 3.1 Job Freshness Indicator (Implementation Heuristic)
Calculated dynamically at query/API runtime relative to baseline date:
- **`FRESH`**: Age `0 – 7 days` (also includes future-dated postings clamped to age 0)
- **`RECENT`**: Age `8 – 14 days`
- **`AGING`**: Age `15 – 30 days`
- **`STALE`**: Age `> 30 days`

### 3.2 Job Competition Indicator (Implementation Heuristic)
Enriched and calculated from applicant density count:
- **`LOW`**: `< 10` applicants (High candidate opportunity)
- **`MEDIUM`**: `10 – 50` applicants
- **`HIGH`**: `> 50` applicants

---

## 4. Operational Workflows: Backup & Restore

### 4.1 Database Backup Script (`data_hanith/scripts/backup_postgres.py`)
Creates custom-format PostgreSQL dump archives with TOC verification:
```powershell
python data_hanith/scripts/backup_postgres.py
```

### 4.2 Isolated Restore QA Script (`data_hanith/scripts/validate_day5_backup_restore.py`)
Restores into isolated database `swipex_job_db_test_restore`, verifies row counts, and drops the test database:
```powershell
python data_hanith/scripts/validate_day5_backup_restore.py
```

---

## 5. Final QA & Performance Benchmarks

- **Pytest Suite**: 88 out of 88 collected tests passed (100% pass rate).
- **PostgreSQL FK Orphans**: 0 orphan rows across all tables.
- **EXPLAIN ANALYZE SQL Engine Execution Times**:
  - Default Job Feed: `0.21 ms`
  - Job Detail Lookup: `0.02 ms`
  - Location Substring Filter: `0.31 ms`
  - Salary Range Filter: `0.08 ms`
  - Skills Match-Any Filter: `35.35 ms`
  - Company Summary Feed: `0.39 ms`
  - Company Detail Aggregation: `0.03 ms`
- **API Response Latencies**:
  - `GET /api/v1/jobs/{job_id}`: `28.09 ms`
  - `GET /api/v1/companies/{company_id}`: `32.22 ms`
  - `GET /api/v1/companies`: `104.17 ms`
