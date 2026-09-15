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
    os.path.join(BASE_DIR, "data", "raw", "indian-job-market-dataset-2025 processed.xlsx"),
    os.path.join(BASE_DIR, "data", "raw", "indian-job-market-dataset-2025.xlsx"),
    os.path.abspath(os.path.join(BASE_DIR, "..", "data", "raw", "indian-job-market-dataset-2025 processed.xlsx")),
    os.path.abspath(os.path.join(BASE_DIR, "..", "data", "raw", "indian-job-market-dataset-2025.xlsx")),
    os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "raw", "indian-job-market-dataset-2025 processed.xlsx")),
    os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "raw", "indian-job-market-dataset-2025.xlsx")),
]
_default_raw_path = next((p for p in _candidates if os.path.exists(p)), _candidates[0])

RAW_DATASET1_PATH = os.environ.get("RAW_DATASET1_PATH", _default_raw_path)

# Database Configuration
# Supports PostgreSQL via DATABASE_URL environment variable, or falls back to SQLite for local standalone testing
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///" + os.path.join(BASE_DIR, "data", "swipex_job.db"))
