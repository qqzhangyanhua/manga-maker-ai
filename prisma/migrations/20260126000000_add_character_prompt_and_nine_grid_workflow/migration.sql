-- 角色身份证与九宫格工作流系统迁移
-- 创建日期: 2026-01-26

-- ============================================================
-- 1. 创建新表: character_prompt_templates (角色身份证 Prompt 模板)
-- ============================================================

CREATE TABLE "character_prompt_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "character_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "version" VARCHAR(20) NOT NULL DEFAULT 'base',
    "variant_name" VARCHAR(100),
    "appearance_prompt" TEXT NOT NULL,
    "clothing_prompt" TEXT NOT NULL,
    "style_prompt" TEXT NOT NULL,
    "characteristic_prompt" TEXT,
    "full_prompt" TEXT NOT NULL,
    "negative_prompt" TEXT NOT NULL DEFAULT '',
    "reference_image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- 创建唯一约束: 同一角色的同版本同名变体唯一
CREATE UNIQUE INDEX "unique_character_prompt_version" ON "character_prompt_templates"("character_id", "version", "variant_name");

-- 创建索引
CREATE INDEX "idx_character_prompt_templates_character" ON "character_prompt_templates"("character_id");
CREATE INDEX "idx_character_prompt_templates_user" ON "character_prompt_templates"("user_id");
CREATE INDEX "idx_character_prompt_templates_active" ON "character_prompt_templates"("is_active");

-- ============================================================
-- 2. 创建新表: shot_prompt_compositions (分镜 Prompt 合成记录)
-- ============================================================

CREATE TABLE "shot_prompt_compositions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shot_design_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "character_prompts" JSONB NOT NULL DEFAULT '[]',
    "scene_prompt" TEXT NOT NULL,
    "action_prompt" TEXT NOT NULL,
    "atmosphere_prompt" TEXT NOT NULL,
    "camera_prompt" TEXT NOT NULL,
    "final_prompt" TEXT NOT NULL,
    "final_negative_prompt" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shot_prompt_compositions_pkey" PRIMARY KEY ("id")
);

-- 创建唯一约束: 一个 ShotDesign 只有一个 PromptComposition
CREATE UNIQUE INDEX "shot_prompt_compositions_shot_design_id_key" ON "shot_prompt_compositions"("shot_design_id");

-- 创建索引
CREATE INDEX "idx_shot_prompt_compositions_user" ON "shot_prompt_compositions"("user_id");

-- ============================================================
-- 3. 创建新表: nine_grid_generations (九宫格生成记录)
-- ============================================================

CREATE TABLE "nine_grid_generations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shot_design_id" UUID NOT NULL,
    "prompt_composition_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "generation_params" JSONB NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "selected_grid_position" INTEGER,
    "selected_image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "nine_grid_generations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "nine_grid_generations_selected_position_check" CHECK ("selected_grid_position" IS NULL OR ("selected_grid_position" >= 1 AND "selected_grid_position" <= 9)),
    CONSTRAINT "nine_grid_generations_status_check" CHECK ("status" IN ('pending', 'generating', 'completed', 'error'))
);

-- 创建索引
CREATE INDEX "idx_nine_grid_generations_shot" ON "nine_grid_generations"("shot_design_id");
CREATE INDEX "idx_nine_grid_generations_user" ON "nine_grid_generations"("user_id");
CREATE INDEX "idx_nine_grid_generations_status" ON "nine_grid_generations"("status");

-- ============================================================
-- 4. 修改现有表: shot_designs (添加新字段)
-- ============================================================

-- 添加角色 Prompt 模板引用
ALTER TABLE "shot_designs" ADD COLUMN IF NOT EXISTS "character_prompt_template_ids" UUID[] DEFAULT '{}';

-- 添加 Prompt 合成记录关联
ALTER TABLE "shot_designs" ADD COLUMN IF NOT EXISTS "prompt_composition_id" UUID;

-- 添加九宫格生成记录关联
ALTER TABLE "shot_designs" ADD COLUMN IF NOT EXISTS "nine_grid_generation_id" UUID;

-- 添加生成状态细化字段
ALTER TABLE "shot_designs" ADD COLUMN IF NOT EXISTS "character_prompt_status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "shot_designs" ADD COLUMN IF NOT EXISTS "final_prompt_status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "shot_designs" ADD COLUMN IF NOT EXISTS "nine_grid_status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "shot_designs" ADD COLUMN IF NOT EXISTS "selection_status" TEXT NOT NULL DEFAULT 'pending';

-- 添加约束检查
ALTER TABLE "shot_designs" ADD CONSTRAINT "shot_designs_character_prompt_status_check" 
    CHECK ("character_prompt_status" IN ('pending', 'generating', 'completed', 'error'));
ALTER TABLE "shot_designs" ADD CONSTRAINT "shot_designs_final_prompt_status_check" 
    CHECK ("final_prompt_status" IN ('pending', 'generating', 'completed', 'error'));
ALTER TABLE "shot_designs" ADD CONSTRAINT "shot_designs_nine_grid_status_check" 
    CHECK ("nine_grid_status" IN ('pending', 'generating', 'completed', 'error'));
ALTER TABLE "shot_designs" ADD CONSTRAINT "shot_designs_selection_status_check" 
    CHECK ("selection_status" IN ('pending', 'selected', 'refined'));

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_shot_design_prompt_composition" ON "shot_designs"("prompt_composition_id");
CREATE INDEX IF NOT EXISTS "idx_shot_design_nine_grid" ON "shot_designs"("nine_grid_generation_id");

-- ============================================================
-- 5. 添加外键约束
-- ============================================================

-- shot_designs -> shot_prompt_compositions
ALTER TABLE "shot_designs" ADD CONSTRAINT "shot_designs_prompt_composition_id_fkey" 
    FOREIGN KEY ("prompt_composition_id") REFERENCES "shot_prompt_compositions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- shot_designs -> nine_grid_generations
ALTER TABLE "shot_designs" ADD CONSTRAINT "shot_designs_nine_grid_generation_id_fkey" 
    FOREIGN KEY ("nine_grid_generation_id") REFERENCES "nine_grid_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 注意: character_prompt_templates 不添加外键到 NovelCharacter
-- 因为它需要支持跨项目复用，character_id 可能指向不同表（NovelCharacter 或 Character）
-- 使用软关联，在应用层验证

-- ============================================================
-- 6. 创建 updated_at 自动更新触发器
-- ============================================================

-- 触发器函数（如果不存在则创建）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- character_prompt_templates 触发器
DROP TRIGGER IF EXISTS update_character_prompt_templates_updated_at ON "character_prompt_templates";
CREATE TRIGGER update_character_prompt_templates_updated_at
    BEFORE UPDATE ON "character_prompt_templates"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- shot_prompt_compositions 触发器
DROP TRIGGER IF EXISTS update_shot_prompt_compositions_updated_at ON "shot_prompt_compositions";
CREATE TRIGGER update_shot_prompt_compositions_updated_at
    BEFORE UPDATE ON "shot_prompt_compositions"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
