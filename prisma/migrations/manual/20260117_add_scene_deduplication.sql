-- Scene Deduplication Migration
-- 添加 location_key 字段用于场景去重
-- 添加 shared_scene_id 字段用于多镜头共享场景

-- Step 1: 为 shot_designs 表添加 location_key 字段
ALTER TABLE shot_designs
ADD COLUMN IF NOT EXISTS location_key VARCHAR(255) DEFAULT '';

-- Step 2: 为 shot_designs 表添加 shared_scene_id 字段
ALTER TABLE shot_designs
ADD COLUMN IF NOT EXISTS shared_scene_id UUID REFERENCES scene_images(id) ON DELETE SET NULL;

-- Step 3: 为 scene_images 表添加 location_key 字段
ALTER TABLE scene_images
ADD COLUMN IF NOT EXISTS location_key VARCHAR(255) DEFAULT '';

-- Step 4: 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_shot_design_location ON shot_designs(location_key);
CREATE INDEX IF NOT EXISTS idx_shot_design_shared_scene ON shot_designs(shared_scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_image_location ON scene_images(location_key);

-- Step 5: 为现有数据初始化 location_key (使用 shot_description 的前50个字符作为临时标识)
-- 注意：这只是临时方案，新数据会由 LLM 生成更好的 location_key
UPDATE shot_designs
SET location_key = LEFT(REGEXP_REPLACE(shot_description, '[^a-zA-Z0-9_]', '_', 'g'), 50)
WHERE location_key = '' OR location_key IS NULL;
