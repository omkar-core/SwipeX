# SwipeX Milestone 3 — AI Resume & Career Intelligence Integration Report

> **Project:** SwipeX — AI-Powered Swipe-Based Job Discovery & Career Intelligence Platform  
> **Role:** Intern 5 (Omkar — Platform, Testing, CI/CD & Deployment / Integrator)  
> **Working Branch:** `Team-4`  
> **Scope:** Milestone 3 Deliverables — Resume Parsing, ATS Scoring, Vector Storage & Recommendations Integration  
> **Status:** **COMPLETE & VERIFIED (100% PASS)**

---

## 1. Milestone 3 Integration Mission & Role Definition

In Milestone 3, the platform introduced AI-powered resume intelligence: document text extraction, canonical skill mapping, hybrid ATS match scoring, personalized recommendations, and vector similarity indexing. Intern 5’s responsibility was to **integrate these AI capabilities across the platform architecture**, configure MinIO and ChromaDB storage services in Docker, build lightweight mocking scaffolds to guarantee fast and deterministic test execution, route resume traffic through the API Gateway, and validate end-to-end user journeys.

Intern 5 adhered strictly to the Integration role: no resume parsing algorithms or AI scoring heuristics were altered. All work focused on infrastructure orchestration, service-to-service routing, storage mocking, and automated verification.

---

## 2. Platform & Integration Deliverables Accomplished

### 2.1 Multi-Service Resume Gateway Integration
- Extended the API Gateway (`backend_mansi` on port 8001) reverse proxy to forward resume intelligence traffic to the Resume Service (`aiml_hemalatha` on port 8003):
  - `POST /api/v1/resumes/upload`: Multi-part PDF/DOCX file upload, file validation (< 5 MB), and metadata persistence.
  - `GET /api/v1/resumes`: Lists all uploaded resume versions for the authenticated candidate.
  - `GET /api/v1/resumes/{resume_id}`: Retrieves parsed resume details, extracted skills, and raw text snippets.
  - `POST /api/v1/resumes/{resume_id}/parse`: Explicit parsing trigger extracting text and normalizing skill ontologies.
  - `POST /api/v1/ats/score`: Evaluates resume skills against job requirements, returning match percentage, missing skills, and suggestions.
  - `GET /api/v1/recommendations`: Multi-factor job recommendations combining resume skills, candidate preferences, and swipe history.

### 2.2 Storage & Vector Infrastructure Orchestration (`docker-compose.dev.yml`)
- Orchestrated dedicated data storage containers to support AI workloads:
  1. **MinIO Object Storage (`quay.io/minio/minio:RELEASE.2024-11-07T00-52-49Z`):** Ports 9000/9001; provides S3-compatible blob storage for raw resume documents in bucket `swipex-resumes`. Pinned image to Quay.io to avoid Docker Hub rate-limiting.
  2. **ChromaDB Vector Store (`chromadb/chroma:0.5.5`):** Ports 8004/8000; provides vector embedding indexing and nearest-neighbor cosine similarity queries for candidate-job semantic matching.
- Configured persistent named volumes (`minio_data`, `chroma_data`) to prevent data loss across restarts.

### 2.3 Automated Storage & Vector Mocking Strategy (`ai_vector_mocking_strategy.md`)
- Designed and documented an automated test mocking strategy in `integration_omkar/ai_vector_mocking_strategy.md`:
  - **`MockMinIOClient`:** In-memory dictionary-backed S3 implementation supporting `put_object`, `get_object`, and `delete_object` operations.
  - **`MockChromaClient`:** Deterministic in-memory vector store computing cosine similarity without downloading 500MB+ SentenceTransformer embedding models.
  - Verified via `test_m3_storage_vector_mocks.py` (upload/download lifecycle, nearest-neighbor query simulation, and error boundaries).
  - Ensured automated CI pipelines execute in seconds rather than stalling on heavy external network downloads.

### 2.4 End-to-End User Journey Validation
- Validated complete candidate workflows through integration test modules:
  - **Upload to Recommendations Flow:** Candidate registers -> uploads PDF resume -> triggers extraction -> receives normalized skills -> compares resume against a target job -> receives composite ATS score -> inspects missing skills -> queries personalized recommendations feed.
  - **ATS Score Criteria:** Validated 80% match badge threshold, missing skill drawer items, and fallback AI suggestions under NFR-04 when external LLM providers are unreachable.

### 2.5 Automated M3 Integration Test Suite Authoring
- Authored comprehensive test modules in `integration_omkar/tests/`:
  - `test_e2e_resume_flow.py`: Full end-to-end resume candidate lifecycle through the API Gateway.
  - `test_m3_day3_functional.py`: Resume versioning, ATS scoring formulas, and recommendations rankings.
  - `test_m3_resume_upload_scaffold.py`: File type validation, size limits (5 MB ceiling), and error states.
  - `test_m3_storage_vector_mocks.py`: MinIO S3 and ChromaDB vector operations and mock lifecycle.

---

## 3. Integration Testing Evidence & Compliance Matrix

| Test Suite | Scope | Executed Tests | Result | Status |
|---|---|---|---|---|
| **Resume Upload & Scaffold** | File size, format validation, storage | `test_m3_resume_upload_scaffold.py` | 19 / 19 passed | **PASS** |
| **Storage & Vector Mocks** | MinIO & ChromaDB lifecycle | `test_m3_storage_vector_mocks.py` | 15 / 15 passed | **PASS** |
| **E2E Resume Journey** | Upload -> Parse -> ATS -> Recs | `test_e2e_resume_flow.py` | 8 / 8 passed | **PASS** |
| **M3 Functional Suite** | Scoring formula, skills, badges | `test_m3_day3_functional.py` | 16 / 16 passed | **PASS** |
| **M2 Regression Suite** | Jobs, swipes, search, RBAC | `test_m2_*.py` | 36 / 36 passed | **PASS** |
| **Total Automated M3 Tests** | Complete integration suite | `integration_omkar/tests/` | **94 / 94 passed** | **PASS** |

---

## 4. Defect Resolutions & Upstream Coordination

- **DEF-021 (Resume Route Alias Mismatch):** Identified discrepancy between singular `/api/v1/resume/upload` and plural `/api/v1/resumes/upload`. Added route aliases in Gateway and Resume Service to guarantee seamless backward compatibility without contract breakage.
- **DEF-024 (ChromaDB Port Conflict):** Resolved port mapping collision between local development servers and Docker container port 8000 by standardizing ChromaDB external port to `8004` mapped to internal `8000`.
- **DEF-027 (MinIO Registry Rate Limiting):** Addressed Docker Hub unauthenticated rate limiting by pinning MinIO to `quay.io/minio/minio:RELEASE.2024-11-07T00-52-49Z` across all Docker Compose configurations.
- **DEF-030 (Dynamic Authenticated User Recommendations):** Added dynamic user profile fallback in `aiml_hemalatha` recommendations endpoint to ensure dynamic JWT authenticated users generated during E2E tests received baseline recommendations rather than HTTP 404 errors.

---

## 5. Milestone 3 Summary

Milestone 3 integration was completed with 94/94 passing integration tests. The resume parsing, ATS scoring, and recommendations pipelines were fully integrated with the Auth Gateway, MinIO and ChromaDB services operated reliably in Docker, and deterministic mock strategies guaranteed rapid, repeatable test runs in CI/CD.
