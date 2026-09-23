# SwipeX Milestone 3 — Day 1 Schema & Architectural Design Specification

**Domain:** Job & Data Intelligence (Intern 3) & Matching Engine / AI-ML (Intern 4)  
**Date:** September 23, 2026  
**Status:** REVISED DESIGN SPECIFICATION (Final Approved Day 1 Specification — No Code Implementation)  

---

## 1. Executive Summary & Architecture Scope

This document specifies the updated **Milestone 3 (Day 1)** database schema, entity-relationship model, and inter-service integration specifications for the SwipeX platform. It incorporates all 10 confirmed decisions agreed upon with **Intern 4 (AI/ML & Matching Engine)** while preserving the existing **Milestone 2 (M2)** PostgreSQL baseline database schema (`companies`, `jobs`, `skills`, `swipes`, `saved_jobs`).

> [!IMPORTANT]  
> **Strict Operational Policy**: This document is purely a design specification. No application code, database migrations, database tables, or seed scripts are modified, created, or executed as part of this deliverable.

---

## 2. Preserved Milestone 2 Schema Baseline

The existing M2 relational schema remains fully intact without destructive changes or breaking modifications:

```
+------------------+         +------------------+         +------------------+
|    companies     |1       *|       jobs       |*       *|      skills      |
+------------------+---------+------------------+---------+------------------+
| id (PK)          |         | id (PK)          |         | id (PK)          |
| raw_company_id   |         | company_id (FK)  |         | name (UQ LOWER)  |
| name             |         | title            |         | category         |
| about, size, etc |         | job_description  |         | created_at       |
+------------------+         | min/max_salary   |         +------------------+
                             | min/max_exp      |                  |
                             | location         |                  |
                             | applicant_count  |                  |
                             | competition_lvl  |                  |
                             +------------------+                  |
                                      |                            |
                                      +------------+---------------+
                                                   |
                                          +------------------+
                                          |    job_skills    | (Extended in M3)
                                          +------------------+
                                          | job_id (PK, FK)  |
                                          | skill_id (PK, FK)|
                                          +------------------+
```

---

## 3. Revised Entity List & Detailed Field Specification

### 3.1 Extended Entity: `job_skills` Junction Table
*Extends M2 junction entity to support weighted ATS matching, required skill filtering, and skill-specific experience thresholds.*

* **Primary Key:** `(job_id, skill_id)`
* **Foreign Keys:**
  * `job_id` → `jobs(id)` ON DELETE CASCADE
  * `skill_id` → `skills(id)` ON DELETE CASCADE

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `job_id` | `UUID` | `NOT NULL, REFERENCES jobs(id)` | Foreign key to target job posting |
| `skill_id` | `UUID` | `NOT NULL, REFERENCES skills(id)` | Foreign key to normalized skill |
| `is_required` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | **[M3 Extension]** Flag indicating mandatory vs optional skill |
| `weight` | `NUMERIC(3,2)`| `NOT NULL DEFAULT 1.00` | **[M3 Extension]** Relative importance weight (0.00 to 1.00) |
| `min_years` | `NUMERIC(4,1)`| `NULL` | **[M3 Extension]** Minimum required years of experience for this skill |

---

### 3.2 New Entity: `job_keywords`
*Stores extracted domain keywords, tools, frameworks, and job-specific terminology for semantic search and NLP feature extraction.*

* **Primary Key:** `id` (`UUID`)
* **Foreign Keys:**
  * `job_id` → `jobs(id)` ON DELETE CASCADE
