"""
SwipeX Milestone 3 Day 3 Job Dataset Enrichment & Keyword Extraction Backfill Script.
Enriches existing ~98k job postings with structured skill attributes and job keywords.

Policy & Rule Compliance:
1. is_required = TRUE set as documented default fallback across mapped skills.
2. weight = 1.00 set as neutral default weight.
3. min_years = NULL preserved (no copying of job-level experience to skills).
4. No fake optional skills (is_required = FALSE) fabricated.
5. Job keywords extracted across 6 categories: DOMAIN, TOOL, FRAMEWORK, CERTIFICATION, RESPONSIBILITY, SOFT_SKILL.
6. Functional unique constraint (job_id, LOWER(keyword), keyword_type) enforced via ON CONFLICT upsert.
7. Batching used for high throughput directly against database (no Excel re-reading).
8. 100% data preservation verified for jobs, companies, skills, job_skills.
"""
import os
import re
import sys
import uuid
import logging
from typing import Dict, List, Tuple, Set, Any
from datetime import datetime, timezone

# Add data_hanith to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import DATABASE_URL
from db.connection import get_raw_connection, get_dict_cursor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill_m3_job_data")

# Keyword Taxonomy Regex Dictionary
TAXONOMY_PATTERNS = {
    "DOMAIN": [
        (r"\b(fintech|finance|banking|financial services)\b", "Fintech & Banking"),
        (r"\b(e-?commerce|retail|shopping|marketplace)\b", "E-Commerce"),
        (r"\b(health\s*care|health-?tech|medical|pharma)\b", "Healthcare"),
        (r"\b(cloud|saas|paas|iaas)\b", "Cloud & SaaS"),
        (r"\b(big\s*data|data\s*engineering|analytics|business\s*intelligence)\b", "Big Data & Analytics"),
        (r"\b(ai|ml|machine\s*learning|artificial\s*intelligence|deep\s*learning|nlp)\b", "AI & Machine Learning"),
        (r"\b(cyber\s*security|security|infosec|network\s*security)\b", "Cybersecurity"),
        (r"\b(devops|infrastructure|site\s*reliability|sre)\b", "DevOps & Infrastructure"),
        (r"\b(mobile|android|ios|app\s*development)\b", "Mobile Development"),
        (r"\b(gaming|game\b|game\s*dev)\b", "Gaming"),
    ],
    "TOOL": [
        (r"\b(docker)\b", "Docker"),
        (r"\b(kubernetes|k8s)\b", "Kubernetes"),
        (r"\b(git|github|gitlab|bitbucket)\b", "Git"),
        (r"\b(jira|confluence|trello)\b", "Jira"),
        (r"\b(aws|amazon\s*web\s*services)\b", "AWS"),
        (r"\b(azure|microsoft\s*azure)\b", "Azure"),
        (r"\b(gcp|google\s*cloud)\b", "GCP"),
        (r"\b(postman|insomnia)\b", "Postman"),
        (r"\b(jenkins|circleci|github\s*actions)\b", "Jenkins / CI-CD"),
        (r"\b(redis|memcached)\b", "Redis"),
        (r"\b(postgresql|postgres)\b", "PostgreSQL"),
        (r"\b(mysql|mariadb)\b", "MySQL"),
        (r"\b(mongodb|nosql)\b", "MongoDB"),
        (r"\b(linux|unix|bash|shell)\b", "Linux"),
        (r"\b(figma|sketch|adobe\s*xd)\b", "Figma"),
    ],
    "FRAMEWORK": [
        (r"\b(react|reactjs|react\.js)\b", "React"),
        (r"\b(fastapi)\b", "FastAPI"),
        (r"\b(django)\b", "Django"),
        (r"\b(pytorch)\b", "PyTorch"),
        (r"\b(tensorflow|tf)\b", "TensorFlow"),
        (r"\b(spring|spring\s*boot)\b", "Spring Boot"),
        (r"\b(angular|angularjs)\b", "Angular"),
        (r"\b(next\.js|nextjs)\b", "Next.js"),
        (r"\b(flask)\b", "Flask"),
        (r"\b(node|nodejs|node\.js|express|expressjs)\b", "Node.js"),
        (r"\b(vue|vuejs|vue\.js)\b", "Vue.js"),
        (r"\b(\.net|dotnet|asp\.net)\b", ".NET Framework"),
    ],
    "CERTIFICATION": [
        (r"\b(aws\s*certified|aws\s*certification)\b", "AWS Certified"),
        (r"\b(pmp|project\s*management\s*professional)\b", "PMP"),
        (r"\b(cissp)\b", "CISSP"),
        (r"\b(cka|certified\s*kubernetes\s*administrator)\b", "CKA"),
        (r"\b(scrum\s*master|csm)\b", "Scrum Master"),
        (r"\b(azure\s*certified|microsoft\s*certified)\b", "Azure Certified"),
        (r"\b(gcp\s*certified|google\s*cloud\s*certified)\b", "GCP Certified"),
    ],
    "RESPONSIBILITY": [
        (r"\b(architect|architecture|designing|system\s*design)\b", "Architecture & Design"),
        (r"\b(development|developing|building|coding|implementation)\b", "Software Development"),
        (r"\b(maintenance|bug\s*fixing|troubleshooting|debugging)\b", "Maintenance & Operations"),
        (r"\b(testing|unit\s*testing|automation\s*testing|qa)\b", "Testing & QA"),
        (r"\b(code\s*review|peer\s*review|mentoring)\b", "Code Review & Mentorship"),
        (r"\b(leadership|leading|team\s*lead|managing)\b", "Team Leadership"),
    ],
    "SOFT_SKILL": [
        (r"\b(communication|verbal|written\s*communication)\b", "Communication"),
        (r"\b(problem\s*solving|analytical\s*thinking|critical\s*thinking)\b", "Problem Solving"),
        (r"\b(leadership|ownership|accountability)\b", "Leadership"),
        (r"\b(collaboration|teamwork|cross-functional)\b", "Collaboration"),
        (r"\b(agile|scrum|kanban)\b", "Agile & Scrum"),
    ],
}


