"""
Job Repository for Job & Data Intelligence Service.
Handles database access and SQL execution for paginated job search, filtering, and job detail retrieval.
"""
from typing import List, Optional, Dict, Any
from api.schemas.job import JobSummarySchema, JobDetailSchema, CompanyDetailSchema
from db.connection import get_dict_cursor
from services.job_indicators import compute_freshness_level, compute_competition_level


def format_salary_range(min_sal: Optional[float], max_sal: Optional[float], currency: str = "INR") -> str:
    """
    Formats salary range derived strictly from numeric salary fields and currency.
    For undisclosed salaries (both min_sal and max_sal are None), returns 'Not disclosed'.
    Does NOT use or leak experience information.
    """
    if min_sal is None and max_sal is None:
        return "Not disclosed"

    curr = currency if currency else "INR"

    if curr == "INR" and min_sal is not None and max_sal is not None:
        min_lacs = min_sal / 100000.0
        max_lacs = max_sal / 100000.0
        if min_lacs >= 0.1 and max_lacs >= 0.1:
            min_str = f"{min_lacs:g}"
            max_str = f"{max_lacs:g}"
            return f"{min_str}-{max_str} Lacs PA"

    if min_sal is not None and max_sal is not None:
        if min_sal == max_sal:
            return f"{int(min_sal):,} {curr}"
        return f"{int(min_sal):,}-{int(max_sal):,} {curr}"
    elif min_sal is not None:
        return f"From {int(min_sal):,} {curr}"
    elif max_sal is not None:
        return f"Up to {int(max_sal):,} {curr}"

    return "Not disclosed"


