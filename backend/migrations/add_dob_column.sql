-- Migration: Add date of birth column to users table
-- Run this against the leave_system database

ALTER TABLE users
  ADD COLUMN dob DATE DEFAULT NULL AFTER role;
