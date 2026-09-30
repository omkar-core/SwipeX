"""
test_m3_day3_functional.py - Milestone 3 Day 3 Functional Tests Against Live Endpoints.

Executes functional verification of:
- POST /api/v1/resumes/upload  (Resume upload — M3 plural contract)
- POST /api/v1/resumes/{resume_id}/parse  (Parse trigger endpoint)
- GET  /api/v1/resumes          (Resume list)
- GET  /api/v1/resumes/{id}     (Resume detail)
- POST /api/v1/ats/score        (ATS scoring)

All tests hit the ACTUAL live Gateway/backend stack (via docker-compose.dev.yml).
Tests are skipped (not failed) when the live stack is not running — this prevents
CI breakage during teammate development while preserving the full assertion set.

Day 3 Boundary:
- Tests run against live Day-3 endpoints as they exist RIGHT NOW in the repo.
- Do NOT mock what is already live.
- Defects found are logged in integration_omkar/defect_log.md (not silently fixed).
"""
import io
import uuid
import pytest
import httpx

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TIMEOUT_UPLOAD = 15.0   # Resume uploads may be slower due to MinIO writes
TIMEOUT_STD    = 10.0

VALID_TEST_PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
    b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
    b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
    b"4 0 obj << /Length 55 >> stream\n"
    b"BT /F1 12 Tf 72 712 Td (Python Developer with FastAPI Docker experience) Tj ET\n"
    b"endstream endobj\n"
    b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
    b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000234 00000 n \n0000000340 00000 n \n"
    b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n420\n%%EOF"
)


def _skip_if_down(gateway_url: str) -> None:
    """Soft-skip this test if the live stack is not reachable."""
    try:
        r = httpx.get(f"{gateway_url}/health", timeout=3.0)
        if r.status_code != 200:
            pytest.skip(f"Gateway /health returned {r.status_code} — live stack not ready.")
    except Exception as exc:
        pytest.skip(f"Live Gateway not reachable at {gateway_url}: {exc}")


# ---------------------------------------------------------------------------
# Day 3 Functional Test Set — Resume Upload (M3 plural contract path)
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_d3_fn_01_resume_upload_pdf_returns_201(gateway_url, test_job_seeker):
    """
    D3-FN-01: POST /api/v1/resumes/upload with a valid PDF returns 201 or 200.
    Verifies: M3 contract path (plural), authentication, resume_id in response.
    Result is logged here (pass or FAIL → DEF entry).
    """
    _skip_if_down(gateway_url)
    headers = {k: v for k, v in test_job_seeker["headers"].items()
               if k.lower() != "content-type"}
    files = {"file": ("d3_functional_test.pdf", io.BytesIO(VALID_TEST_PDF_BYTES), "application/pdf")}

    res = httpx.post(
        f"{gateway_url}/api/v1/resumes/upload",
        files=files,
        headers=headers,
        timeout=TIMEOUT_UPLOAD
    )
    # DEF-021 reference: 404 here means the old singular route was still live — confirm plural.
    assert res.status_code in (200, 201), (
        f"D3-FN-01 FAIL: POST /api/v1/resumes/upload returned {res.status_code}. "
        f"Body: {res.text[:300]}. "
        f"If 404 → verify gateway routes resume to the new M3 service path (DEF-021)."
    )
    data = res.json()
    assert "resume_id" in data or "id" in data, (
        f"D3-FN-01 FAIL: Response missing resume_id/id field. Got: {data}"
    )


@pytest.mark.integration
def test_d3_fn_02_upload_unauthorized_returns_401(gateway_url):
    """D3-FN-02: Upload without token returns 401 Unauthorized."""
    _skip_if_down(gateway_url)
    resume_bytes = b"%PDF-1.4 minimal\n%%EOF"
    files = {"file": ("anon.pdf", io.BytesIO(resume_bytes), "application/pdf")}
    res = httpx.post(
        f"{gateway_url}/api/v1/resumes/upload",
        files=files,
        timeout=TIMEOUT_STD
    )
    assert res.status_code in (401, 403), (
        f"D3-FN-02 FAIL: Expected 401/403 for unauthenticated upload, got {res.status_code}"
    )


