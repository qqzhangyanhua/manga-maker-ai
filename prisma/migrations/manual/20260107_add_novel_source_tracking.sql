-- Migration: add_novel_source_tracking
-- Description: Add source tracking fields for novel-to-comic conversion
-- Date: 2026-01-07

-- Add source tracking fields to stories table
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_novel_id UUID;

-- Add index for source_novel_id
CREATE INDEX IF NOT EXISTS idx_stories_source_novel ON stories(source_novel_id);

-- Add source tracking fields to chapters table
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS source_novel_chapter_id UUID,
ADD COLUMN IF NOT EXISTS source_scene_markers JSONB;

-- Add index for source_novel_chapter_id
CREATE INDEX IF NOT EXISTS idx_chapters_source_novel ON chapters(source_novel_chapter_id);

-- Note: These are soft references (no foreign key constraints) to allow
-- flexibility in cross-service data management between NovelProject (Python backend)
-- and Story/Chapter (Next.js backend)
