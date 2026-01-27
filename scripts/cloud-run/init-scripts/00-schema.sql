-- =============================================================================
-- IZARA TELEMEDICINE - POSTGRESQL DOCKER SERVICE INITIALIZATION
-- =============================================================================
-- 
-- ⚠️  DEPRECATED: This file is kept for backward compatibility.
-- 
-- The unified database script is now located at:
--   scripts/database/izara-database.sql
--
-- For PostgreSQL Docker container initialization, use:
--   docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/database/izara-database.sql
--
-- NOTE: NO Cloud SQL is used. PostgreSQL runs as a Docker service.
--
-- =============================================================================
-- Version: 5.1.0 (Deprecated - Points to unified file)
-- Updated: 2026-01-27
-- =============================================================================

\echo '=============================================='
\echo 'NOTICE: Using legacy 00-schema.sql'
\echo '=============================================='
\echo ''
\echo 'This file is deprecated. Please use:'
\echo '  scripts/database/izara-database.sql'
\echo ''
\echo 'The unified file works for both local and cloud.'
\echo '=============================================='
\echo ''

-- Include the unified database file
\i ../../database/izara-database.sql