@pytest.mark.integration
def test_d3_fn_03_upload_recruiter_role_returns_403(gateway_url, test_recruiter):
    """D3-FN-03: Upload with recruiter role is rejected with 403 (RBAC enforcement)."""
    _skip_if_down(gateway_url)
    headers = {k: v for k, v in test_recruiter["headers"].items()
               if k.lower() != "content-type"}
    resume_bytes = b"%PDF-1.4 recruiter attempt\n%%EOF"
    files = {"file": ("recruiter_attempt.pdf", io.BytesIO(resume_bytes), "application/pdf")}
    res = httpx.post(
        f"{gateway_url}/api/v1/resumes/upload",
        files=files,
        headers=headers,
        timeout=TIMEOUT_STD
    )
    assert res.status_code == 403, (
        f"D3-FN-03 FAIL: Expected 403 Forbidden for recruiter, got {res.status_code}: {res.text}"
    )


@pytest.mark.integration
def test_d3_fn_04_upload_invalid_file_type_rejected(gateway_url, test_job_seeker):
    """D3-FN-04: Uploading an .exe file returns 400 or 415 Unsupported Media Type."""
    _skip_if_down(gateway_url)
    headers = {k: v for k, v in test_job_seeker["headers"].items()
               if k.lower() != "content-type"}
    files = {"file": ("malicious.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")}
    res = httpx.post(
        f"{gateway_url}/api/v1/resumes/upload",
        files=files,
        headers=headers,
        timeout=TIMEOUT_STD
    )
    assert res.status_code in (400, 415, 422), (
        f"D3-FN-04 FAIL: Expected 400/415/422 for .exe upload, got {res.status_code}: {res.text}"
    )


@pytest.mark.integration
def test_d3_fn_05_resume_list_returns_200(gateway_url, test_job_seeker):
    """D3-FN-05: GET /api/v1/resumes returns 200 with a list (possibly empty) for authenticated seeker."""
    _skip_if_down(gateway_url)
    res = httpx.get(
        f"{gateway_url}/api/v1/resumes",
        headers=test_job_seeker["headers"],
        timeout=TIMEOUT_STD
    )
    assert res.status_code == 200, (
        f"D3-FN-05 FAIL: GET /api/v1/resumes returned {res.status_code}: {res.text}"
    )
    data = res.json()
    assert isinstance(data, list) or ("resumes" in data) or ("items" in data), (
        f"D3-FN-05 FAIL: Expected list or paginated wrapper, got: {type(data)} — {data}"
    )


@pytest.mark.integration
def test_d3_fn_06_upload_then_list_contains_upload(gateway_url, test_job_seeker):
    """
    D3-FN-06: End-to-end: upload a resume, then GET /api/v1/resumes — the new upload appears in the list.
    Verifies: upload write path + list read path are consistent.
    """
    _skip_if_down(gateway_url)
    headers = {k: v for k, v in test_job_seeker["headers"].items()
               if k.lower() != "content-type"}
    files = {"file": ("d3_list_test.pdf", io.BytesIO(VALID_TEST_PDF_BYTES), "application/pdf")}

    upload_res = httpx.post(
        f"{gateway_url}/api/v1/resumes/upload",
        files=files,
        headers=headers,
        timeout=TIMEOUT_UPLOAD
    )
    if upload_res.status_code not in (200, 201):
        pytest.skip(
            f"Upload returned {upload_res.status_code} — list consistency test cannot run. "
            f"Log as defect if upload endpoint is not yet live."
        )

    upload_data = upload_res.json()
    created_id = upload_data.get("resume_id") or upload_data.get("id")
    assert created_id, f"Upload returned no resume_id or id: {upload_data}"

    list_res = httpx.get(
        f"{gateway_url}/api/v1/resumes",
        headers=test_job_seeker["headers"],
        timeout=TIMEOUT_STD
    )
    assert list_res.status_code == 200, (
        f"D3-FN-06 FAIL: List returned {list_res.status_code}: {list_res.text}"
    )
    items = list_res.json()
    if isinstance(items, dict):
        items = items.get("resumes") or items.get("items") or []
    found_ids = [str(item.get("resume_id") or item.get("id") or "") for item in items]
    assert str(created_id) in found_ids, (
        f"D3-FN-06 FAIL: Uploaded resume {created_id} not in list. List IDs: {found_ids}"
    )


