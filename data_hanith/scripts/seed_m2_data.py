"""
Seed Data Population Strategy for SwipeX Milestone 2.
Populates M2 extended fields (company profiles, applicant counts, competition levels)
deterministically across the existing 18,328 companies and 97,929 job listings.
"""
import os
import sys
import math

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import DATABASE_URL
from db.connection import get_raw_connection, get_dict_cursor


def compute_competition_level(applicant_count: int) -> str:
    """
    Implementation Decision (SwipeX M2):
    - LOW: < 10 applicants
    - MEDIUM: 10 - 50 applicants
    - HIGH: > 50 applicants
    """
    if applicant_count < 10:
        return "LOW"
    elif applicant_count <= 50:
        return "MEDIUM"
    else:
        return "HIGH"


def run_seed_m2_data(db_url: str = DATABASE_URL):
    print("=== Starting M2 Seed Data Population Strategy ===")
    print(f"Target DB: {db_url}")

    conn, db_type = get_raw_connection(db_url)
    cur = conn.cursor()

    # 1. Enrich Companies
    print("Enriching company profiles (about, size, industry, is_newly_founded)...")
    cur.execute("SELECT id, raw_company_id, name, reviews_count FROM companies;")
    companies = cur.fetchall()

    sizes = ["1-10", "11-50", "51-200", "201-500", "500+"]
    industries = [
        "Information Technology & Services",
        "Financial Services & Fintech",
        "E-Commerce & Retail",
        "Healthcare & Pharmaceuticals",
        "Education & EdTech",
        "Manufacturing & Engineering",
        "Consulting & Professional Services"
    ]

    comp_updates = []
    for c in companies:
        c_id = c[0]
        raw_id = c[1] or 0
        name = c[2] or "Leading Organization"
        reviews = c[3] or 0

        # Deterministic assignment
        size = sizes[raw_id % len(sizes)]
        industry = industries[(raw_id // 3) % len(industries)]
        is_startup = True if (reviews < 5 and size in ("1-10", "11-50")) or (raw_id % 7 == 0) else False

        about_text = (
            f"{name} is a pioneer in the {industry} sector with a team size of {size} employees. "
            f"Dedicated to innovation, excellence, and creating high-impact solutions for global clients."
        )

        comp_updates.append((about_text, size, industry, is_startup, c_id))

    param = "%s" if db_type == "postgres" else "?"
    if db_type == "postgres":
        cur.executemany(
            f"UPDATE companies SET about = %s, size = %s, industry = %s, is_newly_founded = %s WHERE id = %s;",
            comp_updates
        )
    else:
        cur.executemany(
            f"UPDATE companies SET about = ?, size = ?, industry = ?, is_newly_founded = ? WHERE id = ?;",
            comp_updates
        )
    conn.commit()
    print(f"Enriched {len(comp_updates)} company records.")

    # 2. Enrich Jobs (applicant_count & competition_level)
    print("Enriching job listings (applicant_count & competition_level)...")
    cur.execute("SELECT id, raw_job_id FROM jobs;")
    jobs = cur.fetchall()

    job_updates = []
    for j in jobs:
        j_id = j[0]
        raw_j_id = j[1] or 0
        # Deterministic applicant count (0 to 120)
        app_count = (raw_j_id * 17) % 121
        comp_level = compute_competition_level(app_count)
        job_updates.append((app_count, comp_level, j_id))

    if db_type == "postgres":
        cur.executemany(
            f"UPDATE jobs SET applicant_count = %s, competition_level = %s WHERE id = %s;",
            job_updates
        )
    else:
        cur.executemany(
            f"UPDATE jobs SET applicant_count = ?, competition_level = ? WHERE id = ?;",
            job_updates
        )
    conn.commit()
    print(f"Enriched {len(job_updates)} job records.")

    cur.close()
    conn.close()
    print("=== M2 Seed Data Population Completed Successfully ===")


if __name__ == "__main__":
    run_seed_m2_data()
