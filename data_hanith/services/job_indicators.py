import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Tuple, Dict, Any

from config import get_reference_time, EARLY_APPLICANT_WINDOW_HOURS


def parse_datetime_utc(dt_val: Optional[Union[datetime, str]]) -> Optional[datetime]:
    """Helper to safely convert ISO string or datetime to timezone-aware UTC datetime."""
    if not dt_val:
        return None
    if isinstance(dt_val, datetime):
        return dt_val if dt_val.tzinfo else dt_val.replace(tzinfo=timezone.utc)
    if isinstance(dt_val, str):
        try:
            iso_str = dt_val.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso_str)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            return None
    return None


def compute_competition_level(
    applicant_count: Optional[int],
    posted_at_approx: Optional[Union[datetime, str]] = None,
    ref_date: Optional[datetime] = None
) -> str:
    """
    Computes competition level deterministically based on applicant_count (A) and job age (Age in days):
    - HIGH: A >= 50 OR (A >= 20 AND Age <= 7 days)
    - LOW: A < 10 OR (A < 20 AND Age > 30 days)
    - MEDIUM: Everything else (mutually exclusive)

    If posted_at_approx is NULL/unparseable, falls back to count-only thresholds:
    - HIGH: A >= 50
    - MEDIUM: 10 <= A < 50
    - LOW: A < 10
    """
    A = applicant_count if (applicant_count is not None and applicant_count >= 0) else 0
    posted_dt = parse_datetime_utc(posted_at_approx)

    if posted_dt is None:
        # Fallback for NULL posting date: count-based thresholding without fake timestamps
        if A >= 50:
            return "HIGH"
        elif A >= 10:
            return "MEDIUM"
        else:
            return "LOW"

    if ref_date is None:
        ref_date = get_reference_time()
    elif ref_date.tzinfo is None:
        ref_date = ref_date.replace(tzinfo=timezone.utc)

    delta = ref_date - posted_dt
    age_days = delta.total_seconds() / 86400.0
    if age_days < 0:
        age_days = 0.0

    # 1. HIGH condition
    if A >= 50 or (A >= 20 and age_days <= 7.0):
        return "HIGH"

    # 2. LOW condition
    if A < 10 or (A < 20 and age_days > 30.0):
        return "LOW"

    # 3. MEDIUM condition (Everything else)
    return "MEDIUM"


def compute_early_applicant_status(
    applied_at: Union[datetime, str],
    posted_at_approx: Optional[Union[datetime, str]],
    window_hours: int = EARLY_APPLICANT_WINDOW_HOURS
) -> Tuple[Optional[bool], str]:
    """
    Evaluates early applicant status with strict NULL semantics:
    - If posted_at_approx is NULL/unparseable: returns (None, "UNAVAILABLE")
    - If applied_at <= posted_at_approx + window_hours: returns (True, "EARLY")
    - Else: returns (False, "REGULAR")
    """
    posted_dt = parse_datetime_utc(posted_at_approx)
    if posted_dt is None:
        return None, "UNAVAILABLE"

    applied_dt = parse_datetime_utc(applied_at)
    if applied_dt is None:
        return None, "UNAVAILABLE"

    early_deadline = posted_dt + timedelta(hours=window_hours)
    if applied_dt <= early_deadline:
        return True, "EARLY"
    return False, "REGULAR"


def compute_is_recently_posted(
    posted_at_approx: Optional[Union[datetime, str]],
    ref_date: Optional[datetime] = None,
    window_hours: int = 48
) -> bool:
    """
    Public job freshness helper evaluating whether the job itself was posted recently (<= 48h).
    """
    posted_dt = parse_datetime_utc(posted_at_approx)
    if posted_dt is None:
        return False

    if ref_date is None:
        ref_date = get_reference_time()
    elif ref_date.tzinfo is None:
        ref_date = ref_date.replace(tzinfo=timezone.utc)

    delta = ref_date - posted_dt
    age_hours = delta.total_seconds() / 3600.0
    return 0.0 <= age_hours <= float(window_hours)


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
    """
    if ref_date is None:
        ref_date = get_reference_time()
    elif ref_date.tzinfo is None:
        ref_date = ref_date.replace(tzinfo=timezone.utc)

    dt = parse_datetime_utc(posted_at_approx)
    if dt:
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
            return "FRESH"

    dt_c = parse_datetime_utc(created_at)
    if dt_c:
        delta_c = ref_date - dt_c
        age_c = delta_c.total_seconds() / 86400.0
        if age_c < 0:
            age_c = 0.0

        if age_c <= 7.0:
            return "FRESH"
        elif age_c <= 14.0:
            return "RECENT"
        elif age_c <= 30.0:
            return "AGING"
        else:
            return "STALE"

    return "STALE"


def classify_company_type(company_type: Optional[str]) -> str:
    """
    Classifies company_type strictly according to approved project rule:
    - STARTUP: explicitly contains "STARTUP"
    - MNC: explicitly contains "MNC" or "MULTINATIONAL"
    - OTHER: everything else (Corporate, Conglomerate, Enterprise, Private, Public, NULL, etc.)
    """
    if not company_type or not isinstance(company_type, str):
        return "OTHER"

    ct = company_type.strip().upper()
    if "STARTUP" in ct:
        return "STARTUP"
    if "MNC" in ct or "MULTINATIONAL" in ct:
        return "MNC"
    return "OTHER"



