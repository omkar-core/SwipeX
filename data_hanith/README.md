# Job & Data Intelligence Service (`data_hanith`)

## 1. Job & Data Intelligence Service
The **Job & Data Intelligence Service** is the microservice domain in SwipeX responsible for job market data ingestion, canonical data storage, job catalog search/filtering, user swipe action recording, and personalized job feed delivery.

## 2. Purpose / Responsibility
This service fulfills Intern 2's domain requirements for the SwipeX platform:
- Ingesting, cleaning, and normalizing raw job dataset records into a canonical relational data model.
- Serving public and authenticated job feed queries with pagination, search, and parameter-based filtering.
- Providing detailed job, company, and required skill information by job UUID.
- Recording user swipe actions (`RIGHT` = interested/apply, `LEFT` = skip/pass) and serving user swipe history.
- Automatically excluding previously swiped jobs from authenticated Job Seeker feeds.
- Caching feed queries and swiped job ID sets in Redis while maintaining PostgreSQL as the durable source of truth.
- Enforcing security boundaries by parsing standard Bearer JWT tokens or validating internal forwarded identity headers from the API Gateway.

## 3. Architecture and Directory Structure

```
data_hanith/
├── api/
│   ├── dependencies.py       # Auth boundary, DB connection provider, & RBAC rules
│   ├── routers/
│   │   ├── jobs.py           # GET /api/v1/jobs & GET /api/v1/jobs/{job_id}
│   │   └── swipes.py         # POST /api/v1/swipes & GET /api/v1/swipes/history
│   └── schemas/
│       ├── job.py            # Pydantic schemas for Job Summary, Detail, Company
│       └── swipe.py          # Pydantic schemas for Swipe Request, Response, History
├── config.py                 # Service config (Dataset paths, DB URL defaults)
├── db/
│   ├── cache.py              # Redis cache service & graceful SQL fallback handler
│   ├── connection.py         # DB connection factory (PostgreSQL & SQLite)
│   ├── schema.sql            # PostgreSQL DDL table & index definitions
│   └── repositories/
│       ├── job_repository.py  # SQL queries for job listing, detail, & filtering
│       └── swipe_repository.py# SQL queries for swipe insertion & history retrieval
├── main.py                   # FastAPI ASGI application entry point (port 8002)
└── scripts/
    ├── ingest_dataset1.py    # Pipeline script ingesting Dataset 1 Excel into DB
    └── verify_postgres_production.py # Automated database validation script
```

## 4. Prerequisites
- **Python**: 3.10+ (tested on Python 3.10 – 3.14)
- **Database**: PostgreSQL 14+ (production/dev) or SQLite 3 (local standalone testing)
- **Cache (Optional)**: Redis 6+ (for feed caching; service falls back to SQL if Redis is offline)

## 5. Local Setup
1. Clone the repository and navigate to the project directory:
   ```bash
   cd "D:\Workspace\Project repo\AI-Powered-Swipe-Based-Job-Discovery-and-Personalized-Career-Intelligence-Platform"
   ```
2. Install Python dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy psycopg2-binary redis httpx pydantic email-validator python-jose passlib "bcrypt<4.0.0" openpyxl pandas
   ```
3. Initialize the database schema and populate Dataset 1 (if not using pre-built SQLite DB):
   ```bash
   python data_hanith/scripts/ingest_dataset1.py
   ```

## 6. Environment Variables / Configuration
The service is configured via environment variables (with sensible local defaults):

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///.../data/swipex_job.db` | Database connection URI (PostgreSQL or SQLite). |
| `RAW_DATASET1_PATH` | `.../data/raw/indian-job-market-dataset-2025.xlsx` | Path to raw Dataset 1 Excel file for ingestion. |
| `REDIS_HOST` | `127.0.0.1` | Redis server hostname. |
| `REDIS_PORT` | `6379` | Redis server port. |
| `REDIS_DB` | `0` | Redis database index. |
| `REDIS_PASSWORD` | `None` | Optional Redis authentication password. |
| `REDIS_TIMEOUT` | `1.0` | Redis connection timeout in seconds. |
| `GATEWAY_SHARED_SECRET`| `swipex-internal-gateway-secret` | Shared secret to validate trusted internal API Gateway headers (`X-Gateway-Secret`). |
| `TRUST_GATEWAY_HEADERS`| `false` | Set to `"true"` in isolated dev environments to accept Gateway identity headers without secret verification. |

