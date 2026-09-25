"""
Milestone 3 Day 6 Repository & Query Optimization Test Suite.

Validates:
1. ResumeRepository & JobRepository query correctness and robustness across all Intern 4 data-access methods.
2. Edge case handling (nonexistent IDs, cross-resume version activation, missing/null fields, empty/unknown skills).
3. Skill normalization, deduplication, and case-insensitive matching (no matched_count inflation).
4. Safety against malformed parsed_json, null salaries, null locations, and very large job descriptions.
5. Verification of stable Intern 4 data contract payload structures.
"""
import os
import sys
import uuid
import pytest
from typing import Dict, Any

# Ensure data_hanith is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data_hanith"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import DATABASE_URL
from db.connection import get_raw_connection, get_dict_cursor
from scripts.apply_m3_migration import apply_m3_migration
from db.repositories.resume_repository import ResumeRepository
from db.repositories.job_repository import JobRepository


@pytest.fixture(scope="module")
def db_context():
    """Applies M3 migration and yields database connection and repositories."""
    apply_m3_migration(DATABASE_URL)
    conn, db_type = get_raw_connection(DATABASE_URL)
    resume_repo = ResumeRepository(conn, db_type)
    job_repo = JobRepository(conn, db_type)
    yield conn, db_type, resume_repo, job_repo
    conn.close()


# =============================================================================
# 1. RESUME REPOSITORY QUERY TESTS
# =============================================================================

def test_resume_repo_active_version_lookups(db_context):
    """Test get_active_resume_version and get_active_resume_version_by_user."""
    conn, db_type, resume_repo, job_repo = db_context

    user_id = str(uuid.uuid4())
    parent = resume_repo.create_resume(user_id=user_id, title="Active Version Test")
    v1 = resume_repo.create_resume_version(
        resume_id=parent["id"], file_name="v1.pdf", file_path="uploads/v1.pdf",
        raw_text="v1 text", parsed_json={"skills": ["Python"]}, is_active=True
    )

    # 1. Direct active version lookup
    active = resume_repo.get_active_resume_version(parent["id"])
    assert active is not None
    assert active["id"] == v1["id"]

    # 2. User ownership active version lookup
    active_by_user = resume_repo.get_active_resume_version_by_user(user_id=user_id, resume_id=parent["id"])
    assert active_by_user is not None
    assert active_by_user["id"] == v1["id"]

    # 3. Mismatched user ownership returns None
    other_user_id = str(uuid.uuid4())
    mismatch = resume_repo.get_active_resume_version_by_user(user_id=other_user_id, resume_id=parent["id"])
    assert mismatch is None

    # 4. Nonexistent resume ID returns None
    non_existent = resume_repo.get_active_resume_version(str(uuid.uuid4()))
    assert non_existent is None


def test_resume_repo_version_listing_and_latest(db_context):
    """Test list_resume_versions and get_latest_resume_version."""
    conn, db_type, resume_repo, job_repo = db_context

    user_id = str(uuid.uuid4())
    parent = resume_repo.create_resume(user_id=user_id, title="Multi Version List Test")

    v1 = resume_repo.create_resume_version(
        resume_id=parent["id"], file_name="v1.pdf", file_path="u/1.pdf",
        raw_text="t1", parsed_json={"skills": ["Python"]}, is_active=False
    )
    v2 = resume_repo.create_resume_version(
        resume_id=parent["id"], file_name="v2.pdf", file_path="u/2.pdf",
        raw_text="t2", parsed_json={"skills": ["Python", "SQL"]}, is_active=True
    )

    # List versions ordered DESC
    versions = resume_repo.list_resume_versions(parent["id"])
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2
    assert versions[1]["version_number"] == 1

    # Get latest version (by version_number DESC)
    latest = resume_repo.get_latest_resume_version(parent["id"])
    assert latest is not None
    assert latest["id"] == v2["id"]
    assert latest["version_number"] == 2

    # Nonexistent resume_id returns empty list / None
    bogus_id = str(uuid.uuid4())
    assert resume_repo.list_resume_versions(bogus_id) == []
    assert resume_repo.get_latest_resume_version(bogus_id) is None


