"""
Resume Repository for SwipeX Job & Data Intelligence Service.
Handles database access and SQL execution for parent resumes, resume versions,
job keywords, ATS scores persistence, and canonical skill mapping.
"""
import json
import uuid
from typing import List, Optional, Dict, Any
from db.connection import get_dict_cursor


class ResumeRepository:
    def __init__(self, conn, db_type: str):
        self.conn = conn
        self.db_type = db_type

    def create_resume(self, user_id: str, title: str = "Default Resume") -> Dict[str, Any]:
        """Creates a new parent resume container record for a candidate user."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        resume_id = str(uuid.uuid4())
        clean_user_id = str(user_id).strip()
        clean_title = title.strip() or "Default Resume"

        sql = f"""
            INSERT INTO resumes (id, user_id, title, created_at, updated_at)
            VALUES ({param_placeholder}, {param_placeholder}, {param_placeholder}, NOW(), NOW())
        """ if self.db_type == "postgres" else f"""
            INSERT INTO resumes (id, user_id, title, created_at, updated_at)
            VALUES ({param_placeholder}, {param_placeholder}, {param_placeholder}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """

        cursor.execute(sql, (resume_id, clean_user_id, clean_title))
        self.conn.commit()

        return self.get_resume_by_id(resume_id)

    def get_resume_by_id(self, resume_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a parent resume record by ID."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"SELECT id, user_id, title, created_at, updated_at FROM resumes WHERE id = {param_placeholder}"
        cursor.execute(sql, (str(resume_id),))
        row = cursor.fetchone()
        if not row:
            return None

        r = dict(row)
        return {
            "id": str(r["id"]),
            "user_id": str(r["user_id"]),
            "title": r["title"],
            "created_at": str(r["created_at"]),
            "updated_at": str(r["updated_at"]),
        }

    def list_user_resumes(self, user_id: str) -> List[Dict[str, Any]]:
        """Lists all parent resumes owned by a candidate user."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"""
            SELECT id, user_id, title, created_at, updated_at
            FROM resumes
            WHERE user_id = {param_placeholder}
            ORDER BY created_at DESC
        """
        cursor.execute(sql, (str(user_id),))
        rows = cursor.fetchall()
        return [
            {
                "id": str(r["id"]),
                "user_id": str(r["user_id"]),
                "title": r["title"],
                "created_at": str(r["created_at"]),
                "updated_at": str(r["updated_at"]),
            }
            for r in rows
        ]

    def create_resume_version(
        self,
        resume_id: str,
        file_name: str,
        file_path: str,
        raw_text: str,
        parsed_json: Dict[str, Any],
        is_active: bool = True
    ) -> Dict[str, Any]:
        """
        Safely creates a new resume version:
        1. Computes next version_number monotonically.
        2. If is_active is True, atomically deactivates previous active versions.
        3. Inserts new version record with is_active state.
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        clean_resume_id = str(resume_id).strip()

        # Step 1: Safely determine next version number
        v_sql = f"SELECT COALESCE(MAX(version_number), 0) + 1 FROM resume_versions WHERE resume_id = {param_placeholder}"
        cursor.execute(v_sql, (clean_resume_id,))
        next_version = cursor.fetchone()[0]

        # Step 2: Atomic deactivation of previous active version if new version is active
        if is_active:
            if self.db_type == "postgres":
                deact_sql = f"UPDATE resume_versions SET is_active = FALSE WHERE resume_id = {param_placeholder} AND is_active = TRUE"
            else:
                deact_sql = f"UPDATE resume_versions SET is_active = 0 WHERE resume_id = {param_placeholder} AND is_active = 1"
            cursor.execute(deact_sql, (clean_resume_id,))

        # Step 3: Insert new version
        version_id = str(uuid.uuid4())
        json_payload = json.dumps(parsed_json) if isinstance(parsed_json, dict) else str(parsed_json)
        active_val = True if self.db_type == "postgres" else (1 if is_active else 0)

        if self.db_type == "postgres":
            insert_sql = f"""
                INSERT INTO resume_versions (
                    id, resume_id, file_name, file_path, raw_text, parsed_json, version_number, is_active, created_at
                ) VALUES (
                    {param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder},
                    {param_placeholder}, {param_placeholder}::jsonb, {param_placeholder}, {param_placeholder}, NOW()
                )
            """
        else:
            insert_sql = f"""
                INSERT INTO resume_versions (
                    id, resume_id, file_name, file_path, raw_text, parsed_json, version_number, is_active, created_at
                ) VALUES (
                    {param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder},
                    {param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder}, CURRENT_TIMESTAMP
                )
            """

        cursor.execute(insert_sql, (
            version_id, clean_resume_id, file_name, file_path, raw_text, json_payload, next_version, active_val
        ))
        self.conn.commit()

        return self.get_resume_version_by_id(version_id)

    def get_active_resume_version(self, resume_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves candidate's currently active resume version."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        if self.db_type == "postgres":
            sql = f"SELECT * FROM resume_versions WHERE resume_id = {param_placeholder} AND is_active = TRUE"
        else:
            sql = f"SELECT * FROM resume_versions WHERE resume_id = {param_placeholder} AND is_active = 1"

        cursor.execute(sql, (str(resume_id),))
        row = cursor.fetchone()
        if not row:
            return None

        return self._format_version_dict(row)

    def get_resume_version_by_id(self, version_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a specific resume version by ID."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"SELECT * FROM resume_versions WHERE id = {param_placeholder}"
        cursor.execute(sql, (str(version_id),))
        row = cursor.fetchone()
        if not row:
            return None

        return self._format_version_dict(row)

    def _format_version_dict(self, row) -> Dict[str, Any]:
        r = dict(row)
        parsed = r["parsed_json"]
        if isinstance(parsed, str):
            try:
                parsed = json.loads(parsed)
            except Exception:
                pass

        return {
            "id": str(r["id"]),
            "resume_id": str(r["resume_id"]),
            "file_name": r["file_name"],
            "file_path": r["file_path"],
            "raw_text": r["raw_text"],
            "parsed_json": parsed,
            "version_number": int(r["version_number"]),
            "is_active": bool(r["is_active"]),
            "created_at": str(r["created_at"]),
        }

    def upsert_ats_score(self, resume_version_id: str, job_id: str, match_score: float) -> Dict[str, Any]:
        """
        Persists ATS match score calculation.
        If a score already exists for (resume_version_id, job_id), performs an atomic UPDATE on the existing row.
        Rejects match_score outside [0.00, 100.00].
        """
        if match_score < 0.00 or match_score > 100.00:
            raise ValueError(f"Match score must be between 0.00 and 100.00. Got: {match_score}")

        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        rv_id = str(resume_version_id).strip()
        j_id = str(job_id).strip()
        score_val = round(float(match_score), 2)
        ats_id = str(uuid.uuid4())

        if self.db_type == "postgres":
            sql = f"""
                INSERT INTO ats_scores (id, resume_version_id, job_id, match_score, created_at)
                VALUES ({param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder}, NOW())
                ON CONFLICT (resume_version_id, job_id)
                DO UPDATE SET match_score = EXCLUDED.match_score, created_at = NOW()
                RETURNING id, resume_version_id, job_id, match_score, created_at
            """
            cursor.execute(sql, (ats_id, rv_id, j_id, score_val))
            row = cursor.fetchone()
            self.conn.commit()
            r = dict(row)
            return {
                "id": str(r["id"]),
                "resume_version_id": str(r["resume_version_id"]),
                "job_id": str(r["job_id"]),
                "match_score": float(r["match_score"]),
                "created_at": str(r["created_at"]),
            }
        else:
            # SQLite upsert
            check_sql = f"SELECT id FROM ats_scores WHERE resume_version_id = {param_placeholder} AND job_id = {param_placeholder}"
            cursor.execute(check_sql, (rv_id, j_id))
            existing = cursor.fetchone()

            if existing:
                ats_id = str(existing[0])
                upd_sql = f"""
                    UPDATE ats_scores
                    SET match_score = {param_placeholder}, created_at = CURRENT_TIMESTAMP
                    WHERE resume_version_id = {param_placeholder} AND job_id = {param_placeholder}
                """
                cursor.execute(upd_sql, (score_val, rv_id, j_id))
            else:
                ins_sql = f"""
                    INSERT INTO ats_scores (id, resume_version_id, job_id, match_score, created_at)
                    VALUES ({param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder}, CURRENT_TIMESTAMP)
                """
                cursor.execute(ins_sql, (ats_id, rv_id, j_id, score_val))

            self.conn.commit()

            cursor.execute(f"SELECT id, resume_version_id, job_id, match_score, created_at FROM ats_scores WHERE id = {param_placeholder}", (ats_id,))
            r = dict(cursor.fetchone())
            return {
                "id": str(r["id"]),
                "resume_version_id": str(r["resume_version_id"]),
                "job_id": str(r["job_id"]),
                "match_score": float(r["match_score"]),
                "created_at": str(r["created_at"]),
            }

    def add_job_keywords(self, job_id: str, keywords: List[Dict[str, Any]]) -> int:
        """
        Inserts job keywords for job feature extraction.
        Each keyword dict contains: keyword, keyword_type, weight (default 1.00).
        """
        if not keywords:
            return 0

        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"
        j_id = str(job_id).strip()

        inserted_count = 0
        for kw_item in keywords:
            kw = str(kw_item["keyword"]).strip()
            kw_type = str(kw_item["keyword_type"]).strip()
            weight = float(kw_item.get("weight", 1.00))

            if weight < 0.00 or weight > 5.00:
                raise ValueError(f"Keyword weight must be between 0.00 and 5.00. Got: {weight}")

            kw_id = str(uuid.uuid4())

            if self.db_type == "postgres":
                sql = f"""
                    INSERT INTO job_keywords (id, job_id, keyword, keyword_type, weight, created_at)
                    VALUES ({param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder}, NOW())
                    ON CONFLICT (job_id, LOWER(keyword), keyword_type)
                    DO UPDATE SET weight = EXCLUDED.weight
                """
                cursor.execute(sql, (kw_id, j_id, kw, kw_type, weight))
            else:
                sql = f"""
                    INSERT INTO job_keywords (id, job_id, keyword, keyword_type, weight, created_at)
                    VALUES ({param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder}, CURRENT_TIMESTAMP)
                    ON CONFLICT(job_id, LOWER(keyword), keyword_type) DO UPDATE SET weight = excluded.weight
                """
                cursor.execute(sql, (kw_id, j_id, kw, kw_type, weight))
            inserted_count += 1

        self.conn.commit()
        return inserted_count

    def get_job_keywords(self, job_id: str) -> List[Dict[str, Any]]:
        """Retrieves extracted job keywords for a job posting."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"SELECT id, job_id, keyword, keyword_type, weight, created_at FROM job_keywords WHERE job_id = {param_placeholder}"
        cursor.execute(sql, (str(job_id),))
        rows = cursor.fetchall()
        return [
            {
                "id": str(r["id"]),
                "job_id": str(r["job_id"]),
                "keyword": r["keyword"],
                "keyword_type": r["keyword_type"],
                "weight": float(r["weight"]),
                "created_at": str(r["created_at"]),
            }
            for r in rows
        ]

    def map_resume_skills_to_canonical(self, parsed_json: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Dynamically matches extracted skill strings from parsed_json['skills'] against
        the canonical `skills` table (Option A).
        Does NOT automatically insert unknown skills into the canonical skills table.
        """
        if not isinstance(parsed_json, dict):
            return []

        raw_skills = parsed_json.get("skills", [])
        if not isinstance(raw_skills, list) or not raw_skills:
            return []

        clean_skills = [str(s).strip().lower() for s in raw_skills if s and str(s).strip()]
        if not clean_skills:
            return []

        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        placeholders = ", ".join([param_placeholder] * len(clean_skills))
        sql = f"""
            SELECT id, name, category
            FROM skills
            WHERE LOWER(name) IN ({placeholders})
        """
        cursor.execute(sql, tuple(clean_skills))
        rows = cursor.fetchall()

        return [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "category": r["category"],
            }
            for r in rows
        ]
