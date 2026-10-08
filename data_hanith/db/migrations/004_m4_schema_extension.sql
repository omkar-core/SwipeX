-- =============================================================================
-- SwipeX Job & Data Intelligence Domain — Milestone 4 Extension Schema
-- Database Engine: PostgreSQL 15+
-- Service Boundary: Job & Data Intelligence Service (swipex_job)
-- Author: Intern 3 (Job & Data Intelligence)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_version_id UUID NULL REFERENCES resume_versions(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'APPLIED',
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_job_application UNIQUE (user_id, job_id),
    CONSTRAINT chk_app_status CHECK (status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'WITHDRAWN'))
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_resume_ver ON applications(resume_version_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);

-- 2. APPLICATION STATUS EVENTS TABLE
CREATE TABLE IF NOT EXISTS application_status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    previous_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    actor_id UUID NULL,
    actor_role VARCHAR(50) NULL DEFAULT 'SYSTEM',
    notes TEXT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_app_event_status CHECK (new_status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'WITHDRAWN'))
);

CREATE INDEX IF NOT EXISTS idx_app_status_events_app_id ON application_status_events(application_id);
CREATE INDEX IF NOT EXISTS idx_app_status_events_changed_at ON application_status_events(changed_at DESC);

-- 3. RESUME VERSION VIEWS TABLE (Resume performance tracking)
CREATE TABLE IF NOT EXISTS resume_version_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_version_id UUID NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
    viewer_user_id UUID NOT NULL,
    job_id UUID NULL REFERENCES jobs(id) ON DELETE SET NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rv_views_version ON resume_version_views(resume_version_id);
CREATE INDEX IF NOT EXISTS idx_rv_views_viewer ON resume_version_views(viewer_user_id);

-- 4. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    payload JSONB NULL,
    related_job_id UUID NULL REFERENCES jobs(id) ON DELETE SET NULL,
    related_application_id UUID NULL REFERENCES applications(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_notification_type CHECK (notification_type IN ('INSTANT_JOB', 'STARTUP_HIRING', 'HIGH_MATCH', 'LOW_COMPETITION', 'APPLICATION_STATUS_CHANGE', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 5. NOTIFICATION DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_delivery_channel CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH')),
    CONSTRAINT chk_delivery_status CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_notif_deliv_notif_id ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_deliv_status ON notification_deliveries(status);

-- 6. ALERT PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS alert_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    instant_job BOOLEAN NOT NULL DEFAULT TRUE,
    startup_hiring BOOLEAN NOT NULL DEFAULT TRUE,
    high_match BOOLEAN NOT NULL DEFAULT TRUE,
    low_competition BOOLEAN NOT NULL DEFAULT TRUE,
    channel_in_app BOOLEAN NOT NULL DEFAULT TRUE,
    channel_email BOOLEAN NOT NULL DEFAULT TRUE,
    channel_push BOOLEAN NOT NULL DEFAULT FALSE,
    match_threshold NUMERIC(5, 2) NOT NULL DEFAULT 70.00,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start TIME NULL,
    quiet_hours_end TIME NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_alert_threshold CHECK (match_threshold >= 0.00 AND match_threshold <= 100.00)
);

CREATE INDEX IF NOT EXISTS idx_alert_preferences_user_id ON alert_preferences(user_id);

-- 7. DAILY APPLICATION ANALYTICS AGGREGATE TABLE (Daily Snapshot Semantics)
CREATE TABLE IF NOT EXISTS daily_application_analytics (
    snapshot_date DATE NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    total_applications INTEGER NOT NULL DEFAULT 0,
    applied_count INTEGER NOT NULL DEFAULT 0,
    shortlisted_count INTEGER NOT NULL DEFAULT 0,
    interview_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    withdrawn_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (snapshot_date, job_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_app_analytics_company ON daily_application_analytics(company_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_daily_app_analytics_date ON daily_application_analytics(snapshot_date DESC);

-- 8. DAILY HIRING TREND ANALYTICS AGGREGATE TABLE
CREATE TABLE IF NOT EXISTS daily_hiring_trend_analytics (
    snapshot_date DATE NOT NULL,
    company_type_category VARCHAR(50) NOT NULL,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    jobs_posted_count INTEGER NOT NULL DEFAULT 0,
    applications_received_count INTEGER NOT NULL DEFAULT 0,
    avg_min_salary NUMERIC(12, 2) NULL,
    avg_max_salary NUMERIC(12, 2) NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (snapshot_date, company_type_category, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_hiring_trends_date_cat ON daily_hiring_trend_analytics(snapshot_date DESC, company_type_category);
CREATE INDEX IF NOT EXISTS idx_hiring_trends_skill ON daily_hiring_trend_analytics(skill_id);