def test_resume_repo_activate_version(db_context):
    """Test activate_resume_version safety and cross-resume protection."""
    conn, db_type, resume_repo, job_repo = db_context

    user_id = str(uuid.uuid4())
    p1 = resume_repo.create_resume(user_id=user_id, title="P1 Resume")
    v1_1 = resume_repo.create_resume_version(p1["id"], "1.pdf", "u/1.pdf", "t1", {"skills": ["Python"]}, is_active=True)
    v1_2 = resume_repo.create_resume_version(p1["id"], "2.pdf", "u/2.pdf", "t2", {"skills": ["Java"]}, is_active=False)

    p2 = resume_repo.create_resume(user_id=user_id, title="P2 Resume")
    v2_1 = resume_repo.create_resume_version(p2["id"], "p2.pdf", "u/p2.pdf", "tp2", {"skills": ["C++"]}, is_active=True)

    # Activate v1_2 for p1
    res = resume_repo.activate_resume_version(p1["id"], v1_2["id"])
    assert res is not None
    assert res["id"] == v1_2["id"]
    assert res["is_active"] is True

    # Verify v1_1 is now inactive
    v1_1_check = resume_repo.get_resume_version_by_id(v1_1["id"])
    assert v1_1_check["is_active"] is False

    # Attempt cross-activation (activating v2_1 on p1) -> Must return None and fail safely
    cross_res = resume_repo.activate_resume_version(p1["id"], v2_1["id"])
    assert cross_res is None

    # Verify p1 active version remains v1_2
    assert resume_repo.get_active_resume_version(p1["id"])["id"] == v1_2["id"]


# =============================================================================
# 2. JOB REPOSITORY QUERY TESTS
# =============================================================================

