"""
Idempotent, non-destructive migration script for SwipeX Milestone 3 schema extensions.
Applies parent resumes, resume_versions, job_skills extensions, job_keywords, and ats_scores tables
without dropping or re-creating existing M2 tables.
Compatible with both PostgreSQL and SQLite.
"""
import os
import sys

# Ensure data_hanith is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import DATABASE_URL
from db.connection import get_raw_connection, get_db_type


def apply_m3_migration(db_url: str = DATABASE_URL):
    print(f"=== Starting Milestone 3 Database Migration ===")
    print(f"Database Target: {db_url}")

    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()

    # Record counts BEFORE migration
    cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_before = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM companies;")
    companies_before = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM skills;")
    skills_before = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_skills;")
    job_skills_before = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM swipes;")
    swipes_before = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM saved_jobs;")
    saved_jobs_before = cur.fetchone()[0]

    print(f"\n[Before Migration] Record Counts:")
    print(f"  - Jobs: {jobs_before}")
    print(f"  - Companies: {companies_before}")
    print(f"  - Skills: {skills_before}")
    print(f"  - Job_Skills: {job_skills_before}")
    print(f"  - Swipes: {swipes_before}")
    print(f"  - Saved_Jobs: {saved_jobs_before}")

    if db_type == "postgres":
        print("\n[Migrating PostgreSQL Database]...")
        migration_sql_path = os.path.join(BASE_DIR, "db", "migrations", "003_m3_schema_extension.sql")
        with open(migration_sql_path, "r", encoding="utf-8") as f:
            sql_script = f.read()
        cur.execute(sql_script)
        conn.commit()
    else:
        print("\n[Migrating SQLite Database]...")
        # 1. Resumes table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS resumes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT 'Default Resume',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_resume_title ON resumes(user_id, title);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);")

        # 2. Resume_versions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS resume_versions (
                id TEXT PRIMARY KEY,
                resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                parsed_json TEXT NOT NULL,
                version_number INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                UNIQUE(resume_id, version_number)
            );
        """)
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_resume_active_version ON resume_versions(resume_id) WHERE is_active = 1;")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id);")

        # 3. Job_skills extensions
        cur.execute("PRAGMA table_info(job_skills);")
        js_cols = [row[1] for row in cur.fetchall()]
        if "is_required" not in js_cols:
            cur.execute("ALTER TABLE job_skills ADD COLUMN is_required INTEGER NOT NULL DEFAULT 1;")
        if "weight" not in js_cols:
            cur.execute("ALTER TABLE job_skills ADD COLUMN weight REAL NOT NULL DEFAULT 1.00;")
        if "min_years" not in js_cols:
            cur.execute("ALTER TABLE job_skills ADD COLUMN min_years REAL NULL;")

        cur.execute("CREATE INDEX IF NOT EXISTS idx_job_skills_required ON job_skills(job_id, is_required);")

        # 4. Job_keywords table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_keywords (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                keyword TEXT NOT NULL,
                keyword_type TEXT NOT NULL,
                weight REAL NOT NULL DEFAULT 1.00,
                created_at TEXT NOT NULL
            );
        """)
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_job_keyword_type ON job_keywords(job_id, LOWER(keyword), keyword_type);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_job_keywords_job_id ON job_keywords(job_id);")

        # 5. Ats_scores table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS ats_scores (
                id TEXT PRIMARY KEY,
                resume_version_id TEXT NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                match_score REAL NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(resume_version_id, job_id),
                CHECK(match_score >= 0.00 AND match_score <= 100.00)
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_ats_scores_resume_version ON ats_scores(resume_version_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_ats_scores_job_id ON ats_scores(job_id);")
        conn.commit()

    # Record counts AFTER migration
    cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM companies;")
    companies_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM skills;")
    skills_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_skills;")
    job_skills_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM swipes;")
    swipes_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM saved_jobs;")
    saved_jobs_after = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM resumes;")
    resumes_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM resume_versions;")
    resume_versions_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_keywords;")
    job_keywords_after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM ats_scores;")
    ats_scores_after = cur.fetchone()[0]

    cur.close()
    conn.close()

    print(f"\n[After Migration] Record Counts:")
    print(f"  - Jobs: {jobs_after} (Diff: {jobs_after - jobs_before})")
    print(f"  - Companies: {companies_after} (Diff: {companies_after - companies_before})")
    print(f"  - Skills: {skills_after} (Diff: {skills_after - skills_before})")
    print(f"  - Job_Skills: {job_skills_after} (Diff: {job_skills_after - job_skills_before})")
    print(f"  - Swipes: {swipes_after} (Diff: {swipes_after - swipes_before})")
    print(f"  - Saved_Jobs: {saved_jobs_after} (Diff: {saved_jobs_after - saved_jobs_before})")
    print(f"  - Resumes: {resumes_after}")
    print(f"  - Resume_Versions: {resume_versions_after}")
    print(f"  - Job_Keywords: {job_keywords_after}")
    print(f"  - ATS_Scores: {ats_scores_after}")

    assert jobs_before == jobs_after, "FATAL: Job count changed during migration!"
    assert companies_before == companies_after, "FATAL: Company count changed during migration!"
    assert skills_before == skills_after, "FATAL: Skills count changed during migration!"
    assert job_skills_before == job_skills_after, "FATAL: Job_Skills count changed during migration!"
    assert swipes_before == swipes_after, "FATAL: Swipes count changed during migration!"
    assert saved_jobs_before == saved_jobs_after, "FATAL: Saved_Jobs count changed during migration!"

    print(f"\n=== M3 Database Migration COMPLETED SUCCESSFULLY — 100% DATA PRESERVED ===")


if __name__ == "__main__":
    apply_m3_migration()
