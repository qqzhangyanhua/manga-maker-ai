-- Add style_guide field to novel_projects table
ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS style_guide JSONB;

-- Add comment
COMMENT ON COLUMN novel_projects.style_guide IS '风格指导文档（由 ProfessionalMode 工作流生成）: { creative_direction, writing_style, quality_rules, framework_summary }';
