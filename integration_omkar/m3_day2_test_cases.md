# SwipeX Milestone 3 — Day 2 Test Case Specifications
**Role:** Intern 5 — Platform, Testing & Deployment  
**Scope:** Milestone 3 Day 2 (Resume Upload, Multi-Versioning, RBAC, and Listing)  
**Contract Baseline:** SwipeX Milestone 3 SRS (Sections 6, 9.2, 9.5, 10.5)

---

## 1. Overview & Test Scope

In Milestone 3 Day 2, the Resume Service introduces endpoints for:
1. Uploading resumes (`POST /api/v1/resumes/upload` via Gateway — M3 contract, plural path, **frozen per Section 11.2**)
2. Managing multiple resume versions per Job Seeker
3. Querying active and historical resumes (`GET /api/v1/resumes`)
4. Enforcing strict Role-Based Access Control (RBAC: Job Seeker only; Recruiters/Unauthenticated blocked)

This document defines the **19 authoritative test cases** specified for Day 2 validation across functional, security, boundary, and error-handling dimensions.

---

## 2. Test Case Matrix: Resume Upload (14 Test Cases)

| TC ID | Test Case Name | Pre-Conditions | Request / Inputs | Expected Status | Expected Response / Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RES-01** | Valid PDF Upload | User authenticated as `job_seeker` | `POST /api/v1/resumes/upload`<br>Header: `Bearer <token>`<br>Body: `multipart/form-data`<br>File: `sample_resume.pdf` (valid %PDF binary) | `201 Created` / `200 OK` | `resume_id` returned, `file_name="sample_resume.pdf"`, `version=1`, `file_size > 0`, storage key generated. |
| **TC-RES-02** | Valid DOCX Upload | User authenticated as `job_seeker` | `POST /api/v1/resumes/upload`<br>File: `sample_cv.docx` (valid PK zip header) | `201 Created` / `200 OK` | Upload accepted, version created, content type identified as DOCX. |
| **TC-RES-03** | Invalid File Type Rejection | User authenticated as `job_seeker` | `POST /api/v1/resumes/upload`<br>File: `malicious.exe` or `avatar.png` | `400 Bad Request` / `415 Unsupported Media Type` | Request rejected with descriptive error message: "Only PDF and DOCX formats are supported". No file written to storage. |
| **TC-RES-04** | Empty File Rejection | User authenticated as `job_seeker` | `POST /api/v1/resumes/upload`<br>File: `empty.pdf` (0 bytes payload) | `400 Bad Request` | Request rejected: "Uploaded file is empty (0 bytes)". |
| **TC-RES-05** | Missing File in Form | User authenticated as `job_seeker` | `POST /api/v1/resumes/upload`<br>Empty multipart payload or wrong field name | `422 Unprocessable Entity` / `400 Bad Request` | Validation failure detailing missing `file` parameter. |
| **TC-RES-06** | Oversized File Rejection | User authenticated as `job_seeker` | `POST /api/v1/resumes/upload`<br>File: `large_file.pdf` (> 10MB payload) | `413 Payload Too Large` / `400 Bad Request` | Request rejected: "File size exceeds maximum allowed limit (10MB)". |
| **TC-RES-07** | Authenticated Job Seeker Allowed | Valid JWT token with `role="job_seeker"` | Standard valid PDF upload request | `201 Created` / `200 OK` | Upload succeeds and resume record is bound to authenticated user's `user_id`. |
| **TC-RES-08** | Unauthorized User Upload Blocked | Missing or malformed `Authorization` header | Standard valid PDF upload request without token | `401 Unauthorized` / `403 Forbidden` | Access denied. Upstream storage and service never invoked. |
| **TC-RES-09** | Wrong Role (Recruiter) Blocked | Valid JWT token with `role="recruiter"` | Standard valid PDF upload request | `403 Forbidden` | Access denied: "Only Job Seekers are permitted to upload resumes". |
| **TC-RES-10** | Resume Initial Version Creation | User has no previous resumes | Upload first valid PDF | `201 Created` | Resume entity created with `version=1`, `is_active=true`. |
| **TC-RES-11** | Resume Retrieval in List | User uploaded a resume via TC-RES-01 | `GET /api/v1/resumes` | `200 OK` | Response array contains the newly uploaded resume record. |
| **TC-RES-12** | Multiple Resume Versions | User already has `version=1` resume | Upload second valid resume document | `201 Created` | Incremented `version=2` created; linked under same user profile; active flag updated. |
| **TC-RES-13** | Invalid Resume / Version ID | User authenticated as `job_seeker` | `GET /api/v1/resumes/00000000-0000-0000-0000-000000000000` | `404 Not Found` | Error returned: "Resume not found". |
| **TC-RES-14** | Storage Failure Graceful Handling | User authenticated as `job_seeker`; MinIO storage throws `IOError` / timeout | Standard valid PDF upload request | `500 Internal Server Error` / `503 Service Unavailable` | Graceful failure returned without database corruption or orphan partial record. |

---

## 3. Test Case Matrix: Resume Listing & Tenant Isolation (5 Test Cases)

| TC ID | Test Case Name | Pre-Conditions | Request / Inputs | Expected Status | Expected Response / Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LIST-01** | Authenticated Seeker Lists Own Resumes | User A has 2 uploaded resumes | `GET /api/v1/resumes`<br>Header: `Bearer <token_user_a>` | `200 OK` | Array containing exactly User A's 2 resumes. |
| **TC-LIST-02** | User Cannot Access Another User's Resumes | User A and User B have separate resumes | User B requests User A's resume ID or lists resumes with User B's token | `403 Forbidden` / `404 Not Found` (for specific ID) | User B receives only User B's resumes in list; direct access to User A's resume ID is rejected. Complete cross-tenant privacy guaranteed (NFR-03). |
| **TC-LIST-03** | Empty Resume List for New User | User C registered but uploaded 0 resumes | `GET /api/v1/resumes`<br>Header: `Bearer <token_user_c>` | `200 OK` | Returns empty array `[]` with status 200 (not 404). |
| **TC-LIST-04** | Multiple Versions Returned in Correct Order | User A has versions 1, 2, and 3 | `GET /api/v1/resumes` | `200 OK` | All versions returned, ordered deterministically (by `version DESC` or `created_at DESC`), with latest marked active. |
| **TC-LIST-05** | Correct Response Structure & Schema | User A has active resume | `GET /api/v1/resumes` | `200 OK` | Every item matches schema: `id` (UUID), `file_name` (str), `file_size` (int), `content_type` (str), `version` (int), `is_active` (bool), `created_at` (ISO timestamp). |

---

## 4. Execution & Automation Strategy

These 19 test cases form the core verification matrix for:
1. **Offline Mocked Test Scaffold (`integration_omkar/tests/test_m3_resume_upload_scaffold.py`)**: Runs in under 1 second in CI with simulated in-memory storage and mock tokens.
2. **Live E2E Gateway Integration (`integration_omkar/tests/test_e2e_resume_flow.py`)**: Runs against live Docker Compose containers as teammate endpoints go live in Day 3–5.
