"""
Production PostgreSQL Verification Script for Job & Data Intelligence Domain.
Executes schema creation, Dataset 1 ingestion, data-rule validation, skill case-insensitivity checks,
foreign key integrity checks, and SQL reporting directly against PostgreSQL 18+.
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import RAW_DATASET1_PATH
from scripts.ingest_dataset1 import run_ingestion

POSTGRES_URL = "postgresql://postgres@127.0.0.1:5432/swipex_job_db"


def run_full_postgres_verification():
    print("==================================================")
    print("1. POSTGRESQL CONNECTION & SCHEMA INITIALIZATION")
    print("==================================================")
    
    # Ensure database exists
    conn_sys = psycopg2.connect(dbname="postgres", user="postgres", host="127.0.0.1", port=5432)
    conn_sys.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur_sys = conn_sys.cursor()
    cur_sys.execute("DROP DATABASE IF EXISTS swipex_job_db;")
    cur_sys.execute("CREATE DATABASE swipex_job_db;")
    cur_sys.close()
    conn_sys.close()
    print("[OK] Created fresh PostgreSQL database 'swipex_job_db'")

    # Run ingestion against PostgreSQL
    print("\n==================================================")
    print("2. DATASET 1 INGESTION ON POSTGRESQL")
    print("==================================================")
    stats = run_ingestion(dataset_path=RAW_DATASET1_PATH, db_url=POSTGRES_URL)

    conn = psycopg2.connect(POSTGRES_URL)
    cur = conn.cursor()

    print(f"[OK] Ingestion finished. Stats: {stats}")

    # Check extension
    cur.execute("SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp';")
    ext = cur.fetchone()
    print(f"[OK] Extension uuid-ossp enabled: {ext is not None}")

    # Check tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
    tables = [t[0] for t in cur.fetchall()]
    print(f"[OK] PostgreSQL Tables in DB: {tables}")

    # Check Foreign Keys
    cur.execute("""
        SELECT tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY';
    """)
    fks = cur.fetchall()
    print(f"[OK] Foreign Keys in PostgreSQL ({len(fks)} found):")
    for fk in fks:
        print(f"  - {fk[1]}.{fk[2]} -> {fk[3]}")

    # Check Indexes
    cur.execute("SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';")
    indexes = cur.fetchall()
    print(f"[OK] Indexes in PostgreSQL ({len(indexes)} found):")
    for idx in indexes:
        print(f"  - {idx[0]} ON {idx[1]}")

    # Counts
    df_raw = pd.read_excel(RAW_DATASET1_PATH)
    source_rows = len(df_raw)
    
    cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM companies;")
    companies_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM skills;")
    skills_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM job_skills;")
    job_skills_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT raw_job_id) FROM jobs;")
    unique_raw_job_ids = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM jobs WHERE raw_job_id IN (SELECT raw_job_id FROM jobs GROUP BY raw_job_id HAVING COUNT(*) > 1);")
    dup_raw_job_id_rows = cur.fetchone()[0]

    print("\n--------------------------------------------------")
    print("EXACT INGESTION COUNTS ON POSTGRESQL:")
    print(f"  Source Excel rows:            {source_rows}")
    print(f"  Jobs inserted:                {jobs_count}")
    print(f"  Companies inserted:           {companies_count}")
    print(f"  Skills inserted:              {skills_count}")
    print(f"  JobSkills inserted:           {job_skills_count}")
    print(f"  Unique raw_job_id:            {unique_raw_job_ids}")
    print(f"  Duplicate raw_job_id rows:    {dup_raw_job_id_rows}")
    print("--------------------------------------------------")

    print("\n==================================================")
    print("3. DATA RULE VERIFICATION ON POSTGRESQL")
    print("==================================================")

    # 1. Salary 0 check
    cur.execute("SELECT COUNT(*) FROM jobs WHERE min_salary = 0 OR max_salary = 0;")
    zero_sal = cur.fetchone()[0]
    print(f"  - Salary 0 count: {zero_sal} (Expected: 0)")

    # 2. NULL salary check
    cur.execute("SELECT COUNT(*) FROM jobs WHERE min_salary IS NULL AND max_salary IS NULL;")
    null_sal = cur.fetchone()[0]
    print(f"  - NULL min & max salary count: {null_sal} (Expected: 64,700)")

    # 3. Currency values
    cur.execute("SELECT currency, COUNT(*) FROM jobs GROUP BY currency;")
    curr_vals = cur.fetchall()
    print(f"  - Currency distribution: {curr_vals}")

    # 4. company_type values
    cur.execute("SELECT COUNT(*) FROM companies WHERE company_type IS NOT NULL;")
    comp_types = cur.fetchone()[0]
    print(f"  - Populated company_type count: {comp_types} (Expected: 0)")

    # 5. work_mode values
    cur.execute("SELECT COUNT(*) FROM jobs WHERE work_mode IS NOT NULL;")
    work_modes = cur.fetchone()[0]
    print(f"  - Populated work_mode count: {work_modes} (Expected: 0)")

    # 6. job_type values
    cur.execute("SELECT COUNT(*) FROM jobs WHERE job_type IS NOT NULL;")
    job_types = cur.fetchone()[0]
    print(f"  - Populated job_type count: {job_types} (Expected: 0)")

    # 7. Missing company names
    cur.execute("SELECT name FROM companies WHERE raw_company_id = 1346914;")
    resolved_comp = cur.fetchone()[0]
    print(f"  - Missing companyName resolution for raw_company_id 1346914: {resolved_comp!r}")

    # 8. posted_at determinism
    cur.execute("SELECT posted_at_approx FROM jobs WHERE posted_at_raw = '4 Days Ago' LIMIT 1;")
    pa_approx = cur.fetchone()[0]
    print(f"  - '4 Days Ago' approx timestamp: {pa_approx}")

    cur.execute("SELECT COUNT(*) FROM jobs WHERE posted_at_raw LIKE 'Starts%' AND posted_at_approx IS NOT NULL;")
    future_non_null = cur.fetchone()[0]
    print(f"  - Future start strings with non-null posted_at_approx: {future_non_null} (Expected: 0)")

    # 9. Valid salary ranges check
    cur.execute("SELECT COUNT(*) FROM jobs WHERE min_salary > max_salary;")
    invalid_sal = cur.fetchone()[0]
    print(f"  - Invalid salary range count (min > max): {invalid_sal} (Expected: 0)")

    # 10. Valid experience ranges check
    cur.execute("SELECT COUNT(*) FROM jobs WHERE min_experience > max_experience;")
    invalid_exp = cur.fetchone()[0]
    print(f"  - Invalid experience range count (min > max): {invalid_exp} (Expected: 0)")

    print("\n==================================================")
    print("4. SKILL VERIFICATION ON POSTGRESQL")
    print("==================================================")

    print(f"  - Total skills: {skills_count}")
    print(f"  - Total job_skill relationships: {job_skills_count}")

    # Duplicate skill names ignoring case
    cur.execute("SELECT LOWER(name), COUNT(*) FROM skills GROUP BY LOWER(name) HAVING COUNT(*) > 1;")
    dup_skills = cur.fetchall()
    print(f"  - Case-insensitive duplicate skills in table: {len(dup_skills)} (Expected: 0)")

    # Average skills per job
    avg_skills = job_skills_count / jobs_count
    print(f"  - Average skills per job: {avg_skills:.2f}")

    # Top 20 most common skills
    cur.execute("""
        SELECT s.name, COUNT(js.job_id) AS job_count
        FROM skills s
        JOIN job_skills js ON s.id = js.skill_id
        GROUP BY s.name
        ORDER BY job_count DESC
        LIMIT 20;
    """)
    top_20 = cur.fetchall()
    print("  - Top 20 Most Common Skills:")
    for rank, (sname, scount) in enumerate(top_20, 1):
        print(f"    {rank:2d}. {sname:30} ({scount} jobs)")

    # Test case-insensitive unique constraint violation on PostgreSQL
    try:
        cur.execute("INSERT INTO skills (id, name, category, created_at) VALUES (gen_random_uuid(), 'PYTHON', NULL, NOW());")
        conn.commit()
        print("  - [FAIL] Duplicate 'PYTHON' insertion succeeded unexpectedly!")
    except Exception as e:
        conn.rollback()
        print("  - [PASS] Inserting 'PYTHON' when skill exists raised expected PostgreSQL constraint error!")

    print("\n==================================================")
    print("5. FOREIGN KEY INTEGRITY VERIFICATION ON POSTGRESQL")
    print("==================================================")

    cur.execute("SELECT COUNT(*) FROM jobs j LEFT JOIN companies c ON j.company_id = c.id WHERE c.id IS NULL;")
    orphan_jobs = cur.fetchone()[0]
    print(f"  - Jobs referencing invalid company_id: {orphan_jobs} (Expected: 0)")

    cur.execute("SELECT COUNT(*) FROM job_skills js LEFT JOIN jobs j ON js.job_id = j.id WHERE j.id IS NULL;")
    orphan_js_jobs = cur.fetchone()[0]
    print(f"  - JobSkills referencing invalid job_id: {orphan_js_jobs} (Expected: 0)")

    cur.execute("SELECT COUNT(*) FROM job_skills js LEFT JOIN skills s ON js.skill_id = s.id WHERE s.id IS NULL;")
    orphan_js_skills = cur.fetchone()[0]
    print(f"  - JobSkills referencing invalid skill_id: {orphan_js_skills} (Expected: 0)")

    # Swipes user_id check
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'swipes' AND column_name = 'user_id';")
    u_col = cur.fetchone()
    print(f"  - Swipes user_id column type in PostgreSQL: {u_col}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    run_full_postgres_verification()