* **Uniqueness Constraint:** `uq_job_keyword_type UNIQUE (job_id, LOWER(keyword), keyword_type)`

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT uuid_generate_v4()` | Unique keyword mapping identifier |
| `job_id` | `UUID` | `NOT NULL, REFERENCES jobs(id)` | Target job posting reference |
| `keyword` | `VARCHAR(100)`| `NOT NULL` | Extracted keyword string (e.g., `'PyTorch'`, `'Fintech'`) |
| `keyword_type` | `VARCHAR(50)` | `NOT NULL` | Category: `'DOMAIN'`, `'TOOL'`, `'FRAMEWORK'`, `'CERTIFICATION'`, `'RESPONSIBILITY'`, `'SOFT_SKILL'` |
| `weight` | `NUMERIC(3,2)`| `NOT NULL DEFAULT 1.00` | Term weight for TF-IDF / keyword similarity score |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |

---

### 3.3 Core Parent Entity: `resumes`
*Logical parent resume container representing candidate user resume profiles.*

* **Primary Key:** `id` (`UUID`)
* **Uniqueness Constraint:** `uq_user_resume_title UNIQUE (user_id, LOWER(title))`

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT uuid_generate_v4()` | Primary key of parent resume container |
| `user_id` | `UUID` | `NOT NULL` | Logical FK to Auth Identity User (`users.id`) |
| `title` | `VARCHAR(255)`| `NOT NULL DEFAULT 'Default Resume'` | Candidate-assigned title (e.g. `'Full Stack Resume'`) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Parent record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

---

### 3.4 New Entity: `resume_versions`
*Stores multi-version resume uploads, extracted raw text, structured JSON representations, and active version status.*

* **Primary Key:** `id` (`UUID`)
* **Foreign Keys:**
  * `resume_id` → `resumes(id)` ON DELETE CASCADE
* **Uniqueness Constraints:**
  * `uq_resume_version_num UNIQUE (resume_id, version_number)`
  * `uq_resume_active_version UNIQUE (resume_id) WHERE is_active = TRUE` *(PostgreSQL Partial Unique Index)*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT uuid_generate_v4()` | Unique version surrogate key |
| `resume_id` | `UUID` | `NOT NULL, REFERENCES resumes(id)` | Reference to parent resume container |
| `file_name` | `VARCHAR(255)`| `NOT NULL` | Original uploaded file name (e.g., `'john_doe_cv_v2.pdf'`) |
| `file_path` | `VARCHAR(512)`| `NOT NULL` | Storage path or object storage key (provider choice unresolved) |
| `raw_text` | `TEXT` | `NOT NULL` | Plain text content extracted from document parser |
| `parsed_json` | `JSONB` | `NOT NULL` | Structured JSON output (skills, work history, education) |
| `version_number` | `INTEGER` | `NOT NULL` | Monotonically increasing version index (1, 2, 3...) |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Flag indicating candidate's currently active resume version |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Upload timestamp |

---

### 3.5 New Entity: `ats_scores`
*Persists computed ATS match score evaluations between specific resume versions and job postings for downstream recommendations and analytics.*

* **Primary Key:** `id` (`UUID`)
* **Foreign Keys:**
  * `resume_version_id` → `resume_versions(id)` ON DELETE CASCADE
  * `job_id` → `jobs(id)` ON DELETE CASCADE
* **Uniqueness Constraint:** `uq_resume_version_job_ats UNIQUE (resume_version_id, job_id)`

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT uuid_generate_v4()` | Unique ATS result identifier |
| `resume_version_id` | `UUID` | `NOT NULL, REFERENCES resume_versions(id)`| Specific evaluated resume version reference |
| `job_id` | `UUID` | `NOT NULL, REFERENCES jobs(id)` | Evaluated target job posting reference |
| `match_score` | `NUMERIC(5,2)`| `NOT NULL` | Calculated ATS match percentage (0.00 to 100.00) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Score calculation timestamp |

---

## 4. Key Architectural & Technical Strategies

### 4.1 Resume Versioning & Active-Version Strategy
1. **Monotonic Version Numbers:** Every new upload for a candidate increments `version_number` by 1.
2. **Single Active Version Guarantee:** Managed using PostgreSQL's partial unique index:
   ```sql
   CREATE UNIQUE INDEX uq_resume_active_version ON resume_versions(resume_id) WHERE is_active = TRUE;
   ```
3. **Atomic Version Switch Routine:**
   ```sql
   -- Step 1: Deactivate existing active version
   UPDATE resume_versions SET is_active = FALSE WHERE resume_id = :resume_id AND is_active = TRUE;
   -- Step 2: Insert new version as active
   INSERT INTO resume_versions (resume_id, file_name, file_path, raw_text, parsed_json, version_number, is_active)
   VALUES (:resume_id, :file_name, :file_path, :raw_text, :parsed_json, :next_version, TRUE);
   ```

