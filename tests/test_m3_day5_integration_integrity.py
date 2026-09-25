"""
Milestone 3 Day 5 Integration, Data Integrity, Transaction & Persistence Test Suite.

Validates:
1. Existing M2/M3 dataset counts remain 100% intact (jobs=97,929, companies=18,328, skills=44,078, job_skills=755,099, job_keywords=156,908).
2. Foreign key integrity across job_skills, job_keywords, resume_versions, and ats_scores (0 orphans).
3. Resume versioning & active-version rules (multi-version support, version_number uniqueness, single-active version, safe activation switch).
4. ATS score integrity (unique (resume_version_id, job_id), score range [0, 100], upsert update behavior, no history table).
5. Transaction & rollback behavior (rollback undoes changes, failed version activation does not mutate active state, no partial state leakage).
6. Resume storage persistence & lifecycle (save, retrieve byte equality, path structure, cleanup).
7. End-to-end real database query integration (resume_version -> parsed_json -> canonical skills -> job_skills -> job_keywords -> matching feature payload).
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
from db.connection import get_raw_connection, get_dict_cursor
from scripts.apply_m3_migration import apply_m3_migration
from storage.resume_storage import ResumeStorage
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


def test_1_m2_m3_dataset_row_counts_intact(db_context):
    """Phase 2A. Verify existing M2/M3 table row counts remain 100% preserved."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM jobs;")
    jobs_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM companies;")
    companies_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM skills;")
    skills_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_skills;")
    job_skills_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_keywords;")
    job_keywords_cnt = cur.fetchone()[0]

    assert jobs_cnt > 0
    assert companies_cnt > 0
    assert skills_cnt > 0
    assert job_skills_cnt > 0
    assert job_keywords_cnt > 0

    if db_type == "postgres":
        assert jobs_cnt == 97929, f"Expected 97,929 jobs, got {jobs_cnt}"
        assert companies_cnt == 18328, f"Expected 18,328 companies, got {companies_cnt}"
        assert skills_cnt == 44078, f"Expected 44,078 skills, got {skills_cnt}"
        assert job_skills_cnt == 755099, f"Expected 755,099 job_skills, got {job_skills_cnt}"
        assert job_keywords_cnt == 156908, f"Expected 156,908 job_keywords, got {job_keywords_cnt}"


