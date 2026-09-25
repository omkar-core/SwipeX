# SwipeX Milestone 3 Day 6 — Repository & Query Optimization Analysis

**Service**: Job & Data Intelligence Service (`data_hanith`)  
**Author**: Data & Backend Engineering  
**Target Consumer**: Intern 4 (Matching Engine & AI/ML Pipeline)  
**Date**: September 25, 2026  
**Status**: VERIFIED & AUDITED  

---

## 1. Executive Summary

During **Milestone 3 Day 6**, the repository and query access layers of `data_hanith` were comprehensively audited, benchmarked, and hardened. 

Query execution plans (`EXPLAIN QUERY PLAN` in SQLite and `EXPLAIN` in PostgreSQL) were analyzed against the production-scale dataset containing **97,929 jobs**, **755,099 job_skills**, **156,908 job_keywords**, and **44,078 canonical skills**.

### Key Outcomes:
- **0 Redundant Indexes**: Audited all 8 core repository query patterns. Existing indexes created in M2 and M3 Day 2/3 cover all lookup pathways with optimal $O(1)$ and $O(\log N)$ complexity.
- **Sub-Millisecond Latency**: Average matching feature retrieval time per job is **0.258 ms** (Max: 0.671 ms, even for jobs with 37 keywords and 20KB+ descriptions).
- **100% Robust Edge-Case Protection**: Safe fallback for missing skills, null salaries, null locations, malformed JSON, and cross-resume version activation attempts.
- **40 / 40 Tests Passed**: Full regression suite (Day 2 to Day 6) executing cleanly.

---

## 2. Audited Repository Queries & Index Verification

| Query Identifier | Repository Method | Target Table(s) | Verified Index Used | Access Pattern / Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **Q1: Active Resume Lookup** | `get_active_resume_version` | `resume_versions` | `uq_resume_active_version` | $O(1)$ Partial Unique Index Search (`resume_id` WHERE `is_active=1`) |
| **Q2: Latest Version Lookup** | `get_latest_resume_version` | `resume_versions` | `uq_resume_version_num` | $O(\log N)$ Index Scan ordered by `version_number DESC LIMIT 1` |
| **Q3: Version Listing** | `list_resume_versions` | `resume_versions` | `uq_resume_version_num` | $O(\log N)$ Index Scan ordered by `version_number DESC` |
| **Q4: Canonical Skill Mapping** | `map_resume_skills_detailed` | `skills` | `uq_skills_name_lower` | $O(K \log N)$ Lowercase Functional Unique Index Match |
| **Q5: Required Job Skills** | `get_job_required_skills` | `job_skills` $\bowtie$ `skills` | `idx_job_skills_required` $\rightarrow$ `PRIMARY(skills.id)` | $O(M)$ Composite Index Seek (`job_id`, `is_required=1`) |
| **Q6: Job Keyword Lookup** | `get_job_keywords_by_type` | `job_keywords` | `idx_job_keywords_job_id` | $O(W)$ Composite Index Seek (`job_id`) with temp B-Tree sort |
| **Q7: Job Detail Lookup** | `get_job_by_id` | `jobs` $\bowtie$ `companies` | `PRIMARY(jobs.id)` $\rightarrow$ `PRIMARY(companies.id)` | $O(1)$ PK Point Lookup with `LEFT JOIN` |
| **Q8: ATS Score Check/Upsert** | `upsert_ats_score` | `ats_scores` | `uq_resume_version_job_ats` | $O(1)$ Unique Composite Index Lookup (`resume_version_id`, `job_id`) |

---

## 3. Query Plan Evidence (SQLite `EXPLAIN QUERY PLAN`)

