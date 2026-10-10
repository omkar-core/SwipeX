"""
seed_all.py - Database initialization and seed coordinator for SwipeX.

Ensures table schemas are created for swipex_job, and populates baseline
curated jobs, companies, and skills for immediate Milestone 1 integration testing.
"""
import os
import sys
import uuid
from datetime import datetime, timezone

# Add data_hanith to path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SERVICE_DIR = os.path.join(BASE_DIR, "data_hanith")
sys.path.insert(0, SERVICE_DIR)

from db.connection import get_raw_connection, init_db
from config import DATABASE_URL

CURATED_SEED_JOBS = [
    {
        "title": "Senior Full Stack Engineer",
        "company": "Nexus Technologies",
        "company_rating": 4.5,
        "company_reviews": 128,
        "company_about": "Leading provider of scalable web solutions and enterprise cloud platforms.",
        "company_size": "50-200",
        "company_industry": "Information Technology",
        "company_is_newly_founded": False,
        "location": "Bangalore, India",
        "min_salary": 250000.0,
        "max_salary": 270000.0,
        "currency": "INR",
        "min_exp": 3.0,
        "max_exp": 6.0,
        "work_mode": "REMOTE",
        "job_type": "FULL_TIME",
        "skills": ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "Docker"],
        "description": "Join Nexus Technologies to architect modern swipe-based web platforms using FastAPI and React.",
        "applicant_count": 55,
        "competition_level": "HIGH"
    },
    {
        "title": "AI/ML Solutions Architect",
        "company": "HyperScale AI Labs",
        "company_rating": 4.8,
        "company_reviews": 310,
        "company_about": "Pioneering artificial intelligence and deep learning models for next-gen automation.",
        "company_size": "20-50",
        "company_industry": "Artificial Intelligence",
        "company_is_newly_founded": True,
        "location": "Hyderabad, India",
        "min_salary": 230000.0,
        "max_salary": 265000.0,
        "currency": "INR",
        "min_exp": 4.0,
        "max_exp": 8.0,
        "work_mode": "HYBRID",
        "job_type": "FULL_TIME",
        "skills": ["Python", "PyTorch", "NLP", "FastAPI", "Scikit-Learn", "Docker"],
        "description": "Lead the development of recommendation systems and ATS resume scoring intelligence.",
        "applicant_count": 120,
        "competition_level": "HIGH"
    },
    {
        "title": "Frontend Platform Engineer",
        "company": "FinFlow Payments",
        "company_rating": 4.2,
        "company_reviews": 85,
        "company_about": "Modern financial technology stack powering seamless digital payments.",
        "company_size": "100-500",
        "company_industry": "Fintech",
        "company_is_newly_founded": False,
        "location": "Pune, India",
        "min_salary": 200000.0,
        "max_salary": 240000.0,
        "currency": "INR",
        "min_exp": 2.0,
        "max_exp": 5.0,
        "work_mode": "HYBRID",
        "job_type": "FULL_TIME",
        "skills": ["React", "TypeScript", "Tailwind CSS", "Vite", "Framer Motion"],
        "description": "Create responsive, accessible, animated interfaces for next-generation fintech experiences.",
        "applicant_count": 8,
        "competition_level": "LOW"
    },
    {
        "title": "DevOps & Cloud Engineer",
        "company": "CloudMatrix Systems",
        "company_rating": 4.4,
        "company_reviews": 96,
        "company_about": "Cloud infrastructure automation and enterprise reliability engineering.",
        "company_size": "500+",
        "company_industry": "Cloud Computing",
        "company_is_newly_founded": False,
        "location": "Remote, India",
        "min_salary": 210000.0,
        "max_salary": 250000.0,
        "currency": "INR",
        "min_exp": 3.0,
        "max_exp": 6.0,
        "work_mode": "REMOTE",
        "job_type": "FULL_TIME",
        "skills": ["Docker", "Kubernetes", "AWS", "GitHub Actions", "PostgreSQL", "Linux"],
        "description": "Deploy, monitor, and scale distributed microservices across containerized cloud environments.",
        "applicant_count": 15,
        "competition_level": "MEDIUM"
    },
    {
        "title": "Junior Software Engineer",
        "company": "InnoSpark Studios",
        "company_rating": 4.0,
        "company_reviews": 42,
        "company_about": "Creative software studio crafting engaging developer tools and applications.",
        "company_size": "10-50",
        "company_industry": "Software Development",
        "company_is_newly_founded": True,
        "location": "Chennai, India",
        "min_salary": 150000.0,
        "max_salary": 200000.0,
        "currency": "INR",
        "min_exp": 0.0,
        "max_exp": 2.0,
        "work_mode": "ONSITE",
        "job_type": "FULL_TIME",
        "skills": ["Python", "SQL", "JavaScript", "Git"],
        "description": "Entry-level software engineering opportunity with mentorship on distributed web architectures.",
        "applicant_count": 4,
        "competition_level": "LOW"
    }
]