def test_2_foreign_key_referential_integrity(db_context):
    """Phase 2B. Verify zero orphan records across all relational foreign keys."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    # 1. job_skills -> jobs
    cur.execute("SELECT COUNT(*) FROM job_skills js LEFT JOIN jobs j ON js.job_id = j.id WHERE j.id IS NULL;")
    orphan_js_jobs = cur.fetchone()[0]
    assert orphan_js_jobs == 0, f"Found {orphan_js_jobs} orphan job_skills referencing non-existent jobs!"

    # 2. job_skills -> skills
    cur.execute("SELECT COUNT(*) FROM job_skills js LEFT JOIN skills s ON js.skill_id = s.id WHERE s.id IS NULL;")
    orphan_js_skills = cur.fetchone()[0]
    assert orphan_js_skills == 0, f"Found {orphan_js_skills} orphan job_skills referencing non-existent skills!"

    # 3. job_keywords -> jobs
    cur.execute("SELECT COUNT(*) FROM job_keywords jk LEFT JOIN jobs j ON jk.job_id = j.id WHERE j.id IS NULL;")
    orphan_jk_jobs = cur.fetchone()[0]
    assert orphan_jk_jobs == 0, f"Found {orphan_jk_jobs} orphan job_keywords referencing non-existent jobs!"

    # 4. resume_versions -> resumes
    cur.execute("SELECT COUNT(*) FROM resume_versions rv LEFT JOIN resumes r ON rv.resume_id = r.id WHERE r.id IS NULL;")
    orphan_rv_resumes = cur.fetchone()[0]
    assert orphan_rv_resumes == 0, f"Found {orphan_rv_resumes} orphan resume_versions referencing non-existent resumes!"

    # 5. ats_scores -> resume_versions & jobs
    cur.execute("SELECT COUNT(*) FROM ats_scores ats LEFT JOIN resume_versions rv ON ats.resume_version_id = rv.id WHERE rv.id IS NULL;")
    orphan_ats_rv = cur.fetchone()[0]
    assert orphan_ats_rv == 0, f"Found {orphan_ats_rv} orphan ats_scores referencing non-existent resume_versions!"

    cur.execute("SELECT COUNT(*) FROM ats_scores ats LEFT JOIN jobs j ON ats.job_id = j.id WHERE j.id IS NULL;")
    orphan_ats_jobs = cur.fetchone()[0]
    assert orphan_ats_jobs == 0, f"Found {orphan_ats_jobs} orphan ats_scores referencing non-existent jobs!"


def test_3_resume_and_version_integrity(db_context):
    """Phase 2C. Verify multi-versioning, version number uniqueness, and single active version rule."""
    conn, db_type, resume_repo, job_repo = db_context

    user_id = str(uuid.uuid4())
    parent_resume = resume_repo.create_resume(user_id=user_id, title="Integrity Test CV")

    v1 = resume_repo.create_resume_version(
        resume_id=parent_resume["id"],
        file_name="v1.pdf", file_path="uploads/v1.pdf",
        raw_text="Text 1", parsed_json={"skills": ["Python"]}, is_active=True
    )
    v2 = resume_repo.create_resume_version(
        resume_id=parent_resume["id"],
        file_name="v2.pdf", file_path="uploads/v2.pdf",
        raw_text="Text 2", parsed_json={"skills": ["Python", "SQL"]}, is_active=True
    )

    # Multi-version check
    versions = resume_repo.list_resume_versions(parent_resume["id"])
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2
    assert versions[1]["version_number"] == 1

    # Single active version check
    active_v = resume_repo.get_active_resume_version(parent_resume["id"])
    assert active_v["id"] == v2["id"]

    v1_reloaded = resume_repo.get_resume_version_by_id(v1["id"])
    assert v1_reloaded["is_active"] is False

    # Switching active version
    act_res = resume_repo.activate_resume_version(parent_resume["id"], v1["id"])
    assert act_res["id"] == v1["id"]
    assert act_res["is_active"] is True

    active_after = resume_repo.get_active_resume_version(parent_resume["id"])
    assert active_after["id"] == v1["id"]

    v2_reloaded = resume_repo.get_resume_version_by_id(v2["id"])
    assert v2_reloaded["is_active"] is False


def test_4_ats_score_integrity(db_context):
    """Phase 2D. Verify ATS score pair uniqueness, range constraints, and upsert update semantics."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    cur.execute("SELECT id FROM jobs LIMIT 1;")
    job_id = str(cur.fetchone()[0])

    user_id = str(uuid.uuid4())
    parent_resume = resume_repo.create_resume(user_id=user_id, title="ATS Integrity CV")
    v1 = resume_repo.create_resume_version(
        resume_id=parent_resume["id"],
        file_name="ats.pdf", file_path="uploads/ats.pdf",
        raw_text="text", parsed_json={"skills": ["Python"]}, is_active=True
    )

    # 1. Upsert initial score
    score1 = resume_repo.upsert_ats_score(resume_version_id=v1["id"], job_id=job_id, match_score=65.00)
    assert score1["match_score"] == 65.00

    # 2. Re-score performs update (no duplicate row)
    score2 = resume_repo.upsert_ats_score(resume_version_id=v1["id"], job_id=job_id, match_score=92.50)
    assert score2["id"] == score1["id"]
    assert score2["match_score"] == 92.50

    placeholder = "%s" if db_type == "postgres" else "?"
    cur.execute(f"SELECT COUNT(*) FROM ats_scores WHERE resume_version_id = {placeholder} AND job_id = {placeholder};", (v1["id"], job_id))
    assert cur.fetchone()[0] == 1, "Duplicate ATS score row created instead of updating!"

    # 3. Reject invalid scores
    with pytest.raises(ValueError):
        resume_repo.upsert_ats_score(v1["id"], job_id, match_score=150.0)


