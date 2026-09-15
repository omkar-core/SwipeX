"""
Job Indicators Service for Job & Data Intelligence Service.
Provides reusable, deterministic, timezone-safe, and null-safe helpers for
freshness category calculation and competition level classification.
"""
import re
from datetime import datetime, timezone
from typing import Optional, Union


def compute_competition_level(applicant_count: Optional[int]) -> str:
    """
    Computes competition level based on applicant_count:
    - LOW: < 10 applicants
    - MEDIUM: 10 - 50 applicants
    - HIGH: > 50 applicants
    """
    if applicant_count is None or applicant_count < 10:
        return "LOW"
    elif applicant_count <= 50:
        return "MEDIUM"
    else:
        return "HIGH"


def compute_freshness_level(
    posted_at_approx: Optional[Union[datetime, str]] = None,
    posted_at_raw: Optional[str] = None,
    created_at: Optional[Union[datetime, str]] = None,
    ref_date: Optional[datetime] = None
) -> str:
    """
    Determines job freshness tier deterministically:
    - FRESH: 0 to 7 days old
    - RECENT: 8 to 14 days old
    - AGING: 15 to 30 days old
    - STALE: > 30 days old

    Priority order for date source:
    1. posted_at_approx (parsed ISO string or datetime)
    2. posted_at_raw relative string parsing
    3. created_at timestamp fallback
    """
    # Baseline reference date (defaults to UTC current time if not supplied)
    if ref_date is None:
        ref_date = datetime.now(timezone.utc)
    elif ref_date.tzinfo is None:
        ref_date = ref_date.replace(tzinfo=timezone.utc)

    # 1. Primary path: posted_at_approx
    if posted_at_approx:
        dt = None
        if isinstance(posted_at_approx, datetime):
            dt = posted_at_approx
        elif isinstance(posted_at_approx, str):
            try:
                iso_str = posted_at_approx.replace("Z", "+00:00")
                dt = datetime.fromisoformat(iso_str)
            except (ValueError, TypeError):
                dt = None

        if dt:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            delta = ref_date - dt
            age_days = delta.total_seconds() / 86400.0
            if age_days < 0:
                age_days = 0.0

            if age_days <= 7.0:
                return "FRESH"
            elif age_days <= 14.0:
                return "RECENT"
            elif age_days <= 30.0:
                return "AGING"
            else:
                return "STALE"

    # 2. Secondary path: parse posted_at_raw string
    if posted_at_raw and isinstance(posted_at_raw, str):
        raw = posted_at_raw.strip().lower()
        if any(token in raw for token in ("just now", "today", "few hours ago", "hour")):
            return "FRESH"
        if "yesterday" in raw or raw == "1 day ago":
            return "FRESH"

        m_days = re.search(r"(\d+)\s+days?\s+ago", raw)
        if m_days:
            days = int(m_days.group(1))
            if days <= 7:
                return "FRESH"
            elif days <= 14:
                return "RECENT"
            elif days <= 30:
                return "AGING"
            else:
                return "STALE"

        if raw.startswith("starts"):
            # Future start date postings are considered upcoming / FRESH
            return "FRESH"

    # 3. Tertiary path: fallback to created_at
    if created_at:
        dt_c = None
        if isinstance(created_at, datetime):
            dt_c = created_at
        elif isinstance(created_at, str):
            try:
                iso_str = created_at.replace("Z", "+00:00")
                dt_c = datetime.fromisoformat(iso_str)
            except (ValueError, TypeError):
                dt_c = None

        if dt_c:
            if dt_c.tzinfo is None:
                dt_c = dt_c.replace(tzinfo=timezone.utc)
            delta = ref_date - dt_c
            age_days = delta.total_seconds() / 86400.0
            if age_days < 0:
                age_days = 0.0

            if age_days <= 7.0:
                return "FRESH"
            elif age_days <= 14.0:
                return "RECENT"
            elif age_days <= 30.0:
                return "AGING"
            else:
                return "STALE"

    # Default fallback if all fields missing or unparseable
    return "STALE"
