"""
Daily Analytics Snapshot Generator Script for Milestone 4.
Generates cumulative daily_application_analytics and daily_hiring_trend_analytics snapshots.
Command-line runnable for scheduled cron jobs or standalone analytics generation.
"""
import os
import sys
import logging
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import DATABASE_URL, get_reference_time
from db.connection import get_raw_connection, init_db
from db.repositories.analytics_repository import AnalyticsRepository

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("generate_snapshots")


def run_snapshot_generation(snapshot_date: str = None, db_url: str = None) -> dict:
    """
    Executes daily application analytics and daily hiring trend analytics snapshot generation.
    Returns status dict with summary of rows generated.
    """
    target_db_url = db_url or DATABASE_URL
    if not snapshot_date:
        ref_time = get_reference_time()
        snapshot_date = ref_time.date().isoformat()

    logger.info(f"[Analytics Snapshot Generator] Generating snapshots for date: {snapshot_date} on DB: {target_db_url}")

    schema_sql_path = os.path.join(BASE_DIR, "db", "schema.sql")
    init_db(target_db_url, schema_sql_path)

    conn, db_type = get_raw_connection(target_db_url)
    try:
        repo = AnalyticsRepository(conn, db_type)

        app_rows = repo.generate_daily_application_analytics(snapshot_date=snapshot_date)
        logger.info(f"[Application Analytics] Successfully generated {app_rows} snapshot rows for {snapshot_date}.")

        trend_rows = repo.generate_daily_hiring_trend_analytics(snapshot_date=snapshot_date)
        logger.info(f"[Hiring Trend Analytics] Successfully generated {trend_rows} snapshot rows for {snapshot_date}.")

        return {
            "status": "SUCCESS",
            "snapshot_date": snapshot_date,
            "application_snapshot_rows": app_rows,
            "hiring_trend_snapshot_rows": trend_rows,
        }
    finally:
        conn.close()


if __name__ == "__main__":
    date_arg = sys.argv[1] if len(sys.argv) > 1 else None
    res = run_snapshot_generation(snapshot_date=date_arg)
    print("\n==================================================")
    print(f"ANALYTICS SNAPSHOT GENERATION COMPLETED FOR {res['snapshot_date']}")
    print(f"  - Application Snapshots: {res['application_snapshot_rows']} rows")
    print(f"  - Hiring Trend Snapshots: {res['hiring_trend_snapshot_rows']} rows")
    print("==================================================")
