-- =============================================================================
-- SwipeX Job & Data Intelligence Domain — Milestone 4 Rollback Script
-- Database Engine: PostgreSQL 15+ / SQLite
-- Service Boundary: Job & Data Intelligence Service (swipex_job)
-- Author: Intern 3 (Job & Data Intelligence)
-- =============================================================================

DROP TABLE IF EXISTS daily_hiring_trend_analytics;
DROP TABLE IF EXISTS daily_application_analytics;
DROP TABLE IF EXISTS alert_preferences;
DROP TABLE IF EXISTS notification_deliveries;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS resume_version_views;
DROP TABLE IF EXISTS application_status_events;
DROP TABLE IF EXISTS applications;
