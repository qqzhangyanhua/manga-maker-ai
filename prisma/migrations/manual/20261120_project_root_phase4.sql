-- 项目根对齐 阶段 4：收紧约束
-- 计划：docs/plans/2026-11-18-project-root-alignment-plan.md
-- 前置：20261119_project_root_phase2.sql 已执行
-- 幂等：可以重复执行。回滚：20261120_project_root_phase4_rollback.sql
--
-- 结果：每个分镜都挂在本项目的某个章节上，每个章节都属于一个项目。
--   chapters.project_id、panels.chapter_id 非空；删除项目级联删除章节，删除章节级联删除分镜；
--   chapters.story_id 可空（独立项目的章节没有故事），删除故事时只把章节的 story_id 置空。
-- 兼容：旧代码新建分镜不带 chapter_id 时，触发器挂到项目第一个章节，没有章节就建"第一章"。

BEGIN;

-- 1. 前置检查：章节都已归属项目，分镜与章节同属一个项目
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM chapters WHERE project_id IS NULL) THEN
    RAISE EXCEPTION '存在未归属项目的章节，先执行阶段 1 回填';
  END IF;
  IF EXISTS (
    SELECT 1 FROM panels x JOIN chapters c ON c.id = x.chapter_id
    WHERE c.project_id <> x.project_id
  ) THEN
    RAISE EXCEPTION '存在章节与分镜不属于同一项目的数据，先处理后再执行本迁移';
  END IF;
END $$;

-- 2. 独立项目的章节没有故事
ALTER TABLE chapters ALTER COLUMN story_id DROP NOT NULL;

-- 3. 章节按 story_id 填 project_id；story_id 为空（独立项目章节、故事已删除）时保留原项目
CREATE OR REPLACE FUNCTION project_root_fill_project_id() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NEW.story_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.story_id IS NOT DISTINCT FROM OLD.story_id AND NEW.project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT id INTO v_project_id FROM projects WHERE story_id = NEW.story_id;
  NEW.project_id := COALESCE(v_project_id, NEW.project_id);
  RETURN NEW;
END $$;

-- 4. 没有章节的项目建"第一章"，未挂章节的分镜挂到项目第一个章节
INSERT INTO chapters (project_id, story_id, title, chapter_order)
SELECT p.id, p.story_id, '第一章', 1
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM chapters c WHERE c.project_id = p.id);

UPDATE panels x
SET chapter_id = (
  SELECT c.id FROM chapters c
  WHERE c.project_id = x.project_id
  ORDER BY c.chapter_order, c.created_at
  LIMIT 1
)
WHERE x.chapter_id IS NULL;

-- 5. 分镜写入时：没有章节就挂默认章节；有章节就校验同属一个项目
CREATE OR REPLACE FUNCTION project_root_fill_panel_chapter() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_chapter_id uuid;
  v_chapter_project_id uuid;
BEGIN
  IF NEW.chapter_id IS NULL THEN
    -- 与 src/lib/project/chapter.ts 的 ensureDefaultChapter 使用同一个锁键
    PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));
    SELECT id INTO v_chapter_id FROM chapters
    WHERE project_id = NEW.project_id
    ORDER BY chapter_order, created_at
    LIMIT 1;
    IF v_chapter_id IS NULL THEN
      INSERT INTO chapters (project_id, story_id, title, chapter_order)
      SELECT p.id, p.story_id, '第一章', 1 FROM projects p WHERE p.id = NEW.project_id
      RETURNING id INTO v_chapter_id;
    END IF;
    NEW.chapter_id := v_chapter_id;
    RETURN NEW;
  END IF;

  SELECT project_id INTO v_chapter_project_id FROM chapters WHERE id = NEW.chapter_id;
  IF FOUND AND v_chapter_project_id IS DISTINCT FROM NEW.project_id THEN
    RAISE EXCEPTION '分镜 % 的章节 % 不属于项目 %', NEW.id, NEW.chapter_id, NEW.project_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_project_root_fill_panel_chapter ON panels;
CREATE TRIGGER trg_project_root_fill_panel_chapter
  BEFORE INSERT OR UPDATE OF chapter_id, project_id ON panels
  FOR EACH ROW EXECUTE FUNCTION project_root_fill_panel_chapter();

-- 6. 章节换项目时，章节下的分镜必须跟着换（AFTER 触发器，看到填充后的最终值）
CREATE OR REPLACE FUNCTION project_root_check_chapter_project() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM panels WHERE chapter_id = NEW.id AND project_id <> NEW.project_id) THEN
    RAISE EXCEPTION '章节 % 下有分镜不属于项目 %', NEW.id, NEW.project_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_project_root_check_chapter_project ON chapters;
CREATE TRIGGER trg_project_root_check_chapter_project
  AFTER UPDATE ON chapters
  FOR EACH ROW
  WHEN (OLD.project_id IS DISTINCT FROM NEW.project_id)
  EXECUTE FUNCTION project_root_check_chapter_project();

-- 7. 非空约束
ALTER TABLE chapters ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE panels ALTER COLUMN chapter_id SET NOT NULL;

-- 8. 外键删除规则
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_project_id_fkey;
ALTER TABLE chapters ADD CONSTRAINT chapters_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_story_id_fkey;
ALTER TABLE chapters ADD CONSTRAINT chapters_story_id_fkey
  FOREIGN KEY (story_id) REFERENCES stories(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE panels DROP CONSTRAINT IF EXISTS panels_chapter_id_fkey;
ALTER TABLE panels ADD CONSTRAINT panels_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