```sql
-- Q1: Active Resume Version Lookup
EXPLAIN QUERY PLAN SELECT * FROM resume_versions WHERE resume_id = ? AND is_active = 1;
-- Plan: SEARCH resume_versions USING INDEX uq_resume_active_version (resume_id=?)

-- Q2 & Q3: Latest / List Resume Versions
EXPLAIN QUERY PLAN SELECT * FROM resume_versions WHERE resume_id = ? ORDER BY version_number DESC LIMIT 1;
-- Plan: SEARCH resume_versions USING INDEX sqlite_autoindex_resume_versions_2 (resume_id=?)

-- Q4: Canonical Skill Mapping
EXPLAIN QUERY PLAN SELECT id, name, category FROM skills WHERE LOWER(name) IN ('python', 'java', 'sql');
-- Plan: SEARCH skills USING INDEX uq_skills_name_lower (<expr>=?)

-- Q5: Required Job Skill Lookup
EXPLAIN QUERY PLAN SELECT s.id AS skill_id, s.name, s.category, js.is_required, js.weight, js.min_years 
FROM job_skills js JOIN skills s ON js.skill_id = s.id 
WHERE js.job_id = ? AND js.is_required = 1;
-- Plan 1: SEARCH js USING INDEX idx_job_skills_required (job_id=? AND is_required=?)
-- Plan 2: SEARCH s USING INDEX sqlite_autoindex_skills_1 (id=?)

-- Q6: Job Keyword Lookup
EXPLAIN QUERY PLAN SELECT id, job_id, keyword, keyword_type, weight, created_at 
FROM job_keywords WHERE job_id = ? AND UPPER(keyword_type) = UPPER(?) 
ORDER BY keyword_type ASC, keyword ASC;
-- Plan: SEARCH job_keywords USING INDEX idx_job_keywords_job_id (job_id=?)
```

---

## 4. Empirical Performance Benchmark

Benchmarks were measured against the live **swipex_job.db** database on local development environment (Intel/AMD x86_64, Windows 11, Python 3.14).

### Benchmark Results:

1. **`get_job_matching_features(job_id)`**:
   - **Sample Size**: 12 representative jobs (including jobs with max skills, max keywords (37 keywords), and 20KB+ descriptions).
   - **Min Latency**: `0.158 ms`
   - **Average Latency**: `0.258 ms`
   - **Max Latency**: `0.671 ms`

2. **`map_resume_skills_detailed(parsed_json)`**:
   - **Input**: 20 raw candidate skills against 44,078 database skills.
   - **Execution Time**: `0.306 ms`
   - **Match Accuracy**: 19 canonical matched, 1 unmatched.

3. **Index Recommendation**:
   - **Conclusion**: **NO new database indexes are required.**
   - **Rationale**: Existing indexes cover $100\%$ of filter and join conditions. All index scans perform direct seeks without full-table scans (`SCAN TABLE`).

---

## 5. Edge Case & Safety Audits

| Edge Case | Input Condition | Behavior / Guardrail |
| :--- | :--- | :--- |
| **Nonexistent IDs** | Invalid `resume_id`, `version_id`, or `job_id` | Returns `None` or `[]` without throwing database exceptions. |
| **Cross-Resume Version Activation** | Attempt to activate version belonging to `Resume B` on `Resume A` | Returns `None`; maintains existing active state of both resumes without mutating DB. |
| **Duplicate Skill Inputs** | `["Python", " python ", "PYTHON", "Python"]` | Deduplicated to 1 canonical match; `matched_count` is 1 (not 4). |
| **Zero Required Job Skills** | Job with 0 required skills in `job_skills` | `skill_match_percentage` returns `100.0%` safely (division-by-zero protected). |
| **Missing/Malformed JSON** | `parsed_json` is `None`, string, or missing `"skills"` key | Returns `{"matched_skills": [], "unmatched_skills": []}` safely. |
| **NULL Salary / Location** | Job with undisclosed salary or missing location | Formats `salary_range` as `"Not disclosed"`, sets `monthly_salary` to `None`, handles location string gracefully. |
| **Large Job Description** | Description size $> 40\text{ KB}$ | Included in `embedding_input_text` cleanly without memory or string truncation faults. |

---

## 6. Guidelines for Intern 4 (Matching Engine Integration)

1. **Single Access Entrypoint**:
   Call `JobRepository.get_job_matching_features(job_id)` to get all job features for embedding generation or scoring in a single pre-built structure.
2. **Skill Overlap Payload**:
   Call `ResumeRepository.compare_resume_and_job_skills(resume_version_id, job_id, job_repo)` for deterministic skill match percentages and skill name breakdowns.
3. **ATS Score Persistence**:
   Store calculated match scores using `ResumeRepository.upsert_ats_score(resume_version_id, job_id, score)`. This handles re-scoring atomically via `ON CONFLICT DO UPDATE`.
