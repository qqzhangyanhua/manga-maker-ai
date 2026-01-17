-- 添加角色来源追踪字段
-- Migration: add_character_source_tracking
-- Date: 2026-01-17

-- 添加 source_type 和 source_reference 字段
ALTER TABLE "characters"
ADD COLUMN IF NOT EXISTS "source_type" TEXT,
ADD COLUMN IF NOT EXISTS "source_reference" JSONB;

-- 添加索引（便于后续按来源类型查询）
CREATE INDEX IF NOT EXISTS "idx_characters_source_type"
ON "characters"("source_type")
WHERE "source_type" IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN "characters"."source_type" IS '角色来源类型: manual/novel/story_ai/imported';
COMMENT ON COLUMN "characters"."source_reference" IS '来源引用，JSON格式存储相关ID和元数据';

-- 验证迁移
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters'
    AND column_name = 'source_type'
  ) THEN
    RAISE NOTICE '✅ Migration successful: source_type and source_reference added to characters table';
  ELSE
    RAISE EXCEPTION '❌ Migration failed: columns not added';
  END IF;
END $$;
