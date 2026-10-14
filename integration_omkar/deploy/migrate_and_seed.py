"""
migrate_and_seed.py - Unified Idempotent Database Migration & Seed Coordinator
Owned by Intern 5 (Platform, Testing & Deployment).

This script:
1. Waits for PostgreSQL (or SQLite) to become ready.
2. Creates table schemas for swipex_job and swipex_auth idempotently.
3. Applies Milestone 4 schema extensions (applications, notifications, analytics).
4. Seeds baseline curated jobs, companies, and skills if the database is empty.
5. Can be run safely across local Docker (db-migrate container), CI, and Render cloud startup.
"""
import os
import sys
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate_and_seed")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "data_hanith"))
sys.path.insert(0, os.path.join(BASE_DIR, "backend_mansi"))
sys.path.insert(0, os.path.join(BASE_DIR, "integration_omkar"))

from integration_omkar.deploy.redact import redact_url

def normalize_db_url(url: str) -> str:
    """Normalize postgres:// to postgresql:// for SQLAlchemy / psycopg compatibility."""
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url

def wait_for_db(db_url: str, max_retries: int = 30, retry_delay: float = 1.0) -> bool:
    """Waits for database connection to succeed."""
    env_retries = os.environ.get("DB_MAX_RETRIES")
    if env_retries and env_retries.isdigit():
        max_retries = int(env_retries)
    env_delay = os.environ.get("DB_RETRY_DELAY")
    if env_delay:
        try:
            retry_delay = float(env_delay)
        except ValueError:
            pass
    normalized_url = normalize_db_url(db_url)
    if "sqlite" in normalized_url:
        return True

    from data_hanith.db.connection import get_raw_connection
    logger.info(f"Waiting for database connection to {redact_url(normalized_url)}...")
    for attempt in range(1, max_retries + 1):
        try:
            conn, _ = get_raw_connection(normalized_url)
            cur = conn.cursor()
            cur.execute("SELECT 1;")
            cur.fetchone()
            cur.close()
            conn.close()
            logger.info(f"Database reachable on attempt {attempt}.")
            return True
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt}/{max_retries} failed: {e}")
            time.sleep(retry_delay)
    return False

SWIPEX_MIGRATION_LOCK_ID = 849204  # Unique 32-bit advisory lock key for SwipeX


def sync_notification_and_m4_schemas(db_url: str):
    """
    Reconciles schema differences between data_hanith SQL tables and backend_mansi models:
    1. notifications table: ensures columns 'type', 'channel', 'metadata_json' exist, and converts user_id/id to VARCHAR.
    2. alert_preferences table: ensures columns 'email_enabled', 'push_enabled', 'in_app_enabled' exist, and converts user_id/id to VARCHAR.
    3. Copies data between Hanith's notification_type/payload/channels and Mansi's columns.
    """
    if not db_url or "sqlite" in db_url:
        return
    try:
        from data_hanith.db.connection import get_raw_connection
        conn, db_type = get_raw_connection(db_url)
        if db_type == "postgres":
            if hasattr(conn, "autocommit"):
                conn.autocommit = True
            cur = conn.cursor()
            statements = [
                # Notifications schema reconciliation
                "ALTER TABLE notifications ALTER COLUMN user_id TYPE VARCHAR(255);",
                "ALTER TABLE notifications ALTER COLUMN id TYPE VARCHAR(255);",
                "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'system';",
                "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'in_app';",
                "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata_json TEXT;",
                "UPDATE notifications SET type = LOWER(notification_type) WHERE type IS NULL OR type = 'system';",
                # Alert preferences schema reconciliation
                "ALTER TABLE alert_preferences ALTER COLUMN user_id TYPE VARCHAR(255);",
                "ALTER TABLE alert_preferences ALTER COLUMN id TYPE VARCHAR(255);",
                "ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT TRUE;",
                "UPDATE alert_preferences SET email_enabled = channel_email, push_enabled = channel_push, in_app_enabled = channel_in_app WHERE email_enabled IS NULL;",
            ]
            for stmt in statements:
                try:
                    cur.execute(stmt)
                except Exception as stmt_err:
                    logger.debug(f"Schema synchronization note ({stmt}): {stmt_err}")
            cur.close()
            conn.close()
            logger.info("Notification and alert preference schema alignment completed.")
    except Exception as exc:
        logger.warning(f"Note: Schema alignment skipped or deferred: {exc}")


