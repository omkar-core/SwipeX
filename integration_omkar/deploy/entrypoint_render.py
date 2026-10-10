"""
entrypoint_render.py - Production Entrypoint Wrapper for Render Free Tier Services
Owned by Intern 5 (Platform, Testing & Deployment).

Responsibilities:
1. Normalizes DATABASE_URL from 'postgres://' to 'postgresql://' (required for SQLAlchemy & psycopg).
2. Sets up sys.path and environment variable defaults.
3. Conditionally runs idempotent database migration & seed (if RUN_MIGRATION=true or specified).
4. Dynamically binds to 0.0.0.0:$PORT (Render injects PORT at runtime).
5. Execs uvicorn with production configuration (single worker, no reload).
"""
import os
import sys
import argparse
import logging
import subprocess

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("entrypoint_render")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def setup_environment():
    # Ensure all service paths are present in PYTHONPATH / sys.path
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
    new_pythonpath = os.pathsep.join(paths_to_add + ([current_pythonpath] if current_pythonpath else []))
    os.environ["PYTHONPATH"] = new_pythonpath

    # Normalize DATABASE_URL if present
    db_url = os.environ.get("DATABASE_URL", "")
    if db_url and db_url.startswith("postgres://"):
        normalized = db_url.replace("postgres://", "postgresql://", 1)
        os.environ["DATABASE_URL"] = normalized
        logger.info("Normalized DATABASE_URL from postgres:// to postgresql://")

def maybe_run_migration():
    if os.environ.get("RUN_MIGRATION", "").lower() in ("true", "1", "yes"):
        logger.info("RUN_MIGRATION is enabled. Running idempotent database migrations & seeding...")
        try:
            from integration_omkar.deploy.migrate_and_seed import run_migrations_and_seed
            run_migrations_and_seed()
            logger.info("Database migration step completed successfully.")
        except Exception as e:
            logger.error(f"Migration error during startup: {e}")
            # Do not crash the web service container completely if DB was already migrated by another replica
            logger.warning("Continuing to start web service...")

def main():
    parser = argparse.ArgumentParser(description="Render Service Entrypoint")
    parser.add_argument("--app", required=True, help="ASGI application import string, e.g. backend_mansi.app.main:app")
    parser.add_argument("--migrate", action="store_true", help="Force database migration before startup")
    args = parser.parse_args()

    setup_environment()

    if args.migrate or os.environ.get("RUN_MIGRATION", "").lower() in ("true", "1", "yes"):
        maybe_run_migration()

    port = int(os.environ.get("PORT", "8000"))
    host = "0.0.0.0"
    logger.info(f"Starting ASGI application '{args.app}' on {host}:{port}")

    # Launch uvicorn
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        args.app,
        "--host",
        host,
        "--port",
        str(port),
        "--log-level",
        os.environ.get("LOG_LEVEL", "info").lower(),
    ]

    sys.exit(subprocess.call(cmd))

if __name__ == "__main__":
    main()
