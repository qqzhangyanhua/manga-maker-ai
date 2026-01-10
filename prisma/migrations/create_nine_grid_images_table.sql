-- CreateTable: nine_grid_images
-- 九宫格图片表，用于存储生成的九宫格图片及其元数据

CREATE TABLE IF NOT EXISTS "nine_grid_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "panel_ids" TEXT[] NOT NULL,
    "image_url" TEXT NOT NULL,
    "prompt_combined" TEXT NOT NULL,
    "comic_style_id" UUID,
    "reference_image" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nine_grid_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_nine_grid_images_user" ON "nine_grid_images"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_nine_grid_images_chapter" ON "nine_grid_images"("chapter_id");

-- 说明：
-- 1. 本表用于存储九宫格图片生成记录
-- 2. panel_ids 存储9个分镜的ID数组
-- 3. prompt_combined 存储组合后的提示词（用于审计和重新生成）
-- 4. comic_style_id 和 reference_image 为可选参数

-- 使用方法：
-- 在 psql 或数据库管理工具中执行：
-- psql $DATABASE_URL -f prisma/migrations/create_nine_grid_images_table.sql
