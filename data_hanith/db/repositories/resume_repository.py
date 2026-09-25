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

    def get_active_resume_version_by_user(self, user_id: str, resume_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves active resume version for a specific resume_id after verifying ownership by user_id.
        Prevents exposing another user's resume.
        """
        parent_resume = self.get_resume_by_id(resume_id)
        if not parent_resume or parent_resume["user_id"] != str(user_id).strip():
            return None
        return self.get_active_resume_version(resume_id)

    def list_resume_versions(self, resume_id: str) -> List[Dict[str, Any]]:
        """Lists all resume versions for a parent resume ordered by version_number DESC."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"""
            SELECT * FROM resume_versions
            WHERE resume_id = {param_placeholder}
            ORDER BY version_number DESC
        """
        cursor.execute(sql, (str(resume_id).strip(),))
        rows = cursor.fetchall()
        return [self._format_version_dict(r) for r in rows]

    def get_latest_resume_version(self, resume_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves the latest resume version for a parent resume using version_number
        (not created_at) as the authoritative ordering.
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"""
            SELECT * FROM resume_versions
            WHERE resume_id = {param_placeholder}
            ORDER BY version_number DESC
            LIMIT 1
        """
        cursor.execute(sql, (str(resume_id).strip(),))
        row = cursor.fetchone()
        if not row:
            return None
        return self._format_version_dict(row)

    def activate_resume_version(self, resume_id: str, version_id: str) -> Optional[Dict[str, Any]]:
        """
        Transactionally activates a specific version:
        1. Verifies the version exists and belongs to resume_id.
        2. Deactivates any currently active version for resume_id.
        3. Sets is_active = True for the target version.
        4. Preserves partial unique active version constraint.
        """
        clean_resume_id = str(resume_id).strip()
        clean_version_id = str(version_id).strip()

        target = self.get_resume_version_by_id(clean_version_id)
        if not target or target["resume_id"] != clean_resume_id:
            return None

        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        # Deactivate all versions for this resume
        if self.db_type == "postgres":
            deact_sql = f"UPDATE resume_versions SET is_active = FALSE WHERE resume_id = {param_placeholder} AND is_active = TRUE"
            act_sql = f"UPDATE resume_versions SET is_active = TRUE WHERE id = {param_placeholder} AND resume_id = {param_placeholder}"
        else:
            deact_sql = f"UPDATE resume_versions SET is_active = 0 WHERE resume_id = {param_placeholder} AND is_active = 1"
            act_sql = f"UPDATE resume_versions SET is_active = 1 WHERE id = {param_placeholder} AND resume_id = {param_placeholder}"

        cursor.execute(deact_sql, (clean_resume_id,))
        cursor.execute(act_sql, (clean_version_id, clean_resume_id))
        self.conn.commit()

        return self.get_resume_version_by_id(clean_version_id)

    def map_resume_skills_to_canonical(self, parsed_json: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Dynamically matches extracted skill strings from parsed_json['skills'] against
        the canonical `skills` table (Option A).
        Does NOT automatically insert unknown skills into the canonical skills table.
        """
        res = self.map_resume_skills_detailed(parsed_json)
        return res["matched_skills"]

    def map_resume_skills_detailed(self, parsed_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Maps extracted skill strings from parsed_json['skills'] against canonical `skills` table.
        Does NOT mutate the canonical skills table for unknown skills.
        Returns detailed dict separating matched canonical skills and unmatched raw skills.
        """
        if not isinstance(parsed_json, dict):
            return {"matched_skills": [], "unmatched_skills": []}

        raw_skills = parsed_json.get("skills", [])
        if not isinstance(raw_skills, list) or not raw_skills:
            return {"matched_skills": [], "unmatched_skills": []}

        clean_skill_map = {}
        for s in raw_skills:
            if s and str(s).strip():
                clean_name = str(s).strip()
                lower_name = clean_name.lower()
                if lower_name not in clean_skill_map:
                    clean_skill_map[lower_name] = clean_name

        if not clean_skill_map:
            return {"matched_skills": [], "unmatched_skills": []}

        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        lower_list = list(clean_skill_map.keys())
        placeholders = ", ".join([param_placeholder] * len(lower_list))
        sql = f"""
            SELECT id, name, category
            FROM skills
            WHERE LOWER(name) IN ({placeholders})
        """
        cursor.execute(sql, tuple(lower_list))
        rows = cursor.fetchall()

        matched_skills = [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "category": r["category"],
            }
            for r in rows
        ]

        matched_lower_set = {m["name"].lower() for m in matched_skills}
        unmatched_skills = [
            clean_skill_map[l_name]
            for l_name in lower_list
            if l_name not in matched_lower_set
        ]

        return {
            "matched_skills": matched_skills,
            "unmatched_skills": unmatched_skills
        }

    def compare_resume_and_job_skills(
        self,
        resume_version_id: str,
        job_id: str,
        job_repo: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Compares a resume version's skills against a job's required skills.
        Returns a deterministic skill-overlap feature payload for Intern 4 matching engine.
        Calculates:
          skill_match_percentage = (matched required job skills / total required job skills) * 100
        Handles 0 required skills safely (returns 100.0%).
        """
        version = self.get_resume_version_by_id(resume_version_id)
        if not version:
            raise ValueError(f"Resume version not found: {resume_version_id}")

        parsed_json = version.get("parsed_json", {})
        mapping_res = self.map_resume_skills_detailed(parsed_json)
        matched_canonical = mapping_res["matched_skills"]
        unmatched_resume_skills = mapping_res["unmatched_skills"]

        # Set of normalized (lower-case) resume skill names
        resume_canonical_lower = {m["name"].lower() for m in matched_canonical}
        resume_all_names = sorted(list({m["name"] for m in matched_canonical} | set(unmatched_resume_skills)))

        # Get required job skills
        if job_repo is not None:
            req_job_skills = job_repo.get_job_required_skills(job_id)
        else:
            cursor = get_dict_cursor(self.conn, self.db_type)
            param_placeholder = "%s" if self.db_type == "postgres" else "?"
            is_req_val = True if self.db_type == "postgres" else 1
            sql = f"""
                SELECT s.id AS skill_id, s.name, s.category, js.is_required, js.weight, js.min_years
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id = {param_placeholder} AND js.is_required = {param_placeholder}
            """
            cursor.execute(sql, (str(job_id), is_req_val))
            rows = cursor.fetchall()
            req_job_skills = [
                {
                    "skill_id": str(r["skill_id"]),
                    "name": r["name"],
                    "category": r["category"],
                    "is_required": bool(r["is_required"]),
                    "weight": float(r["weight"]) if r["weight"] is not None else 1.00,
                    "min_years": float(r["min_years"]) if r["min_years"] is not None else None,
                }
                for r in rows
            ]

        req_job_skill_names = [s["name"] for s in req_job_skills]
        req_job_skill_lower_map = {s["name"].lower(): s["name"] for s in req_job_skills}

        matched_skill_names = sorted([
            req_job_skill_lower_map[l_name]
            for l_name in req_job_skill_lower_map
            if l_name in resume_canonical_lower
        ])

        missing_job_skill_names = sorted([
            req_job_skill_lower_map[l_name]
            for l_name in req_job_skill_lower_map
            if l_name not in resume_canonical_lower
        ])

        matched_count = len(matched_skill_names)
        required_skill_count = len(req_job_skills)

        if required_skill_count == 0:
            skill_match_percentage = 100.0
        else:
            skill_match_percentage = round((matched_count / float(required_skill_count)) * 100.0, 2)

        return {
            "resume_version_id": str(resume_version_id),
            "job_id": str(job_id),
            "resume_skill_names": resume_all_names,
            "matched_skill_names": matched_skill_names,
            "missing_job_skill_names": missing_job_skill_names,
            "matched_count": matched_count,
            "required_skill_count": required_skill_count,
            "skill_match_percentage": skill_match_percentage,
        }

