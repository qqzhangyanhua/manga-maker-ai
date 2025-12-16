-- 手动执行此 SQL 来添加 comic_style_id 字段到 characters 表
--
-- 运行方式：
-- 1. 连接到 PostgreSQL 数据库
-- 2. 执行以下 SQL 命令

-- 添加 comic_style_id 字段（可选，允许为 NULL）
ALTER TABLE "characters"
ADD COLUMN IF NOT EXISTS "comic_style_id" UUID;

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS "idx_characters_comic_style"
ON "characters"("comic_style_id");

-- 添加外键约束，删除风格时将角色的 comic_style_id 设为 NULL
ALTER TABLE "characters"
ADD CONSTRAINT "characters_comic_style_id_fkey"
FOREIGN KEY ("comic_style_id")
REFERENCES "comic_styles"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 验证字段已添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'characters' AND column_name = 'comic_style_id';
