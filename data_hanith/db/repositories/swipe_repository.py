"""
Swipe Repository for Job & Data Intelligence Service.
Handles database access for inserting swipes and fetching user swipe history.
"""
import uuid
import sqlite3
from typing import List, Tuple, Optional, Dict, Any, Set
from datetime import datetime, timezone
from db.connection import get_dict_cursor

try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


class SwipeRepository:
    def __init__(self, conn, db_type: str):
        self.conn = conn
        self.db_type = db_type

    def check_job_exists(self, job_id: str) -> bool:
        """
        Verifies whether a job record exists for the given job_id UUID.
        """
        cursor = self.conn.cursor()
        placeholder = "%s" if self.db_type == "postgres" else "?"
        query = f"SELECT 1 FROM jobs WHERE id = {placeholder} LIMIT 1;"
        cursor.execute(query, (job_id,))
        row = cursor.fetchone()
        cursor.close()
        return row is not None

    def create_swipe(self, user_id: str, job_id: str, direction: str) -> Tuple[Optional[str], bool]:
        """
        Inserts a swipe record for the authenticated user and target job.
        Enforces UNIQUE(user_id, job_id) constraint.

        Returns (swipe_id, is_duplicate).
        If (user_id, job_id) already exists, returns (None, True).
        """
        swipe_id = str(uuid.uuid4())
        swiped_at = datetime.now(timezone.utc).isoformat()
        placeholder = "%s" if self.db_type == "postgres" else "?"

        query = f"""
            INSERT INTO swipes (id, user_id, job_id, direction, swiped_at)
            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder});
        """

        cursor = self.conn.cursor()
        try:
            cursor.execute(query, (swipe_id, user_id, job_id, direction, swiped_at))
            self.conn.commit()
            cursor.close()
            return swipe_id, False
        except (sqlite3.IntegrityError, Exception) as exc:
            self.conn.rollback()
            cursor.close()
            err_msg = str(exc).lower()
            # Check for unique constraint violation on (user_id, job_id)
            if "unique" in err_msg or "duplicate" in err_msg or "uq_user_job_swipe" in err_msg:
                return None, True
            raise exc

    def get_swipe_history(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all swipe actions performed by the authenticated user in reverse chronological order.
        Strictly scoped by user_id.
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        placeholder = "%s" if self.db_type == "postgres" else "?"

        query = f"""
            SELECT job_id, direction, swiped_at
            FROM swipes
            WHERE user_id = {placeholder}
            ORDER BY swiped_at DESC;
        """

        cursor.execute(query, (user_id,))
        rows = cursor.fetchall()

        results = []
        for r in rows:
            dict_row = dict(r) if not isinstance(r, dict) else r
            # Format swiped_at to ISO string if datetime
            sw_at = dict_row.get("swiped_at")
            if isinstance(sw_at, datetime):
                sw_at = sw_at.isoformat()
            results.append({
                "job_id": str(dict_row["job_id"]),
                "direction": str(dict_row["direction"]),
                "swiped_at": str(sw_at)
            })

        cursor.close()
        return results

    def get_user_swiped_job_ids(self, user_id: str) -> Set[str]:
        """
        Retrieves the set of all swiped job_ids (both RIGHT and LEFT) for user_id directly from PostgreSQL.
        Used as durable source of truth when Redis set is missing or offline.
        """
        cursor = self.conn.cursor()
        placeholder = "%s" if self.db_type == "postgres" else "?"
        query = f"SELECT job_id FROM swipes WHERE user_id = {placeholder};"
        cursor.execute(query, (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        return {str(r[0]) for r in rows}

