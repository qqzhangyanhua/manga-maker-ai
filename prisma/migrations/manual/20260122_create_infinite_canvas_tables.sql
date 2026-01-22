-- Infinite Canvas System Tables
-- 创建无限画布系统的核心表

-- 1. canvas_timelines - 无限画布时间线项目
CREATE TABLE IF NOT EXISTS "canvas_timelines" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "novel_project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'draft',
    "config" JSONB NOT NULL DEFAULT '{"auto_generate":true,"use_character_library":true,"use_scene_library":true}',
    "total_chapters" INTEGER NOT NULL DEFAULT 0,
    "completed_chapters" INTEGER NOT NULL DEFAULT 0,
    "total_shots" INTEGER NOT NULL DEFAULT 0,
    "total_images" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_canvas_timeline_user" ON "canvas_timelines"("user_id");
CREATE INDEX IF NOT EXISTS "idx_canvas_timeline_project" ON "canvas_timelines"("novel_project_id");

-- 2. timeline_chapters - 时间线章节节点
CREATE TABLE IF NOT EXISTS "timeline_chapters" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "timeline_id" UUID NOT NULL REFERENCES "canvas_timelines"("id") ON DELETE CASCADE,
    "chapter_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "script_status" VARCHAR NOT NULL DEFAULT 'pending',
    "shot_status" VARCHAR NOT NULL DEFAULT 'pending',
    "scene_status" VARCHAR NOT NULL DEFAULT 'pending',
    "final_status" VARCHAR NOT NULL DEFAULT 'pending',
    "character_ids" UUID[] DEFAULT '{}',
    "comic_style_id" UUID REFERENCES "comic_styles"("id") ON DELETE SET NULL,
    "script_segment_count" INTEGER NOT NULL DEFAULT 0,
    "shot_count" INTEGER NOT NULL DEFAULT 0,
    "scene_image_count" INTEGER NOT NULL DEFAULT 0,
    "final_image_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_timeline_chapter_timeline" ON "timeline_chapters"("timeline_id");
CREATE INDEX IF NOT EXISTS "idx_timeline_chapter_chapter" ON "timeline_chapters"("chapter_id");
CREATE INDEX IF NOT EXISTS "idx_timeline_chapter_style" ON "timeline_chapters"("comic_style_id");

-- 3. script_segments - 剧本片段
CREATE TABLE IF NOT EXISTS "script_segments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "timeline_chapter_id" UUID NOT NULL REFERENCES "timeline_chapters"("id") ON DELETE CASCADE,
    "segment_order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "scene_description" TEXT NOT NULL,
    "character_actions" TEXT NOT NULL,
    "dialogue" TEXT,
    "estimated_duration" INTEGER NOT NULL DEFAULT 0,
    "emotion_tone" VARCHAR NOT NULL DEFAULT '',
    "source_text_start" INTEGER NOT NULL DEFAULT 0,
    "source_text_end" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_script_segment_chapter" ON "script_segments"("timeline_chapter_id");

-- 4. shot_designs - 镜头设计
CREATE TABLE IF NOT EXISTS "shot_designs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "script_segment_id" UUID NOT NULL REFERENCES "script_segments"("id") ON DELETE CASCADE,
    "shot_order" INTEGER NOT NULL,
    "camera_angle" VARCHAR NOT NULL DEFAULT '',
    "shot_size" VARCHAR NOT NULL DEFAULT '',
    "panel_type" VARCHAR NOT NULL DEFAULT '',
    "shot_description" TEXT NOT NULL,
    "composition_hint" TEXT NOT NULL,
    "location_key" VARCHAR NOT NULL DEFAULT '',
    "character_ids" VARCHAR[] DEFAULT '{}',
    "scene_id" UUID,
    "expression_types" VARCHAR[] DEFAULT '{}',
    "outfit_ids" VARCHAR[] DEFAULT '{}',
    "shared_scene_id" UUID,
    "prompt" TEXT NOT NULL,
    "negative_prompt" TEXT,
    "generated_image_url" VARCHAR,
    "generation_status" VARCHAR NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_shot_design_segment" ON "shot_designs"("script_segment_id");
CREATE INDEX IF NOT EXISTS "idx_shot_design_location" ON "shot_designs"("location_key");

-- 5. scene_images - 场景基础图
CREATE TABLE IF NOT EXISTS "scene_images" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shot_design_id" UUID NOT NULL REFERENCES "shot_designs"("id") ON DELETE CASCADE,
    "location_key" VARCHAR NOT NULL DEFAULT '',
    "image_url" VARCHAR NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1024,
    "height" INTEGER NOT NULL DEFAULT 768,
    "generation_prompt" TEXT NOT NULL,
    "scene_id" UUID,
    "model_used" VARCHAR NOT NULL DEFAULT '',
    "seed" INTEGER,
    "generation_params" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR NOT NULL DEFAULT 'generating',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_scene_image_shot" ON "scene_images"("shot_design_id");
CREATE INDEX IF NOT EXISTS "idx_scene_image_location" ON "scene_images"("location_key");

-- 6. comic_panel_results - 最终漫画图
CREATE TABLE IF NOT EXISTS "comic_panel_results" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shot_design_id" UUID NOT NULL REFERENCES "shot_designs"("id") ON DELETE CASCADE,
    "scene_image_id" UUID NOT NULL REFERENCES "scene_images"("id") ON DELETE CASCADE,
    "image_url" VARCHAR NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1024,
    "height" INTEGER NOT NULL DEFAULT 768,
    "generation_prompt" TEXT NOT NULL,
    "character_reference_images" VARCHAR[] DEFAULT '{}',
    "controlnet_type" VARCHAR NOT NULL DEFAULT 'reference',
    "controlnet_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "model_used" VARCHAR NOT NULL DEFAULT '',
    "lora_models" VARCHAR[] DEFAULT '{}',
    "generation_params" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR NOT NULL DEFAULT 'generating',
    "error_message" TEXT,
    "exported_to_panel_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_comic_panel_shot" ON "comic_panel_results"("shot_design_id");
CREATE INDEX IF NOT EXISTS "idx_comic_panel_scene" ON "comic_panel_results"("scene_image_id");

-- 7. Add shared_scene_id FK constraint (after scene_images table exists)
ALTER TABLE "shot_designs"
ADD CONSTRAINT "shot_designs_shared_scene_id_fkey"
FOREIGN KEY ("shared_scene_id") REFERENCES "scene_images"("id") ON DELETE SET NULL;
