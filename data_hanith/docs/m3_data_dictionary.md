# SwipeX Data Dictionary — Milestone 3 Schema Reference

**Domain Service**: Job & Data Intelligence Service (`data_hanith`)  
**Author**: Data & Backend Engineering (Intern 3)  
**Target Consumers**: Intern 4 (Matching Engine & AI/ML), Backend Gateway, Database Engineers  
**Date**: September 25, 2026  
**Status**: APPROVED & AUDITED  

---

## 1. Overview & Classification System

This document provides the authoritative Data Dictionary for the SwipeX data layer following Milestone 3 schema extensions.

Fields across all tables are classified into three distinct structural tiers:
1. **Existing M2 Fields**: Core tables and columns created during Milestone 2 data ingestion.
2. **M3-Added Tables & Fields**: Schema extensions introduced in Milestone 3 (Days 1–3) to support candidate resume versioning, job skill/keyword enrichment, and ATS score persistence.
3. **Derived / Runtime Fields**: Dynamically computed fields calculated by repository accessors at query time (e.g. `monthly_salary`, `salary_range`, `skill_match_percentage`).

---

## 2. Table Specifications

### 2.1 `resumes` (Parent Resume Container)
- **Status**: M3-Added Table (Day 2)
- **Purpose**: Represents the parent resume container owned by a candidate user. Groups all historical and active resume versions under a logical entity.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: `user_id` (Logical reference to Auth Identity User)

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY`, Default UUIDv4 | Unique identifier for parent resume. *(M3-Added)* |
| `user_id` | `UUID` / `TEXT` | NO | `idx_resumes_user_id` | Foreign key referencing candidate user ID. *(M3-Added)* |
| `title` | `VARCHAR(255)` / `TEXT` | NO | Default `'Default Resume'` | Candidate-defined title for resume container. *(M3-Added)* |
| `created_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Record creation timestamp. *(M3-Added)* |
| `updated_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Record last modification timestamp. *(M3-Added)* |

- **Indexes**:
  - `PRIMARY KEY (id)`
  - `idx_resumes_user_id ON resumes(user_id)`
  - `uq_user_resume_title ON resumes(user_id, LOWER(title))` (Prevents duplicate container names per candidate user).

---

### 2.2 `resume_versions` (Resume File & Parsed Versioning)
- **Status**: M3-Added Table (Day 2)
- **Purpose**: Stores uploaded resume files, extracted raw text, parsed JSON skills/experience, version metadata, and active version state.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: `resume_id` $\rightarrow$ `resumes(id)` ON DELETE CASCADE

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY`, Default UUIDv4 | Unique identifier for resume version. *(M3-Added)* |
| `resume_id` | `UUID` / `TEXT` | NO | `REFERENCES resumes(id) ON DELETE CASCADE` | Foreign key to parent resume container. *(M3-Added)* |
| `file_name` | `VARCHAR(255)` / `TEXT` | NO | — | Original uploaded file name (e.g. `resume_v1.pdf`). *(M3-Added)* |
| `file_path` | `VARCHAR(512)` / `TEXT` | NO | — | Local persistent storage path (`uploads/resumes/...`). *(M3-Added)* |
| `raw_text` | `TEXT` | NO | — | Plaintext extracted from resume document. *(M3-Added)* |
| `parsed_json` | `JSONB` / `TEXT` | NO | — | Structured JSON containing `{"skills": [...], "experience": [...]}`. *(M3-Added)* |
| `version_number` | `INTEGER` | NO | `uq_resume_version_num(resume_id, version_number)` | Monotonic 1-based version number per resume. *(M3-Added)* |
| `is_active` | `BOOLEAN` / `INTEGER` | NO | Default `TRUE` / `1`, `uq_resume_active_version` | Boolean flag indicating active resume version. *(M3-Added)* |
| `created_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Version creation timestamp. *(M3-Added)* |

- **Indexes & Constraints**:
  - `PRIMARY KEY (id)`
  - `uq_resume_version_num UNIQUE (resume_id, version_number)`
  - `uq_resume_active_version UNIQUE (resume_id) WHERE is_active = TRUE/1` (Guarantees at most ONE active version per parent resume).
  - `idx_resume_versions_resume_id ON resume_versions(resume_id)`

---

### 2.3 `jobs` (Job Postings Dataset)
- **Status**: Existing M2 Table (Baseline 97,929 jobs)
- **Purpose**: Master table containing job titles, descriptions, locations, salaries, and company relationships.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: `company_id` $\rightarrow$ `companies(id)` ON DELETE RESTRICT

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY` | Unique job UUID. *(Existing M2)* |
| `raw_job_id` | `INTEGER` | NO | `idx_jobs_raw_job_id` | Integer ID from raw dataset. *(Existing M2)* |
| `company_id` | `UUID` / `TEXT` | NO | `REFERENCES companies(id)` | Foreign key to company record. *(Existing M2)* |
| `title` | `TEXT` | NO | — | Job title. *(Existing M2)* |
| `job_description` | `TEXT` | NO | — | Full job description text. *(Existing M2)* |
| `min_salary` | `NUMERIC(12,2)` / `REAL` | YES | `idx_jobs_salary` | Minimum annual salary in local currency. *(Existing M2)* |
| `max_salary` | `NUMERIC(12,2)` / `REAL` | YES | `idx_jobs_salary` | Maximum annual salary in local currency. *(Existing M2)* |
| `currency` | `VARCHAR(10)` / `TEXT` | NO | Default `'INR'` | Salary currency. *(Existing M2)* |
| `min_experience` | `NUMERIC(4,1)` / `REAL` | YES | `idx_jobs_experience` | Minimum required years of experience. *(Existing M2)* |
| `max_experience` | `NUMERIC(4,1)` / `REAL` | YES | `idx_jobs_experience` | Maximum required years of experience. *(Existing M2)* |
| `raw_experience_str` | `TEXT` | YES | — | Unparsed raw experience text from dataset. *(Existing M2)* |
| `location` | `TEXT` | NO | `idx_jobs_location` | Job location city/state/country. *(Existing M2)* |
| `work_mode` | `VARCHAR(20)` / `TEXT` | YES | — | Work mode (`REMOTE`, `HYBRID`, `ONSITE`). *(Existing M2)* |
| `job_type` | `VARCHAR(30)` / `TEXT` | YES | — | Employment type (`FULL_TIME`, `CONTRACT`, etc.). *(Existing M2)* |
| `applicant_count` | `INTEGER` | NO | Default `0` | Number of candidates who applied. *(Existing M2)* |
| `competition_level` | `VARCHAR(10)` / `TEXT` | NO | Default `'LOW'`, `CHECK IN ('LOW','MEDIUM','HIGH')` | Derived competition level. *(Existing M2)* |
| `posted_at_raw` | `TEXT` | NO | — | Raw posted date string. *(Existing M2)* |
| `posted_at_approx` | `TIMESTAMPTZ` / `TEXT` | YES | `idx_jobs_posted_at_approx` | Standardized reference date. *(Existing M2)* |

