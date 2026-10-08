"""
Configuration module for Job & Data Intelligence Domain Service.
"""
import os
from datetime import datetime, timezone

# Dataset baseline reference timestamp (Fixed date for deterministic relative date parsing)
DATASET_REF_TIMESTAMP = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

# Path to Dataset 1 raw excel file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_candidates = [
    os.path.join(BASE_DIR, "data", "raw", "indian-job-market-dataset-2025.xlsx"),
    os.path.join(BASE_DIR, "data", "raw", "indian-job-market-dataset-2025 processed.xlsx"),
    os.path.abspath(os.path.join(BASE_DIR, "..", "data", "raw", "indian-job-market-dataset-2025.xlsx")),
    os.path.abspath(os.path.join(BASE_DIR, "..", "data", "raw", "indian-job-market-dataset-2025 processed.xlsx")),
    os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "raw", "indian-job-market-dataset-2025.xlsx")),
    os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "raw", "indian-job-market-dataset-2025 processed.xlsx")),
]
_default_raw_path = next((p for p in _candidates if os.path.exists(p)), _candidates[0])

RAW_DATASET1_PATH = os.environ.get("RAW_DATASET1_PATH", _default_raw_path)

# Database Configuration
# Supports PostgreSQL via DATABASE_URL environment variable, or falls back to SQLite for local standalone testing
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///" + os.path.join(BASE_DIR, "data", "swipex_job.db"))

# Early applicant window in hours (Default: 48 hours)
EARLY_APPLICANT_WINDOW_HOURS = int(os.environ.get("EARLY_APPLICANT_WINDOW_HOURS", "48"))


def get_reference_time() -> datetime:
    """
    Returns configured reference clock provider.
    In seed/testing mode or when SWIPEX_REF_TIMESTAMP is unset/fixed, returns DATASET_REF_TIMESTAMP.
    In live production mode (SWIPEX_USE_LIVE_CLOCK=true), returns datetime.now(timezone.utc).
    """
    custom_ref = os.environ.get("SWIPEX_REF_TIMESTAMP", None)
    if custom_ref:
        try:
            return datetime.fromisoformat(custom_ref.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass

    use_live = os.environ.get("SWIPEX_USE_LIVE_CLOCK", "false").lower() in ("true", "1", "yes")
    if use_live:
        return datetime.now(timezone.utc)
    return DATASET_REF_TIMESTAMP

