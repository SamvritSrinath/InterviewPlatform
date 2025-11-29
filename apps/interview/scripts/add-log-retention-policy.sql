-- Migration: Add retention policies to clean up old logs automatically
-- This migration adds retention policies to automatically delete old logs
-- to prevent storage from growing unbounded (< 500 MB limit)
-- 
-- Run this SQL in your Supabase SQL Editor:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Execute the SQL

-- Retention periods (adjust based on your needs):
-- - cheating_attempts: 90 days (keep problematic events for ~3 months)
-- - scraper_logs: 30 days (keep scraper logs for ~1 month)
-- - user_ips: 90 days (keep IP records for ~3 months)

-- ============================================================================
-- CHEATING ATTEMPTS RETENTION POLICY
-- ============================================================================
-- Delete resolved cheating attempts older than 90 days
-- Keep unresolved attempts indefinitely (they need to be reviewed)
CREATE OR REPLACE FUNCTION cleanup_old_cheating_attempts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete resolved attempts older than 90 days
  DELETE FROM cheating_attempts
  WHERE resolved = true
    AND detected_at < NOW() - INTERVAL '90 days';
  
  -- Delete very old unresolved attempts (older than 365 days)
  -- This ensures we don't keep unresolved attempts forever
  DELETE FROM cheating_attempts
  WHERE resolved = false
    AND detected_at < NOW() - INTERVAL '365 days';
END;
$$;

-- Create a scheduled job to run cleanup daily (if pg_cron is available)
-- Note: This requires pg_cron extension to be enabled in Supabase
-- If pg_cron is not available, you can run the function manually or via a cron job
DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Schedule daily cleanup at 2 AM UTC
    PERFORM cron.schedule(
      'cleanup-old-cheating-attempts',
      '0 2 * * *', -- Daily at 2 AM UTC
      'SELECT cleanup_old_cheating_attempts()'
    );
  END IF;
END $$;

-- ============================================================================
-- SCRAPER LOGS RETENTION POLICY
-- ============================================================================
-- Delete scraper logs older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_scraper_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM scraper_logs
  WHERE detected_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Schedule daily cleanup for scraper logs (if pg_cron is available)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-old-scraper-logs',
      '0 3 * * *', -- Daily at 3 AM UTC
      'SELECT cleanup_old_scraper_logs()'
    );
  END IF;
END $$;

-- ============================================================================
-- USER IPS RETENTION POLICY
-- ============================================================================
-- Delete user IP records older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_user_ips()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM user_ips
  WHERE detected_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Schedule daily cleanup for user IPs (if pg_cron is available)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-old-user-ips',
      '0 4 * * *', -- Daily at 4 AM UTC
      'SELECT cleanup_old_user_ips()'
    );
  END IF;
END $$;

-- ============================================================================
-- MANUAL CLEANUP FUNCTIONS (for manual execution)
-- ============================================================================
-- You can run these functions manually if pg_cron is not available:
-- SELECT cleanup_old_cheating_attempts();
-- SELECT cleanup_old_scraper_logs();
-- SELECT cleanup_old_user_ips();

-- ============================================================================
-- VERIFY RETENTION POLICIES
-- ============================================================================
-- Check current log counts
DO $$
DECLARE
  cheating_count BIGINT;
  scraper_count BIGINT;
  user_ip_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO cheating_count FROM cheating_attempts;
  SELECT COUNT(*) INTO scraper_count FROM scraper_logs;
  SELECT COUNT(*) INTO user_ip_count FROM user_ips;
  
  RAISE NOTICE 'Current log counts:';
  RAISE NOTICE '  Cheating attempts: %', cheating_count;
  RAISE NOTICE '  Scraper logs: %', scraper_count;
  RAISE NOTICE '  User IPs: %', user_ip_count;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Retention periods can be adjusted based on your storage needs
-- 2. If pg_cron is not available, you can:
--    - Run the cleanup functions manually via SQL Editor
--    - Set up an external cron job to call these functions
--    - Use Supabase Edge Functions with scheduled triggers
-- 3. Unresolved cheating attempts are kept for 365 days to ensure review
-- 4. Resolved attempts are deleted after 90 days to save storage
-- 5. Scraper logs are deleted after 30 days (they're less critical)
-- 6. User IPs are kept for 90 days for IP analysis