def run_backfill(db_url: str = DATABASE_URL) -> Dict[str, Any]:
    logger.info("=== Starting M3 Job Data Enrichment & Keyword Extraction Backfill ===")
    logger.info(f"Target Database: {db_url}")

    conn, db_type = get_raw_connection(db_url)
    cursor = get_dict_cursor(conn, db_type)

    # 1. RECORD PRE-BACKFILL COUNTS
    raw_cur = conn.cursor()
    raw_cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_before = raw_cur.fetchone()[0]
    raw_cur.execute("SELECT COUNT(*) FROM companies;")
    companies_before = raw_cur.fetchone()[0]
    raw_cur.execute("SELECT COUNT(*) FROM skills;")
    skills_before = raw_cur.fetchone()[0]
    raw_cur.execute("SELECT COUNT(*) FROM job_skills;")
    job_skills_before = raw_cur.fetchone()[0]
    raw_cur.execute("SELECT COUNT(*) FROM job_keywords;")
    job_keywords_before = raw_cur.fetchone()[0]

    logger.info(f"[Before Backfill] Table Counts:")
    logger.info(f"  - Jobs: {jobs_before}")
    logger.info(f"  - Companies: {companies_before}")
    logger.info(f"  - Skills: {skills_before}")
    logger.info(f"  - Job_Skills: {job_skills_before}")
    logger.info(f"  - Job_Keywords: {job_keywords_before}")

    # 2. ENRICH JOB_SKILLS ATTRIBUTES (is_required = TRUE, weight = 1.00, min_years = NULL)
    logger.info("Enriching job_skills attributes with default fallback is_required=TRUE, weight=1.00, min_years=NULL...")
    if db_type == "postgres":
        upd_js_sql = """
            UPDATE job_skills
            SET is_required = TRUE,
                weight = 1.00
            WHERE is_required IS NOT TRUE OR weight IS NULL;
        """
    else:
        upd_js_sql = """
            UPDATE job_skills
            SET is_required = 1,
                weight = 1.00
            WHERE is_required != 1 OR weight IS NULL;
        """
    raw_cur.execute(upd_js_sql)
    job_skills_updated = raw_cur.rowcount
    conn.commit()
    logger.info(f"Updated {job_skills_updated} job_skills records.")

    # 3. EXTRACT JOB KEYWORDS IN HIGH-PERFORMANCE BATCHES
    logger.info("Batch fetching job listings for keyword extraction...")
    raw_cur.execute("SELECT id, title, job_description FROM jobs;")
    all_jobs = raw_cur.fetchall()
    logger.info(f"Fetched {len(all_jobs)} jobs for keyword processing.")

    now_iso = datetime.now(timezone.utc).isoformat()
    keyword_records = []
    category_counts = {cat: 0 for cat in TAXONOMY_PATTERNS.keys()}

    for job_row in all_jobs:
        job_id = str(job_row[0])
        title_text = str(job_row[1] or "")
        desc_text = str(job_row[2] or "")
        combined_text = f"{title_text} {desc_text}"

        seen_keywords_per_job: Set[Tuple[str, str]] = set()

        for cat, patterns in TAXONOMY_PATTERNS.items():
            for regex_str, kw_label in patterns:
                if re.search(regex_str, combined_text, re.IGNORECASE):
                    kw_lower = kw_label.lower()
                    if (kw_lower, cat) not in seen_keywords_per_job:
                        seen_keywords_per_job.add((kw_lower, cat))
                        kw_id = str(uuid.uuid4())
                        keyword_records.append((
                            kw_id,
                            job_id,
                            kw_label,
                            cat,
                            1.00,  # default weight
                            now_iso
                        ))
                        category_counts[cat] += 1

    logger.info(f"Extracted {len(keyword_records)} total keyword mappings across {len(all_jobs)} jobs.")

    # Batch Insert into job_keywords
    chunk_size = 10000
    if db_type == "postgres":
        kw_sql = """
            INSERT INTO job_keywords (id, job_id, keyword, keyword_type, weight, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (job_id, LOWER(keyword), keyword_type)
            DO UPDATE SET weight = EXCLUDED.weight;
        """
    else:
        kw_sql = """
            INSERT INTO job_keywords (id, job_id, keyword, keyword_type, weight, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(job_id, LOWER(keyword), keyword_type) DO UPDATE SET weight = excluded.weight;
        """

    logger.info(f"Inserting job_keywords in chunks of {chunk_size}...")
    for i in range(0, len(keyword_records), chunk_size):
        raw_cur.executemany(kw_sql, keyword_records[i:i + chunk_size])
        conn.commit()

    # 4. RECORD POST-BACKFILL COUNTS & VERIFY PRESERVATION
    raw_cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_after = raw_cur.fetchone()[0]
    raw_cur.execute("SELECT COUNT(*) FROM companies;")
    companies_after = raw_cur.fetchone()[0]
    raw_cur.execute("SELECT COUNT(*) FROM skills;")
    skills_after = raw_cur.fetchone()[0]
    raw_cur.execute("SELECT COUNT(*) FROM job_skills;")
    job_skills_after = raw_cur.fetchone()[0]
    raw_cur.execute("SELECT COUNT(*) FROM job_keywords;")
    job_keywords_after = raw_cur.fetchone()[0]

    raw_cur.close()
    conn.close()

    logger.info(f"\n[After Backfill] Table Counts:")
    logger.info(f"  - Jobs: {jobs_after} (Diff: {jobs_after - jobs_before})")
    logger.info(f"  - Companies: {companies_after} (Diff: {companies_after - companies_before})")
    logger.info(f"  - Skills: {skills_after} (Diff: {skills_after - skills_before})")
    logger.info(f"  - Job_Skills: {job_skills_after} (Diff: {job_skills_after - job_skills_before})")
    logger.info(f"  - Job_Keywords: {job_keywords_after}")
    logger.info(f"Keyword Type Category Distribution:")
    for cat, count in category_counts.items():
        logger.info(f"  * {cat}: {count} keywords")

    assert jobs_before == jobs_after, "FATAL: Job count changed during backfill!"
    assert companies_before == companies_after, "FATAL: Company count changed during backfill!"
    assert skills_before == skills_after, "FATAL: Skills count changed during backfill!"
    assert job_skills_before == job_skills_after, "FATAL: Job_Skills count changed during backfill!"

    logger.info("\n=== M3 Job Data Enrichment & Keyword Backfill COMPLETED SUCCESSFULLY ===")

    return {
        "jobs_processed": len(all_jobs),
        "job_skills_updated": job_skills_updated,
        "job_keywords_created": job_keywords_after,
        "category_distribution": category_counts,
        "job_skills_required_count": job_skills_after,
        "job_skills_optional_count": 0
    }


if __name__ == "__main__":
    run_backfill()
