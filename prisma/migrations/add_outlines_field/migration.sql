-- Add outlines field to novel_projects table
ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS outlines JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance on outlines
CREATE INDEX IF NOT EXISTS idx_novel_projects_outlines ON novel_projects USING gin(outlines);

-- Add comment
COMMENT ON COLUMN novel_projects.outlines IS '章节大纲（JSON 结构化存储）: [{ chapterNumber, title, outline, keyEvents, characters, plotLines, isKeyChapter }]';
