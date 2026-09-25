# SwipeX Milestone 3 Day 7 — Final Validation, Implementation Inventory & M4 Handoff

**Service**: Job & Data Intelligence Service (`data_hanith`)  
**Author**: Data & Backend Engineering (Intern 3)  
**Target Consumers**: Intern 4 (Matching Engine / AI-ML), Team Lead, Backend Engineers  
**Date**: September 25, 2026  
**Status**: COMPLETED, VERIFIED & COMMIT-READY  

---

## A. M3 Objective

The primary objective of **Milestone 3 (Intern 3)** was to establish the complete data access, resume storage, job skill/keyword enrichment, transactional integrity, and query foundation required for Intern 4's AI-Powered Job Matching & Recommendation Engine.

---

## B. Day 1 through Day 7 Implementation Summary

- **Day 1 (Schema Design)**: Designed dual-engine (PostgreSQL 14+ & SQLite) schema extensions for `resumes`, `resume_versions`, `job_skills` metadata, `job_keywords`, and `ats_scores`.
- **Day 2 (Resume Schema & Storage)**: Implemented parent resume containers, multi-versioning, partial unique index active version rules (`uq_resume_active_version`), ATS score range checks, and local file storage persistence in `ResumeStorage`.
- **Day 3 (Job Skill & Keyword Enrichment)**: Implemented backfill script (`backfill_m3_job_data.py`) populating **755,099** enriched `job_skills` and **156,908** regex-derived `job_keywords` across 6 categories.
- **Day 4 (Resume/Job Query Foundation)**: Developed repository methods (`get_active_resume_version_by_user`, `map_resume_skills_detailed`, `compare_resume_and_job_skills`, `get_job_matching_features`). Updated Intern 4 Data Contract.
- **Day 5 (Integration & Backup/Restore)**: Created `test_m3_day5_integration_integrity.py` and `validate_day5_backup_restore.py` verifying transaction rollback, 0 orphan records, and isolated database backup/restore safety.
- **Day 6 (Query Optimization & Edge Cases)**: Performed `EXPLAIN QUERY PLAN` audit and sub-millisecond benchmarking (Avg `0.258 ms`). Hardened edge-case handling (cross-resume activation, null salaries, 45KB+ descriptions). Created 9 new test cases.
- **Day 7 (Final Validation & M4 Handoff)**: Completed final regression (**40/40 tests passed**), live database integrity check, Data Dictionary documentation, known limitations audit, and M4 handoff specification.

---

## C. Files Created During M3

1. `data_hanith/db/migrations/003_m3_schema_extension.sql`
2. `data_hanith/storage/resume_storage.py`
3. `data_hanith/scripts/apply_m3_migration.py`
4. `data_hanith/scripts/backfill_m3_job_data.py`
5. `data_hanith/scripts/validate_day5_backup_restore.py`
6. `data_hanith/docs/m3_day1_schema_design.md`
7. `data_hanith/docs/m3_intern4_data_contract.md`
8. `data_hanith/docs/m3_day5_backup_restore.md`
9. `data_hanith/docs/m3_day6_query_optimization.md`
10. `data_hanith/docs/m3_data_dictionary.md`
11. `data_hanith/docs/m3_day7_final_validation.md`
12. `tests/test_m3_day2_schema_and_storage.py`
13. `tests/test_m3_day3_job_enrichment.py`
14. `tests/test_m3_day4_resume_job_queries.py`
15. `tests/test_m3_day5_integration_integrity.py`
16. `tests/test_m3_day6_repository_query_optimization.py`

---

## D. Files Modified During M3

1. `data_hanith/db/repositories/resume_repository.py` (Added versioning, ATS upsert, canonical skill mapping, and skill comparison methods).
2. `data_hanith/db/repositories/job_repository.py` (Added `get_job_required_skills`, `get_job_keywords_by_type`, and `get_job_matching_features`).

---

## E. Database Schema Changes

Introduced 4 new schema objects and extended 1 existing table:
- **`resumes`**: Parent resume container with user ownership.
- **`resume_versions`**: Multi-version table storing raw text, `parsed_json`, version numbers, and `is_active` state. Enforces single active version via `uq_resume_active_version`.
- **`job_skills` (Extended)**: Added `is_required` (BOOL default TRUE), `weight` (NUMERIC 1.00), and `min_years` (NULL).
- **`job_keywords`**: Extracted taxonomy table storing `(job_id, keyword, keyword_type, weight)`.
- **`ats_scores`**: Persistence table for calculated match scores, constrained to $[0.00, 100.00]$ with unique pair index `(resume_version_id, job_id)`.

---

## F. Data Enrichment / Backfill Results

Executed against the production-scale dataset:
- **Jobs**: `97,929` (100% preserved)
- **Companies**: `18,328` (100% preserved)
- **Skills**: `44,078` (100% preserved)
- **Job_Skills**: `755,099` (100% mapped)
- **Job_Keywords**: `156,908` (Extracted across 6 taxonomy types: `DOMAIN`: 29,865; `TOOL`: 69,796; `FRAMEWORK`: 18,354; `CERTIFICATION`: 1,940; `RESPONSIBILITY`: 20,446; `SOFT_SKILL`: 16,507).
- **Resumes**: `23` (Clean baseline restored)
- **Resume_Versions**: `30` (Clean baseline restored)
- **ATS_Scores**: `6` (Clean baseline restored)
- **Swipes**: `311` (100% preserved)
- **Saved_Jobs**: `0` (100% preserved)
- **Orphan Records**: `0` across all foreign key relationships.

