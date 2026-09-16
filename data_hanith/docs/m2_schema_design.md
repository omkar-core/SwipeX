# SwipeX Milestone 2 — Schema Extension, Indexing & Seed Strategy

**Domain:** Job & Data Intelligence (Intern 3)
**Date:** September 14, 2026
**Status:** DAY 1 COMPLETE — Migration & Indexing Strategy Finalized

---

## 1. M1 → M2 Schema Evolution

Milestone 2 extends the canonical PostgreSQL / SQLite relational schema non-destructively to support Company profile pages, Saved Jobs functionality, Job Search keyword indexing, and competition level indicators.

### 1.1 Extended Tables & Columns

#### `companies` Table Extensions
- **`about`** (`TEXT NULL`): Comprehensive company description and mission overview.
- **`size`** (`VARCHAR(50) NULL`): Employee count size bracket (e.g. `'1-10'`, `'11-50'`, `'51-200'`, `'201-500'`, `'500+'`).
- **`industry`** (`VARCHAR(100) NULL`): Primary industry domain (e.g. `'Information Technology & Services'`, `'Financial Services & Fintech'`).
- **`is_newly_founded`** (`BOOLEAN NOT NULL DEFAULT FALSE` / `INTEGER` in SQLite): Flag identifying startups and newly founded companies.

#### `jobs` Table Extensions
- **`applicant_count`** (`INTEGER NOT NULL DEFAULT 0`): Total number of applicant submissions for the posting.
- **`competition_level`** (`VARCHAR(20) NOT NULL DEFAULT 'LOW'`): Categorized applicant density (`'LOW'`, `'MEDIUM'`, `'HIGH'`) enforced by CHECK constraint `chk_job_competition`.

#### `saved_jobs` New Table
- **`id`** (`UUID` / `TEXT` PRIMARY KEY): Primary key identifier.
- **`user_id`** (`UUID` / `TEXT` NOT NULL): Foreign key reference to Job Seeker user identity.
- **`job_id`** (`UUID` / `TEXT` NOT NULL): Foreign key referencing `jobs(id)` ON DELETE CASCADE.
- **`saved_at`** (`TIMESTAMPTZ` / `TEXT` NOT NULL DEFAULT NOW()): Timestamp of bookmarking.
- **`notes`** (`TEXT NULL`): Optional user notes for saved jobs.
- **Constraint**: `CONSTRAINT uq_user_saved_job UNIQUE (user_id, job_id)`.

---

## 2. Search Indexing Strategy

Milestone 2 requires fast full-text keyword matching across titles, job descriptions, and company names alongside multi-filter query support.

### 2.1 Trigram GIN Search Indexing (`pg_trgm`)
- **`idx_jobs_title_trgm`**: `CREATE INDEX idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);`
- **`idx_jobs_description_trgm`**: `CREATE INDEX idx_jobs_description_trgm ON jobs USING gin (job_description gin_trgm_ops);`
- **`idx_companies_name_trgm`**: `CREATE INDEX idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);`

### 2.2 B-Tree Performance Indexes
- **`idx_jobs_competition`**: `CREATE INDEX idx_jobs_competition ON jobs(competition_level);`
- **`idx_jobs_applicant_count`**: `CREATE INDEX idx_jobs_applicant_count ON jobs(applicant_count);`
- **`idx_companies_newly_founded`**: `CREATE INDEX idx_companies_newly_founded ON companies(is_newly_founded);`
- **`idx_companies_industry`**: `CREATE INDEX idx_companies_industry ON companies(industry);`
- **`idx_saved_jobs_user_id`**: `CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(user_id);`
- **`idx_saved_jobs_user_job`**: `CREATE INDEX idx_saved_jobs_user_job ON saved_jobs(user_id, job_id);`

---

## 3. Seed Data Strategy & Implementation Decisions

### 3.1 Competition Level Thresholds (Implementation Decision)
The SRS specifies that Competition Level must be calculated from applicant count thresholds into `Low`, `Medium`, and `High`. The explicit threshold criteria implemented are:
- **`LOW`**: `< 10` applicants (Low competition / High opportunity)
- **`MEDIUM`**: `10` to `50` applicants (Moderate competition)
- **`HIGH`**: `> 50` applicants (High competition)

### 3.2 Seed Dataset Enrichment Statistics
- Total Jobs Enriched: **97,929**
  - High Competition: **56,745** listings
  - Medium Competition: **32,991** listings
  - Low Competition: **8,193** listings
- Total Companies Enriched: **18,328**
- Total Skills & Mappings Preserved: **44,078** skills / **755,099** mappings.
