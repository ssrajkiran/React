-- Migration: Change man_hrs from INT to DECIMAL to support fractional hours
-- Run this against the leave_system database
-- This allows storing values like 1.5 (1h 30m), 0.5 (30m), 2.25 (2h 15m), etc.

ALTER TABLE timesheet
  MODIFY COLUMN man_hrs DECIMAL(5,2) DEFAULT NULL;
