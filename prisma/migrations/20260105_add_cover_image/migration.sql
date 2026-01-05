-- Add cover_image field to novel_projects table
ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Add comment
COMMENT ON COLUMN novel_projects.cover_image IS 'AI生成的封面图URL';
