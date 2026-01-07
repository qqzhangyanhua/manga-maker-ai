-- ====================================================================
-- Migration: Add Chapter Background Generation Feature
-- Date: 2026-01-07
-- Description: Add SuggestedScene table and extend Scene table for
--              intelligent chapter background generation
-- ====================================================================

-- Step 1: Add source tracking fields to Scene table
ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "source_chapter_id" UUID;
ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "source_novel_id" UUID;
ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "generation_params" JSONB;
ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "is_ai_generated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "generation_cost" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Create SuggestedScene table
CREATE TABLE IF NOT EXISTS "suggested_scenes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scene_prompt" TEXT NOT NULL,
    "scene_type" TEXT NOT NULL,
    "atmosphere" TEXT,
    "lighting_hint" TEXT,

    "generated" BOOLEAN NOT NULL DEFAULT false,
    "scene_id" UUID,
    "image_url" TEXT,
    "optimized_prompt" TEXT,
    "generated_at" TIMESTAMPTZ(6),
    "generation_cost" INTEGER NOT NULL DEFAULT 0,

    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggested_scenes_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS "idx_scenes_source_chapter" ON "scenes"("source_chapter_id");
CREATE INDEX IF NOT EXISTS "idx_scenes_source_novel" ON "scenes"("source_novel_id");
CREATE INDEX IF NOT EXISTS "idx_scenes_user_ai_generated" ON "scenes"("user_id", "is_ai_generated");
CREATE INDEX IF NOT EXISTS "idx_suggested_scenes_chapter_generated" ON "suggested_scenes"("chapter_id", "generated");
CREATE INDEX IF NOT EXISTS "idx_suggested_scenes_scene" ON "suggested_scenes"("scene_id");

-- Step 4: Add foreign keys
ALTER TABLE "suggested_scenes" ADD CONSTRAINT "suggested_scenes_chapter_id_fkey"
  FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suggested_scenes" ADD CONSTRAINT "suggested_scenes_scene_id_fkey"
  FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Add comments for documentation
COMMENT ON COLUMN "scenes"."source_chapter_id" IS '来源章节ID（用于追踪从哪个章节生成）';
COMMENT ON COLUMN "scenes"."source_novel_id" IS '来源小说项目ID';
COMMENT ON COLUMN "scenes"."generation_params" IS '生成参数存档（JSON格式）';
COMMENT ON COLUMN "scenes"."is_ai_generated" IS '是否AI生成';
COMMENT ON COLUMN "scenes"."generation_cost" IS '生成消耗的算力';
COMMENT ON TABLE "suggested_scenes" IS '章节建议场景表（两步生成模式：分析→生成）';

-- Step 6: Verify tables and columns exist
DO $$
BEGIN
    -- Verify Scene table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scenes' AND column_name='source_chapter_id') THEN
        RAISE EXCEPTION 'Column scenes.source_chapter_id was not created';
    END IF;

    -- Verify SuggestedScene table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suggested_scenes') THEN
        RAISE EXCEPTION 'Table suggested_scenes was not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully!';
END $$;
