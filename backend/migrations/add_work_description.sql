-- Migration: Add work_description column to timesheet table
-- Run this against the leave_system database

ALTER TABLE timesheet
  ADD COLUMN work_description TEXT DEFAULT NULL AFTER end_time;
