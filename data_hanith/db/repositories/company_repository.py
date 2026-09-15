"""
Company Repository for Job & Data Intelligence Service.
Handles database access for paginated company listings, startup filtering, and company profile detail retrieval.
"""
from typing import List, Optional, Dict, Any
from db.connection import get_dict_cursor
from db.repositories.job_repository import JobRepository


class CompanyRepository:
    def __init__(self, conn, db_type: str):
        self.conn = conn
        self.db_type = db_type

    def list_companies(
        self,
        page: int = 1,
        page_size: int = 20,
        newly_founded: Optional[bool] = None,
        industry: Optional[str] = None,
        company_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        where_clauses = []
        params = []

        # 1. Newly Founded / Startup Filter
        if newly_founded is not None:
            if self.db_type == "postgres":
                where_clauses.append(f"c.is_newly_founded = {param_placeholder}")
                params.append(newly_founded)
            else:
                where_clauses.append(f"c.is_newly_founded = {param_placeholder}")
                params.append(1 if newly_founded else 0)

        # 2. Industry Filter (case-insensitive substring)
        if industry and industry.strip():
            if self.db_type == "postgres":
                where_clauses.append(f"c.industry ILIKE {param_placeholder}")
            else:
                where_clauses.append(f"LOWER(c.industry) LIKE LOWER({param_placeholder})")
            params.append(f"%{industry.strip()}%")

        # 3. Company Type Filter
        if company_type and company_type.strip():
            if self.db_type == "postgres":
                where_clauses.append(f"c.company_type ILIKE {param_placeholder}")
            else:
                where_clauses.append(f"LOWER(c.company_type) LIKE LOWER({param_placeholder})")
            params.append(f"%{company_type.strip()}%")

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        offset = (page - 1) * page_size

        sql = f"""
            SELECT
                c.id AS company_id,
                c.raw_company_id,
                c.name,
                c.company_type,
                c.aggregate_rating,
                c.reviews_count,
                c.about,
                c.size,
                c.industry,
                c.is_newly_founded,
                COUNT(j.id) AS job_count
            FROM companies c
            LEFT JOIN jobs j ON c.id = j.company_id
            {where_sql}
            GROUP BY c.id, c.raw_company_id, c.name, c.company_type, c.aggregate_rating,
                     c.reviews_count, c.about, c.size, c.industry, c.is_newly_founded
            ORDER BY c.name ASC NULLS LAST, c.id ASC
            LIMIT {param_placeholder} OFFSET {param_placeholder}
        """
        params.append(page_size)
        params.append(offset)

        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()
        cursor.close()

        results = []
        for r in rows:
            dict_r = dict(r)
            rating = float(dict_r["aggregate_rating"]) if dict_r["aggregate_rating"] is not None else None
            reviews = int(dict_r["reviews_count"]) if dict_r["reviews_count"] is not None else None
            job_cnt = int(dict_r["job_count"]) if dict_r["job_count"] is not None else 0

            results.append({
                "company_id": str(dict_r["company_id"]),
                "raw_company_id": int(dict_r["raw_company_id"]),
                "name": dict_r["name"],
                "company_type": dict_r["company_type"],
                "aggregate_rating": rating,
                "reviews_count": reviews,
                "about": dict_r["about"],
                "size": dict_r["size"],
                "industry": dict_r["industry"],
                "is_newly_founded": bool(dict_r["is_newly_founded"]),
                "job_count": job_cnt
            })

        return results

    def get_company_by_id(self, company_id: str) -> Optional[Dict[str, Any]]:
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"""
            SELECT
                c.id AS company_id,
                c.raw_company_id,
                c.name,
                c.company_type,
                c.aggregate_rating,
                c.reviews_count,
                c.about,
                c.size,
                c.industry,
                c.is_newly_founded,
                COUNT(j.id) AS job_count
            FROM companies c
            LEFT JOIN jobs j ON c.id = j.company_id
            WHERE c.id = {param_placeholder}
            GROUP BY c.id, c.raw_company_id, c.name, c.company_type, c.aggregate_rating,
                     c.reviews_count, c.about, c.size, c.industry, c.is_newly_founded
        """
        cursor.execute(sql, (company_id,))
        row = cursor.fetchone()
        cursor.close()

        if not row:
            return None

        dict_r = dict(row)
        rating = float(dict_r["aggregate_rating"]) if dict_r["aggregate_rating"] is not None else None
        reviews = int(dict_r["reviews_count"]) if dict_r["reviews_count"] is not None else None
        job_cnt = int(dict_r["job_count"]) if dict_r["job_count"] is not None else 0

        # Fetch active job listings for this company
        job_repo = JobRepository(self.conn, self.db_type)
        # Query jobs specifically for this company
        job_sql = f"""
            SELECT j.id AS job_id
            FROM jobs j
            WHERE j.company_id = {param_placeholder}
            ORDER BY j.created_at DESC
            LIMIT 20
        """
        job_cur = get_dict_cursor(self.conn, self.db_type)
        job_cur.execute(job_sql, (company_id,))
        job_rows = job_cur.fetchall()
        job_cur.close()

        company_jobs = []
        for j_row in job_rows:
            j_detail = job_repo.get_job_by_id(str(j_row["job_id"]))
            if j_detail:
                company_jobs.append({
                    "job_id": j_detail["job_id"],
                    "title": j_detail["title"],
                    "company": dict_r["name"],
                    "type": dict_r["company_type"],
                    "location": j_detail["location"],
                    "salary_range": j_detail["salary_range"],
                    "skills": j_detail["skills"],
                    "posted_at": j_detail["posted_at_raw"]
                })

        return {
            "company_id": str(dict_r["company_id"]),
            "raw_company_id": int(dict_r["raw_company_id"]),
            "name": dict_r["name"],
            "company_type": dict_r["company_type"],
            "aggregate_rating": rating,
            "reviews_count": reviews,
            "about": dict_r["about"],
            "size": dict_r["size"],
            "industry": dict_r["industry"],
            "is_newly_founded": bool(dict_r["is_newly_founded"]),
            "job_count": job_cnt,
            "jobs": company_jobs
        }
