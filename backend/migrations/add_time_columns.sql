-- Migration: Add start_time and end_time columns to timesheet table
-- Run this against the leave_system database

ALTER TABLE timesheet
  ADD COLUMN start_time TIME DEFAULT NULL AFTER man_hrs,
  ADD COLUMN end_time TIME DEFAULT NULL AFTER start_time;

-- Optional: Backfill existing rows with sensible defaults based on man_hrs
-- This gives each existing row a start of 09:00 and end = 09:00 + man_hrs hours
UPDATE timesheet
SET start_time = '09:00:00',
    end_time = ADDTIME('09:00:00', SEC_TO_TIME(man_hrs * 3600))
WHERE start_time IS NULL AND man_hrs IS NOT NULL;
