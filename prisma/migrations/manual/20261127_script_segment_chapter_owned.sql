-- 剧本片段的章节 id 由 module 写入。
-- 没有时间线章节时，插入触发器不再把 chapter_id 清掉。
-- 有时间线章节时，chapter_id 仍改成该时间线的 project_chapter_id。
-- 时间线改锚时，原有 trg_canvas_sync_segment_chapter 继续把片段带到新章节，本文件不改那一支。
-- 幂等。回滚：20261127_script_segment_chapter_owned_rollback.sql

BEGIN;

ALTER TABLE script_segments ALTER COLUMN timeline_chapter_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION canvas_fill_segment_chapter() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_anchor uuid;
BEGIN
  IF NEW.timeline_chapter_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT project_chapter_id INTO v_anchor
  FROM timeline_chapters
  WHERE id = NEW.timeline_chapter_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  NEW.chapter_id := v_anchor;
  RETURN NEW;
END $$;

COMMIT;