### 4.2 ATS Persistence & Relationship Strategy
* **Decoupled Evaluated Relationship:** ATS scores are stored in `ats_scores` referencing `(resume_version_id, job_id)` directly.
* **Update Mechanics (No Historical Duplicates):** Enforced by `CONSTRAINT uq_resume_version_job_ats UNIQUE (resume_version_id, job_id)`. Re-evaluating or recalculating an ATS score for an existing `(resume_version_id, job_id)` pair performs an atomic `UPDATE` on the existing `ats_scores` row (`match_score = :new_score`, `created_at = NOW()`) rather than inserting a duplicate row. Historical ATS score logging is deliberately omitted.
* **Why NOT in `resume_versions`:** A single resume version yields different ATS match scores across different job listings. Storing `match_score` directly on `resume_versions` would violate 1NF/2NF data normalization.
* **API Behavior (`GET /ats/score`):**
  1. Retrieve active `resume_version_id` for candidate.
  2. Query `ats_scores` for `(resume_version_id, job_id)`.
  3. If cached score exists, return existing persisted `match_score`.
  4. If recalculating, compute score via Intern 4 engine, execute upsert/update on `ats_scores`, and return the updated result.

### 4.3 Resume Keyword Derivation Approach (No `resume_keywords` Table)
* **Decision:** No dedicated `resume_keywords` table will be created initially.
* **Mechanism:** Keywords are derived dynamically at runtime from `parsed_json` (e.g., `parsed_json -> 'extracted_skills'`, `parsed_json -> 'keywords'`) or tokenized in-memory from `raw_text` during feature extraction.
* **Benefit:** Eliminates write amplification and redundant normalization storage while maintaining flexibility for evolving ML tokenization strategies.

### 4.4 Semantic Similarity & Embedding Input Pipeline
Vector embedding generation for jobs uses existing M2 schema fields as currently defined and stored in the M2 baseline:

```
Embedding Input Text = 
  "Title: " + job.title + 
  " | Location: " + job.location + 
  " | Required Skills: " + STRING_AGG(job_skills.skill_name WHERE is_required = TRUE) + 
  " | Experience: " + job.min_experience + " - " + job.max_experience + " years" + 
  " | Salary: " + job.currency + " " + job.min_salary + " - " + job.max_salary + 
  " (Monthly: " + job.monthly_salary + ")" + 
  " | Description: " + job.job_description
```

* **Salary & Monthly Salary Policy:** M3 uses existing M2 `salary` / `monthly_salary` semantics exactly as stored in the database. M3 will **NOT** redefine or recalculate `monthly_salary`.
* **Currency Normalization:** Currency conversion across currencies (e.g., INR vs USD) remains an unresolved team decision and is **NOT** implemented by assumption.

### 4.5 File Storage Approach
* **Storage Provider Unresolved:** The physical storage location choice (local persistent disk storage volume vs MinIO / AWS S3 object storage) remains an **UNRESOLVED team decision**. No specific provider is selected yet.
* **Database Representation:** `file_path` will store the abstract relative path or URI string once a provider is chosen by team consensus.

---

## 5. Service Boundaries & Inter-Service Contracts

### 5.1 Intern 2 Contract (Auth Gateway & Identity)
* **Identity Forwarding Headers:**
  * `X-User-Id`: Authenticated candidate UUID
  * `X-User-Role`: User role (`job_seeker` / `recruiter`)
  * `X-Gateway-Secret`: Shared secret matching downstream `GATEWAY_SHARED_SECRET`
* **Routing Table:**
  * `POST /api/v1/resume/upload` → Resume Service (`:8003`)
  * `GET /api/v1/resume/{resume_id}` → Resume Service (`:8003`)
  * `GET /api/v1/resume/{resume_id}/ats-score` → Matching Engine / Resume Service (`:8003` / `:8004`)
  * `GET /api/v1/recommendations` → Matching Engine (`:8004`)

