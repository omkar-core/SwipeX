"""
Application Repository for Job & Data Intelligence Service.
Handles transactional access for Applications, Application Status Events,
Applicant Counter Increments, Competition Level Re-evaluation, and Early Applicant Status.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple, Union

from config import get_reference_time
from db.connection import get_dict_cursor
from db.cache import get_cache_service
from services.job_indicators import (
    compute_competition_level,
    compute_early_applicant_status,
    compute_is_recently_posted,
    parse_datetime_utc
)

logger = logging.getLogger("swipex_applications")


class ApplicationRepository:
    def __init__(self, conn, db_type: str):
        self.conn = conn
        self.db_type = db_type
        self.cache_service = get_cache_service()

    def create_application(
        self,
        user_id: str,
        job_id: str,
        resume_version_id: Optional[str] = None,
        applied_at: Optional[Union[datetime, str]] = None
    ) -> Dict[str, Any]:
        """
        Transactionally creates a job application:
        1. Inserts row into applications table.
        2. Logs initial status event ('APPLIED').
        3. Increments jobs.applicant_count and recalculates jobs.competition_level.
        4. Invalidates Redis competition cache.
        5. Computes early applicant status with strict NULL semantics.
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        # 1. Fetch job posting timestamp and current applicant count
        job_sql = f"SELECT id, applicant_count, posted_at_approx FROM jobs WHERE id = {param_placeholder}"
        cursor.execute(job_sql, (job_id,))
        job_row = cursor.fetchone()
        if not job_row:
            raise ValueError(f"Job with ID {job_id} does not exist.")

        j_dict = dict(job_row)
        current_count = int(j_dict.get("applicant_count") or 0)
        posted_at_approx = j_dict.get("posted_at_approx")

        app_id = str(uuid.uuid4())
        now_dt = get_reference_time()
        applied_at_dt = parse_datetime_utc(applied_at) or now_dt
        applied_at_str = applied_at_dt.isoformat()
        now_str = now_dt.isoformat()

        # 2. Insert application record
        if self.db_type == "postgres":
            app_sql = f"""
                INSERT INTO applications (id, user_id, job_id, resume_version_id, status, applied_at, updated_at)
                VALUES (%s, %s, %s, %s, 'APPLIED', %s, %s)
            """
            cursor.execute(app_sql, (app_id, str(user_id), str(job_id), str(resume_version_id) if resume_version_id else None, applied_at_str, now_str))
        else:
            app_sql = f"""
                INSERT INTO applications (id, user_id, job_id, resume_version_id, status, applied_at, updated_at)
                VALUES (?, ?, ?, ?, 'APPLIED', ?, ?)
            """
            cursor.execute(app_sql, (app_id, str(user_id), str(job_id), str(resume_version_id) if resume_version_id else None, applied_at_str, now_str))

        # 3. Log initial status event
        event_id = str(uuid.uuid4())
        if self.db_type == "postgres":
            event_sql = f"""
                INSERT INTO application_status_events (id, application_id, previous_status, new_status, actor_id, actor_role, notes, changed_at)
                VALUES (%s, %s, NULL, 'APPLIED', %s, 'JOB_SEEKER', 'Initial application submitted', %s)
            """
            cursor.execute(event_sql, (event_id, app_id, str(user_id), now_str))
        else:
            event_sql = f"""
                INSERT INTO application_status_events (id, application_id, previous_status, new_status, actor_id, actor_role, notes, changed_at)
                VALUES (?, ?, NULL, 'APPLIED', ?, 'JOB_SEEKER', 'Initial application submitted', ?)
            """
            cursor.execute(event_sql, (event_id, app_id, str(user_id), now_str))

        # 4. Atomic SQL increment of applicant count & dynamic competition recomputation
        if self.db_type == "postgres":
            update_job_sql = """
                UPDATE jobs
                SET applicant_count = applicant_count + 1, updated_at = %s
                WHERE id = %s
                RETURNING applicant_count, posted_at_approx
            """
            cursor.execute(update_job_sql, (now_str, str(job_id)))
            res_row = cursor.fetchone()
            if res_row:
                r_res = dict(res_row)
                new_count = int(r_res["applicant_count"])
                posted_at_approx = r_res.get("posted_at_approx")
            else:
                new_count = current_count + 1

            new_competition = compute_competition_level(new_count, posted_at_approx)
            cursor.execute("UPDATE jobs SET competition_level = %s WHERE id = %s", (new_competition, str(job_id)))
        else:
            update_job_sql = """
                UPDATE jobs
                SET applicant_count = applicant_count + 1, updated_at = ?
                WHERE id = ?
            """
            cursor.execute(update_job_sql, (now_str, str(job_id)))

            cursor.execute("SELECT applicant_count, posted_at_approx FROM jobs WHERE id = ?", (str(job_id),))
            res_row = cursor.fetchone()
            if res_row:
                r_res = dict(res_row)
                new_count = int(r_res["applicant_count"])
                posted_at_approx = r_res.get("posted_at_approx")
            else:
                new_count = current_count + 1

            new_competition = compute_competition_level(new_count, posted_at_approx)
            cursor.execute("UPDATE jobs SET competition_level = ? WHERE id = ?", (new_competition, str(job_id)))

        self.conn.commit()

        # 5. Invalidate Redis competition cache key
        try:
            cli = self.cache_service.client
            if cli:
                cli.delete(f"competition:{job_id}")
                cli.delete(f"analytics:user_funnel:{user_id}")
        except Exception as exc:
            logger.warning(f"[Redis Cache Invalidation Failure] job {job_id}: {exc}")

        # 6. Compute early applicant status & job freshness
        is_early, early_status = compute_early_applicant_status(applied_at_str, posted_at_approx)
        is_recent = compute_is_recently_posted(posted_at_approx)

        return {
            "id": app_id,
            "user_id": str(user_id),
            "job_id": str(job_id),
            "resume_version_id": str(resume_version_id) if resume_version_id else None,
            "status": "APPLIED",
            "applied_at": applied_at_str,
            "applicant_count": new_count,
            "competition_level": new_competition,
            "is_early_applicant": is_early,
            "early_applicant_status": early_status,
            "is_recently_posted": is_recent
        }

    def update_application_status(
        self,
        application_id: str,
        new_status: str,
        actor_id: Optional[str] = None,
        actor_role: str = "SYSTEM",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates an existing application's status and logs a status transition event.
        Allowed statuses: 'APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'WITHDRAWN'.
        """
        valid_statuses = {'APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'WITHDRAWN'}
        clean_status = new_status.upper().strip()
        if clean_status not in valid_statuses:
            raise ValueError(f"Invalid application status: '{new_status}'. Allowed: {valid_statuses}")

        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        # Fetch current application
        fetch_sql = f"SELECT id, user_id, job_id, status FROM applications WHERE id = {param_placeholder}"
        cursor.execute(fetch_sql, (str(application_id),))
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Application with ID {application_id} does not exist.")

        r_dict = dict(row)
        prev_status = r_dict["status"]
        user_id = r_dict["user_id"]
        now_str = get_reference_time().isoformat()

        # Update application status
        if self.db_type == "postgres":
            upd_sql = f"UPDATE applications SET status = %s, updated_at = %s WHERE id = %s"
            cursor.execute(upd_sql, (clean_status, now_str, str(application_id)))
        else:
            upd_sql = f"UPDATE applications SET status = ?, updated_at = ? WHERE id = ?"
            cursor.execute(upd_sql, (clean_status, now_str, str(application_id)))

        # Log transition event
        event_id = str(uuid.uuid4())
        if self.db_type == "postgres":
            ev_sql = f"""
                INSERT INTO application_status_events (id, application_id, previous_status, new_status, actor_id, actor_role, notes, changed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(ev_sql, (event_id, str(application_id), prev_status, clean_status, str(actor_id) if actor_id else None, actor_role, notes, now_str))
        else:
            ev_sql = f"""
                INSERT INTO application_status_events (id, application_id, previous_status, new_status, actor_id, actor_role, notes, changed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
            cursor.execute(ev_sql, (event_id, str(application_id), prev_status, clean_status, str(actor_id) if actor_id else None, actor_role, notes, now_str))

        self.conn.commit()

        # Invalidate cache
        try:
            cli = self.cache_service.client
            if cli:
                cli.delete(f"analytics:user_funnel:{user_id}")
        except Exception:
            pass

        return {
            "id": str(application_id),
            "user_id": str(user_id),
            "previous_status": prev_status,
            "new_status": clean_status,
            "updated_at": now_str
        }

    def get_application_by_id(self, application_id: str) -> Optional[Dict[str, Any]]:
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"""
            SELECT a.id, a.user_id, a.job_id, a.resume_version_id, a.status, a.applied_at, a.updated_at,
                   j.title AS job_title, j.posted_at_approx, j.applicant_count, j.competition_level,
                   c.name AS company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE a.id = {param_placeholder}
        """
        cursor.execute(sql, (str(application_id),))
        row = cursor.fetchone()
        if not row:
            return None

        r = dict(row)
        is_early, early_status = compute_early_applicant_status(r["applied_at"], r.get("posted_at_approx"))
        return {
            "id": str(r["id"]),
            "user_id": str(r["user_id"]),
            "job_id": str(r["job_id"]),
            "resume_version_id": str(r["resume_version_id"]) if r.get("resume_version_id") else None,
            "status": r["status"],
            "applied_at": str(r["applied_at"]),
            "updated_at": str(r["updated_at"]),
            "job_title": r["job_title"],
            "company_name": r["company_name"],
            "applicant_count": int(r["applicant_count"]),
            "competition_level": compute_competition_level(r["applicant_count"], r.get("posted_at_approx")),
            "is_early_applicant": is_early,
            "early_applicant_status": early_status
        }

    def get_application_by_user_and_job(self, user_id: str, job_id: str) -> Optional[Dict[str, Any]]:
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"SELECT id FROM applications WHERE user_id = {param_placeholder} AND job_id = {param_placeholder}"
        cursor.execute(sql, (str(user_id), str(job_id)))
        row = cursor.fetchone()
        if not row:
            return None
        return self.get_application_by_id(dict(row)["id"])

    def get_application_status_history(self, application_id: str) -> List[Dict[str, Any]]:
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"""
            SELECT id, application_id, previous_status, new_status, actor_id, actor_role, notes, changed_at
            FROM application_status_events
            WHERE application_id = {param_placeholder}
            ORDER BY changed_at ASC
        """
        cursor.execute(sql, (str(application_id),))
        rows = cursor.fetchall()
        return [
            {
                "id": str(r["id"]),
                "application_id": str(r["application_id"]),
                "previous_status": r["previous_status"],
                "new_status": r["new_status"],
                "actor_id": str(r["actor_id"]) if r.get("actor_id") else None,
                "actor_role": r["actor_role"],
                "notes": r["notes"],
                "changed_at": str(r["changed_at"])
            }
            for r in [dict(row) for row in rows]
        ]
