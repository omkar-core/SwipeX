"""
Idempotent, non-destructive migration script for SwipeX Milestone 2 schema extensions.
Applies column additions, saved_jobs table creation, and index updates without dropping or re-creating tables.
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


def apply_migration(db_url: str = DATABASE_URL):
    print(f"=== Starting Milestone 2 Database Migration ===")
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

    print(f"\n[Before Migration] Record Counts:")
    print(f"  - Jobs: {jobs_before}")
    print(f"  - Companies: {companies_before}")
    print(f"  - Skills: {skills_before}")
    print(f"  - Job_Skills: {job_skills_before}")
    print(f"  - Swipes: {swipes_before}")

    if db_type == "postgres":
        print("\n[Migrating PostgreSQL Database]...")
        migration_sql_path = os.path.join(BASE_DIR, "db", "migrations", "002_m2_schema_extension.sql")
        with open(migration_sql_path, "r", encoding="utf-8") as f:
            sql_script = f.read()
        cur.execute(sql_script)
        conn.commit()
    else:
        print("\n[Migrating SQLite Database]...")
        # Inspect columns in companies table
        cur.execute("PRAGMA table_info(companies);")
        comp_cols = [row[1] for row in cur.fetchall()]

        if "about" not in comp_cols:
            cur.execute("ALTER TABLE companies ADD COLUMN about TEXT NULL;")
        if "size" not in comp_cols:
            cur.execute("ALTER TABLE companies ADD COLUMN size TEXT NULL;")
        if "industry" not in comp_cols:
            cur.execute("ALTER TABLE companies ADD COLUMN industry TEXT NULL;")
        if "is_newly_founded" not in comp_cols:
            cur.execute("ALTER TABLE companies ADD COLUMN is_newly_founded INTEGER NOT NULL DEFAULT 0;")

        cur.execute("CREATE INDEX IF NOT EXISTS idx_companies_newly_founded ON companies(is_newly_founded);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);")

        # Inspect columns in jobs table
        cur.execute("PRAGMA table_info(jobs);")
        job_cols = [row[1] for row in cur.fetchall()]

        if "applicant_count" not in job_cols:
            cur.execute("ALTER TABLE jobs ADD COLUMN applicant_count INTEGER NOT NULL DEFAULT 0;")
        if "competition_level" not in job_cols:
            cur.execute("ALTER TABLE jobs ADD COLUMN competition_level TEXT NOT NULL DEFAULT 'LOW';")

        cur.execute("CREATE INDEX IF NOT EXISTS idx_jobs_competition ON jobs(competition_level);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_jobs_applicant_count ON jobs(applicant_count);")

        # Create saved_jobs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS saved_jobs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                saved_at TEXT NOT NULL,
                notes TEXT NULL,
                UNIQUE (user_id, job_id)
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_job ON saved_jobs(user_id, job_id);")
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

    cur.close()
    conn.close()

    print(f"\n[After Migration] Record Counts:")
    print(f"  - Jobs: {jobs_after} (Diff: {jobs_after - jobs_before})")
    print(f"  - Companies: {companies_after} (Diff: {companies_after - companies_before})")
    print(f"  - Skills: {skills_after} (Diff: {skills_after - skills_before})")
    print(f"  - Job_Skills: {job_skills_after} (Diff: {job_skills_after - job_skills_before})")
    print(f"  - Swipes: {swipes_after} (Diff: {swipes_after - swipes_before})")
    print(f"  - Saved_Jobs: {saved_jobs_after}")

    assert jobs_before == jobs_after, "FATAL: Job count changed during migration!"
    assert companies_before == companies_after, "FATAL: Company count changed during migration!"
    assert skills_before == skills_after, "FATAL: Skills count changed during migration!"
    assert job_skills_before == job_skills_after, "FATAL: Job_Skills count changed during migration!"
    assert swipes_before == swipes_after, "FATAL: Swipes count changed during migration!"

    print(f"\n=== M2 Database Migration COMPLETED SUCCESSFULLY — 100% DATA PRESERVED ===")


if __name__ == "__main__":
    apply_migration()
