"""
Database connection and initialization module for Job & Data Intelligence Service.
Supports both PostgreSQL (Production/Dev container) and SQLite (Local testing/ingestion).
"""
import os
import sqlite3
from typing import Tuple, Any

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


def get_db_type(db_url: str) -> str:
    if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
        return "postgres"
    return "sqlite"


def get_raw_connection(db_url: str):
    db_type = get_db_type(db_url)
    if db_type == "postgres":
        if not HAS_PSYCOPG2:
            raise ImportError("psycopg2 is required for PostgreSQL connections.")
        conn = psycopg2.connect(db_url)
        return conn, "postgres"
    else:
        path = db_url.replace("sqlite:///", "")
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        conn = sqlite3.connect(path, timeout=30.0)
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn, "sqlite"


def get_dict_cursor(conn, db_type: str):
    """
    Returns a cursor that yields dictionary rows for SQL queries.
    """
    if db_type == "postgres":
        return conn.cursor(cursor_factory=RealDictCursor)
    else:
        conn.row_factory = sqlite3.Row
        return conn.cursor()


def init_db(db_url: str, schema_sql_path: str = None):
    """
    Initializes database schema using PostgreSQL schema DDL or SQLite dialect adaptation.
    """
    conn, db_type = get_raw_connection(db_url)
    cursor = conn.cursor()

    if schema_sql_path and os.path.exists(schema_sql_path):
        with open(schema_sql_path, "r", encoding="utf-8") as f:
            sql_script = f.read()
    else:
        sql_script = ""

    if db_type == "postgres":
        cursor.execute(sql_script)
        conn.commit()
    else:
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY,
                raw_company_id INTEGER NOT NULL,
                name TEXT NULL,
                company_type TEXT NULL,
                aggregate_rating REAL NULL,
                reviews_count INTEGER NULL,
                about TEXT NULL,
                size TEXT NULL,
                industry TEXT NULL,
                is_newly_founded INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_companies_raw_id ON companies(raw_company_id);
            CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
            CREATE INDEX IF NOT EXISTS idx_companies_newly_founded ON companies(is_newly_founded);
            CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                raw_job_id INTEGER NOT NULL,
                company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
                title TEXT NOT NULL,
                job_description TEXT NOT NULL,
                min_salary REAL NULL,
                max_salary REAL NULL,
                currency TEXT NOT NULL,
                min_experience REAL NULL,
                max_experience REAL NULL,
                raw_experience_str TEXT NULL,
                location TEXT NOT NULL,
                work_mode TEXT NULL,
                job_type TEXT NULL,
                applicant_count INTEGER NOT NULL DEFAULT 0,
                competition_level TEXT NOT NULL DEFAULT 'LOW' CHECK (competition_level IN ('LOW', 'MEDIUM', 'HIGH')),
                posted_at_raw TEXT NOT NULL,
                posted_at_approx TEXT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
            CREATE INDEX IF NOT EXISTS idx_jobs_raw_job_id ON jobs(raw_job_id);
            CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
            CREATE INDEX IF NOT EXISTS idx_jobs_posted_at_approx ON jobs(posted_at_approx);
            CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs(min_salary, max_salary);
            CREATE INDEX IF NOT EXISTS idx_jobs_experience ON jobs(min_experience, max_experience);
            CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC, id ASC);
            CREATE INDEX IF NOT EXISTS idx_jobs_competition ON jobs(competition_level);
            CREATE INDEX IF NOT EXISTS idx_jobs_applicant_count ON jobs(applicant_count);

            CREATE TABLE IF NOT EXISTS skills (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NULL,
                created_at TEXT NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS uq_skills_name_lower ON skills(LOWER(name));

            CREATE TABLE IF NOT EXISTS job_skills (
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
                PRIMARY KEY (job_id, skill_id)
            );

            CREATE INDEX IF NOT EXISTS idx_job_skills_skill_id ON job_skills(skill_id);

            CREATE TABLE IF NOT EXISTS swipes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                direction TEXT NOT NULL CHECK (direction IN ('RIGHT', 'LEFT')),
                swiped_at TEXT NOT NULL,
                UNIQUE (user_id, job_id)
            );

            CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON swipes(user_id);
            CREATE INDEX IF NOT EXISTS idx_swipes_user_job ON swipes(user_id, job_id);

            CREATE TABLE IF NOT EXISTS saved_jobs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                saved_at TEXT NOT NULL,
                notes TEXT NULL,
                UNIQUE (user_id, job_id)
            );

            CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
            CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_job ON saved_jobs(user_id, job_id);
        """)
        conn.commit()

    conn.close()