---

## G. Repository / Query Layer

Provides thread-safe parameter-bound SQL methods supporting both PostgreSQL 14+ and SQLite:
- `ResumeRepository`: Implements atomic version deactivation, monotonic version numbering, JSON parsing, and detailed canonical skill overlap matching.
- `JobRepository`: Implements multi-field job feature aggregation, salary formatting, monthly salary calculation, and search filtering.

---

## H. Resume Storage Persistence

`ResumeStorage` class handles filesystem persistence for uploaded resume documents:
- **Directory Structure**: `uploads/resumes/{user_id}/{version_id}/{file_name}`
- **Lifecycle Methods**: `save_resume_file()`, `get_resume_file()`, `exists_resume_file()`, `delete_resume_file()`.
- **Validation**: Verified binary content equality, path structure, and clean deletion lifecycle.

---

## I. Backup / Restore Validation

Created `validate_day5_backup_restore.py` supporting:
- **PostgreSQL**: `pg_dump` and `pg_restore` targeting isolated database `swipex_job_db_test_restore`.
- **SQLite**: Atomic database file copying targeting isolated temporary file `swipex_job_backup_test.db`.
- **Safety Guardrail**: Raises `ValueError` if backup or restore attempts target the live production database name. Verified count preservation across all 10 tables.

---

## J. Test Coverage & Results

Ran complete M3 test suite:
```bash
python -m pytest tests/test_m3_day2_schema_and_storage.py \
                tests/test_m3_day3_job_enrichment.py \
                tests/test_m3_day4_resume_job_queries.py \
                tests/test_m3_day5_integration_integrity.py \
                tests/test_m3_day6_repository_query_optimization.py -v
```
- **Total Tests**: `40`
- **Passed**: `40`
- **Failed**: `0`
- **Warnings**: `0`
- **Execution Time**: `4.79s` (Pytest fast mode) / `192.87s` (Full database scan mode)

---

## K. Query Optimization Findings

Analyzed execution plans via `EXPLAIN QUERY PLAN`:
- **0 Redundant Indexes**: All queries execute direct index seeks ($O(1)$ or $O(\log N)$).
- **Matching Feature Latency**: Average `0.258 ms` per job lookup (Max: `0.671 ms`).
- **Skill Mapping Latency**: `0.306 ms` for 20 skills against 44,078 canonical skills.

---

## L. Intern 4 Contract Verification

Confirmed $100\%$ alignment between `m3_intern4_data_contract.md` and repository implementations:
- `get_job_matching_features(job_id)` returns stable payload with 13 fields.
- `compare_resume_and_job_skills(resume_version_id, job_id)` returns stable skill overlap payload with 8 fields.

---

## M. Known Limitations

1. **Heuristic Keyword Extraction**: Keywords in `job_keywords` are extracted via predefined regex taxonomy and word-boundary rules, not ML-based entity extraction.
2. **`job_skills` Default Semantics**: `is_required = TRUE` and `weight = 1.00` are M3 default values for Dataset 1 mapped skills, not source-specified values.
3. **Local File Storage**: Resume storage uses local disk (`uploads/resumes/`), not cloud object storage (S3/MinIO).
4. **No Historical ATS Scores**: The `ats_scores` table maintains only the current score per `(resume_version_id, job_id)`. Re-scoring overwrites previous scores without historical logging.
5. **No AI/ML Components**: Intern 3 implements data access and feature preparation only. Vector embeddings, ATS scoring models, and recommendation algorithms belong to Intern 4 / M4.

---

## N. M4 Handoff for Intern 4 / AI-ML

### 1. Ready-to-Consume Data Entrypoints
Intern 4 can consume the following repository methods directly:
- `JobRepository.get_job_matching_features(job_id)`: Fetches complete job features and pre-formatted `embedding_input_text`.
- `ResumeRepository.get_active_resume_version_by_user(user_id, resume_id)`: Fetches candidate active resume version and `parsed_json["skills"]`.
- `ResumeRepository.map_resume_skills_detailed(parsed_json)`: Maps extracted resume skills to canonical database skill IDs.
- `ResumeRepository.compare_resume_and_job_skills(resume_version_id, job_id, job_repo)`: Generates deterministic skill overlap percentages.
- `ResumeRepository.upsert_ats_score(resume_version_id, job_id, score)`: Persists final calculated ATS match scores $[0.00, 100.00]$.

### 2. Anti-Assumptions for Intern 4
Intern 4 ML engineers MUST NOT assume:
1. **Do NOT assume `is_required = TRUE` implies source truth**: It is an M3 default fallback value.
2. **Do NOT treat `weight = 1.00` as learned importance**: It is a neutral default weighting.
3. **Do NOT assume `min_years` is always present**: `min_years` defaults to `NULL`.
4. **Do NOT expect pre-generated vector embeddings**: Intern 3 provides text input (`embedding_input_text`), but vector generation belongs to Intern 4.
5. **Do NOT introduce a separate `resume_skills` table**: Candidate resume skills reside inside `resume_versions.parsed_json["skills"]`.
