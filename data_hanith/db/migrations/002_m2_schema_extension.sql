-- =============================================================================
-- SwipeX Job & Data Intelligence Domain M2 Schema Extension Migration
-- Database Engine: PostgreSQL 14+ / SQLite
-- Version: 002
-- Description: Non-destructive schema extension adding Company profiles,
--              Job applicant & competition level tracking, SavedJobs table,
--              and PostgreSQL pg_trgm GIN search indexing.
-- =============================================================================

-- 1. EXTEND COMPANIES TABLE
ALTER TABLE companies ADD COLUMN IF NOT EXISTS about TEXT NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS size VARCHAR(50) NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100) NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_newly_founded BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_companies_newly_founded ON companies(is_newly_founded);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

-- 2. EXTEND JOBS TABLE
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applicant_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS competition_level VARCHAR(20) NOT NULL DEFAULT 'LOW';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_job_competition'
    ) THEN
        ALTER TABLE jobs ADD CONSTRAINT chk_job_competition CHECK (competition_level IN ('LOW', 'MEDIUM', 'HIGH'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_competition ON jobs(competition_level);
CREATE INDEX IF NOT EXISTS idx_jobs_applicant_count ON jobs(applicant_count);

-- 3. CREATE SAVED_JOBS TABLE
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

-- 4. POSTGRESQL TRIGRAM GIN SEARCH INDEXES (pg_trgm)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_description_trgm ON jobs USING gin (job_description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);