def seed_database(db_url: str = None):
    target_db_url = db_url or os.environ.get("DATABASE_URL", DATABASE_URL)
    print(f"[SEED] Target database URL: {target_db_url}")
    
    schema_path = os.path.join(SERVICE_DIR, "db", "schema.sql")
    init_db(target_db_url, schema_path)
    print("[SEED] Table schema initialized successfully.")

    conn, db_type = get_raw_connection(target_db_url)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM jobs;")
    count = cur.fetchone()[0]

    if count > 0:
        print(f"[SEED] Database already contains {count} jobs. Skipping seed.")
        cur.close()
        conn.close()
        return

    print(f"[SEED] Populating database with {len(CURATED_SEED_JOBS)} curated job records...")
    now_iso = datetime.now(timezone.utc).isoformat()

    for item in CURATED_SEED_JOBS:
        company_id = str(uuid.uuid4())
        job_id = str(uuid.uuid4())

        # Insert company
        if db_type == "postgres":
            cur.execute("""
                INSERT INTO companies (id, raw_company_id, name, aggregate_rating, reviews_count, about, size, industry, is_newly_founded, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (company_id, 1001, item["company"], item["company_rating"], item["company_reviews"], item["company_about"], item["company_size"], item["company_industry"], item["company_is_newly_founded"], now_iso, now_iso))
        else:
            cur.execute("""
                INSERT INTO companies (id, raw_company_id, name, aggregate_rating, reviews_count, about, size, industry, is_newly_founded, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (company_id, 1001, item["company"], item["company_rating"], item["company_reviews"], item["company_about"], item["company_size"], item["company_industry"], item["company_is_newly_founded"], now_iso, now_iso))

        # Insert job
        if db_type == "postgres":
            cur.execute("""
                INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, min_salary, max_salary, currency, min_experience, max_experience, work_mode, job_type, location, applicant_count, competition_level, posted_at_raw, posted_at_approx, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (job_id, 2001, company_id, item["title"], item["description"], item["min_salary"], item["max_salary"], item["currency"], item["min_exp"], item["max_exp"], item.get("work_mode"), item.get("job_type"), item["location"], item["applicant_count"], item["competition_level"], "Just Now", now_iso, now_iso, now_iso))
        else:
            cur.execute("""
                INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, min_salary, max_salary, currency, min_experience, max_experience, work_mode, job_type, location, applicant_count, competition_level, posted_at_raw, posted_at_approx, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (job_id, 2001, company_id, item["title"], item["description"], item["min_salary"], item["max_salary"], item["currency"], item["min_exp"], item["max_exp"], item.get("work_mode"), item.get("job_type"), item["location"], item["applicant_count"], item["competition_level"], "Just Now", now_iso, now_iso, now_iso))

        # Insert skills & job_skills
        for skill_name in item["skills"]:
            skill_id = str(uuid.uuid4())
            # Insert skill or ignore if existing
            if db_type == "postgres":
                cur.execute("""
                    INSERT INTO skills (id, name, created_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (skill_id, skill_name, now_iso))
                cur.execute("SELECT id FROM skills WHERE LOWER(name) = LOWER(%s)", (skill_name,))
                actual_skill_id = cur.fetchone()[0]
                cur.execute("""
                    INSERT INTO job_skills (job_id, skill_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (job_id, actual_skill_id))
            else:
                try:
                    cur.execute("INSERT OR IGNORE INTO skills (id, name, created_at) VALUES (?, ?, ?)", (skill_id, skill_name, now_iso))
                except Exception:
                    pass
                cur.execute("SELECT id FROM skills WHERE LOWER(name) = LOWER(?)", (skill_name,))
                actual_skill_id = cur.fetchone()[0]
                cur.execute("INSERT OR IGNORE INTO job_skills (job_id, skill_id) VALUES (?, ?)", (job_id, actual_skill_id))

    conn.commit()
    cur.close()
    conn.close()
    print("[SUCCESS] Baseline database seed completed successfully.")

if __name__ == "__main__":
    seed_database()
