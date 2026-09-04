-- SwipeX Multi-Database Initialization Script
-- Executed on PostgreSQL container first boot

-- Create databases if they do not exist
SELECT 'CREATE DATABASE swipex_auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swipex_auth')\gexec

SELECT 'CREATE DATABASE swipex_job'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swipex_job')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE swipex_auth TO swipex;
GRANT ALL PRIVILEGES ON DATABASE swipex_job TO swipex;
