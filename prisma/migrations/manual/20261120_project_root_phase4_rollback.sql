-- 回滚 项目根对齐 阶段 4（20261120_project_root_phase4.sql）
-- 回滚后必须部署阶段 3 的代码和 Prisma Client（chapters.story_id 非空、panels.chapter_id 可空）。
-- 迁移建的"第一章"保留，分镜仍挂在上面；只有独立项目（无故事）的章节会被删除，
-- 其分镜的 chapter_id 置空，恢复到阶段 3 的状态。

BEGIN;

DROP TRIGGER IF EXISTS trg_project_root_fill_panel_chapter ON panels;
DROP FUNCTION IF EXISTS project_root_fill_panel_chapter();
DROP TRIGGER IF EXISTS trg_project_root_check_chapter_project ON chapters;
DROP FUNCTION IF EXISTS project_root_check_chapter_project();

ALTER TABLE panels DROP CONSTRAINT IF EXISTS panels_chapter_id_fkey;
ALTER TABLE panels ADD CONSTRAINT panels_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE panels ALTER COLUMN chapter_id DROP NOT NULL;

ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_project_id_fkey;
ALTER TABLE chapters ADD CONSTRAINT chapters_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE chapters ALTER COLUMN project_id DROP NOT NULL;

UPDATE panels SET chapter_id = NULL
WHERE chapter_id IN (SELECT id FROM chapters WHERE story_id IS NULL);
DELETE FROM chapters WHERE story_id IS NULL;

ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_story_id_fkey;
ALTER TABLE chapters ADD CONSTRAINT chapters_story_id_fkey
  FOREIGN KEY (story_id) REFERENCES stories(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE chapters ALTER COLUMN story_id SET NOT NULL;

-- 恢复阶段 2 的章节归属函数
CREATE OR REPLACE FUNCTION project_root_fill_project_id() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.story_id IS NOT DISTINCT FROM OLD.story_id AND NEW.project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  NEW.project_id := (SELECT id FROM projects WHERE story_id = NEW.story_id);
  RETURN NEW;
END $$;

COMMIT;