### 5.2 Intern 4 Contract (Matching Engine & Recommendation AI)
* **ATS Evaluation Interface:**
  * Request: `GET /api/v1/resume/{resume_id}/ats-score?job_id={job_id}`
  * Payload / Response:
    ```json
    {
      "ats_score_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "resume_version_id": "c39a282f-8a49-411a-8c88-51307b22d10a",
      "job_id": "7a8b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      "match_score": 87.50,
      "created_at": "2026-09-23T19:51:47Z"
    }
    ```
* **Recommendations Interface:**
  * Request: `GET /api/v1/recommendations?user_id={user_id}`
  * Logic: Combines active `resume_version`, user preference vectors, `swipes` exclusions, and persisted `ats_scores` to rank recommended jobs.

---

## 6. Comprehensive Indexing & Constraint Matrix

| Table Name | Constraint / Index Name | Type | Target Column(s) | Operational Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `job_skills` | `pk_job_skills` | `PRIMARY KEY` | `(job_id, skill_id)` | Enforces unique skill assignment per job |
| `job_skills` | `idx_job_skills_skill_id` | `B-TREE` | `skill_id` | Fast reverse lookup of jobs by skill |
| `job_skills` | `idx_job_skills_required` | `B-TREE` | `(job_id, is_required)` | Fast filtering of mandatory vs optional skills |
| `job_keywords`| `pk_job_keywords` | `PRIMARY KEY` | `id` | Unique keyword surrogate ID |
| `job_keywords`| `uq_job_keyword_type` | `UNIQUE` | `(job_id, LOWER(keyword), keyword_type)` | Prevents duplicate keywords per category |
| `job_keywords`| `idx_job_keywords_job_id` | `B-TREE` | `job_id` | Fast fetching of keywords for job embedding |
| `resumes` | `pk_resumes` | `PRIMARY KEY` | `id` | Parent resume ID |
| `resumes` | `uq_user_resume_title` | `UNIQUE` | `(user_id, LOWER(title))` | Unique resume container title per user |
| `resume_versions`| `pk_resume_versions` | `PRIMARY KEY` | `id` | Version surrogate key |
| `resume_versions`| `uq_resume_version_num` | `UNIQUE` | `(resume_id, version_number)`| Prevents duplicate version numbers |
| `resume_versions`| `uq_resume_active_version`| `PARTIAL UNIQUE`| `(resume_id) WHERE is_active = TRUE` | Guarantees exactly one active version per resume |
| `resume_versions`| `idx_resume_versions_active`| `B-TREE` | `(resume_id, is_active)` | Fast lookup of active resume version |
| `ats_scores` | `pk_ats_scores` | `PRIMARY KEY` | `id` | Unique ATS evaluation ID |
| `ats_scores` | `uq_resume_version_job_ats`| `UNIQUE` | `(resume_version_id, job_id)` | Prevents duplicate ATS evaluation entries |
| `ats_scores` | `idx_ats_scores_lookup` | `B-TREE` | `(resume_version_id, job_id)` | Instant cached score retrieval |

---

## 7. Open Architectural Flags Requiring Team Approval

The following items are explicitly flagged for team alignment prior to database migration authoring:

1. **Parent `resumes` Container Table Ownership**: Confirm whether the parent `resumes` container table is owned by the Auth/Identity domain (`backend_mansi`) or the Resume & Data Intelligence domain (`data_hanith` / `aiml_hemalatha`).
2. **Currency Normalization & Conversion Rules**: Currency conversion across currencies (e.g., converting USD vs INR) remains an unresolved team decision and must NOT be implemented by assumption.
3. **Storage Provider Selection**: Selection between local persistent disk storage volume vs MinIO / AWS S3 object storage remains an unresolved team decision; no provider has been selected.
4. **ATS Score Engine Versioning (`generated_by`)**: Confirm whether an optional `generated_by` column (e.g. `'heuristic-v0'` vs `'ml-v1'`) should be persisted in `ats_scores` to support A/B testing of recommendation algorithms.