- **Derived / Runtime Fields**:
  - `salary_range`: Formatted string (e.g. `"10-15 Lacs PA"` or `"Not disclosed"`).
  - `monthly_salary`: Average monthly salary derived as `((min_salary + max_salary) / 2) / 12`.
  - `embedding_input_text`: Formatted semantic string for Intern 4 embedding model.

---

### 2.4 `companies` (Employer Organisations)
- **Status**: Existing M2 Table (Baseline 18,328 companies)
- **Purpose**: Master table for employer organisations.
- **Primary Key**: `id` (UUID string)

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Description & Classification |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | Unique company UUID. *(Existing M2)* |
| `raw_company_id` | `INTEGER` | NO | Raw dataset company ID. *(Existing M2)* |
| `name` | `TEXT` | YES | Company name. *(Existing M2)* |
| `company_type` | `TEXT` | YES | Company category (e.g. `Corporate`, `Startup`, `MNC`). *(Existing M2)* |
| `aggregate_rating` | `REAL` | YES | Average employer rating (0.00 – 5.00). *(Existing M2)* |
| `reviews_count` | `INTEGER` | YES | Number of reviews. *(Existing M2)* |
| `industry` | `TEXT` | YES | Industry domain. *(Existing M2)* |

---

### 2.5 `skills` (Canonical Skill Taxonomy)
- **Status**: Existing M2 Table (Baseline 44,078 skills)
- **Purpose**: Global canonical master table of professional skills.
- **Primary Key**: `id` (UUID string)

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY` | Unique skill UUID. *(Existing M2)* |
| `name` | `TEXT` | NO | `uq_skills_name_lower` | Canonical skill name (e.g. `"Python"`, `"Machine Learning"`). *(Existing M2)* |
| `category` | `TEXT` | YES | — | Skill classification category. *(Existing M2)* |

- **Indexes**:
  - `uq_skills_name_lower UNIQUE INDEX ON skills(LOWER(name))` (Enforces case-insensitive skill uniqueness).

---

### 2.6 `job_skills` (Job Skills Join Table)
- **Status**: Extended M3 Table (Day 3, Baseline 755,099 rows)
- **Purpose**: Many-to-many join table connecting jobs to canonical skills, extended in M3 with importance metadata.
- **Primary Key**: `(job_id, skill_id)`
- **Foreign Keys**:
  - `job_id` $\rightarrow$ `jobs(id)` ON DELETE CASCADE
  - `skill_id` $\rightarrow$ `skills(id)` ON DELETE CASCADE

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `job_id` | `UUID` / `TEXT` | NO | `REFERENCES jobs(id) ON DELETE CASCADE` | Job FK. *(Existing M2)* |
| `skill_id` | `UUID` / `TEXT` | NO | `REFERENCES skills(id) ON DELETE CASCADE` | Skill FK. *(Existing M2)* |
| `is_required` | `BOOLEAN` / `INTEGER` | NO | Default `TRUE` / `1`, `idx_job_skills_required` | Mandatory skill flag *(M3-Added Fallback)*. |
| `weight` | `NUMERIC(3,2)` / `REAL` | NO | Default `1.00`, `CHECK(weight BETWEEN 0.00 AND 5.00)` | Neutral weight default *(M3-Added Neutral)*. |
| `min_years` | `NUMERIC(4,1)` / `REAL` | YES | Default `NULL` | Skill experience threshold *(M3-Added Optional)*. |

---

### 2.7 `job_keywords` (Extracted Job Keywords Taxonomy)
- **Status**: M3-Added Table (Day 3, Baseline 156,908 rows)
- **Purpose**: Stores structured domain terms, tools, frameworks, certifications, responsibilities, and soft skills extracted from job titles and descriptions via regex word-boundary taxonomy.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**: `job_id` $\rightarrow$ `jobs(id)` ON DELETE CASCADE

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY` | Unique keyword record UUID. *(M3-Added)* |
| `job_id` | `UUID` / `TEXT` | NO | `REFERENCES jobs(id) ON DELETE CASCADE` | Job FK. *(M3-Added)* |
| `keyword` | `VARCHAR(100)` / `TEXT` | NO | `uq_job_keyword_type` | Extracted keyword string. *(M3-Added)* |
| `keyword_type` | `VARCHAR(50)` / `TEXT` | NO | `uq_job_keyword_type` | Keyword category (`DOMAIN`, `TOOL`, `FRAMEWORK`, `CERTIFICATION`, `RESPONSIBILITY`, `SOFT_SKILL`). *(M3-Added)* |
| `weight` | `NUMERIC(3,2)` / `REAL` | NO | Default `1.00`, `CHECK(weight BETWEEN 0.00 AND 5.00)` | Category importance weight. *(M3-Added)* |
| `created_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Extraction timestamp. *(M3-Added)* |

- **Indexes**:
  - `uq_job_keyword_type UNIQUE ON job_keywords(job_id, LOWER(keyword), keyword_type)`
  - `idx_job_keywords_job_id ON job_keywords(job_id)`

---

### 2.8 `ats_scores` (ATS Match Score Persistence)
- **Status**: M3-Added Table (Day 2)
- **Purpose**: Stores calculated candidate resume version to job posting ATS match scores. Re-scoring updates existing rows atomically without creating score history rows.
- **Primary Key**: `id` (UUID string)
- **Foreign Keys**:
  - `resume_version_id` $\rightarrow$ `resume_versions(id)` ON DELETE CASCADE
  - `job_id` $\rightarrow$ `jobs(id)` ON DELETE CASCADE

| Column Name | Data Type (PostgreSQL / SQLite) | Nullable | Constraints / Defaults | Description & Classification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | NO | `PRIMARY KEY` | Unique ATS score record UUID. *(M3-Added)* |
| `resume_version_id` | `UUID` / `TEXT` | NO | `REFERENCES resume_versions(id) ON DELETE CASCADE` | Resume version FK. *(M3-Added)* |
| `job_id` | `UUID` / `TEXT` | NO | `REFERENCES jobs(id) ON DELETE CASCADE` | Job FK. *(M3-Added)* |
| `match_score` | `NUMERIC(5,2)` / `REAL` | NO | `CHECK(match_score BETWEEN 0.00 AND 100.00)` | ATS match percentage score [0.00, 100.00]. *(M3-Added)* |
| `created_at` | `TIMESTAMPTZ` / `TEXT` | NO | Default `NOW()` / `datetime('now')` | Score timestamp. *(M3-Added)* |

- **Indexes**:
  - `uq_resume_version_job_ats UNIQUE (resume_version_id, job_id)`
  - `idx_ats_scores_resume_version ON ats_scores(resume_version_id)`
  - `idx_ats_scores_job_id ON ats_scores(job_id)`

---

## 3. Entity-Relationship Summary

```
                      +-------------------+
                      |     companies     |
                      +-------------------+
                                | 1
                                |
                                | N (ON DELETE RESTRICT)
                                v
+------------------+  1   +-------------------+  1   +-------------------+
|     resumes      |----->|       jobs        |<-----|    job_skills     |
+------------------+ N    +-------------------+ N    +-------------------+
         | 1                        | 1                        | N
         |                          |                          |
         | N                        | N (CASCADE)              v 1
         v                          v                    +-------------------+
+------------------+      +-------------------+          |      skills       |
| resume_versions  |      |   job_keywords    |          +-------------------+
+------------------+      +-------------------+
         | 1                        |
         |                          |
         | N (CASCADE)              | N (CASCADE)
         v                          v
+---------------------------------------------+
|                 ats_scores                  |
+---------------------------------------------+
```