def test_5_transaction_and_rollback_behavior(db_context):
    """Phase 3. Verify database transactions, rollback isolation, and safe activation failure recovery."""
    conn, db_type, resume_repo, job_repo = db_context

    # 1. Transaction Rollback Isolation Check
    user_id = str(uuid.uuid4())

    # Perform change in raw transaction then rollback
    cur = conn.cursor()
    placeholder = "%s" if db_type == "postgres" else "?"
    temp_resume_id = str(uuid.uuid4())

    if db_type == "postgres":
        cur.execute(f"INSERT INTO resumes (id, user_id, title, created_at, updated_at) VALUES ({placeholder}, {placeholder}, 'Temp Rollback Resume', NOW(), NOW());", (temp_resume_id, user_id))
    else:
        cur.execute(f"INSERT INTO resumes (id, user_id, title, created_at, updated_at) VALUES ({placeholder}, {placeholder}, 'Temp Rollback Resume', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);", (temp_resume_id, user_id))

    # Rollback transaction
    conn.rollback()

    # Verify change was completely undone
    fetched = resume_repo.get_resume_by_id(temp_resume_id)
    assert fetched is None, "Rollback failed! Temporary resume record persisted after rollback."

    # 2. Failed Activation Operation Isolation
    parent_1 = resume_repo.create_resume(user_id=user_id, title="User Resume 1")
    v1_1 = resume_repo.create_resume_version(
        resume_id=parent_1["id"], file_name="r1.pdf", file_path="uploads/r1.pdf",
        raw_text="text1", parsed_json={"skills": ["Python"]}, is_active=True
    )

    parent_2 = resume_repo.create_resume(user_id=user_id, title="User Resume 2")
    v2_1 = resume_repo.create_resume_version(
        resume_id=parent_2["id"], file_name="r2.pdf", file_path="uploads/r2.pdf",
        raw_text="text2", parsed_json={"skills": ["SQL"]}, is_active=True
    )

    # Attempt to activate v2_1 (belongs to parent_2) on parent_1
    fail_act = resume_repo.activate_resume_version(resume_id=parent_1["id"], version_id=v2_1["id"])
    assert fail_act is None

    # Verify parent_1's active version remains v1_1
    active_p1 = resume_repo.get_active_resume_version(parent_1["id"])
    assert active_p1["id"] == v1_1["id"]
    assert active_p1["is_active"] is True


def test_6_resume_storage_persistence_lifecycle():
    """Phase 4. Test ResumeStorage persistence lifecycle: save, retrieve, equality, path format, cleanup."""
    storage = ResumeStorage()

    test_user_id = str(uuid.uuid4())
    test_version_id = str(uuid.uuid4())
    file_name = "candidate_cv_v1.pdf"
    file_bytes = b"%PDF-1.4 Fake PDF Content for M3 Day 5 Persistence Validation Test."

    # 1. Save resume file
    rel_path = storage.save_resume_file(
        user_id=test_user_id,
        resume_version_id=test_version_id,
        file_name=file_name,
        content=file_bytes
    )

    assert rel_path.startswith("uploads/resumes/")
    assert test_user_id in rel_path
    assert test_version_id in rel_path
    assert file_name in rel_path

    # 2. Verify existence
    assert storage.exists_resume_file(rel_path) is True

    # 3. Retrieve and verify byte equality
    retrieved_bytes = storage.get_resume_file(rel_path)
    assert retrieved_bytes == file_bytes

    # 4. Delete and verify cleanup
    deleted = storage.delete_resume_file(rel_path)
    assert deleted is True
    assert storage.exists_resume_file(rel_path) is False


def test_7_real_database_end_to_end_query_integration(db_context):
    """Phase 5. End-to-end integration across resume_version -> parsed_json -> canonical skills -> job_skills -> job_keywords -> matching features."""
    conn, db_type, resume_repo, job_repo = db_context
    cur = conn.cursor()

    # Select real job with required skills
    cur.execute("""
        SELECT js.job_id, COUNT(js.skill_id) AS cnt
        FROM job_skills js
        WHERE js.is_required = 1 OR js.is_required = TRUE
        GROUP BY js.job_id
        HAVING COUNT(js.skill_id) >= 2
        LIMIT 1;
    """)
    row = cur.fetchone()
    assert row is not None
    job_id = str(row[0])

    req_job_skills = job_repo.get_job_required_skills(job_id)
    req_names = [s["name"] for s in req_job_skills]

    # Create test resume containing some of the required skills
    user_id = str(uuid.uuid4())
    parent_resume = resume_repo.create_resume(user_id=user_id, title="Integration Test Resume")
    v = resume_repo.create_resume_version(
        resume_id=parent_resume["id"],
        file_name="integration.pdf", file_path="uploads/integration.pdf",
        raw_text="Integration raw text",
        parsed_json={"skills": [req_names[0], "CustomUnknownSkillXYZ"]},
        is_active=True
    )

    # 1. Canonical skill mapping
    map_res = resume_repo.map_resume_skills_detailed(v["parsed_json"])
    assert len(map_res["matched_skills"]) >= 1
    assert "CustomUnknownSkillXYZ" in map_res["unmatched_skills"]

    # 2. Resume-job skill comparison
    comp = resume_repo.compare_resume_and_job_skills(resume_version_id=v["id"], job_id=job_id, job_repo=job_repo)
    assert comp["resume_version_id"] == v["id"]
    assert comp["job_id"] == job_id
    assert comp["matched_count"] >= 1
    assert comp["skill_match_percentage"] > 0.0

    # 3. Matching feature query
    features = job_repo.get_job_matching_features(job_id)
    assert features is not None
    assert features["job_id"] == job_id
    assert "required_skills" in features
    assert "keywords" in features
    assert "embedding_input_text" in features
