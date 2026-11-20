-- 回滚 20261127：恢复“写入片段时总是用时间线锚点覆盖 chapter_id”。
-- 已有 timeline_chapter_id 为空的行时，不能把该列改回 NOT NULL。

BEGIN;

CREATE OR REPLACE FUNCTION canvas_fill_segment_chapter() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.chapter_id := (
    SELECT project_chapter_id FROM timeline_chapters
    WHERE id = NEW.timeline_chapter_id
    FOR SHARE
  );
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM script_segments WHERE timeline_chapter_id IS NULL) THEN
    ALTER TABLE script_segments ALTER COLUMN timeline_chapter_id SET NOT NULL;
  END IF;
END $$;

COMMIT;