## 7. PostgreSQL Schema
The database schema (`db/schema.sql`) consists of 5 normalized relational tables:

- **`companies`**:
  - `id` (`TEXT` / `UUID`, Primary Key): Internal UUID.
  - `raw_company_id` (`INTEGER`): Original dataset company identifier.
  - `name` (`TEXT`, Nullable): Company name (resolved via company ID mapping).
  - `company_type` (`TEXT`, Nullable): Category/industry (NULL in Dataset 1).
  - `aggregate_rating` (`REAL`, Nullable): User rating (0.0 to 5.0).
  - `reviews_count` (`INTEGER`, Nullable): Review count.
  - `created_at`, `updated_at` (`TEXT` / `TIMESTAMPTZ`): Timestamps.

- **`jobs`**:
  - `id` (`TEXT` / `UUID`, Primary Key): Internal unique job UUID string.
  - `raw_job_id` (`INTEGER`): Dataset raw job ID (*Note: 250 raw job IDs are non-unique in source dataset*).
  - `company_id` (`TEXT`, Foreign Key -> `companies.id`): Mandatory link to company.
  - `title` (`TEXT`): Job title string.
  - `job_description` (`TEXT`): Full job text description.
  - `min_salary`, `max_salary` (`REAL`, Nullable): Salary bounds (NULL if undisclosed).
  - `currency` (`TEXT`): Source currency (`"INR"` or `"USD"`).
  - `min_experience`, `max_experience` (`REAL`, Nullable): Years of experience bounds.
  - `raw_experience_str` (`TEXT`, Nullable): Raw text (e.g. `"2 - 5 Yrs"`).
  - `location` (`TEXT`): Job location.
  - `work_mode` (`TEXT`, Nullable): Work mode (`"REMOTE"`, `"HYBRID"`, `"ONSITE"`; NULL in Dataset 1).
  - `job_type` (`TEXT`, Nullable): Employment type (`"FULL_TIME"`, etc.; NULL in Dataset 1).
  - `posted_at_raw` (`TEXT`): Verbatim raw posting string (e.g. `"4 Days Ago"`).
  - `posted_at_approx` (`TEXT`, Nullable): Calculated ISO 8601 timestamp baseline (`2025-01-01T00:00:00Z`).
  - `created_at`, `updated_at` (`TEXT` / `TIMESTAMPTZ`): Timestamps.

- **`skills`**:
  - `id` (`TEXT` / `UUID`, Primary Key): Skill UUID.
  - `name` (`TEXT`): Skill name. Enforces case-insensitive lower uniqueness (`uq_skills_name_lower`).
  - `category` (`TEXT`, Nullable): Skill category (NULL in Dataset 1).
  - `created_at`: Timestamp.

- **`job_skills`** (Junction Table):
  - `job_id` (`TEXT`, Foreign Key -> `jobs.id` ON DELETE CASCADE).
  - `skill_id` (`TEXT`, Foreign Key -> `skills.id` ON DELETE CASCADE).
  - Primary Key: `(job_id, skill_id)`.

- **`swipes`**:
  - `id` (`TEXT` / `UUID`, Primary Key): Unique swipe UUID.
  - `user_id` (`TEXT`): Identity of authenticated Job Seeker.
  - `job_id` (`TEXT`, Foreign Key -> `jobs.id` ON DELETE CASCADE).
  - `direction` (`TEXT`): Restricted by CHECK constraint to `'RIGHT'` or `'LEFT'`.
  - `swiped_at` (`TEXT` / `TIMESTAMPTZ`): Swipe timestamp.
  - Unique Constraint: `UNIQUE(user_id, job_id)`.

