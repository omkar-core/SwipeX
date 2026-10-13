"""
entrypoint_render.py - Production Entrypoint Wrapper for Render Free Tier Services
Owned by Intern 5 (Platform, Testing & Deployment).

Responsibilities:
1. Validates DATABASE_URL is present; exits with a clear diagnostic if not.
2. Normalizes DATABASE_URL from 'postgres://' to 'postgresql://' (required for SQLAlchemy & psycopg).
3. Adds sslmode=require for non-Render-internal hosts (external URL safety).
4. Sets up sys.path and environment variable defaults.
5. Waits up to 60 s for the database to become reachable (free tier may be cold-starting).
6. Conditionally runs idempotent database migration & seed (if RUN_MIGRATION=true).
7. Dynamically binds to 0.0.0.0: (Render injects PORT at runtime).
8. Execs uvicorn with production configuration (single worker, no reload).

See integration_omkar/docs/RENDER_DEPLOY.md for full deployment instructions.
"""
import os
import sys
import time
import socket
import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("entrypoint_render")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _is_render_internal_host(host: str) -> bool:
    """Return True if host looks like a Render private-network host (no dots in name)."""
    return "." not in host


def normalize_db_url(url: str) -> str:
    """
    1. Replace postgres:// with postgresql:// (SQLAlchemy requirement).
    2. Append ?sslmode=require when host is external and sslmode not already set.
       Internal Render hosts (no dots in hostname) do NOT need sslmode.
    """
    if not url:
        return url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
        logger.info("Normalized DATABASE_URL scheme: postgres:// -> postgresql://")

    # Parse host to decide on SSL
    try:
        after_at = url.split("@", 1)[1] if "@" in url else url.split("://", 1)[1]
        host_part = after_at.split("/")[0].split(":")[0]
        if not _is_render_internal_host(host_part):
            if "sslmode" not in url:
                sep = "&" if "?" in url else "?"
                url = f"{url}{sep}sslmode=require"
                logger.info("Added sslmode=require for external host.")
    except Exception:
        pass  # Best-effort; never crash on URL inspection
    return url


def setup_environment():
    """Validate required env vars, normalize URLs, and extend sys.path."""
    db_url_raw = os.environ.get("DATABASE_URL", "")
    job_db_url_raw = os.environ.get("JOB_DATABASE_URL", "")

    if not db_url_raw and not job_db_url_raw:
        present_db_keys = [
            k for k in os.environ
            if any(tok in k.upper() for tok in ("DATABASE", "POSTGRES", "PG_", "DB_URL", "DB_HOST"))
        ]
        logger.error(
            "STARTUP FAILURE: No database URL configured.\n"
            "  Expected: DATABASE_URL or JOB_DATABASE_URL\n"
            "  DB-related variables currently present (names only): %s\n"
            "  Fix options:\n"
            "    A) Blueprint: render.yaml defines databases: + fromDatabase: connectionString.\n"
            "       Delete the manually-created service and re-create via New > Blueprint.\n"
            "    B) Manual: set DATABASE_URL in Dashboard > Environment to the Postgres\n"
            "       INTERNAL connection string (Connect tab of the database).\n"
            "  See: integration_omkar/docs/RENDER_DEPLOY.md",
            present_db_keys if present_db_keys else ["(none)"],
        )
        sys.exit(1)

    if db_url_raw:
        os.environ["DATABASE_URL"] = normalize_db_url(db_url_raw)
    if job_db_url_raw:
        os.environ["JOB_DATABASE_URL"] = normalize_db_url(job_db_url_raw)

    paths_to_add = [
        BASE_DIR,
        os.path.join(BASE_DIR, "backend_mansi"),
        os.path.join(BASE_DIR, "data_hanith"),
        os.path.join(BASE_DIR, "aiml_hemalatha"),
        os.path.join(BASE_DIR, "integration_omkar"),
    ]
    for p in paths_to_add:
        if p not in sys.path:
            sys.path.insert(0, p)
    current_pythonpath = os.environ.get("PYTHONPATH", "")
    os.environ["PYTHONPATH"] = os.pathsep.join(
        paths_to_add + ([current_pythonpath] if current_pythonpath else [])
    )


