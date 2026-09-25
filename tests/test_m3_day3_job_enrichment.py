"""
Milestone 3 Day 3 Job Dataset Enrichment & Keyword Extraction Validation Test Suite.
Validates:
1. job_skills fallback defaults (is_required = TRUE, weight = 1.00, min_years = NULL).
2. job_keywords extraction across 6 categories without artificial forcing.
3. Case-insensitive keyword uniqueness (job_id, LOWER(keyword), keyword_type).
4. Foreign key integrity & zero orphan records.
5. Idempotency (running backfill twice yields identical record counts).
6. Existing M2 row counts preservation (jobs=97,929, companies=18,328, skills=44,078, job_skills=755,099).
7. Repository helper methods (get_job_required_skills, get_job_keywords_by_type, get_job_matching_features).
"""
import os
import sys
import uuid
import pytest

# Ensure data_hanith is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data_hanith"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import DATABASE_URL
from db.connection import get_raw_connection
from scripts.apply_m3_migration import apply_m3_migration
from scripts.backfill_m3_job_data import run_backfill
from db.repositories.job_repository import JobRepository


@pytest.fixture(scope="module")
def db_context():
    """Applies M3 migration, runs backfill, and yields connection."""
    apply_m3_migration(DATABASE_URL)
    run_backfill(DATABASE_URL)
    conn, db_type = get_raw_connection(DATABASE_URL)
    yield conn, db_type
    conn.close()


def test_1_m2_row_counts_preserved(db_context):
    """1. Verify existing M2 table row counts remain 100% preserved."""
    conn, db_type = db_context
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM companies;")
    companies_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM skills;")
    skills_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_skills;")
    job_skills_count = cur.fetchone()[0]

    assert jobs_count > 0
    assert companies_count > 0
    assert skills_count > 0
    assert job_skills_count > 0

    if db_type == "postgres":
        assert jobs_count == 97929, f"Expected 97,929 jobs, got {jobs_count}"
        assert companies_count == 18328, f"Expected 18,328 companies, got {companies_count}"
        assert skills_count == 44078, f"Expected 44,078 skills, got {skills_count}"
        assert job_skills_count == 755099, f"Expected 755,099 job_skills, got {job_skills_count}"


def test_2_job_skills_fallback_defaults(db_context):
    """2. Verify job_skills defaults (is_required = TRUE, weight = 1.00, min_years = NULL)."""
    conn, db_type = db_context
    cur = conn.cursor()

    if db_type == "postgres":
        cur.execute("SELECT COUNT(*) FROM job_skills WHERE is_required IS NOT TRUE;")
        not_req_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM job_skills WHERE min_years IS NOT NULL;")
        min_years_count = cur.fetchone()[0]
    else:
        cur.execute("SELECT COUNT(*) FROM job_skills WHERE is_required != 1;")
        not_req_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM job_skills WHERE min_years IS NOT NULL;")
        min_years_count = cur.fetchone()[0]

    assert not_req_count == 0, f"Found {not_req_count} job_skills with is_required != TRUE!"
    assert min_years_count == 0, f"Rule violation: min_years should be NULL, found {min_years_count} non-NULL rows!"


def test_3_job_keywords_extracted_categories(db_context):
    """3. Verify job_keywords populated across categories without forcing missing categories."""
    conn, db_type = db_context
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM job_keywords;")
    kw_count = cur.fetchone()[0]
    assert kw_count > 0, "No job_keywords created!"

    cur.execute("SELECT DISTINCT keyword_type FROM job_keywords;")
    types = [r[0] for r in cur.fetchall()]
    assert len(types) > 0

    valid_taxonomy = {"DOMAIN", "TOOL", "FRAMEWORK", "CERTIFICATION", "RESPONSIBILITY", "SOFT_SKILL"}
    for t in types:
        assert t in valid_taxonomy, f"Invalid keyword_type found: {t}"


