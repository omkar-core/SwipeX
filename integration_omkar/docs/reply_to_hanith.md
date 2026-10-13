# Reply to Hanith (Data Intelligence Lead)
**Date:** October 13, 2026
**From:** Omkar (Platform, Testing & Deployment — Intern 5)

---

Hey Hanith,

Thanks a lot for the thorough audit! Your findings are spot-on. Here is the exact status and clarification:

### 1. Where the Code Lives
The deployment code lives in my personal production repo **https://github.com/omkar-core/SwipeX.git** on branch **main** (commit 69d1935).
In the team repo (springboardmentor54321v), main is an old upload (a686154) with no deployment files, and team/Team-4 (5b678d0) does not yet have the latest M4 commits because our team policy reserves team-repo pushes for mentor review approval.

### 2. Status of Your Findings (H1–H5)
* **H1 (entrypoint_render.py):** [VERIFIED] It exists in omkar-core/SwipeX (main @ 69d1935).
* **H2 (Dataset & M4):** [CONFIRMED] seed_all.py only creates 5 curated jobs. The deployment flow calls data_hanith/scripts/apply_m4_migration.py to create the 8 M4 tables, but the raw 97k dataset (indian-job-market-dataset-2025.xlsx) is missing from the repo (DEF-045).
* **H3 (RUN_MIGRATION & advisory lock):** [VERIFIED] Implemented in entrypoint_render.py and migrate_and_seed.py using pg_advisory_lock(849204).
* **H4 (Separate vs. Shared DB):** [DECISION NEEDED] Render Free Tier provides exactly one PostgreSQL instance per workspace. We propose running both services on one shared database (DATABASE_URL).
* **H5 (JOB_DATABASE_URL & REDIS_URL):** [CONFIRMED & FIXED] You are 100% correct. data_hanith reads DATABASE_URL (not JOB_DATABASE_URL) and REDIS_HOST/REDIS_PORT (ignoring REDIS_URL). I am removing the unused Render Redis service and JOB_DATABASE_URL wiring.

### 3. Decisions & Next Steps
1. **Infrastructure:** I own the Render deployment account; I will provision the database. You do not need to create anything or run manual SQL scripts.
2. **Migration Ownership:** Gateway service acts as the sole migrator (RUN_MIGRATION=true with advisory lock); Job service has migrations disabled to prevent race conditions.
3. **Dataset Plan:** We will run with the 5 curated baseline jobs unless you would like to commit a trimmed CSV (< 2 MB) or provide a hosted download URL.
