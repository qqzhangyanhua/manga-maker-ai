-- 阶段 5c-2：剧本片段挂到项目章节
-- 设计：docs/plans/2026-11-20-canvas-script-panel-merge-design.md
-- 前置：20261121_canvas_anchor_phase5c1.sql 已执行
-- 幂等：可以重复执行。回滚：20261122_script_segment_chapter_phase5c2_rollback.sql
--
-- script_segments.chapter_id 指向项目章节，值始终等于所属时间线章节的 project_chapter_id，
-- 由触发器维护（ADR-0004 的双写方式），应用代码不直接写。阶段 6 去掉 timeline_chapters 后改由服务层写入。
--
-- 外键用 ON DELETE SET NULL 而不是级联删除：过渡期剧本片段仍归时间线章节所有，删除项目或项目章节时
-- 时间线只是解除归属（canvas_timelines.project_id 同样是 SET NULL），不能连带删掉画布上的剧本和镜头。
-- 阶段 6 剧本片段只归项目章节所有时再改为级联删除。

BEGIN;

ALTER TABLE script_segments ADD COLUMN IF NOT EXISTS chapter_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'script_segments_chapter_id_fkey'
  ) THEN
    ALTER TABLE script_segments
      ADD CONSTRAINT script_segments_chapter_id_fkey
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_script_segment_project_chapter
  ON script_segments (chapter_id);

-- 1. 写入剧本片段时按时间线章节的锚点填 chapter_id。
--    FOR SHARE 与锚定时对时间线章节的 UPDATE 互斥：锚定事务未提交时这里等待并读到新锚点；
--    这里先拿到锁时，锚定的 UPDATE 等本事务提交后再执行，下面第 2 个触发器能看到这里插入的片段。
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

DROP TRIGGER IF EXISTS trg_canvas_fill_segment_chapter ON script_segments;
CREATE TRIGGER trg_canvas_fill_segment_chapter
  BEFORE INSERT OR UPDATE OF timeline_chapter_id, chapter_id ON script_segments
  FOR EACH ROW EXECUTE FUNCTION canvas_fill_segment_chapter();

-- 2. 时间线章节锚点变化（锚定、改归属、项目章节被删除置空）时同步其剧本片段
CREATE OR REPLACE FUNCTION canvas_sync_segment_chapter() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE script_segments
  SET chapter_id = NEW.project_chapter_id
  WHERE timeline_chapter_id = NEW.id
    AND chapter_id IS DISTINCT FROM NEW.project_chapter_id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_canvas_sync_segment_chapter ON timeline_chapters;
CREATE TRIGGER trg_canvas_sync_segment_chapter
  AFTER UPDATE OF project_chapter_id ON timeline_chapters
  FOR EACH ROW
  WHEN (OLD.project_chapter_id IS DISTINCT FROM NEW.project_chapter_id)
  EXECUTE FUNCTION canvas_sync_segment_chapter();

-- 3. 回填已有剧本片段
UPDATE script_segments s
SET chapter_id = tc.project_chapter_id
FROM timeline_chapters tc
WHERE tc.id = s.timeline_chapter_id
  AND s.chapter_id IS DISTINCT FROM tc.project_chapter_id;

COMMIT;