def wait_for_db(max_wait_s: int = 60, retry_interval_s: float = 3.0) -> bool:
    """TCP-ping the DB host until it accepts connections or the deadline expires."""
    db_url = os.environ.get("DATABASE_URL", "") or os.environ.get("JOB_DATABASE_URL", "")
    if not db_url or "sqlite" in db_url:
        return True
    try:
        after_at = db_url.split("@", 1)[1] if "@" in db_url else db_url.split("://", 1)[1]
        host_port = after_at.split("/")[0]
        host = host_port.split(":")[0]
        port = int(host_port.split(":")[1]) if ":" in host_port else 5432
    except Exception as exc:
        logger.warning("Could not parse host/port from DATABASE_URL for wait check: %s", exc)
        return True

    deadline = time.monotonic() + max_wait_s
    attempt = 0
    while time.monotonic() < deadline:
        attempt += 1
        try:
            with socket.create_connection((host, port), timeout=3):
                logger.info("Database TCP port reachable on attempt %d.", attempt)
                return True
        except OSError as exc:
            remaining = int(deadline - time.monotonic())
            logger.warning("DB not reachable yet (attempt %d, %ds remaining): %s", attempt, remaining, exc)
            time.sleep(retry_interval_s)
    logger.error("Database did not become reachable within %d seconds.", max_wait_s)
    return False


def maybe_run_migration():
    """Run idempotent migration + seed if RUN_MIGRATION=true. Missing dataset is skipped gracefully."""
    if os.environ.get("RUN_MIGRATION", "").lower() not in ("true", "1", "yes"):
        return

    logger.info("RUN_MIGRATION is enabled. Waiting for database before migrating...")
    if not wait_for_db(max_wait_s=60, retry_interval_s=3.0):
        logger.error(
            "Cannot reach database after 60 s. Aborting. "
            "Check DATABASE_URL and that the Render Postgres service is in the same region."
        )
        sys.exit(1)

    logger.info("Running idempotent database migrations & seeding...")
    try:
        from integration_omkar.deploy.migrate_and_seed import run_migrations_and_seed
        run_migrations_and_seed()
        logger.info("Database migration step completed successfully.")
    except SystemExit:
        raise  # propagate sys.exit(1) from migrate_and_seed (missing DB URL case)
    except Exception as e:
        err_msg = str(e)
        if "indian-job-market-dataset-2025.xlsx" in err_msg or "No such file" in err_msg:
            logger.warning(
                "Seed skipped: dataset file 'data/raw/indian-job-market-dataset-2025.xlsx' "
                "is not committed to the repository. "
                "Schema migration succeeded; app starts with curated seed data only. "
                "See integration_omkar/docs/m4_defect_log.md DEF-045 for details."
            )
        else:
            logger.error("Migration error during startup: %s", e)
            logger.warning("Continuing to start web service despite migration error.")


def main():
    parser = argparse.ArgumentParser(description="Render Service Entrypoint")
    parser.add_argument("--app", required=True, help="ASGI application import string")
    parser.add_argument("--migrate", action="store_true", help="Force database migration before startup")
    args = parser.parse_args()

    setup_environment()

    if args.migrate or os.environ.get("RUN_MIGRATION", "").lower() in ("true", "1", "yes"):
        maybe_run_migration()

    port = int(os.environ.get("PORT", "8000"))
    host = "0.0.0.0"
    log_level = os.environ.get("LOG_LEVEL", "info").lower()
    logger.info("Starting ASGI application '%s' on %s:%d", args.app, host, port)

    # Replace current process with uvicorn (exec, not subprocess — no zombie processes).
    os.execvp(sys.executable, [
        sys.executable, "-m", "uvicorn",
        args.app,
        "--host", host,
        "--port", str(port),
        "--log-level", log_level,
    ])


if __name__ == "__main__":
    main()