## 8. Dataset 1 Information
- **Source Dataset**: `indian-job-market-dataset-2025.xlsx`
- **Total Ingested Jobs**: **97,929**
- **Total Companies**: **18,328**
- **Unique Normalized Skills**: **44,078**
- **Job-Skill Relational Mappings**: **755,099**
- **Known Dataset Characteristics & Limitations**:
  1. **Undisclosed Salaries**: Exactly **64,700** jobs do not specify salary data. In the database, `min_salary` and `max_salary` are set to `NULL` (never 0.0). Providing `salary_min` or `salary_max` filter parameters automatically excludes undisclosed salary jobs.
  2. **Non-Unique `raw_job_id`**: Exactly **250** raw job IDs appear twice in Dataset 1 (500 total rows). All 500 records are preserved under distinct internal `job_id` surrogate UUIDs.
  3. **Unpopulated Dataset 1 Fields**: `company_type` (in `companies`), `work_mode` (in `jobs`), and `job_type` (in `jobs`) exist in the schema but have `NULL` values across all Dataset 1 rows. Filtering by `remote=true` returns 0 results on Dataset 1.
  4. **Company Name Recovery**: Missing company names for raw company ID `1346914` are mapped to `"Morepen Laboratories"` based on dataset co-occurrences.

## 9. API Endpoints

### `GET /health`
- **Public**: Yes
- **Description**: Returns microservice health status: `{"status": "healthy", "service": "job-data-service"}`.

### `GET /api/v1/jobs`
- **Public / Optional Auth**: Yes
- **Description**: Returns paginated list of job summaries (`JobSummarySchema`).
- **Query Parameters**:
  - `page` (int, default 1)
  - `page_size` (int, default 20, max 100)
  - `type` (string, company type filter)
  - `location` (string, case-insensitive substring match)
  - `remote` (boolean, work mode filter)
  - `salary_min` / `salary_max` (numeric range bounds)
  - `skills` (comma-separated skill strings, OR match semantics)
- **Authenticated Behavior**: If authenticated as a Job Seeker, automatically excludes all jobs previously swiped (`RIGHT` or `LEFT`) by that user from the feed. Unauthenticated requests browse all matching jobs.

### `GET /api/v1/jobs/{job_id}`
- **Public / Optional Auth**: Yes
- **Description**: Returns detailed job object (`JobDetailSchema`) including full description, salary bounds, experience requirements, and nested company details. `job_id` must be a valid UUID string.

### `POST /api/v1/swipes`
- **Protected**: Requires `Job Seeker` role
- **Description**: Records a job swipe.
- **Request Body**: `{"job_id": "<UUID>", "direction": "RIGHT" | "LEFT"}`
- **Responses**:
  - `201 Created`: `{"swipe_id": "<UUID>"}`
  - `400 Bad Request`: Invalid job_id UUID or direction string.
  - `404 Not Found`: Target `job_id` does not exist.
  - `409 Conflict`: User has already swiped on target `job_id`.

### `GET /api/v1/swipes/history`
- **Protected**: Requires `Job Seeker` role
- **Description**: Returns array of all swipe history records for the authenticated user ordered by `swiped_at DESC`.

