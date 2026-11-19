-- 回滚阶段 5c-2：删除 script_segments.chapter_id 及同步触发器（剧本片段本身保留）

BEGIN;

DROP TRIGGER IF EXISTS trg_canvas_sync_segment_chapter ON timeline_chapters;
DROP FUNCTION IF EXISTS canvas_sync_segment_chapter();
DROP TRIGGER IF EXISTS trg_canvas_fill_segment_chapter ON script_segments;
DROP FUNCTION IF EXISTS canvas_fill_segment_chapter();
DROP INDEX IF EXISTS idx_script_segment_project_chapter;
ALTER TABLE script_segments DROP CONSTRAINT IF EXISTS script_segments_chapter_id_fkey;
ALTER TABLE script_segments DROP COLUMN IF EXISTS chapter_id;

COMMIT;
