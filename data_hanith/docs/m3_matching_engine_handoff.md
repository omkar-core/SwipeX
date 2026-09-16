# Milestone 3 — Matching Engine & Recommendation System Handoff Contract

**Domain Provider:** Job & Data Intelligence (Intern 3)
**Domain Consumer:** Matching Engine / Recommendation & AI-ML Systems (Intern 4)
**Target Milestone:** Milestone 3 (Matching Engine & Recommendation Integration)
**Status:** APPROVED FOR HANDOFF

---

## 1. Domain Ownership & Architectural Boundary

To prevent architectural coupling and maintain clean separation of concerns across the SwipeX platform:

### 1.1 Ownership Matrix
- **Intern 3 (Job & Data Intelligence)**:
  - Owns job catalog, company profile, skill mapping, swipe history, and saved job data storage.
  - Owns database integrity, schema migrations, and relational constraints.
  - Owns data ingestion pipelines, canonical models, and baseline data access services/repositories.
- **Intern 4 (Matching Engine / AI-ML)**:
  - Owns recommendation algorithms, vector embeddings, ATS skill match scoring, candidate ranking, and ML model inference.
  - Owns candidate preference modeling and matching score computation.

### 1.2 Integration Contract & Data Access Guidelines
- **Preferred Integration**: Inter-service communication via agreed repository/service Python interfaces or public/internal HTTP API data contracts (`GET /api/v1/jobs`, `GET /api/v1/companies`, `GET /api/v1/swipes/history`).
- **Direct PostgreSQL Access**: Technically supported for high-throughput batch feature extraction or vector candidate generation during controlled development/batch processing, subject to explicit team architecture consensus. Direct database modifications by Intern 4 are strictly prohibited.

---

## 2. Consumable Data Dictionary & Feature Inventory

### 2.1 Job Listing Features (`jobs` Table & Job API)
- **`job_id`** (`UUID` / `str`): Unique surrogate identifier for job posting. Guaranteed non-null.
- **`title`** (`str`): Job title text.
- **`job_description`** (`str`): Full text job description (suitable for NLP keyword extraction, TF-IDF parsing, or embedding generation).
- **`company_id`** (`UUID` / `str`): Foreign key referencing `companies.id`.
- **`location`** (`str`): Geographic location string (e.g. `'Bengaluru'`, `'San Francisco'`).
- **`work_mode`** (`str` or `NULL`): `'REMOTE'`, `'HYBRID'`, or `'ONSITE'`. (*Note: NULL across Dataset 1*).
- **`job_type`** (`str` or `NULL`): `'FULL_TIME'`, `'PART_TIME'`, `'CONTRACT'`. (*Note: NULL across Dataset 1*).
- **`min_salary` / `max_salary`** (`float` or `NULL`): Salary bounds in source currency. (*Note: 64,700 jobs have undisclosed salaries represented as NULL*).
- **`currency`** (`str`): `'INR'` (97,800 jobs) or `'USD'` (129 jobs).
- **`min_experience` / `max_experience`** (`float` or `NULL`): Years of experience required bounds.
- **`skills`** (`List[str]`): Array of normalized skill strings parsed from `job_skills`.
- **`applicant_count`** (`int`): Calculated applicant density count (>= 0).
- **`competition_level`** (`str`): `'LOW'`, `'MEDIUM'`, or `'HIGH'` (Implementation heuristic derived from `applicant_count`).
- **`freshness_level`** (`str`): `'FRESH'`, `'RECENT'`, `'AGING'`, or `'STALE'` (Implementation heuristic derived from `posted_at_approx` age).

### 2.2 Skill Mapping Graph (`skills` & `job_skills` Tables)
- **`skills`**: `id` (`UUID`), `name` (`str`, case-insensitive unique lower).
- **Relational Capacity**: `97,929` jobs mapped to `44,078` unique skills via `755,099` relational mappings.

### 2.3 User Swipe Action Signals (`swipes` Table)
- **`user_id`** (`UUID` / `str`): Authenticated Job Seeker user identity.
- **`job_id`** (`UUID` / `str`): Target job posting ID.
- **`direction`** (`str`): `'RIGHT'` (Positive engagement signal / interest) vs `'LEFT'` (Negative signal / pass).
- **`swiped_at`** (`TIMESTAMPTZ`): Timestamp of user swipe interaction.
- **Constraint**: `UNIQUE (user_id, job_id)` prevents duplicate swipe signals per user-job pair.

### 2.4 Company Profile Features (`companies` Table)
- **`company_id`** (`UUID` / `str`): Primary key.
- **`name`** (`str`): Company name.
- **`about`** (`str` or `NULL`): Company description.
- **`size`** (`str` or `NULL`): Employee size bracket (e.g. `'51-200'`).
- **`industry`** (`str` or `NULL`): Primary industry vertical.
- **`is_newly_founded`** (`bool`): Startup flag.
- **`active_job_count`** (`int`): Aggregate count of active job listings.

---

## 3. Recommended M3 Candidate Matching Signals

For M3 implementation, Intern 4 may combine the following signals provided by Intern 3:

1. **Skill Overlap Score**: Intersection size or Jaccard similarity between candidate user profile skills and `job.skills`.
2. **Experience Compatibility**: Candidate experience years evaluated against `min_experience` and `max_experience`.
3. **Swipe Preference History**: Positive feature vector boost from candidate's past `RIGHT`-swiped job titles/skills, and negative filtering from `LEFT`-swiped job properties.
4. **Feed Exclusion**: Previously swiped job IDs (`swipes` table / Redis cache) must be excluded from active recommendation feeds.
5. **Competition Level Adjustment**: Weighting job recommendations by `competition_level` (`LOW` competition = higher candidate application success probability).

---

## 4. Operational & Contract Summary

1. Intern 3 guarantees data integrity, schema consistency, and query response latencies <500 ms across all baseline endpoints.
2. Intern 4 consumes these interfaces without duplicating ingestion logic or re-defining database schema migrations.
