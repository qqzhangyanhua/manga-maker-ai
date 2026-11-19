-- 阶段 5c-1：画布时间线章节锚定项目章节
-- 设计：docs/plans/2026-11-20-canvas-script-panel-merge-design.md
-- 前置：20261120_project_root_phase4.sql 已执行
-- 幂等：可以重复执行。回滚：20261121_canvas_anchor_phase5c1_rollback.sql
--
-- timeline_chapters.chapter_id 仍指向来源小说章节（novel_chapters，无外键）；
-- 新增 project_chapter_id 指向时间线所属项目中的章节。删除项目章节时置空，下次锚定会重新建立。

BEGIN;

ALTER TABLE timeline_chapters ADD COLUMN IF NOT EXISTS project_chapter_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timeline_chapters_project_chapter_id_fkey'
  ) THEN
    ALTER TABLE timeline_chapters
      ADD CONSTRAINT timeline_chapters_project_chapter_id_fkey
      FOREIGN KEY (project_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_timeline_chapter_project_chapter
  ON timeline_chapters (project_chapter_id);

COMMIT;
