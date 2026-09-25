"""
test_m3_resume_upload_scaffold.py - Milestone 3 Day 2 Automated Test Scaffold.
Executes all 19 test cases defined in integration_omkar/m3_day2_test_cases.md
using mocked storage and deterministic service simulation.
Guarantees 100% offline, zero-cost, deterministic execution in CI and local test runs.
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import pytest

from integration_omkar.tests.mocks.storage_mock import FakeStorageService, StorageError


# -----------------------------------------------------------------------------
# Simulated Resume Service Handler (Contract Reference for M3 Day 2)
# Simulates the business logic agreed in OpenAPI contracts before live endpoints land.
# -----------------------------------------------------------------------------

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}


class ResumeServiceHandler:
    """
    Contract-conforming reference implementation of Resume Service logic.
    Acts as the test scaffold harness for Day 2 until teammate endpoints land in Day 3.
    """
    def __init__(self, storage: FakeStorageService):
        self.storage = storage
        # In-memory database tables for testing
        # user_id -> List of resume records
        self.resumes_by_user: Dict[str, List[Dict[str, Any]]] = {}

    def upload_resume(
        self,
        user_id: Optional[str],
        user_role: Optional[str],
        filename: Optional[str],
        content: Optional[bytes],
        content_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """Handles POST /api/v1/resumes/upload"""
        # 1. RBAC & Auth checks
        if not user_id:
            return {"status_code": 401, "error": "Unauthorized: Missing authentication token"}
        if user_role != "job_seeker":
            return {"status_code": 403, "error": "Forbidden: Only Job Seekers are permitted to upload resumes"}

        # 2. Payload validation
        if content is None or filename is None:
            return {"status_code": 422, "error": "Unprocessable Entity: 'file' is required"}

        if len(content) == 0:
            return {"status_code": 400, "error": "Bad Request: Uploaded file is empty (0 bytes)"}

        if len(content) > MAX_FILE_SIZE_BYTES:
            return {"status_code": 413, "error": "Payload Too Large: File size exceeds 10MB limit"}

        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS or content_type not in ALLOWED_MIME_TYPES:
            return {"status_code": 415, "error": "Unsupported Media Type: Only PDF and DOCX files are allowed"}

        # 3. Version calculation
        user_resumes = self.resumes_by_user.setdefault(user_id, [])
        next_version = len(user_resumes) + 1

        resume_id = str(uuid.uuid4())
        storage_key = f"{user_id}/v{next_version}/{filename}"

        # 4. Storage persistence
        try:
            storage_meta = self.storage.upload_file(
                bucket="swipex-resumes",
                file_key=storage_key,
                data=content,
                content_type=content_type
            )
        except StorageError as e:
            return {"status_code": 503, "error": f"Storage Backend Unavailable: {str(e)}"}

        # Mark previous versions as inactive
        for r in user_resumes:
            r["is_active"] = False

        record = {
            "id": resume_id,
            "user_id": user_id,
            "file_name": filename,
            "file_size": len(content),
            "content_type": content_type,
            "storage_key": storage_key,
            "version": next_version,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        user_resumes.append(record)

        return {"status_code": 201, "data": record}

    def list_resumes(self, user_id: Optional[str], user_role: Optional[str]) -> Dict[str, Any]:
        """Handles GET /api/v1/resumes"""
        if not user_id:
            return {"status_code": 401, "error": "Unauthorized: Missing authentication token"}
        if user_role != "job_seeker":
            return {"status_code": 403, "error": "Forbidden: Only Job Seekers can access resume archives"}

        records = self.resumes_by_user.get(user_id, [])
        # Sort descending by version
        sorted_records = sorted(records, key=lambda x: x["version"], reverse=True)
        return {"status_code": 200, "data": sorted_records}

    def get_resume(self, user_id: Optional[str], user_role: Optional[str], resume_id: str) -> Dict[str, Any]:
        """Handles GET /api/v1/resumes/{id}"""
        if not user_id:
            return {"status_code": 401, "error": "Unauthorized"}
        if user_role != "job_seeker":
            return {"status_code": 403, "error": "Forbidden"}

        user_resumes = self.resumes_by_user.get(user_id, [])
        for r in user_resumes:
            if r["id"] == resume_id:
                return {"status_code": 200, "data": r}

        return {"status_code": 404, "error": "Resume not found"}


# -----------------------------------------------------------------------------
# Test Fixtures
# -----------------------------------------------------------------------------

@pytest.fixture
def mock_storage():
    return FakeStorageService()


@pytest.fixture
def handler(mock_storage):
    return ResumeServiceHandler(storage=mock_storage)


@pytest.fixture
def valid_pdf_bytes():
    return b"%PDF-1.4\n1 0 obj\n<< /Title (Test Resume) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"


@pytest.fixture
def valid_docx_bytes():
    return b"PK\x03\x04Mock DOCX archive header stream"


# -----------------------------------------------------------------------------
# DAY 2 TEST CASES: RESUME UPLOAD (14 Cases)
# -----------------------------------------------------------------------------

def test_tc_res_01_valid_pdf_upload(handler, valid_pdf_bytes):
    """TC-RES-01: Valid PDF upload succeeds with 201 Created and proper metadata."""
    res = handler.upload_resume(
        user_id="seeker_101",
        user_role="job_seeker",
        filename="software_engineer_cv.pdf",
        content=valid_pdf_bytes,
        content_type="application/pdf"
    )
    assert res["status_code"] == 201
    data = res["data"]
    assert data["file_name"] == "software_engineer_cv.pdf"
    assert data["version"] == 1
    assert data["is_active"] is True
    assert data["file_size"] == len(valid_pdf_bytes)


def test_tc_res_02_valid_docx_upload(handler, valid_docx_bytes):
    """TC-RES-02: Valid DOCX upload succeeds with 201 Created."""
    res = handler.upload_resume(
        user_id="seeker_101",
        user_role="job_seeker",
        filename="resume_archive.docx",
        content=valid_docx_bytes,
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert res["status_code"] == 201
    assert res["data"]["file_name"] == "resume_archive.docx"


def test_tc_res_03_invalid_file_type_rejected(handler):
    """TC-RES-03: Invalid file types (.exe, .png) are rejected with 415."""
    res = handler.upload_resume(
        user_id="seeker_101",
        user_role="job_seeker",
        filename="script.exe",
        content=b"MZ\x90Executable binary",
        content_type="application/octet-stream"
    )
    assert res["status_code"] == 415
    assert "Only PDF and DOCX" in res["error"]


def test_tc_res_04_empty_file_rejected(handler):
    """TC-RES-04: Empty 0-byte file upload is rejected with 400 Bad Request."""
    res = handler.upload_resume(
        user_id="seeker_101",
        user_role="job_seeker",
        filename="empty.pdf",
        content=b"",
        content_type="application/pdf"
    )
    assert res["status_code"] == 400
    assert "empty" in res["error"]


def test_tc_res_05_missing_file_rejected(handler):
    """TC-RES-05: Missing file in payload is rejected with 422 Unprocessable Entity."""
    res = handler.upload_resume(
        user_id="seeker_101",
        user_role="job_seeker",
        filename=None,
        content=None,
        content_type="application/pdf"
    )
    assert res["status_code"] == 422
    assert "required" in res["error"]


def test_tc_res_06_oversized_file_rejected(handler):
    """TC-RES-06: Files exceeding 10MB are rejected with 413 Payload Too Large."""
    oversized = b"A" * (10 * 1024 * 1024 + 1)
    res = handler.upload_resume(
        user_id="seeker_101",
        user_role="job_seeker",
        filename="huge_portfolio.pdf",
        content=oversized,
        content_type="application/pdf"
    )
    assert res["status_code"] == 413
    assert "exceeds" in res["error"]


def test_tc_res_07_job_seeker_upload_allowed(handler, valid_pdf_bytes):
    """TC-RES-07: Authenticated user with job_seeker role is permitted."""
    res = handler.upload_resume(
        user_id="valid_seeker_202",
        user_role="job_seeker",
        filename="my_resume.pdf",
        content=valid_pdf_bytes
    )
    assert res["status_code"] == 201


def test_tc_res_08_unauthorized_upload_rejected(handler, valid_pdf_bytes):
    """TC-RES-08: Unauthenticated upload (no user_id/token) is rejected with 401."""
    res = handler.upload_resume(
        user_id=None,
        user_role=None,
        filename="anon.pdf",
        content=valid_pdf_bytes
    )
    assert res["status_code"] == 401


def test_tc_res_09_recruiter_upload_rejected(handler, valid_pdf_bytes):
    """TC-RES-09: Recruiter role is forbidden from uploading resumes (403)."""
    res = handler.upload_resume(
        user_id="recruiter_999",
        user_role="recruiter",
        filename="candidate.pdf",
        content=valid_pdf_bytes
    )
    assert res["status_code"] == 403
    assert "Only Job Seekers" in res["error"]


def test_tc_res_10_resume_version_creation(handler, valid_pdf_bytes):
    """TC-RES-10: Initial upload generates version 1 with is_active=True."""
    res = handler.upload_resume("user_v", "job_seeker", "v1.pdf", valid_pdf_bytes)
    assert res["status_code"] == 201
    assert res["data"]["version"] == 1
    assert res["data"]["is_active"] is True


def test_tc_res_11_resume_list_retrieval(handler, valid_pdf_bytes):
    """TC-RES-11: Newly uploaded resume is discoverable in the list endpoint."""
    upload_res = handler.upload_resume("user_list_check", "job_seeker", "initial.pdf", valid_pdf_bytes)
    created_id = upload_res["data"]["id"]

    list_res = handler.list_resumes("user_list_check", "job_seeker")
    assert list_res["status_code"] == 200
    ids = [item["id"] for item in list_res["data"]]
    assert created_id in ids


def test_tc_res_12_multiple_resume_versions(handler, valid_pdf_bytes):
    """TC-RES-12: Uploading a new resume increments version to 2 and marks v1 inactive."""
    # Upload Version 1
    v1_res = handler.upload_resume("multi_v_user", "job_seeker", "resume_v1.pdf", valid_pdf_bytes)
    assert v1_res["data"]["version"] == 1
    assert v1_res["data"]["is_active"] is True

    # Upload Version 2
    v2_res = handler.upload_resume("multi_v_user", "job_seeker", "resume_v2.pdf", valid_pdf_bytes)
    assert v2_res["data"]["version"] == 2
    assert v2_res["data"]["is_active"] is True

    # Verify version 1 is now inactive
    list_res = handler.list_resumes("multi_v_user", "job_seeker")
    records = list_res["data"]
    assert len(records) == 2
    v1_record = [r for r in records if r["version"] == 1][0]
    v2_record = [r for r in records if r["version"] == 2][0]
    assert v1_record["is_active"] is False
    assert v2_record["is_active"] is True


def test_tc_res_13_invalid_resume_id_returns_404(handler):
    """TC-RES-13: Looking up a nonexistent resume ID returns 404."""
    res = handler.get_resume("seeker_1", "job_seeker", "00000000-0000-0000-0000-000000000000")
    assert res["status_code"] == 404
    assert "not found" in res["error"].lower()


def test_tc_res_14_storage_failure_graceful_handling(handler, mock_storage, valid_pdf_bytes):
    """TC-RES-14: Storage backend exception (MinIO down) returns graceful 503 error."""
    mock_storage.should_fail = True
    res = handler.upload_resume("seeker_fail", "job_seeker", "resume.pdf", valid_pdf_bytes)
    assert res["status_code"] == 503
    assert "Storage Backend Unavailable" in res["error"]


# -----------------------------------------------------------------------------
# DAY 2 TEST CASES: RESUME LISTING & TENANT ISOLATION (5 Cases)
# -----------------------------------------------------------------------------

def test_tc_list_01_authenticated_seeker_lists_own_resumes(handler, valid_pdf_bytes):
    """TC-LIST-01: Authenticated seeker retrieves all their own uploaded resumes."""
    handler.upload_resume("seeker_owner", "job_seeker", "r1.pdf", valid_pdf_bytes)
    handler.upload_resume("seeker_owner", "job_seeker", "r2.pdf", valid_pdf_bytes)

    res = handler.list_resumes("seeker_owner", "job_seeker")
    assert res["status_code"] == 200
    assert len(res["data"]) == 2


def test_tc_list_02_tenant_isolation_cannot_access_other_user_resumes(handler, valid_pdf_bytes):
    """TC-LIST-02: User A's resumes are completely isolated from User B (NFR-03)."""
    # User A uploads
    up_a = handler.upload_resume("user_a", "job_seeker", "confidential_a.pdf", valid_pdf_bytes)
    resume_a_id = up_a["data"]["id"]

    # User B uploads
    handler.upload_resume("user_b", "job_seeker", "cv_b.pdf", valid_pdf_bytes)

    # User B lists resumes
    list_b = handler.list_resumes("user_b", "job_seeker")
    assert len(list_b["data"]) == 1
    assert list_b["data"][0]["file_name"] == "cv_b.pdf"
    assert resume_a_id not in [r["id"] for r in list_b["data"]]

    # User B attempts to access User A's resume directly -> 404 (isolated)
    get_res = handler.get_resume("user_b", "job_seeker", resume_a_id)
    assert get_res["status_code"] == 404


