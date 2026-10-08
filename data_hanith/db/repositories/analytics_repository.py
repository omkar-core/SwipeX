"""
Analytics Repository for Job & Data Intelligence Service.
Handles analytics computations, snapshots, application funnels, resume performance tracking,
skills-in-demand analysis, and hiring trend aggregation.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from config import get_reference_time
from db.connection import get_dict_cursor
from services.job_indicators import classify_company_type, parse_datetime_utc

logger = logging.getLogger("swipex_analytics")


class AnalyticsRepository:
    def __init__(self, conn, db_type: str):
        self.conn = conn
        self.db_type = db_type

    # -------------------------------------------------------------------------
    # 1. DAILY APPLICATION ANALYTICS SNAPSHOT (End-of-day cumulative snapshot)
    # Grain: (snapshot_date, job_id)
    # -------------------------------------------------------------------------
    def generate_daily_application_analytics(self, snapshot_date: Optional[str] = None) -> int:
        """
        Generates and upserts cumulative end-of-day application analytics snapshot.
        Grain: (snapshot_date, job_id)
        Returns the number of snapshot rows upserted.
        """
        if not snapshot_date:
            snapshot_date = get_reference_time().date().isoformat()

        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        # Query all jobs that have applications
        sql = f"""
            SELECT
                j.id AS job_id,
                j.company_id,
                COUNT(a.id) AS total_applications,
                SUM(CASE WHEN a.status = 'APPLIED' THEN 1 ELSE 0 END) AS applied_count,
                SUM(CASE WHEN a.status = 'SHORTLISTED' THEN 1 ELSE 0 END) AS shortlisted_count,
                SUM(CASE WHEN a.status = 'INTERVIEW' THEN 1 ELSE 0 END) AS interview_count,
                SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,
                SUM(CASE WHEN a.status = 'WITHDRAWN' THEN 1 ELSE 0 END) AS withdrawn_count
            FROM jobs j
            JOIN applications a ON j.id = a.job_id
            WHERE DATE(a.applied_at) <= {param_placeholder}
            GROUP BY j.id, j.company_id
        """
        cursor.execute(sql, (snapshot_date,))
        rows = cursor.fetchall()

        if not rows:
            return 0

        now_str = datetime.now(timezone.utc).isoformat()
        count = 0

        for row in rows:
            r = dict(row)
            j_id = str(r["job_id"])
            c_id = str(r["company_id"])
            tot = int(r["total_applications"] or 0)
            app_cnt = int(r["applied_count"] or 0)
            short_cnt = int(r["shortlisted_count"] or 0)
            int_cnt = int(r["interview_count"] or 0)
            rej_cnt = int(r["rejected_count"] or 0)
            with_cnt = int(r["withdrawn_count"] or 0)

            if self.db_type == "postgres":
                upsert_sql = """
                    INSERT INTO daily_application_analytics (
                        snapshot_date, company_id, job_id, total_applications,
                        applied_count, shortlisted_count, interview_count,
                        rejected_count, withdrawn_count, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (snapshot_date, job_id) DO UPDATE SET
                        total_applications = EXCLUDED.total_applications,
                        applied_count = EXCLUDED.applied_count,
                        shortlisted_count = EXCLUDED.shortlisted_count,
                        interview_count = EXCLUDED.interview_count,
                        rejected_count = EXCLUDED.rejected_count,
                        withdrawn_count = EXCLUDED.withdrawn_count,
                        updated_at = EXCLUDED.updated_at
                """
                cursor.execute(upsert_sql, (snapshot_date, c_id, j_id, tot, app_cnt, short_cnt, int_cnt, rej_cnt, with_cnt, now_str))
            else:
                upsert_sql = """
                    INSERT OR REPLACE INTO daily_application_analytics (
                        snapshot_date, company_id, job_id, total_applications,
                        applied_count, shortlisted_count, interview_count,
                        rejected_count, withdrawn_count, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                cursor.execute(upsert_sql, (snapshot_date, c_id, j_id, tot, app_cnt, short_cnt, int_cnt, rej_cnt, with_cnt, now_str))

            count += 1

        self.conn.commit()
        return count

    # -------------------------------------------------------------------------
    # 2. DAILY HIRING TREND ANALYTICS SNAPSHOT
    # Grain: (snapshot_date, company_type_category, skill_id)
    # Approved Rule: Skill aggregation counts jobs/applications per skill.
    # Note: A single application/job with multiple skills contributes to multiple skill rows.
    # -------------------------------------------------------------------------
    def generate_daily_hiring_trend_analytics(self, snapshot_date: Optional[str] = None) -> int:
        """
        Generates and upserts hiring trend analytics by company category and skill.
        Grain: (snapshot_date, company_type_category, skill_id)
        """
        if not snapshot_date:
            snapshot_date = get_reference_time().date().isoformat()

        cursor = get_dict_cursor(self.conn, self.db_type)

        # 1. Fetch active jobs with their company_type, skills, and application counts
        sql = """
            SELECT
                j.id AS job_id,
                j.min_salary,
                j.max_salary,
                c.company_type,
                js.skill_id,
                COUNT(a.id) AS app_count
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            JOIN job_skills js ON j.id = js.job_id
            LEFT JOIN applications a ON j.id = a.job_id
            GROUP BY j.id, j.min_salary, j.max_salary, c.company_type, js.skill_id
        """
        cursor.execute(sql)
        rows = cursor.fetchall()

        if not rows:
            return 0

        # Aggregate metrics in-memory by (company_type_category, skill_id)
        # Using approved classify_company_type mapping (STARTUP / MNC / OTHER)
        groups: Dict[Tuple[str, str], Dict[str, Any]] = {}

        for row in rows:
            r = dict(row)
            cat = classify_company_type(r.get("company_type"))
            skill_id = str(r["skill_id"])
            app_cnt = int(r["app_count"] or 0)
            min_s = float(r["min_salary"]) if r.get("min_salary") is not None else None
            max_s = float(r["max_salary"]) if r.get("max_salary") is not None else None

            key = (cat, skill_id)
            if key not in groups:
                groups[key] = {
                    "jobs": set(),
                    "app_count": 0,
                    "min_salaries": [],
                    "max_salaries": []
                }

            groups[key]["jobs"].add(str(r["job_id"]))
            groups[key]["app_count"] += app_cnt
            if min_s is not None:
                groups[key]["min_salaries"].append(min_s)
            if max_s is not None:
                groups[key]["max_salaries"].append(max_s)

        now_str = datetime.now(timezone.utc).isoformat()
        count = 0

        for (cat, skill_id), data in groups.items():
            jobs_posted = len(data["jobs"])
            apps_received = data["app_count"]
            avg_min = round(sum(data["min_salaries"]) / len(data["min_salaries"]), 2) if data["min_salaries"] else None
            avg_max = round(sum(data["max_salaries"]) / len(data["max_salaries"]), 2) if data["max_salaries"] else None

            if self.db_type == "postgres":
                upsert_sql = """
                    INSERT INTO daily_hiring_trend_analytics (
                        snapshot_date, company_type_category, skill_id,
                        jobs_posted_count, applications_received_count,
                        avg_min_salary, avg_max_salary, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (snapshot_date, company_type_category, skill_id) DO UPDATE SET
                        jobs_posted_count = EXCLUDED.jobs_posted_count,
                        applications_received_count = EXCLUDED.applications_received_count,
                        avg_min_salary = EXCLUDED.avg_min_salary,
                        avg_max_salary = EXCLUDED.avg_max_salary,
                        updated_at = EXCLUDED.updated_at
                """
                cursor.execute(upsert_sql, (snapshot_date, cat, skill_id, jobs_posted, apps_received, avg_min, avg_max, now_str))
            else:
                upsert_sql = """
                    INSERT OR REPLACE INTO daily_hiring_trend_analytics (
                        snapshot_date, company_type_category, skill_id,
                        jobs_posted_count, applications_received_count,
                        avg_min_salary, avg_max_salary, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """
                cursor.execute(upsert_sql, (snapshot_date, cat, skill_id, jobs_posted, apps_received, avg_min, avg_max, now_str))

            count += 1

        self.conn.commit()
        return count

    # -------------------------------------------------------------------------
    # 3. APPLICATION FUNNEL ANALYTICS
    # -------------------------------------------------------------------------
    def get_application_funnel(
        self,
        user_id: Optional[str] = None,
        job_id: Optional[str] = None,
        company_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves stage-by-stage application funnel metrics and conversion rates.
        Supports filtering by user_id, job_id, or company_id.
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"
        where_clauses = []
        params = []

        if user_id:
            where_clauses.append(f"a.user_id = {param_placeholder}")
            params.append(str(user_id))
        if job_id:
            where_clauses.append(f"a.job_id = {param_placeholder}")
            params.append(str(job_id))
        if company_id:
            where_clauses.append(f"j.company_id = {param_placeholder}")
            params.append(str(company_id))

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        sql = f"""
            SELECT
                COUNT(a.id) AS total_applications,
                SUM(CASE WHEN a.status = 'APPLIED' THEN 1 ELSE 0 END) AS applied_count,
                SUM(CASE WHEN a.status = 'SHORTLISTED' THEN 1 ELSE 0 END) AS shortlisted_count,
                SUM(CASE WHEN a.status = 'INTERVIEW' THEN 1 ELSE 0 END) AS interview_count,
                SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,
                SUM(CASE WHEN a.status = 'WITHDRAWN' THEN 1 ELSE 0 END) AS withdrawn_count
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            {where_sql}
        """
        cursor.execute(sql, tuple(params))
        r = dict(cursor.fetchone() or {})

        total = int(r.get("total_applications") or 0)
        applied = int(r.get("applied_count") or 0)
        shortlisted = int(r.get("shortlisted_count") or 0)
        interview = int(r.get("interview_count") or 0)
        rejected = int(r.get("rejected_count") or 0)
        withdrawn = int(r.get("withdrawn_count") or 0)

        # Conversion rate calculations
        app_to_short_pct = round((shortlisted / applied * 100.0), 2) if applied > 0 else 0.0
        short_to_int_pct = round((interview / shortlisted * 100.0), 2) if shortlisted > 0 else 0.0
        overall_conversion_pct = round((interview / total * 100.0), 2) if total > 0 else 0.0

        return {
            "total_applications": total,
            "applied_count": applied,
            "shortlisted_count": shortlisted,
            "interview_count": interview,
            "rejected_count": rejected,
            "withdrawn_count": withdrawn,
            "conversion_rates": {
                "applied_to_shortlisted_pct": app_to_short_pct,
                "shortlisted_to_interview_pct": short_to_int_pct,
                "overall_conversion_pct": overall_conversion_pct,
            }
        }

    # -------------------------------------------------------------------------
    # 4. RESUME VERSION PERFORMANCE ANALYTICS
    # -------------------------------------------------------------------------
    def log_resume_version_view(
        self,
        resume_version_id: str,
        viewer_user_id: str,
        job_id: Optional[str] = None
    ) -> str:
        """Logs a resume view event in resume_version_views."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        view_id = str(uuid.uuid4())
        now_str = datetime.now(timezone.utc).isoformat()
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"""
            INSERT INTO resume_version_views (id, resume_version_id, viewer_user_id, job_id, viewed_at)
            VALUES ({param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder}, {param_placeholder})
        """
        cursor.execute(sql, (view_id, str(resume_version_id), str(viewer_user_id), str(job_id) if job_id else None, now_str))
        self.conn.commit()
        return view_id

    def get_resume_version_performance(
        self,
        user_id: Optional[str] = None,
        resume_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves resume version performance metrics (views, applications, interview conversions).
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"
        where_clauses = []
        params = []

        if user_id:
            where_clauses.append(f"r.user_id = {param_placeholder}")
            params.append(str(user_id))
        if resume_id:
            where_clauses.append(f"rv.resume_id = {param_placeholder}")
            params.append(str(resume_id))

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        sql = f"""
            SELECT
                rv.id AS resume_version_id,
                rv.resume_id,
                rv.version_number,
                rv.file_name,
                rv.is_active,
                (SELECT COUNT(*) FROM resume_version_views rvv WHERE rvv.resume_version_id = rv.id) AS views_count,
                (SELECT COUNT(*) FROM applications a WHERE a.resume_version_id = rv.id) AS applications_count,
                (SELECT COUNT(*) FROM applications a WHERE a.resume_version_id = rv.id AND a.status = 'INTERVIEW') AS interviews_count
            FROM resume_versions rv
            JOIN resumes r ON rv.resume_id = r.id
            {where_sql}
            ORDER BY rv.version_number DESC
        """
        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()

        results = []
        for row in rows:
            r = dict(row)
            views = int(r["views_count"] or 0)
            apps = int(r["applications_count"] or 0)
            interviews = int(r["interviews_count"] or 0)

            view_to_app_pct = round((apps / views * 100.0), 2) if views > 0 else 0.0
            app_to_int_pct = round((interviews / apps * 100.0), 2) if apps > 0 else 0.0

            results.append({
                "resume_version_id": str(r["resume_version_id"]),
                "resume_id": str(r["resume_id"]),
                "version_number": int(r["version_number"]),
                "file_name": r["file_name"],
                "is_active": bool(r["is_active"]),
                "views_count": views,
                "applications_count": apps,
                "interviews_count": interviews,
                "view_to_app_conversion_pct": view_to_app_pct,
                "app_to_interview_conversion_pct": app_to_int_pct,
            })

        return results

    # -------------------------------------------------------------------------
    # 5. SKILLS-IN-DEMAND / SKILL-GAP ANALYTICS
    # -------------------------------------------------------------------------
    def get_skills_in_demand(
        self,
        limit: int = 20,
        company_type_category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top in-demand skills ranked by active job postings and application volume.
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"
        where_clauses = []
        params = []

        if company_type_category:
            where_clauses.append(f"d.company_type_category = {param_placeholder}")
            params.append(company_type_category.upper())

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        sql = f"""
            SELECT
                s.id AS skill_id,
                s.name AS skill_name,
                s.category AS skill_category,
                SUM(d.jobs_posted_count) AS total_jobs_posted,
                SUM(d.applications_received_count) AS total_applications_received,
                AVG(d.avg_min_salary) AS avg_min_salary,
                AVG(d.avg_max_salary) AS avg_max_salary
            FROM daily_hiring_trend_analytics d
            JOIN skills s ON d.skill_id = s.id
            {where_sql}
            GROUP BY s.id, s.name, s.category
            ORDER BY total_jobs_posted DESC, total_applications_received DESC
            LIMIT {param_placeholder}
        """
        params.append(limit)

        try:
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
            if rows:
                return [
                    {
                        "skill_id": str(r["skill_id"]),
                        "name": r["skill_name"],
                        "category": r["skill_category"],
                        "total_jobs_posted": int(r["total_jobs_posted"] or 0),
                        "total_applications_received": int(r["total_applications_received"] or 0),
                        "avg_min_salary": round(float(r["avg_min_salary"]), 2) if r.get("avg_min_salary") is not None else None,
                        "avg_max_salary": round(float(r["avg_max_salary"]), 2) if r.get("avg_max_salary") is not None else None,
                    }
                    for r in [dict(row) for row in rows]
                ]
        except Exception:
            pass

        # Fallback to direct job_skills query if snapshot aggregate is empty
        fallback_sql = f"""
            SELECT
                s.id AS skill_id,
                s.name AS skill_name,
                s.category AS skill_category,
                COUNT(js.job_id) AS total_jobs_posted,
                AVG(j.min_salary) AS avg_min_salary,
                AVG(j.max_salary) AS avg_max_salary
            FROM job_skills js
            JOIN skills s ON js.skill_id = s.id
            JOIN jobs j ON js.job_id = j.id
            GROUP BY s.id, s.name, s.category
            ORDER BY total_jobs_posted DESC
            LIMIT {param_placeholder}
        """
        cursor.execute(fallback_sql, (limit,))
        rows = cursor.fetchall()
        return [
            {
                "skill_id": str(r["skill_id"]),
                "name": r["skill_name"],
                "category": r["skill_category"],
                "total_jobs_posted": int(r["total_jobs_posted"] or 0),
                "total_applications_received": 0,
                "avg_min_salary": round(float(r["avg_min_salary"]), 2) if r.get("avg_min_salary") is not None else None,
                "avg_max_salary": round(float(r["avg_max_salary"]), 2) if r.get("avg_max_salary") is not None else None,
            }
            for r in [dict(row) for row in rows]
        ]

    # -------------------------------------------------------------------------
    # 6. HIRING TREND ANALYTICS QUERIES
    # -------------------------------------------------------------------------
    def get_hiring_trends(
        self,
        company_type_category: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves hiring trend time-series snapshots."""
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"
        where_clauses = []
        params = []

        if company_type_category:
            where_clauses.append(f"d.company_type_category = {param_placeholder}")
            params.append(company_type_category.upper())
        if start_date:
            where_clauses.append(f"d.snapshot_date >= {param_placeholder}")
            params.append(start_date)
        if end_date:
            where_clauses.append(f"d.snapshot_date <= {param_placeholder}")
            params.append(end_date)

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        sql = f"""
            SELECT
                d.snapshot_date,
                d.company_type_category,
                s.name AS skill_name,
                d.jobs_posted_count,
                d.applications_received_count,
                d.avg_min_salary,
                d.avg_max_salary
            FROM daily_hiring_trend_analytics d
            JOIN skills s ON d.skill_id = s.id
            {where_sql}
            ORDER BY d.snapshot_date DESC, d.jobs_posted_count DESC
        """
        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()
        return [
            {
                "snapshot_date": str(r["snapshot_date"]),
                "company_type_category": r["company_type_category"],
                "skill_name": r["skill_name"],
                "jobs_posted_count": int(r["jobs_posted_count"]),
                "applications_received_count": int(r["applications_received_count"]),
                "avg_min_salary": float(r["avg_min_salary"]) if r.get("avg_min_salary") is not None else None,
                "avg_max_salary": float(r["avg_max_salary"]) if r.get("avg_max_salary") is not None else None,
            }
            for r in [dict(row) for row in rows]
        ]

    # -------------------------------------------------------------------------
    # 7. RECOMMENDATION-INSIGHT DATA SUPPORT
    # -------------------------------------------------------------------------
    def get_candidate_performance_insights(self, user_id: str) -> Dict[str, Any]:
        """
        Assembles candidate career performance insights for AI recommendation engine:
        - Overall application funnel
        - Active resume version conversions
        - Top matching low competition job opportunities
        """
        funnel = self.get_application_funnel(user_id=user_id)
        resumes = self.get_resume_version_performance(user_id=user_id)
        low_comp_jobs = self.get_skills_in_demand(limit=5)

        return {
            "user_id": str(user_id),
            "application_funnel": funnel,
            "resume_versions": resumes,
            "recommended_in_demand_skills": low_comp_jobs,
        }
