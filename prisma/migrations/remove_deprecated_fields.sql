-- Week 2 Task 1: Remove deprecated fields
-- Created: 2026-01-06
-- WARNING: Make a database backup before running this migration!

-- Phase 1: Remove deprecated User fields
-- NOTE: Keep 'verified' field - it's a core business field, not a duplicate
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS password;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;

-- Phase 2: Remove deprecated Story.characters field
ALTER TABLE stories DROP COLUMN IF EXISTS characters;

-- Verify changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stories'
ORDER BY ordinal_position;
