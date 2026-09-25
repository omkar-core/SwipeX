"""
Milestone 3 Day 4 Resume-Job Queries & Matching Data Layer Test Suite.

Validates all Day 4 acceptance criteria:
1. get active resume version (get_active_resume_version & get_active_resume_version_by_user).
2. latest version selection by version_number.
3. activate version operation.
4. only one version remains active after activation.
5. invalid version activation is rejected.
6. canonical resume skill mapping (map_resume_skills_detailed).
7. unknown resume skill handling (unmatched skills returned without canonical mutation).
8. resume-job matched skills comparison.
9. missing required skills identification.
10. skill match percentage calculation.
11. zero-required-skills handling.
12. job matching feature payload structure.
13. ownership protection (user A cannot access user B's active resume).
14. existing Day 2/Day 3 data integrity remains intact.
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
from db.repositories.resume_repository import ResumeRepository
from db.repositories.job_repository import JobRepository


@pytest.fixture(scope="module")
def db_context():
    """Applies M3 migration and yields connection and repositories."""
    apply_m3_migration(DATABASE_URL)
    conn, db_type = get_raw_connection(DATABASE_URL)
    resume_repo = ResumeRepository(conn, db_type)
    job_repo = JobRepository(conn, db_type)
    yield conn, db_type, resume_repo, job_repo
    conn.close()


def test_1_get_active_resume_version_and_user_ownership(db_context):
    """1, 13. Test get_active_resume_version and get_active_resume_version_by_user with ownership protection."""
    conn, db_type, resume_repo, job_repo = db_context

    user1_id = str(uuid.uuid4())
    user2_id = str(uuid.uuid4())

    r1 = resume_repo.create_resume(user_id=user1_id, title="User 1 CV")
    v1 = resume_repo.create_resume_version(
        resume_id=r1["id"],
        file_name="u1.pdf",
        file_path="uploads/u1.pdf",
        raw_text="User 1 text",
        parsed_json={"skills": ["Python"]},
        is_active=True
    )

    # 1. Fetch active version directly by resume_id
    active_v = resume_repo.get_active_resume_version(r1["id"])
    assert active_v is not None
    assert active_v["id"] == v1["id"]

    # 2. Fetch active version by user (valid owner)
    owner_v = resume_repo.get_active_resume_version_by_user(user_id=user1_id, resume_id=r1["id"])
    assert owner_v is not None
    assert owner_v["id"] == v1["id"]

    # 3. Fetch active version by user (invalid owner - user 2 trying to access user 1's resume)
    unauthorized_v = resume_repo.get_active_resume_version_by_user(user_id=user2_id, resume_id=r1["id"])
    assert unauthorized_v is None, "Security failure: Exposed another user's active resume version!"


def test_2_get_latest_resume_version(db_context):
    """2. Test get_latest_resume_version uses version_number as authoritative ordering."""
    conn, db_type, resume_repo, job_repo = db_context

    user_id = str(uuid.uuid4())
    r = resume_repo.create_resume(user_id=user_id, title="Multi Version CV")

    v1 = resume_repo.create_resume_version(
        resume_id=r["id"],
        file_name="v1.pdf",
        file_path="uploads/v1.pdf",
        raw_text="v1",
        parsed_json={"skills": ["Python"]},
        is_active=False
    )
    v2 = resume_repo.create_resume_version(
        resume_id=r["id"],
        file_name="v2.pdf",
        file_path="uploads/v2.pdf",
        raw_text="v2",
        parsed_json={"skills": ["Python", "FastAPI"]},
        is_active=True
    )

    latest_v = resume_repo.get_latest_resume_version(r["id"])
    assert latest_v is not None
    assert latest_v["id"] == v2["id"]
    assert latest_v["version_number"] == 2


def test_3_4_5_activate_resume_version(db_context):
    """3, 4, 5. Test activate_resume_version, single active rule, and invalid version rejection."""
    conn, db_type, resume_repo, job_repo = db_context

    user_id = str(uuid.uuid4())
    r = resume_repo.create_resume(user_id=user_id, title="Activation Test CV")

    v1 = resume_repo.create_resume_version(
        resume_id=r["id"], file_name="v1.pdf", file_path="uploads/v1.pdf",
        raw_text="v1", parsed_json={"skills": ["Python"]}, is_active=True
    )
    v2 = resume_repo.create_resume_version(
        resume_id=r["id"], file_name="v2.pdf", file_path="uploads/v2.pdf",
        raw_text="v2", parsed_json={"skills": ["Python", "FastAPI"]}, is_active=True
    )

    # v2 is currently active, v1 is inactive
    assert resume_repo.get_active_resume_version(r["id"])["id"] == v2["id"]

    # Re-activate v1 explicitly
    activated_v1 = resume_repo.activate_resume_version(resume_id=r["id"], version_id=v1["id"])
    assert activated_v1 is not None
    assert activated_v1["id"] == v1["id"]
    assert activated_v1["is_active"] is True

    # Verify v2 is now inactive and exactly ONE version is active
    v2_updated = resume_repo.get_resume_version_by_id(v2["id"])
    assert v2_updated["is_active"] is False

    versions = resume_repo.list_resume_versions(r["id"])
    active_versions = [ver for ver in versions if ver["is_active"]]
    assert len(active_versions) == 1
    assert active_versions[0]["id"] == v1["id"]

    # 5. Invalid version activation (version from another resume or non-existent ID)
    r_other = resume_repo.create_resume(user_id=user_id, title="Other CV")
    v_other = resume_repo.create_resume_version(
        resume_id=r_other["id"], file_name="vo.pdf", file_path="uploads/vo.pdf",
        raw_text="vo", parsed_json={"skills": ["SQL"]}, is_active=True
    )

    invalid_act = resume_repo.activate_resume_version(resume_id=r["id"], version_id=v_other["id"])
    assert invalid_act is None, "Allowed activating a version belonging to a different resume!"


def test_6_7_canonical_skill_mapping_and_unmatched_skills(db_context):
    """6, 7. Test canonical resume skill mapping & unknown skill handling without DB mutation."""
    conn, db_type, resume_repo, job_repo = db_context

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM skills;")
    skills_before = cur.fetchone()[0]

    parsed_json = {
        "skills": ["Python", " SQL ", "fastapi", "SuperFakeNonExistentSkill999"]
    }

    res = resume_repo.map_resume_skills_detailed(parsed_json)
    matched = res["matched_skills"]
    unmatched = res["unmatched_skills"]

    assert isinstance(matched, list)
    assert isinstance(unmatched, list)

    matched_names_lower = [m["name"].lower() for m in matched]
    assert "python" in matched_names_lower
    assert "sql" in matched_names_lower

    assert "SuperFakeNonExistentSkill999" in unmatched

    # Verify canonical skills table count did NOT mutate
    cur.execute("SELECT COUNT(*) FROM skills;")
    skills_after = cur.fetchone()[0]
    assert skills_before == skills_after, "Canonical skills table was improperly mutated by unknown skill!"


def test_8_9_10_11_resume_job_skill_comparison(db_context):
    """8, 9, 10, 11. Test resume-job skill comparison, match percentage, and zero-required skills."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    # Find a job with required skills
    cur.execute("""
        SELECT js.job_id, COUNT(js.skill_id) AS cnt
        FROM job_skills js
        WHERE js.is_required = 1 OR js.is_required = TRUE
        GROUP BY js.job_id
        HAVING COUNT(js.skill_id) >= 2
        LIMIT 1;
    """)
    row = cur.fetchone()
    assert row is not None, "No jobs with required skills found in database!"
    job_id, req_cnt = str(row[0]), int(row[1])

    req_job_skills = job_repo.get_job_required_skills(job_id)
    req_names = [s["name"] for s in req_job_skills]

    # Create resume version matching only the first skill
    matched_skill_name = req_names[0]

    user_id = str(uuid.uuid4())
    r = resume_repo.create_resume(user_id=user_id, title="Match Test CV")
    v = resume_repo.create_resume_version(
        resume_id=r["id"],
        file_name="match.pdf",
        file_path="uploads/match.pdf",
        raw_text="match text",
        parsed_json={"skills": [matched_skill_name, "ExtraCustomSkill"]},
        is_active=True
    )

    comp = resume_repo.compare_resume_and_job_skills(resume_version_id=v["id"], job_id=job_id, job_repo=job_repo)

    assert comp["resume_version_id"] == v["id"]
    assert comp["job_id"] == job_id
    assert matched_skill_name.lower() in [s.lower() for s in comp["matched_skill_names"]]
    assert comp["matched_count"] == 1
    assert comp["required_skill_count"] == req_cnt
    expected_pct = round((1.0 / req_cnt) * 100.0, 2)
    assert comp["skill_match_percentage"] == expected_pct

    # 11. Test zero required skills handling
    no_skill_job_id = str(uuid.uuid4())
    comp_zero = resume_repo.compare_resume_and_job_skills(resume_version_id=v["id"], job_id=no_skill_job_id, job_repo=job_repo)
    assert comp_zero["required_skill_count"] == 0
    assert comp_zero["matched_count"] == 0
    assert comp_zero["skill_match_percentage"] == 100.0


def test_12_job_matching_feature_payload(db_context):
    """12. Test job matching feature payload structure for Intern 4."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    cur.execute("SELECT id FROM jobs LIMIT 1;")
    job_id = str(cur.fetchone()[0])

    payload = job_repo.get_job_matching_features(job_id)
    assert payload is not None
    assert payload["job_id"] == job_id
    assert "title" in payload
    assert "location" in payload
    assert "required_skills" in payload
    assert "keywords" in payload
    assert "job_keywords" in payload
    assert "min_experience" in payload
    assert "max_experience" in payload
    assert "salary" in payload
    assert "monthly_salary" in payload
    assert "job_description" in payload
    assert "embedding_input_text" in payload


def test_14_data_integrity_counts(db_context):
    """14. Verify overall dataset counts and data integrity after Day 4 operations."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_skills;")
    job_skills_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_keywords;")
    job_keywords_count = cur.fetchone()[0]

    assert jobs_count > 0
    assert job_skills_count > 0
    assert job_keywords_count > 0

    if db_type == "postgres":
        assert jobs_count == 97929
        assert job_skills_count == 755099
        assert job_keywords_count == 156908