## 10. Authentication and RBAC
The service defines an explicit authentication boundary in `api/dependencies.py` (`get_current_user`):
1. **Public Access**: Endpoint `GET /api/v1/jobs` allows unauthenticated browsing. `get_optional_current_user` returns `None` if credentials are missing or invalid.
2. **Bearer JWT Verification**: Public client calls supply `Authorization: Bearer <token>`. The service statelessly parses standard 3-part base64 JWT payloads to extract `sub`/`user_id` and `role`.
3. **Internal API Gateway Identity Headers**: Forwarded requests from the trusted API Gateway supply `X-User-Id`, `X-User-Role`, and `X-Gateway-Secret`. If `X-Gateway-Secret` matches `GATEWAY_SHARED_SECRET` (or `TRUST_GATEWAY_HEADERS="true"`), the service trusts the Gateway-injected identity. Direct client header forgery without the secret is rejected with 401 Unauthorized.
4. **Role Authorization (RBAC)**: Endpoint `require_job_seeker` verifies `current_user.role in ("Job Seeker", "job_seeker")`. Recruiter and Admin roles attempting to swipe receive 403 Forbidden.

## 11. Redis Caching and PostgreSQL Fallback
Implemented in `db/cache.py` (`RedisCacheService`):
- **User Swiped Job ID Cache (`swiped_jobs:{user_id}`)**: Stores set of swiped job UUIDs per user for fast $O(1)$ feed exclusion.
- **Feed Result Cache (`job_feed:...`)**: Caches query results using MD5 parameter hash keys with a 5-minute TTL.
- **Cache Invalidation**: Posting a new swipe automatically invalidates the user's cached feed keys.
- **Graceful PostgreSQL Fallback**: Redis is treated strictly as a performance acceleration layer. If Redis is unavailable or times out, the service logs a warning and executes queries directly against PostgreSQL/SQLite without error or data loss.

## 12. Running the Service
Run the service standalone using Uvicorn on port `8002`:
```bash
cd data_hanith
python -m uvicorn main:app --host 127.0.0.1 --port 8002
```
Documentation UI is accessible at `http://127.0.0.1:8002/docs`.

## 13. Running the Tests
Run the automated test suite from the repository root:
```bash
pytest tests/ -v
```
All **61 tests** in `tests/` (`test_dataset1_ingestion.py`, `test_job_api.py`, `test_redis_cache.py`, `test_swipe_api.py`) validate ingestion rules, API contracts, RBAC boundary, feed exclusion, and Redis fallback.

## 14. Gateway Integration
The API Gateway (owned by Intern 1 under `backend_mansi`) proxies external client requests to this service running at `JOB_SERVICE_URL` (`http://localhost:8002`):
- `GET /api/v1/jobs` -> proxied to `http://localhost:8002/api/v1/jobs`
- `GET /api/v1/jobs/{job_id}` -> proxied to `http://localhost:8002/api/v1/jobs/{job_id}`
- `POST /api/v1/swipes` -> proxied to `http://localhost:8002/api/v1/swipes`
- `GET /api/v1/swipes/history` -> proxied to `http://localhost:8002/api/v1/swipes/history`

The Gateway verifies user tokens and forwards the `Authorization: Bearer <token>` header downstream to `data_hanith`.

## 15. Recommendation / Data Handoff
For Intern 3 (Recommendation / ML Engineer):
- Complete data schema, field descriptions, recommendation signals, skill graphs, and API usage guidelines are documented in [`../docs/m2-data-feed-notes.md`](../docs/m2-data-feed-notes.md).
- Use `GET /api/v1/swipes/history` to retrieve user implicit interest signals (`RIGHT` swipes).
- Use `jobs.skills` array and `job_description` text payloads for candidate profile matching.

## 16. Known Limitations / Technical Risks
1. **Unpopulated Fields**: Dataset 1 does not contain data for `company_type`, `work_mode`, or `job_type`.
2. **Undisclosed Salaries**: 64,700 jobs have `NULL` salary fields.
3. **`passlib` / `bcrypt` Package Compatibility**: In Python 3.14 environments, `passlib` requires `bcrypt < 4.0.0` to avoid password byte length initialization errors.
4. **PostgreSQL as Primary Source of Truth**: Do not rely on Redis for persistent state. All durable data resides in PostgreSQL/SQLite.
