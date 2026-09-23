-- =============================================================================
-- SwipeX Job & Data Intelligence Domain M3 Schema Extension Migration
-- Database Engine: PostgreSQL 14+
-- Version: 003
-- Description: Adds parent resumes container, resume_versions multi-versioning,
--              job_skills extensions (is_required, weight, min_years),
--              job_keywords, and ats_scores persistence.
-- =============================================================================

-- 1. CREATE RESUMES TABLE (Parent Container)
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Logical FK to Auth Identity User
    title VARCHAR(255) NOT NULL DEFAULT 'Default Resume',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PostgreSQL Functional Unique Index for (user_id, LOWER(title))
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_resume_title ON resumes(user_id, LOWER(title));
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- 2. CREATE RESUME_VERSIONS TABLE
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

-- Partial Unique Index guaranteeing exactly ONE active version per parent resume
CREATE UNIQUE INDEX IF NOT EXISTS uq_resume_active_version ON resume_versions(resume_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_active ON resume_versions(resume_id, is_active);

-- 3. EXTEND JOB_SKILLS TABLE
ALTER TABLE job_skills ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE job_skills ADD COLUMN IF NOT EXISTS weight NUMERIC(3, 2) NOT NULL DEFAULT 1.00;
ALTER TABLE job_skills ADD COLUMN IF NOT EXISTS min_years NUMERIC(4, 1) NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_job_skill_weight'
    ) THEN
        ALTER TABLE job_skills ADD CONSTRAINT chk_job_skill_weight CHECK (weight >= 0.00 AND weight <= 5.00);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_skills_required ON job_skills(job_id, is_required);

-- 4. CREATE JOB_KEYWORDS TABLE
CREATE TABLE IF NOT EXISTS job_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    keyword_type VARCHAR(50) NOT NULL,
    weight NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_keyword_weight CHECK (weight >= 0.00 AND weight <= 5.00)
);

-- Functional Unique Index for case-insensitive keyword uniqueness per job & category
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_keyword_type ON job_keywords(job_id, LOWER(keyword), keyword_type);
CREATE INDEX IF NOT EXISTS idx_job_keywords_job_id ON job_keywords(job_id);

-- 5. CREATE ATS_SCORES TABLE
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
