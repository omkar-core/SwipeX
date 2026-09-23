-- =============================================================================
-- SwipeX Job & Data Intelligence Domain Canonical Schema (Milestone 3)
-- Database Engine: PostgreSQL 14+
-- Primary Key Strategy: UUID (uuid-ossp + uuid_generate_v4())
-- Service Boundary: Job & Data Intelligence Service (swipex_job_db)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_company_id BIGINT NOT NULL,
    name VARCHAR(255) NULL, -- Nullable (4 missing in Dataset 1; no fake defaults used)
    company_type VARCHAR(50) NULL, -- Retained per SRS FR-04; NULL for Dataset 1
    aggregate_rating NUMERIC(3, 2) NULL,
    reviews_count INTEGER NULL,
    about TEXT NULL, -- M2 Extension: Detailed company profile
    size VARCHAR(50) NULL, -- M2 Extension: Company size tier (e.g. '51-200')
    industry VARCHAR(100) NULL, -- M2 Extension: Industry classification
    is_newly_founded BOOLEAN NOT NULL DEFAULT FALSE, -- M2 Extension: Startup / newly founded flag
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_company_rating CHECK (aggregate_rating IS NULL OR (aggregate_rating >= 0 AND aggregate_rating <= 5)),
    CONSTRAINT chk_company_reviews CHECK (reviews_count IS NULL OR reviews_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_companies_raw_id ON companies(raw_company_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_newly_founded ON companies(is_newly_founded);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

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
    applicant_count INTEGER NOT NULL DEFAULT 0, -- M2 Extension: Applicant count
    competition_level VARCHAR(20) NOT NULL DEFAULT 'LOW', -- M2 Extension: LOW, MEDIUM, HIGH
    posted_at_raw VARCHAR(100) NOT NULL, -- Verbatim raw string e.g. "4 Days Ago"
    posted_at_approx TIMESTAMPTZ NULL, -- Deterministic timestamp calculated from fixed dataset ref date
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_salary_min CHECK (min_salary IS NULL OR min_salary >= 0),
    CONSTRAINT chk_job_salary_max CHECK (max_salary IS NULL OR max_salary >= min_salary),
    CONSTRAINT chk_job_exp_min CHECK (min_experience IS NULL OR min_experience >= 0),
    CONSTRAINT chk_job_exp_max CHECK (max_experience IS NULL OR max_experience >= min_experience),
    CONSTRAINT chk_job_work_mode CHECK (work_mode IN ('REMOTE', 'HYBRID', 'ONSITE') OR work_mode IS NULL),
    CONSTRAINT chk_job_type CHECK (job_type IN ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT') OR job_type IS NULL),
    CONSTRAINT chk_job_competition CHECK (competition_level IN ('LOW', 'MEDIUM', 'HIGH'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_raw_job_id ON jobs(raw_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at_approx ON jobs(posted_at_approx DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs(min_salary, max_salary);
CREATE INDEX IF NOT EXISTS idx_jobs_experience ON jobs(min_experience, max_experience);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_jobs_competition ON jobs(competition_level);
CREATE INDEX IF NOT EXISTS idx_jobs_applicant_count ON jobs(applicant_count);

-- 3. SKILLS TABLE
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single clean case-insensitive uniqueness strategy
CREATE UNIQUE INDEX IF NOT EXISTS uq_skills_name_lower ON skills(LOWER(name));

-- 4. JOB_SKILLS JUNCTION TABLE (Extended M3)
CREATE TABLE IF NOT EXISTS job_skills (
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE, -- M3 Extension
    weight NUMERIC(3, 2) NOT NULL DEFAULT 1.00, -- M3 Extension
    min_years NUMERIC(4, 1) NULL, -- M3 Extension
    PRIMARY KEY (job_id, skill_id),
    CONSTRAINT chk_job_skill_weight CHECK (weight >= 0.00 AND weight <= 5.00)
);

CREATE INDEX IF NOT EXISTS idx_job_skills_skill_id ON job_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_required ON job_skills(job_id, is_required);

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

-- 6. SAVED_JOBS TABLE (M2 Extension)
CREATE TABLE IF NOT EXISTS saved_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT NULL,
    CONSTRAINT uq_user_saved_job UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_job ON saved_jobs(user_id, job_id);

-- 7. RESUMES TABLE (M3 Entity: Parent Container)
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Default Resume',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_resume_title ON resumes(user_id, LOWER(title));
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- 8. RESUME_VERSIONS TABLE (M3 Entity: Multi-versioning)
CREATE TABLE IF NOT EXISTS resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    raw_text TEXT NOT NULL,
    parsed_json JSONB NOT NULL,
    version_number INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resume_version_num UNIQUE (resume_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_resume_active_version ON resume_versions(resume_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_active ON resume_versions(resume_id, is_active);

-- 9. JOB_KEYWORDS TABLE (M3 Entity: Extracted Keywords)
CREATE TABLE IF NOT EXISTS job_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    keyword_type VARCHAR(50) NOT NULL,
    weight NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_keyword_weight CHECK (weight >= 0.00 AND weight <= 5.00)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_keyword_type ON job_keywords(job_id, LOWER(keyword), keyword_type);
CREATE INDEX IF NOT EXISTS idx_job_keywords_job_id ON job_keywords(job_id);

-- 10. ATS_SCORES TABLE (M3 Entity: Persisted ATS Score Evaluations)
CREATE TABLE IF NOT EXISTS ats_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_version_id UUID NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    match_score NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resume_version_job_ats UNIQUE (resume_version_id, job_id),
    CONSTRAINT chk_ats_match_score CHECK (match_score >= 0.00 AND match_score <= 100.00)
);

CREATE INDEX IF NOT EXISTS idx_ats_scores_resume_version ON ats_scores(resume_version_id);
CREATE INDEX IF NOT EXISTS idx_ats_scores_job_id ON ats_scores(job_id);

-- 11. POSTGRESQL TRIGRAM GIN SEARCH INDEXES (pg_trgm)
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_description_trgm ON jobs USING gin (job_description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);