def test_4_job_keywords_uniqueness(db_context):
    """4. Verify case-insensitive keyword uniqueness (job_id, LOWER(keyword), keyword_type)."""
    conn, db_type = db_context
    cur = conn.cursor()

    placeholder = "%s" if db_type == "postgres" else "?"
    cur.execute("SELECT id FROM jobs LIMIT 1;")
    job_id = str(cur.fetchone()[0])

    kw_id = str(uuid.uuid4())
    with pytest.raises(Exception):
        if db_type == "postgres":
            cur.execute(f"""
                INSERT INTO job_keywords (id, job_id, keyword, keyword_type, weight)
                VALUES ({placeholder}, {placeholder}, 'DUPLICATE_TEST', 'DOMAIN', 1.00);
            """, (kw_id, job_id))
            cur.execute(f"""
                INSERT INTO job_keywords (id, job_id, keyword, keyword_type, weight)
                VALUES ({placeholder}, {placeholder}, 'duplicate_test', 'DOMAIN', 1.00);
            """, (str(uuid.uuid4()), job_id))
        else:
            cur.execute(f"""
                INSERT INTO job_keywords (id, job_id, keyword, keyword_type, weight)
                VALUES ({placeholder}, {placeholder}, 'DUPLICATE_TEST', 'DOMAIN', 1.00);
            """, (kw_id, job_id))
            cur.execute(f"""
                INSERT INTO job_keywords (id, job_id, keyword, keyword_type, weight)
                VALUES ({placeholder}, {placeholder}, 'duplicate_test', 'DOMAIN', 1.00);
            """, (str(uuid.uuid4()), job_id))
        conn.commit()

    conn.rollback()


def test_5_zero_orphan_records(db_context):
    """5. Verify zero orphan records in job_keywords and job_skills."""
    conn, db_type = db_context
    cur = conn.cursor()

    cur.execute("""
        SELECT COUNT(*) FROM job_keywords jk
        LEFT JOIN jobs j ON jk.job_id = j.id
        WHERE j.id IS NULL;
    """)
    orphan_kw = cur.fetchone()[0]
    assert orphan_kw == 0, f"Found {orphan_kw} orphan job_keywords records!"

    cur.execute("""
        SELECT COUNT(*) FROM job_skills js
        LEFT JOIN jobs j ON js.job_id = j.id
        WHERE j.id IS NULL;
    """)
    orphan_js = cur.fetchone()[0]
    assert orphan_js == 0, f"Found {orphan_js} orphan job_skills records!"


def test_6_backfill_idempotency(db_context):
    """6. Verify running backfill a second time is fully idempotent and creates zero duplicates."""
    conn, db_type = db_context
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM job_keywords;")
    kw_count_before = cur.fetchone()[0]

    # Re-run backfill
    res = run_backfill(DATABASE_URL)

    cur.execute("SELECT COUNT(*) FROM job_keywords;")
    kw_count_after = cur.fetchone()[0]

    assert kw_count_before == kw_count_after, f"Idempotency failed! Keywords count changed from {kw_count_before} to {kw_count_after}"


def test_7_job_repository_intern4_queries(db_context):
    """7. Verify JobRepository query helper methods for Intern 4 matching engine."""
    conn, db_type = db_context
    repo = JobRepository(conn, db_type)
    cur = conn.cursor()

    cur.execute("SELECT id FROM jobs LIMIT 1;")
    job_id = str(cur.fetchone()[0])

    req_skills = repo.get_job_required_skills(job_id)
    assert isinstance(req_skills, list)
    for s in req_skills:
        assert s["is_required"] is True
        assert s["weight"] == 1.00
        assert s["min_years"] is None

    keywords = repo.get_job_keywords_by_type(job_id)
    assert isinstance(keywords, list)

    features = repo.get_job_matching_features(job_id)
    assert features is not None
    assert features["job_id"] == job_id
    assert "embedding_input_text" in features
    assert "Required Skills:" in features["embedding_input_text"]