def run_migrations_and_seed(job_db_url: str = None, auth_db_url: str = None):
    # Determine Job Service DB URL
    # NOTE: No hardcoded hostname fallback — Render injects DATABASE_URL / JOB_DATABASE_URL
    #       at runtime. Missing env vars produce a clear error instead of a cryptic
    #       connection timeout to a non-existent 'postgres:5432' Docker-compose host.
    raw_job_url = job_db_url or os.environ.get("JOB_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not raw_job_url:
        logger.error(
            "No database URL configured. Set DATABASE_URL or JOB_DATABASE_URL environment variable."
        )
        sys.exit(1)
    target_job_url = normalize_db_url(raw_job_url)

    # Determine Auth Service DB URL
    raw_auth_url = auth_db_url or os.environ.get("AUTH_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not raw_auth_url:
        logger.error(
            "No auth database URL configured. Set DATABASE_URL or AUTH_DATABASE_URL environment variable."
        )
        sys.exit(1)
    target_auth_url = normalize_db_url(raw_auth_url)

    logger.info(f"[1/4] Connecting to Job Database: {redact_url(target_job_url)}")
    if not wait_for_db(target_job_url):
        logger.error("Could not reach Job Database. Aborting migration.")
        sys.exit(1)

    lock_conn = None
    lock_acquired = False
    if "postgres" in target_job_url:
        try:
            from data_hanith.db.connection import get_raw_connection
            lock_conn, _ = get_raw_connection(target_job_url)
            if hasattr(lock_conn, "autocommit"):
                lock_conn.autocommit = True
            cur = lock_conn.cursor()
            logger.info(f"Acquiring Postgres advisory lock ({SWIPEX_MIGRATION_LOCK_ID}) to coordinate concurrent migrations...")
            cur.execute("SELECT pg_advisory_lock(%s);", (SWIPEX_MIGRATION_LOCK_ID,))
            lock_acquired = True
            cur.close()
            logger.info("Postgres advisory lock acquired successfully.")
        except Exception as lock_err:
            logger.warning(f"Failed to acquire advisory lock (proceeding with migration): {lock_err}")

    try:
        # 1. Apply data_hanith canonical schema
        schema_sql_path = os.path.join(BASE_DIR, "data_hanith", "db", "schema.sql")
        from data_hanith.db.connection import init_db
        logger.info(f"[2/4] Applying canonical schema from {schema_sql_path}...")
        init_db(target_job_url, schema_sql_path)

        # 2. Apply M4 schema extension
        from data_hanith.scripts.apply_m4_migration import apply_migration
        logger.info("[3/4] Applying Milestone 4 schema extensions...")
        apply_migration(target_job_url)

        # 3. Seed baseline data if empty
        from integration_omkar.scripts.seed_all import seed_database
        logger.info("[4/4] Ensuring baseline curated seed data exists...")
        seed_database(target_job_url)

        # 4. Initialize Auth DB (tables in swipex_auth)
        try:
            from sqlalchemy import create_engine
            mansi_path = os.path.join(BASE_DIR, "backend_mansi")
            if mansi_path in sys.path:
                sys.path.remove(mansi_path)
            sys.path.insert(0, mansi_path)
            from app.database import Base
            import app.models
            logger.info(f"Ensuring Auth schema tables exist in {redact_url(target_auth_url)}...")
            auth_engine = create_engine(target_auth_url)
            Base.metadata.create_all(bind=auth_engine)
            logger.info(f"Auth schema tables verified ({len(Base.metadata.tables)} models registered: {list(Base.metadata.tables.keys())}).")
        except Exception as e:
            logger.warning(f"Note: Auth DB initialization skipped or deferred: {e}")

        # 5. Reconcile Notification and Alert Preference columns between data_hanith and backend_mansi
        try:
            sync_notification_and_m4_schemas(target_auth_url)
            if target_job_url != target_auth_url:
                sync_notification_and_m4_schemas(target_job_url)
        except Exception as e:
            logger.warning(f"Note: Schema synchronization skipped or deferred: {e}")

        logger.info("Database migration and baseline seeding complete! Exit Code 0.")
    finally:
        if lock_acquired and lock_conn:
            try:
                cur = lock_conn.cursor()
                cur.execute("SELECT pg_advisory_unlock(%s);", (SWIPEX_MIGRATION_LOCK_ID,))
                cur.close()
                logger.info("Postgres advisory lock released.")
            except Exception as e:
                logger.warning(f"Error releasing advisory lock: {e}")
            try:
                lock_conn.close()
            except Exception:
                pass

if __name__ == "__main__":
    job_url = sys.argv[1] if len(sys.argv) > 1 else None
    auth_url = sys.argv[2] if len(sys.argv) > 2 else None
    run_migrations_and_seed(job_url, auth_url)
