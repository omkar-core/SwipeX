"""
Milestone 4 Database Migration Runner for Job & Data Intelligence Service.
Applies 004_m4_schema_extension.sql idempotently to PostgreSQL or SQLite target databases.
"""
import os
import sys
import logging

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from config import DATABASE_URL
from db.connection import get_raw_connection, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("apply_m4_migration")

M4_EXPECTED_TABLES = [
    "applications",
    "application_status_events",
    "resume_version_views",
    "notifications",
    "notification_deliveries",
    "alert_preferences",
    "daily_application_analytics",
    "daily_hiring_trend_analytics"
]


def apply_migration(db_url: str = None) -> bool:
    target_url = db_url or DATABASE_URL
    logger.info(f"Applying Milestone 4 migration script to: {target_url}")

    migration_file = os.path.join(BASE_DIR, "db", "migrations", "004_m4_schema_extension.sql")
    if not os.path.exists(migration_file):
        logger.error(f"Migration file not found at: {migration_file}")
        return False

    init_db(target_url, migration_file)

    conn, db_type = get_raw_connection(target_url)
    cursor = conn.cursor()

    verified_tables = []
    for table_name in M4_EXPECTED_TABLES:
        if db_type == "postgres":
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = %s
            """, (table_name,))
            exists = cursor.fetchone()[0] > 0
        else:
            cursor.execute("""
                SELECT COUNT(*)
                FROM sqlite_master
                WHERE type = 'table' AND name = ?
            """, (table_name,))
            exists = cursor.fetchone()[0] > 0

        if exists:
            verified_tables.append(table_name)

    cursor.close()
    conn.close()

    logger.info(f"Verified M4 tables in database ({len(verified_tables)}/{len(M4_EXPECTED_TABLES)}): {verified_tables}")
    if len(verified_tables) == len(M4_EXPECTED_TABLES):
        logger.info("Milestone 4 schema migration completed successfully.")
        return True
    else:
        missing = set(M4_EXPECTED_TABLES) - set(verified_tables)
        logger.error(f"Milestone 4 migration incomplete. Missing tables: {missing}")
        return False


if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)