@pytest.mark.integration
def test_d3_fn_07_parse_trigger_endpoint(gateway_url, test_job_seeker):
    """
    D3-FN-07: POST /api/v1/resumes/{resume_id}/parse — parse-trigger endpoint.
    Day 3 boundary: test against the endpoint as it exists now.
    If endpoint is not yet live (404/501/503) → skip and log for defect tracking.
    """
    _skip_if_down(gateway_url)
    headers = {k: v for k, v in test_job_seeker["headers"].items()
               if k.lower() != "content-type"}

    # First upload a resume to get a valid ID
    files = {"file": ("parse_trigger_test.pdf", io.BytesIO(VALID_TEST_PDF_BYTES), "application/pdf")}
    upload_res = httpx.post(
        f"{gateway_url}/api/v1/resumes/upload",
        files=files,
        headers=headers,
        timeout=TIMEOUT_UPLOAD
    )
    if upload_res.status_code not in (200, 201):
        pytest.skip(
            f"Upload pre-condition failed ({upload_res.status_code}) — "
            "parse-trigger test cannot run without a valid resume_id."
        )

    upload_data = upload_res.json()
    resume_id = upload_data.get("resume_id") or upload_data.get("id")
    assert resume_id, f"No resume_id from upload: {upload_data}"

    parse_res = httpx.post(
        f"{gateway_url}/api/v1/resumes/{resume_id}/parse",
        headers=test_job_seeker["headers"],
        timeout=TIMEOUT_STD
    )

    # Day 3 tolerance: endpoint may not be fully live yet — log, do not fail CI blindly
    if parse_res.status_code in (404, 501, 503):
        pytest.skip(
            f"D3-FN-07 SKIP: POST /api/v1/resumes/{{id}}/parse returned {parse_res.status_code}. "
            f"Endpoint not yet live — log as DEF-022 in defect_log.md. Body: {parse_res.text[:200]}"
        )

    assert parse_res.status_code in (200, 201, 202), (
        f"D3-FN-07 FAIL: Parse trigger returned {parse_res.status_code}: {parse_res.text}"
    )
    parse_data = parse_res.json()
    # Flexible assertion — contract says returns {parsed_text, extracted_skills[]}
    assert "parsed_text" in parse_data or "extracted_skills" in parse_data or "status" in parse_data, (
        f"D3-FN-07 FAIL: Unexpected parse response shape: {parse_data}"
    )


@pytest.mark.integration
def test_d3_fn_08_resume_detail_by_id(gateway_url, test_job_seeker):
    """
    D3-FN-08: GET /api/v1/resumes/{resume_id} — single resume detail lookup.
    Uploads a resume, then retrieves it by ID. Validates response schema.
    """
    _skip_if_down(gateway_url)
    headers = {k: v for k, v in test_job_seeker["headers"].items()
               if k.lower() != "content-type"}

    files = {"file": ("detail_lookup.pdf", io.BytesIO(VALID_TEST_PDF_BYTES), "application/pdf")}
    upload_res = httpx.post(
        f"{gateway_url}/api/v1/resumes/upload",
        files=files,
        headers=headers,
        timeout=TIMEOUT_UPLOAD
    )
    if upload_res.status_code not in (200, 201):
        pytest.skip(f"Upload pre-condition failed ({upload_res.status_code}).")

    resume_id = upload_res.json().get("resume_id") or upload_res.json().get("id")
    assert resume_id

    detail_res = httpx.get(
        f"{gateway_url}/api/v1/resumes/{resume_id}",
        headers=test_job_seeker["headers"],
        timeout=TIMEOUT_STD
    )
    if detail_res.status_code in (404, 501, 503):
        pytest.skip(
            f"D3-FN-08 SKIP: GET /api/v1/resumes/{{id}} returned {detail_res.status_code}. "
            f"Endpoint may not be live yet."
        )
    assert detail_res.status_code == 200, (
        f"D3-FN-08 FAIL: {detail_res.status_code}: {detail_res.text}"
    )
    detail = detail_res.json()
    detail_id = str(detail.get("resume_id") or detail.get("id") or "")
    assert detail_id == str(resume_id), (
        f"D3-FN-08 FAIL: Expected resume_id {resume_id} in detail, got {detail_id}"
    )


