-- =============================================================================
-- SwipeX Job & Data Intelligence Domain Canonical Schema (Milestone 1)
-- Database Engine: PostgreSQL 14+
-- Primary Key Strategy: UUID (uuid-ossp + uuid_generate_v4())
-- Service Boundary: Job & Data Intelligence Service (swipex_job_db)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_company_id BIGINT NOT NULL,
    name VARCHAR(255) NULL, -- Nullable (4 missing in Dataset 1; no fake defaults used)
    company_type VARCHAR(50) NULL, -- Retained per SRS FR-04; NULL for Dataset 1
    aggregate_rating NUMERIC(3, 2) NULL,
    reviews_count INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_company_rating CHECK (aggregate_rating IS NULL OR (aggregate_rating >= 0 AND aggregate_rating <= 5)),
    CONSTRAINT chk_company_reviews CHECK (reviews_count IS NULL OR reviews_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_companies_raw_id ON companies(raw_company_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- 2. JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_job_id BIGINT NOT NULL, -- Non-unique raw dataset ID (retains all 250 duplicate ID records)
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    min_salary NUMERIC(12, 2) NULL, -- NULL if undisclosed (64,076 rows)
    max_salary NUMERIC(12, 2) NULL, -- NULL if undisclosed (64,076 rows)
    currency VARCHAR(10) NOT NULL, -- Preserves actual source string (97,800 INR, 129 USD); no default override
    min_experience NUMERIC(4, 1) NULL,
    max_experience NUMERIC(4, 1) NULL,
    raw_experience_str VARCHAR(100) NULL,
    location VARCHAR(255) NOT NULL,
    work_mode VARCHAR(50) NULL, -- REMOTE, HYBRID, ONSITE (NULL if unavailable)
    job_type VARCHAR(50) NULL, -- FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT (NULL if unavailable)
    posted_at_raw VARCHAR(100) NOT NULL, -- Verbatim raw string e.g. "4 Days Ago"
    posted_at_approx TIMESTAMPTZ NULL, -- Deterministic timestamp calculated from fixed dataset ref date
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_salary_min CHECK (min_salary IS NULL OR min_salary >= 0),
    CONSTRAINT chk_job_salary_max CHECK (max_salary IS NULL OR max_salary >= min_salary),
    CONSTRAINT chk_job_exp_min CHECK (min_experience IS NULL OR min_experience >= 0),
    CONSTRAINT chk_job_exp_max CHECK (max_experience IS NULL OR max_experience >= min_experience),
    CONSTRAINT chk_job_work_mode CHECK (work_mode IN ('REMOTE', 'HYBRID', 'ONSITE') OR work_mode IS NULL),
    CONSTRAINT chk_job_type CHECK (job_type IN ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT') OR job_type IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_raw_job_id ON jobs(raw_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at_approx ON jobs(posted_at_approx DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs(min_salary, max_salary);
CREATE INDEX IF NOT EXISTS idx_jobs_experience ON jobs(min_experience, max_experience);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC, id ASC);

-- 3. SKILLS TABLE
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single clean case-insensitive uniqueness strategy
CREATE UNIQUE INDEX IF NOT EXISTS uq_skills_name_lower ON skills(LOWER(name));

-- 4. JOB_SKILLS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS job_skills (
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_job_skills_skill_id ON job_skills(skill_id);

-- 5. SWIPES TABLE
CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Logical FK to Identity User (Cross-service boundary)
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL, -- Directional string: 'RIGHT' or 'LEFT'
    swiped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_swipe_direction CHECK (direction IN ('RIGHT', 'LEFT')),
    CONSTRAINT uq_user_job_swipe UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_user_job ON swipes(user_id, job_id);
