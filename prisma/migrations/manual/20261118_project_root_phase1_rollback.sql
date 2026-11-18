-- 回滚 项目根对齐 阶段 1
-- 只删除阶段 1 新增的列和表；Story / StoryCharacter 等旧数据在阶段 1 中未被修改，回滚后旧功能不受影响。
-- 注意：回填脚本新建的 Project（原本没有 Project 的 Story 才会新建）不会被删除，它们是普通的分镜项目。

BEGIN;

ALTER TABLE "canvas_timelines" DROP CONSTRAINT IF EXISTS "canvas_timelines_project_id_fkey";
ALTER TABLE "suggested_characters" DROP CONSTRAINT IF EXISTS "suggested_characters_project_id_fkey";
ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_project_id_fkey";
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_source_novel_id_fkey";
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_comic_style_id_fkey";

DROP TABLE IF EXISTS "project_characters";

DROP INDEX IF EXISTS "idx_canvas_timeline_project_ref";
DROP INDEX IF EXISTS "idx_suggested_characters_project";
DROP INDEX IF EXISTS "idx_chapters_project_order";
DROP INDEX IF EXISTS "idx_projects_source_novel";
DROP INDEX IF EXISTS "idx_projects_comic_style";

ALTER TABLE "canvas_timelines" DROP COLUMN IF EXISTS "project_id";
ALTER TABLE "suggested_characters" DROP COLUMN IF EXISTS "project_id";
ALTER TABLE "chapters" DROP COLUMN IF EXISTS "project_id";

ALTER TABLE "projects"
  DROP COLUMN IF EXISTS "genre",
  DROP COLUMN IF EXISTS "premise",
  DROP COLUMN IF EXISTS "outline",
  DROP COLUMN IF EXISTS "template_id",
  DROP COLUMN IF EXISTS "comic_style_id",
  DROP COLUMN IF EXISTS "style_reference_image",
  DROP COLUMN IF EXISTS "is_serialized",
  DROP COLUMN IF EXISTS "serial_status",
  DROP COLUMN IF EXISTS "is_sample",
  DROP COLUMN IF EXISTS "sample_category",
  DROP COLUMN IF EXISTS "source_type",
  DROP COLUMN IF EXISTS "source_novel_id";

COMMIT;