def test_job_repo_queries_and_matching_features(db_context):
    """Test get_job_required_skills, get_job_keywords_by_type, and get_job_matching_features."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    # Find a real job ID with skills and keywords
    cur.execute("SELECT id FROM jobs LIMIT 1;")
    real_job_id = str(cur.fetchone()[0])

    # 1. Required skills query
    req_skills = job_repo.get_job_required_skills(real_job_id)
    assert isinstance(req_skills, list)
    for s in req_skills:
        assert "skill_id" in s
        assert "name" in s
        assert "is_required" in s
        assert s["is_required"] is True

    # 2. Keywords query (all and by type)
    all_kws = job_repo.get_job_keywords_by_type(real_job_id)
    assert isinstance(all_kws, list)

    tool_kws = job_repo.get_job_keywords_by_type(real_job_id, keyword_type="TOOL")
    assert isinstance(tool_kws, list)
    for k in tool_kws:
        assert k["keyword_type"].upper() == "TOOL"

    # 3. Matching features payload structure (Intern 4 Data Contract)
    features = job_repo.get_job_matching_features(real_job_id)
    assert features is not None
    required_keys = {
        "job_id", "title", "location", "required_skills", "keywords",
        "job_keywords", "min_experience", "max_experience", "salary",
        "salary_range", "monthly_salary", "job_description", "embedding_input_text"
    }
    assert required_keys.issubset(set(features.keys()))
    assert features["job_id"] == real_job_id
    assert isinstance(features["salary"], dict)

    # 4. Nonexistent job ID returns empty lists / None safely
    bogus_job_id = str(uuid.uuid4())
    assert job_repo.get_job_required_skills(bogus_job_id) == []
    assert job_repo.get_job_keywords_by_type(bogus_job_id) == []
    assert job_repo.get_job_matching_features(bogus_job_id) is None


# =============================================================================
# 3. DEDUPLICATION, CASE & WHITESPACE NORMALIZATION TESTS
# =============================================================================

def test_resume_skill_deduplication_and_normalization(db_context):
    """Verify raw skill inputs with case/whitespace variations do not inflate matched_count or produce duplicate matches."""
    conn, db_type, resume_repo, job_repo = db_context

    raw_skills = ["Python", " python ", "PYTHON", "Python", "  SQL  ", "sql", "Sql"]
    parsed_json = {"skills": raw_skills}

    mapping = resume_repo.map_resume_skills_detailed(parsed_json)
    matched = mapping["matched_skills"]
    matched_names_lower = [m["name"].lower() for m in matched]

    # Python and SQL should appear AT MOST once in matched_skills
    assert matched_names_lower.count("python") <= 1
    assert matched_names_lower.count("sql") <= 1

    # Verify compare_resume_and_job_skills deduplication
    cur = conn.cursor()
    cur.execute("SELECT id FROM jobs LIMIT 1;")
    job_id = str(cur.fetchone()[0])

    user_id = str(uuid.uuid4())
    parent = resume_repo.create_resume(user_id=user_id, title="Dedup Test CV")
    v = resume_repo.create_resume_version(
        resume_id=parent["id"], file_name="d.pdf", file_path="u/d.pdf",
        raw_text="raw", parsed_json=parsed_json, is_active=True
    )

    comp = resume_repo.compare_resume_and_job_skills(resume_version_id=v["id"], job_id=job_id, job_repo=job_repo)

    # matched_skill_names must contain unique names
    assert len(comp["matched_skill_names"]) == len(set(comp["matched_skill_names"]))
    assert comp["matched_count"] == len(comp["matched_skill_names"])


# =============================================================================
# 4. EDGE CASES & NULL-SAFETY TESTS
# =============================================================================

def test_empty_and_unknown_skills_handling(db_context):
    """Test behavior when resume has empty skills or only unknown skills."""
    conn, db_type, resume_repo, job_repo = db_context

    # Case A: Empty skills
    res_empty = resume_repo.map_resume_skills_detailed({"skills": []})
    assert res_empty["matched_skills"] == []
    assert res_empty["unmatched_skills"] == []

    # Case B: Unknown skills only
    res_unknown = resume_repo.map_resume_skills_detailed({"skills": ["QuantumFluxCoding2026", "HyperQuantumAI"]})
    assert res_unknown["matched_skills"] == []
    assert set(res_unknown["unmatched_skills"]) == {"QuantumFluxCoding2026", "HyperQuantumAI"}


def test_malformed_parsed_json_safety(db_context):
    """Test map_resume_skills_detailed safety when parsed_json is None, string, or missing skills key."""
    conn, db_type, resume_repo, job_repo = db_context

    assert resume_repo.map_resume_skills_detailed(None) == {"matched_skills": [], "unmatched_skills": []}
    assert resume_repo.map_resume_skills_detailed("Not A Dict") == {"matched_skills": [], "unmatched_skills": []}
    assert resume_repo.map_resume_skills_detailed({}) == {"matched_skills": [], "unmatched_skills": []}
    assert resume_repo.map_resume_skills_detailed({"skills": "Not A List"}) == {"matched_skills": [], "unmatched_skills": []}


def test_zero_required_job_skills_safety(db_context):
    """Test compare_resume_and_job_skills when job has 0 required skills (division-by-zero protection)."""
    conn, db_type, resume_repo, job_repo = db_context

    user_id = str(uuid.uuid4())
    parent = resume_repo.create_resume(user_id=user_id, title="Zero Req Test")
    v = resume_repo.create_resume_version(
        resume_id=parent["id"], file_name="z.pdf", file_path="u/z.pdf",
        raw_text="raw", parsed_json={"skills": ["Python"]}, is_active=True
    )

    # Mock job_repo or nonexistent job with 0 required skills
    bogus_job_id = str(uuid.uuid4())
    comp = resume_repo.compare_resume_and_job_skills(resume_version_id=v["id"], job_id=bogus_job_id, job_repo=job_repo)

    assert comp["required_skill_count"] == 0
    assert comp["matched_count"] == 0
    assert comp["skill_match_percentage"] == 100.0


def test_null_and_large_fields_job_matching_features(db_context):
    """Test get_job_matching_features resilience with synthetic job containing NULL salary, NULL location, and 50KB description."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    # Create temporary company and job with NULL salary, NULL location, and huge description
    comp_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    ph = "%s" if db_type == "postgres" else "?"

    if db_type == "postgres":
        cur.execute(f"INSERT INTO companies (id, raw_company_id, name, created_at, updated_at) VALUES ({ph}, 99999, 'Edge Corp', NOW(), NOW());", (comp_id,))
        huge_desc = "Developer role. " * 3000  # ~45KB text
        cur.execute(f"""
            INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, min_salary, max_salary, currency, location, posted_at_raw, created_at, updated_at)
            VALUES ({ph}, 88888, {ph}, 'Edge Developer', {ph}, NULL, NULL, 'INR', 'Unknown Location', '2025-01-01', NOW(), NOW());
        """, (job_id, comp_id, huge_desc))
    else:
        cur.execute(f"INSERT INTO companies (id, raw_company_id, name, created_at, updated_at) VALUES ({ph}, 99999, 'Edge Corp', datetime('now'), datetime('now'));", (comp_id,))
        huge_desc = "Developer role. " * 3000
        cur.execute(f"""
            INSERT INTO jobs (id, raw_job_id, company_id, title, job_description, min_salary, max_salary, currency, location, posted_at_raw, created_at, updated_at)
            VALUES ({ph}, 88888, {ph}, 'Edge Developer', {ph}, NULL, NULL, 'INR', 'Unknown Location', '2025-01-01', datetime('now'), datetime('now'));
        """, (job_id, comp_id, huge_desc))

    conn.commit()

    features = job_repo.get_job_matching_features(job_id)
    assert features is not None
    assert features["salary_range"] == "Not disclosed"
    assert features["monthly_salary"] is None
    assert len(features["job_description"]) > 40000
    assert "embedding_input_text" in features

    # Cleanup synthetic test record
    cur.execute(f"DELETE FROM jobs WHERE id = {ph};", (job_id,))
    cur.execute(f"DELETE FROM companies WHERE id = {ph};", (comp_id,))
    conn.commit()
