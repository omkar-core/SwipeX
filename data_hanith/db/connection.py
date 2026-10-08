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
                swiped_at TEXT NOT NULL DEFAULT (datetime('now')),
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

            -- Milestone 3 SQLite Tables
            CREATE TABLE IF NOT EXISTS resumes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT 'Default Resume',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

            CREATE TABLE IF NOT EXISTS resume_versions (
                id TEXT PRIMARY KEY,
                resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                parsed_json TEXT NOT NULL,
                version_number INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE (resume_id, version_number)
            );

            CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id);

            CREATE TABLE IF NOT EXISTS job_keywords (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                keyword TEXT NOT NULL,
                keyword_type TEXT NOT NULL,
                weight REAL NOT NULL DEFAULT 1.00,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_job_keywords_job_id ON job_keywords(job_id);

            CREATE TABLE IF NOT EXISTS ats_scores (
                id TEXT PRIMARY KEY,
                resume_version_id TEXT NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                match_score REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE (resume_version_id, job_id)
            );

            CREATE INDEX IF NOT EXISTS idx_ats_scores_resume_version ON ats_scores(resume_version_id);
            CREATE INDEX IF NOT EXISTS idx_ats_scores_job_id ON ats_scores(job_id);

            -- Milestone 4 SQLite Tables
            CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                resume_version_id TEXT NULL REFERENCES resume_versions(id) ON DELETE SET NULL,
                status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'WITHDRAWN')),
                applied_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE (user_id, job_id)
            );

            CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
            CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
            CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
            CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
            CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);

            CREATE TABLE IF NOT EXISTS application_status_events (
                id TEXT PRIMARY KEY,
                application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
                previous_status TEXT NULL,
                new_status TEXT NOT NULL CHECK (new_status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'WITHDRAWN')),
                actor_id TEXT NULL,
                actor_role TEXT NULL DEFAULT 'SYSTEM',
                notes TEXT NULL,
                changed_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_app_status_events_app_id ON application_status_events(application_id);
            CREATE INDEX IF NOT EXISTS idx_app_status_events_changed_at ON application_status_events(changed_at DESC);

            CREATE TABLE IF NOT EXISTS resume_version_views (
                id TEXT PRIMARY KEY,
                resume_version_id TEXT NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
                viewer_user_id TEXT NOT NULL,
                job_id TEXT NULL REFERENCES jobs(id) ON DELETE SET NULL,
                viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_rv_views_version ON resume_version_views(resume_version_id);
            CREATE INDEX IF NOT EXISTS idx_rv_views_viewer ON resume_version_views(viewer_user_id);

            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                notification_type TEXT NOT NULL CHECK (notification_type IN ('INSTANT_JOB', 'STARTUP_HIRING', 'HIGH_MATCH', 'LOW_COMPETITION', 'APPLICATION_STATUS_CHANGE', 'SYSTEM')),
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                payload TEXT NULL,
                related_job_id TEXT NULL REFERENCES jobs(id) ON DELETE SET NULL,
                related_application_id TEXT NULL REFERENCES applications(id) ON DELETE SET NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                read_at TEXT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

            CREATE TABLE IF NOT EXISTS notification_deliveries (
                id TEXT PRIMARY KEY,
                notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
                channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH')),
                status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
                sent_at TEXT NULL,
                error_message TEXT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_notif_deliv_notif_id ON notification_deliveries(notification_id);
            CREATE INDEX IF NOT EXISTS idx_notif_deliv_status ON notification_deliveries(status);

            CREATE TABLE IF NOT EXISTS alert_preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                instant_job INTEGER NOT NULL DEFAULT 1,
                startup_hiring INTEGER NOT NULL DEFAULT 1,
                high_match INTEGER NOT NULL DEFAULT 1,
                low_competition INTEGER NOT NULL DEFAULT 1,
                channel_in_app INTEGER NOT NULL DEFAULT 1,
                channel_email INTEGER NOT NULL DEFAULT 1,
                channel_push INTEGER NOT NULL DEFAULT 0,
                match_threshold REAL NOT NULL DEFAULT 70.00,
                quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
                quiet_hours_start TEXT NULL,
                quiet_hours_end TEXT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_alert_preferences_user_id ON alert_preferences(user_id);

            CREATE TABLE IF NOT EXISTS daily_application_analytics (
                snapshot_date TEXT NOT NULL,
                company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                total_applications INTEGER NOT NULL DEFAULT 0,
                applied_count INTEGER NOT NULL DEFAULT 0,
                shortlisted_count INTEGER NOT NULL DEFAULT 0,
                interview_count INTEGER NOT NULL DEFAULT 0,
                rejected_count INTEGER NOT NULL DEFAULT 0,
                withdrawn_count INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (snapshot_date, job_id)
            );

            CREATE INDEX IF NOT EXISTS idx_daily_app_analytics_company ON daily_application_analytics(company_id, snapshot_date);
            CREATE INDEX IF NOT EXISTS idx_daily_app_analytics_date ON daily_application_analytics(snapshot_date DESC);

            CREATE TABLE IF NOT EXISTS daily_hiring_trend_analytics (
                snapshot_date TEXT NOT NULL,
                company_type_category TEXT NOT NULL,
                skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
                jobs_posted_count INTEGER NOT NULL DEFAULT 0,
                applications_received_count INTEGER NOT NULL DEFAULT 0,
                avg_min_salary REAL NULL,
                avg_max_salary REAL NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (snapshot_date, company_type_category, skill_id)
            );

            CREATE INDEX IF NOT EXISTS idx_hiring_trends_date_cat ON daily_hiring_trend_analytics(snapshot_date DESC, company_type_category);
            CREATE INDEX IF NOT EXISTS idx_hiring_trends_skill ON daily_hiring_trend_analytics(skill_id);
        """)
        conn.commit()

    conn.close()