class JobRepository:
    def __init__(self, conn, db_type: str):
        self.conn = conn
        self.db_type = db_type

    def list_jobs(
        self,
        page: int = 1,
        page_size: int = 20,
        type_param: Optional[str] = None,
        location_param: Optional[str] = None,
        work_mode_param: Optional[List[str]] = None,
        salary_min: Optional[float] = None,
        salary_max: Optional[float] = None,
        skills_param: Optional[List[str]] = None,
        exclude_job_ids: Optional[List[str]] = None,
        keyword_param: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        cursor = get_dict_cursor(self.conn, self.db_type)

        param_placeholder = "%s" if self.db_type == "postgres" else "?"
        where_clauses = []
        params = []

        # 1. Company Type Filter (case-insensitive)
        if type_param and type_param.strip():
            where_clauses.append(f"LOWER(c.company_type) = LOWER({param_placeholder})")
            params.append(type_param.strip())

        # 2. Location Filter (case-insensitive substring match)
        if location_param and location_param.strip():
            if self.db_type == "postgres":
                where_clauses.append(f"j.location ILIKE {param_placeholder}")
            else:
                where_clauses.append(f"LOWER(j.location) LIKE LOWER({param_placeholder})")
            params.append(f"%{location_param.strip()}%")

        # 3. Work Mode Filter (supports multiple modes: REMOTE, HYBRID, ONSITE)
        if work_mode_param:
            clean_modes = [m.strip() for m in work_mode_param if m.strip()]
            if clean_modes:
                mode_placeholders = ", ".join([param_placeholder] * len(clean_modes))
                where_clauses.append(f"j.work_mode IN ({mode_placeholders})")
                params.extend(clean_modes)

        # 4. Salary Filter (Option B: Exclude undisclosed salary rows when salary filters supplied)
        if salary_min is not None and salary_max is not None:
            where_clauses.append(f"j.min_salary IS NOT NULL AND j.max_salary IS NOT NULL AND j.max_salary >= {param_placeholder} AND j.min_salary <= {param_placeholder}")
            params.append(salary_min)
            params.append(salary_max)
        elif salary_min is not None:
            where_clauses.append(f"j.max_salary IS NOT NULL AND j.max_salary >= {param_placeholder}")
            params.append(salary_min)
        elif salary_max is not None:
            where_clauses.append(f"j.min_salary IS NOT NULL AND j.min_salary <= {param_placeholder}")
            params.append(salary_max)

        # 5. Exclude Swiped Job IDs Filter (Feed Exclusion)
        if exclude_job_ids:
            clean_ex_ids = [str(ex_id).strip() for ex_id in exclude_job_ids if ex_id and str(ex_id).strip()]
            if clean_ex_ids:
                ex_placeholders = ", ".join([param_placeholder] * len(clean_ex_ids))
                where_clauses.append(f"j.id NOT IN ({ex_placeholders})")
                params.extend(clean_ex_ids)

        # 6. Skills Filter (Case-insensitive OR / Match-any semantics)
        if skills_param:
            clean_skills = [sk.strip().lower() for sk in skills_param if sk.strip()]
            if clean_skills:
                placeholders = ", ".join([param_placeholder] * len(clean_skills))
                subquery = f"""
                    j.id IN (
                        SELECT js.job_id
                        FROM job_skills js
                        JOIN skills s ON js.skill_id = s.id
                        WHERE LOWER(s.name) IN ({placeholders})
                    )
                """
                where_clauses.append(subquery)
                params.extend(clean_skills)

        # 7. Keyword Search Filter (Match against title, job_description, or skills)
        if keyword_param and keyword_param.strip():
            clean_kw = f"%{keyword_param.strip()}%"
            if self.db_type == "postgres":
                kw_subquery = f"""(
                    j.title ILIKE {param_placeholder}
                    OR j.job_description ILIKE {param_placeholder}
                    OR j.id IN (
                        SELECT js.job_id
                        FROM job_skills js
                        JOIN skills s ON js.skill_id = s.id
                        WHERE s.name ILIKE {param_placeholder}
                    )
                )"""
            else:
                kw_subquery = f"""(
                    LOWER(j.title) LIKE LOWER({param_placeholder})
                    OR LOWER(j.job_description) LIKE LOWER({param_placeholder})
                    OR j.id IN (
                        SELECT js.job_id
                        FROM job_skills js
                        JOIN skills s ON js.skill_id = s.id
                        WHERE LOWER(s.name) LIKE LOWER({param_placeholder})
                    )
                )"""
            where_clauses.append(kw_subquery)
            params.extend([clean_kw, clean_kw, clean_kw])

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        offset = (page - 1) * page_size

        sql = f"""
            SELECT
                j.id AS job_id,
                j.title,
                c.name AS company_name,
                c.company_type,
                j.location,
                j.min_salary,
                j.max_salary,
                j.currency,
                j.posted_at_raw AS posted_at,
                j.applicant_count,
                j.competition_level,
                j.posted_at_approx,
                j.created_at
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            {where_sql}
            ORDER BY j.created_at DESC, j.id ASC
            LIMIT {param_placeholder} OFFSET {param_placeholder}
        """
        params.append(page_size)
        params.append(offset)

        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()

        if not rows:
            return []

        # Map results and batch fetch skills for returned jobs
        job_list = []
        job_ids = []

        for row in rows:
            r_dict = dict(row)
            j_id = str(r_dict["job_id"])
            job_ids.append(j_id)

            min_sal = float(r_dict["min_salary"]) if r_dict["min_salary"] is not None else None
            max_sal = float(r_dict["max_salary"]) if r_dict["max_salary"] is not None else None
            curr = str(r_dict["currency"]) if r_dict["currency"] else "INR"

            sal_range_str = format_salary_range(min_sal, max_sal, curr)
            app_count = int(r_dict["applicant_count"]) if r_dict.get("applicant_count") is not None else 0
            comp_lvl = compute_competition_level(app_count)
            fresh_lvl = compute_freshness_level(
                posted_at_approx=r_dict.get("posted_at_approx"),
                posted_at_raw=r_dict.get("posted_at"),
                created_at=r_dict.get("created_at")
            )

            job_list.append({
                "job_id": j_id,
                "title": r_dict["title"],
                "company": r_dict["company_name"],
                "type": r_dict["company_type"],
                "location": r_dict["location"],
                "salary_range": sal_range_str,
                "skills": [],
                "posted_at": r_dict["posted_at"],
                "freshness_level": fresh_lvl,
                "applicant_count": app_count,
                "competition_level": comp_lvl,
            })

        # Batch fetch skills for jobs
        if job_ids:
            j_placeholders = ", ".join([param_placeholder] * len(job_ids))
            sk_sql = f"""
                SELECT js.job_id, s.name
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id IN ({j_placeholders})
            """
            cursor.execute(sk_sql, tuple(job_ids))
            sk_rows = cursor.fetchall()

            skills_by_job: Dict[str, List[str]] = {}
            for sk_r in sk_rows:
                sk_dict = dict(sk_r)
                j_key = str(sk_dict["job_id"])
                skills_by_job.setdefault(j_key, []).append(sk_dict["name"])

            for job_item in job_list:
                job_item["skills"] = skills_by_job.get(job_item["job_id"], [])

        return job_list

    def get_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"""
            SELECT
                j.id AS job_id,
                j.raw_job_id,
                j.title,
                j.job_description,
                j.min_salary,
                j.max_salary,
                j.currency,
                j.min_experience,
                j.max_experience,
                j.raw_experience_str AS experience_str,
                j.location,
                j.work_mode,
                j.job_type,
                j.posted_at_raw,
                j.posted_at_approx,
                j.created_at,
                j.applicant_count,
                j.competition_level,
                c.id AS company_id,
                c.raw_company_id,
                c.name AS company_name,
                c.company_type,
                c.aggregate_rating,
                c.reviews_count
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.id = {param_placeholder}
        """
        cursor.execute(sql, (job_id,))
        row = cursor.fetchone()

        if not row:
            return None

        r = dict(row)

        # Fetch skills for single job
        sk_sql = f"""
            SELECT s.name
            FROM job_skills js
            JOIN skills s ON js.skill_id = s.id
            WHERE js.job_id = {param_placeholder}
        """
        cursor.execute(sk_sql, (job_id,))
        sk_rows = cursor.fetchall()
        skill_names = [dict(s_r)["name"] for s_r in sk_rows]

        company_obj = None
        if r["company_id"]:
            company_obj = {
                "company_id": str(r["company_id"]),
                "raw_company_id": int(r["raw_company_id"]),
                "name": r["company_name"],
                "company_type": r["company_type"],
                "aggregate_rating": float(r["aggregate_rating"]) if r["aggregate_rating"] is not None else None,
                "reviews_count": int(r["reviews_count"]) if r["reviews_count"] is not None else None,
            }

        min_sal = float(r["min_salary"]) if r["min_salary"] is not None else None
        max_sal = float(r["max_salary"]) if r["max_salary"] is not None else None
        curr = str(r["currency"]) if r["currency"] else "INR"
        sal_range_str = format_salary_range(min_sal, max_sal, curr)
        app_count = int(r["applicant_count"]) if r.get("applicant_count") is not None else 0
        comp_lvl = compute_competition_level(app_count)
        fresh_lvl = compute_freshness_level(
            posted_at_approx=r.get("posted_at_approx"),
            posted_at_raw=r.get("posted_at_raw"),
            created_at=r.get("created_at")
        )

        return {
            "job_id": str(r["job_id"]),
            "raw_job_id": int(r["raw_job_id"]),
            "title": r["title"],
            "job_description": r["job_description"],
            "company": company_obj,
            "min_salary": min_sal,
            "max_salary": max_sal,
            "currency": curr,
            "salary_range": sal_range_str,
            "min_experience": float(r["min_experience"]) if r["min_experience"] is not None else None,
            "max_experience": float(r["max_experience"]) if r["max_experience"] is not None else None,
            "experience_str": r["experience_str"],
            "location": r["location"],
            "work_mode": r["work_mode"],
            "job_type": r["job_type"],
            "posted_at_raw": r["posted_at_raw"],
            "posted_at_approx": str(r["posted_at_approx"]) if r["posted_at_approx"] is not None else None,
            "skills": skill_names,
            "freshness_level": fresh_lvl,
            "applicant_count": app_count,
            "competition_level": comp_lvl,
        }
