-- 回滚阶段 5c-1：删除 timeline_chapters.project_chapter_id（锚定关系丢失，项目章节本身保留）

BEGIN;

DROP INDEX IF EXISTS idx_timeline_chapter_project_chapter;
ALTER TABLE timeline_chapters DROP CONSTRAINT IF EXISTS timeline_chapters_project_chapter_id_fkey;
ALTER TABLE timeline_chapters DROP COLUMN IF EXISTS project_chapter_id;

COMMIT;
