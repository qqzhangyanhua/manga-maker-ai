-- Add character_ids field to timeline_chapters table
-- This field stores the list of character IDs bound to a chapter for reference image generation

ALTER TABLE "timeline_chapters"
ADD COLUMN IF NOT EXISTS "character_ids" UUID[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN "timeline_chapters"."character_ids" IS 'List of character IDs bound to this chapter for comic generation with character reference images';
