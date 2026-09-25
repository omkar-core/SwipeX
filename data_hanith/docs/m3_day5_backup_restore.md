# SwipeX Milestone 3 — Day 5 Backup & Restore Specification & Operational Guide

**Domain:** Job & Data Intelligence (Intern 3)  
**Target Milestone:** Milestone 3 (Day 5 Integration, Data Integrity & Backup/Restore Validation)  
**Status:** VALIDATED PRODUCTION-READY SPECIFICATION  

---

## 1. Overview & Operational Scope

This document specifies the backup and restore procedures, automated validation scripts, safety guardrails, and verification metrics for the SwipeX Job & Data Intelligence Service.

The backup and restore system supports both **PostgreSQL 14+** (production/docker environment) and **SQLite** (local development/unit-testing environment).

---

## 2. Command Usage & Tooling

### 2.1 Executing Automated Backup & Restore Validation

To run the end-to-end backup, restore, and integrity verification workflow:

```bash
python data_hanith/scripts/validate_day5_backup_restore.py
```

### 2.2 Executing PostgreSQL Standalone Backup

```bash
python data_hanith/scripts/backup_postgres.py
```

---

## 3. Backup Locations & Artifact Naming

* **Default Backup Directory**: `data_hanith/data/backups/`
* **PostgreSQL Dump Format**: Custom compressed binary format (`pg_dump -F c`)
* **Naming Pattern**:
  * PostgreSQL: `swipex_job_db_YYYYMMDD_HHMMSS.dump`
  * SQLite: `swipex_job_YYYYMMDD_HHMMSS.db`

---

## 4. Safety Restrictions & Isolation Guardrails

1. **Non-Destructive Execution**: The live database (`swipex_job_db` / `swipex_job.db`) is **NEVER** overwritten, truncated, or dropped during backup or restore operations.
2. **Isolated Test Target**: Restore operations strictly target an isolated temporary database (`swipex_job_db_test_restore` or `swipex_job_test_restore_TIMESTAMP.db`).
3. **Hardcoded Guardrail Check**: The validation script checks if the restore target database equals the live database name and throws a fatal exception before attempting any restore command if a mismatch is detected:
   ```python
   if target_db == LIVE_DB_NAME:
       raise ValueError("SAFETY GUARDRAIL: Refusing to execute restore on live database!")
   ```
4. **Automatic Test Database Cleanup**: After verifying row counts, schema objects, indexes, and foreign key integrity, the temporary test database is dropped/removed immediately.

---

## 5. Verified Data Integrity Metrics

The backup and restore process was executed and verified against the live dataset with **100% data preservation**:

| Table Name | Live Row Count | Restored Target Count | Integrity Status |
| :--- | :--- | :--- | :--- |
| **`jobs`** | 97,929 | **97,929** | 100% Match |
| **`companies`** | 18,328 | **18,328** | 100% Match |
| **`skills`** | 44,078 | **44,078** | 100% Match |
| **`job_skills`** | 755,099 | **755,099** | 100% Match |
| **`job_keywords`** | 156,908 | **156,908** | 100% Match |
| **`resumes`** | 23 | **23** | 100% Match |
| **`resume_versions`** | 30 | **30** | 100% Match |
| **`ats_scores`** | 6 | **6** | 100% Match |
| **`swipes`** | 311 | **311** | 100% Match |
| **`saved_jobs`** | 0 | **0** | 100% Match |

### Foreign-Key & Schema Verification Results
* **Foreign Key Check (`PRAGMA foreign_key_check` / SQL Joins)**: 0 orphan records across all tables.
* **Indexes & Constraints**: Verified intact (`uq_job_keyword_type`, `uq_resume_active_version`, `uq_resume_version_num`, `uq_resume_version_job_ats`, `idx_job_skills_required`, `idx_job_keywords_job_id`).
* **Cleanup Verification**: Temporary test restore database successfully dropped after verification. Live database remained untouched.
