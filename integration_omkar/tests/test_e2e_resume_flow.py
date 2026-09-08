"""
test_e2e_resume_flow.py - Live End-to-End System Tests for Resume & ATS Service via Gateway.

Validates:
Upload Resume -> Extract Skills -> Calculate ATS Score -> Retrieve Recommendations.
"""
import io
import pytest
import httpx

def test_resume_upload_ats_score_and_recommendations(gateway_url, test_job_seeker):
    headers = test_job_seeker["headers"]

    # 1. Upload a text-based resume via Gateway
    resume_content = (
        "Experienced Software Engineer with proficiency in Python, FastAPI, Docker, "
        "PostgreSQL, React, and Git. Built scalable microservice backends and REST APIs."
    )
    files = {
        "file": ("test_resume.txt", io.BytesIO(resume_content.encode("utf-8")), "text/plain")
    }

    # Remove Content-Type header so httpx sets multipart/form-data with proper boundary
    upload_headers = {k: v for k, v in headers.items() if k.lower() != "content-type"}

    upload_res = httpx.post(
        f"{gateway_url}/api/v1/resume/upload",
        files=files,
        headers=upload_headers,
        timeout=10.0
    )
    assert upload_res.status_code == 200 or upload_res.status_code == 201, (
        f"Resume upload failed: {upload_res.status_code} - {upload_res.text}"
    )
    upload_data = upload_res.json()
    assert "resume_id" in upload_data, "Response missing resume_id"
    assert "parsed_skills" in upload_data, "Response missing parsed_skills"
    resume_id = upload_data["resume_id"]
    assert isinstance(upload_data["parsed_skills"], list)

    # 2. Get a valid job_id from Job service via Gateway
    jobs_res = httpx.get(f"{gateway_url}/api/v1/jobs?page_size=1", headers=headers, timeout=5.0)
    assert jobs_res.status_code == 200
    job_id = jobs_res.json()[0]["job_id"]

    # 3. Calculate heuristic ATS match score via Gateway
    ats_res = httpx.get(
        f"{gateway_url}/api/v1/resume/{resume_id}/ats-score?job_id={job_id}",
        headers=headers,
        timeout=5.0
    )
    assert ats_res.status_code == 200, f"ATS score failed: {ats_res.status_code} - {ats_res.text}"
    ats_data = ats_res.json()
    assert ats_data["resume_id"] == resume_id
    assert "ats_score" in ats_data or "match_score" in ats_data
    assert ats_data.get("generated_by") == "heuristic-v0"

    # 4. Fetch job recommendations via Gateway
    recs_res = httpx.get(
        f"{gateway_url}/api/v1/recommendations",
        headers=headers,
        timeout=5.0
    )
    assert recs_res.status_code == 200, f"Recommendations failed: {recs_res.status_code} - {recs_res.text}"
    recs_data = recs_res.json()
    assert "recommendations" in recs_data
    assert isinstance(recs_data["recommendations"], list)
    assert recs_data.get("generated_by") == "heuristic-v0"
