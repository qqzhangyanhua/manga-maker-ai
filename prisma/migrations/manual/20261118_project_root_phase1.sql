-- 项目根对齐 阶段 1：只增不删（ADR-0001 / ADR-0002 / ADR-0003）
-- 计划：docs/plans/2026-11-18-project-root-alignment-plan.md
-- 幂等：可以重复执行。回滚：20261118_project_root_phase1_rollback.sql
-- 执行后运行 npx tsx scripts/migrate-story-to-project.ts --apply 回填数据

BEGIN;

-- 1. projects：从 Story 迁入的设定字段
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "genre" TEXT,
  ADD COLUMN IF NOT EXISTS "premise" TEXT,
  ADD COLUMN IF NOT EXISTS "outline" JSONB,
  ADD COLUMN IF NOT EXISTS "template_id" UUID,
  ADD COLUMN IF NOT EXISTS "comic_style_id" UUID,
  ADD COLUMN IF NOT EXISTS "style_reference_image" TEXT,
  ADD COLUMN IF NOT EXISTS "is_serialized" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "serial_status" TEXT,
  ADD COLUMN IF NOT EXISTS "is_sample" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sample_category" TEXT,
  ADD COLUMN IF NOT EXISTS "source_type" TEXT,
  ADD COLUMN IF NOT EXISTS "source_novel_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_projects_comic_style" ON "projects"("comic_style_id");
CREATE INDEX IF NOT EXISTS "idx_projects_source_novel" ON "projects"("source_novel_id");

-- 2. 章节、建议角色、画布时间线指向项目
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "project_id" UUID;
ALTER TABLE "suggested_characters" ADD COLUMN IF NOT EXISTS "project_id" UUID;
ALTER TABLE "canvas_timelines" ADD COLUMN IF NOT EXISTS "project_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_chapters_project_order" ON "chapters"("project_id", "chapter_order");
CREATE INDEX IF NOT EXISTS "idx_suggested_characters_project" ON "suggested_characters"("project_id");
CREATE INDEX IF NOT EXISTS "idx_canvas_timeline_project_ref" ON "canvas_timelines"("project_id");

-- 3. 项目角色
CREATE TABLE IF NOT EXISTS "project_characters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "character_id" UUID NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'supporting',
  "character_arc" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_characters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_project_characters_project" ON "project_characters"("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_characters_character" ON "project_characters"("character_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_project_character" ON "project_characters"("project_id", "character_id");

-- 4. 外键（PostgreSQL 不支持 ADD CONSTRAINT IF NOT EXISTS，按名称判断）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_comic_style_id_fkey') THEN
    ALTER TABLE "projects" ADD CONSTRAINT "projects_comic_style_id_fkey"
      FOREIGN KEY ("comic_style_id") REFERENCES "comic_styles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_source_novel_id_fkey') THEN
    ALTER TABLE "projects" ADD CONSTRAINT "projects_source_novel_id_fkey"
      FOREIGN KEY ("source_novel_id") REFERENCES "novel_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  -- 迁移期删除项目只置空章节归属，不连带删除仍属于 Story 的章节；阶段 4 改为 CASCADE
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapters_project_id_fkey') THEN
    ALTER TABLE "chapters" ADD CONSTRAINT "chapters_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_characters_project_id_fkey') THEN
    ALTER TABLE "project_characters" ADD CONSTRAINT "project_characters_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_characters_character_id_fkey') THEN
    ALTER TABLE "project_characters" ADD CONSTRAINT "project_characters_character_id_fkey"
      FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suggested_characters_project_id_fkey') THEN
    ALTER TABLE "suggested_characters" ADD CONSTRAINT "suggested_characters_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'canvas_timelines_project_id_fkey') THEN
    ALTER TABLE "canvas_timelines" ADD CONSTRAINT "canvas_timelines_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
