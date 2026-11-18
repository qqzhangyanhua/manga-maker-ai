-- 项目根对齐 阶段 2：过渡期双写（ADR-0004）
-- 计划：docs/plans/2026-11-18-project-root-alignment-plan.md
-- 前置：20261118_project_root_phase1.sql 已执行，且回填脚本已写入
-- 幂等：可以重复执行。回滚：20261119_project_root_phase2_rollback.sql
--
-- 方向固定为 Story -> Project：Story、Chapter.story_id、StoryCharacter、SuggestedCharacter.story_id
-- 仍由现有代码写入，触发器把变更同步到主项目（projects.story_id = 故事 id 的那一个）。
-- 项目一侧没有反向触发器，避免循环。阶段 3 读切换后改为由服务层直接写 Project，阶段 6 删除。

BEGIN;

-- 1. 一个故事最多一个主项目。为已有项目的故事再生成分镜时，新项目不再写 story_id（独立项目）。
--    普通唯一索引允许多个 NULL，所以独立项目不受影响。Prisma 关系仍是一对多，索引只在 SQL 中维护。
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE story_id IS NOT NULL GROUP BY story_id HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION '存在对应多个项目的故事，先处理后再执行本迁移';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "unique_projects_story" ON "projects"("story_id");

-- 2. 故事 -> 主项目设定
CREATE OR REPLACE FUNCTION project_root_sync_story() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 新故事立即拥有主项目，保证"先有项目"；应用代码通过 ensureStoryProject 取到同一个项目
    INSERT INTO projects (
      user_id, story_id, title, status,
      genre, premise, outline, template_id, comic_style_id, style_reference_image,
      is_serialized, serial_status, is_sample, sample_category, source_type, source_novel_id
    ) VALUES (
      NEW.user_id, NEW.id, NEW.title, 'draft',
      NEW.genre, NEW.premise, NEW.outline, NEW.template_id, NEW.comic_style_id, NEW.style_reference_image,
      NEW.is_serialized, NEW.serial_status, NEW.is_sample, NEW.sample_category, NEW.source_type, NEW.source_novel_id
    )
    ON CONFLICT ("story_id") DO NOTHING;
    RETURN NEW;
  END IF;

  IF (OLD.genre, OLD.premise, OLD.outline, OLD.template_id, OLD.comic_style_id, OLD.style_reference_image,
      OLD.is_serialized, OLD.serial_status, OLD.is_sample, OLD.sample_category, OLD.source_type, OLD.source_novel_id,
      OLD.title)
     IS NOT DISTINCT FROM
     (NEW.genre, NEW.premise, NEW.outline, NEW.template_id, NEW.comic_style_id, NEW.style_reference_image,
      NEW.is_serialized, NEW.serial_status, NEW.is_sample, NEW.sample_category, NEW.source_type, NEW.source_novel_id,
      NEW.title) THEN
    RETURN NEW;
  END IF;

  UPDATE projects SET
    genre = NEW.genre,
    premise = NEW.premise,
    outline = NEW.outline,
    template_id = NEW.template_id,
    comic_style_id = NEW.comic_style_id,
    style_reference_image = NEW.style_reference_image,
    is_serialized = NEW.is_serialized,
    serial_status = NEW.serial_status,
    is_sample = NEW.is_sample,
    sample_category = NEW.sample_category,
    source_type = NEW.source_type,
    source_novel_id = NEW.source_novel_id,
    -- 只在故事改名时覆盖标题，保留项目上单独设置过的标题
    title = CASE WHEN OLD.title IS DISTINCT FROM NEW.title THEN NEW.title ELSE title END,
    updated_at = now()
  WHERE story_id = NEW.id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_project_root_sync_story ON stories;
CREATE TRIGGER trg_project_root_sync_story
  AFTER INSERT OR UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION project_root_sync_story();

-- 3. 章节、建议角色：按 story_id 填 project_id（BEFORE 触发器，不产生额外写入）
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

DROP TRIGGER IF EXISTS trg_project_root_fill_chapter ON chapters;
CREATE TRIGGER trg_project_root_fill_chapter
  BEFORE INSERT OR UPDATE OF story_id, project_id ON chapters
  FOR EACH ROW EXECUTE FUNCTION project_root_fill_project_id();

DROP TRIGGER IF EXISTS trg_project_root_fill_suggested ON suggested_characters;
CREATE TRIGGER trg_project_root_fill_suggested
  BEFORE INSERT OR UPDATE OF story_id, project_id ON suggested_characters
  FOR EACH ROW EXECUTE FUNCTION project_root_fill_project_id();

-- 4. 故事角色 -> 项目角色
CREATE OR REPLACE FUNCTION project_root_sync_story_character() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF TG_OP = 'DELETE'
       OR OLD.story_id IS DISTINCT FROM NEW.story_id
       OR OLD.character_id IS DISTINCT FROM NEW.character_id THEN
      -- 删除故事时级联删除的故事角色不同步：项目会变成独立项目，保留它的项目角色
      IF EXISTS (SELECT 1 FROM stories WHERE id = OLD.story_id) THEN
        DELETE FROM project_characters pc
        USING projects p
        WHERE p.story_id = OLD.story_id
          AND pc.project_id = p.id
          AND pc.character_id = OLD.character_id;
      END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
  END IF;

  SELECT id INTO v_project_id FROM projects WHERE story_id = NEW.story_id;
  IF v_project_id IS NOT NULL THEN
    INSERT INTO project_characters (project_id, character_id, role, character_arc, display_order)
    VALUES (v_project_id, NEW.character_id, NEW.role, NEW.character_arc, NEW.display_order)
    ON CONFLICT (project_id, character_id) DO UPDATE SET
      role = EXCLUDED.role,
      character_arc = EXCLUDED.character_arc,
      display_order = EXCLUDED.display_order,
      updated_at = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_project_root_sync_story_character ON story_characters;
CREATE TRIGGER trg_project_root_sync_story_character
  AFTER INSERT OR UPDATE OR DELETE ON story_characters
  FOR EACH ROW EXECUTE FUNCTION project_root_sync_story_character();

COMMIT;