def test_tc_list_03_empty_resume_list_returns_empty_array(handler):
    """TC-LIST-03: New user with no resumes returns an empty array with 200 OK."""
    res = handler.list_resumes("newbie_user", "job_seeker")
    assert res["status_code"] == 200
    assert res["data"] == []


def test_tc_list_04_multiple_versions_ordered(handler, valid_pdf_bytes):
    """TC-LIST-04: Resumes are returned in descending version order (latest first)."""
    handler.upload_resume("user_order", "job_seeker", "v1.pdf", valid_pdf_bytes)
    handler.upload_resume("user_order", "job_seeker", "v2.pdf", valid_pdf_bytes)
    handler.upload_resume("user_order", "job_seeker", "v3.pdf", valid_pdf_bytes)

    res = handler.list_resumes("user_order", "job_seeker")
    assert res["status_code"] == 200
    versions = [r["version"] for r in res["data"]]
    assert versions == [3, 2, 1]


def test_tc_list_05_correct_response_structure(handler, valid_pdf_bytes):
    """TC-LIST-05: Response structure adheres strictly to the defined schema."""
    handler.upload_resume("user_schema", "job_seeker", "standard.pdf", valid_pdf_bytes)
    res = handler.list_resumes("user_schema", "job_seeker")
    assert res["status_code"] == 200
    record = res["data"][0]

    expected_keys = {
        "id", "user_id", "file_name", "file_size", "content_type",
        "storage_key", "version", "is_active", "created_at"
    }
    assert expected_keys.issubset(record.keys())
    assert isinstance(record["id"], str)
    assert isinstance(record["file_size"], int)
    assert isinstance(record["version"], int)
    assert isinstance(record["is_active"], bool)