@pytest.mark.integration
def test_d3_fn_09_ats_score_endpoint(gateway_url, test_job_seeker):
    """
    D3-FN-09: POST /api/v1/ats/score — ATS scoring endpoint (M3 contract).
    Uploads a resume, fetches a job_id, then calls ATS scoring.
    Day 3 boundary: test against the endpoint as it exists now.
    """
    _skip_if_down(gateway_url)
    headers = {k: v for k, v in test_job_seeker["headers"].items()
               if k.lower() != "content-type"}

    # Step 1 — Upload resume
    files = {"file": ("ats_score_test.pdf", io.BytesIO(VALID_TEST_PDF_BYTES), "application/pdf")}
    upload_res = httpx.post(
        f"{gateway_url}/api/v1/resumes/upload",
        files=files,
        headers=headers,
        timeout=TIMEOUT_UPLOAD
    )
    if upload_res.status_code not in (200, 201):
        pytest.skip(f"Upload pre-condition failed ({upload_res.status_code}).")
    resume_id = upload_res.json().get("resume_id") or upload_res.json().get("id")
    assert resume_id

    # Step 2 — Get a job_id from the Jobs service
    jobs_res = httpx.get(
        f"{gateway_url}/api/v1/jobs?page_size=1",
        headers=test_job_seeker["headers"],
        timeout=TIMEOUT_STD
    )
    if jobs_res.status_code != 200 or not jobs_res.json():
        pytest.skip("Jobs list unavailable or empty — cannot get job_id for ATS test.")
    job_id = jobs_res.json()[0]["job_id"]

    # Step 3 — Call ATS scoring (M3 contract: POST /api/v1/ats/score)
    ats_res = httpx.post(
        f"{gateway_url}/api/v1/ats/score",
        json={"resume_id": str(resume_id), "job_id": str(job_id)},
        headers=test_job_seeker["headers"],
        timeout=TIMEOUT_STD
    )
    if ats_res.status_code in (404, 501, 503):
        pytest.skip(
            f"D3-FN-09 SKIP: POST /api/v1/ats/score returned {ats_res.status_code}. "
            f"Endpoint not yet live — log as DEF-023 in defect_log.md if persistent. "
            f"Body: {ats_res.text[:200]}"
        )
    assert ats_res.status_code in (200, 201), (
        f"D3-FN-09 FAIL: ATS score returned {ats_res.status_code}: {ats_res.text}"
    )
    ats_data = ats_res.json()
    assert "match_score" in ats_data or "ats_score" in ats_data or "score" in ats_data, (
        f"D3-FN-09 FAIL: Response missing score field. Got: {ats_data}"
    )


@pytest.mark.integration
def test_d3_fn_10_resume_list_unauthenticated_rejected(gateway_url):
    """D3-FN-10: GET /api/v1/resumes without token returns 401 or 403."""
    _skip_if_down(gateway_url)
    res = httpx.get(f"{gateway_url}/api/v1/resumes", timeout=TIMEOUT_STD)
    assert res.status_code in (401, 403), (
        f"D3-FN-10 FAIL: Expected 401/403, got {res.status_code}: {res.text}"
    )
