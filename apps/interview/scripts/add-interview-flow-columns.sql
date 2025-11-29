-- Migration: Add interviewer_ready and interviewee_started columns to sessions table
-- This migration adds support for the new interview flow where:
-- 1. Interviewer must mark themselves as ready before the interviewee can start
-- 2. Interviewee must explicitly start the interview after the interviewer is ready
-- 
-- Run this SQL in your Supabase SQL Editor:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Execute the SQL
-- 5. Wait a few seconds for the schema cache to refresh

-- Add interviewer_ready column (boolean, default false)
-- This indicates whether the interviewer has marked themselves as ready to start the interview
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS interviewer_ready BOOLEAN NOT NULL DEFAULT false;

-- Add interviewee_started column (boolean, default false)
-- This indicates whether the interviewee has started the interview (after interviewer is ready)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS interviewee_started BOOLEAN NOT NULL DEFAULT false;

-- Update existing sessions to have appropriate default values
-- If a session is already 'active', 'completed', or 'ended', we assume both interviewer was ready and interviewee started
-- For 'pending' sessions, set both to false (default)
-- Note: Since columns have NOT NULL DEFAULT false, new columns will default to false automatically
-- This UPDATE is only needed if we want to backfill existing 'active' sessions
UPDATE sessions
SET 
  interviewer_ready = CASE 
    WHEN session_status IN ('active', 'completed', 'ended') THEN true 
    ELSE false 
  END,
  interviewee_started = CASE 
    WHEN session_status IN ('active', 'completed', 'ended') THEN true 
    ELSE false 
  END
WHERE session_status IN ('active', 'completed', 'ended', 'pending');

-- Create indexes for faster queries on these columns
-- These indexes help with queries filtering by interview flow state
CREATE INDEX IF NOT EXISTS idx_sessions_interviewer_ready 
ON sessions(interviewer_ready);

CREATE INDEX IF NOT EXISTS idx_sessions_interviewee_started 
ON sessions(interviewee_started);

-- Add composite index for common query pattern (finding sessions where interviewer is ready but interviewee hasn't started)
CREATE INDEX IF NOT EXISTS idx_sessions_interview_flow 
ON sessions(interviewer_ready, interviewee_started);

-- Add comments to document the columns
COMMENT ON COLUMN sessions.interviewer_ready IS 'Indicates whether the interviewer has marked themselves as ready to start the interview. Defaults to false.';
COMMENT ON COLUMN sessions.interviewee_started IS 'Indicates whether the interviewee has started the interview (after interviewer is ready). Defaults to false.';

-- Verify the columns were added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'interviewer_ready'
  ) AND EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'interviewee_started'
  ) THEN
    RAISE NOTICE '✓ Successfully added interviewer_ready and interviewee_started columns to sessions table';
  ELSE
    RAISE EXCEPTION '✗ Failed to add columns to sessions table';
  END IF;
END $$;
