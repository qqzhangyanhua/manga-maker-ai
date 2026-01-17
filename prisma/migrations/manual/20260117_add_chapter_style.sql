-- Style Selection Migration
-- 为 TimelineChapter 添加 comic_style_id 字段

-- Step 1: 添加 comic_style_id 字段
ALTER TABLE timeline_chapters
ADD COLUMN IF NOT EXISTS comic_style_id UUID REFERENCES comic_styles(id) ON DELETE SET NULL;

-- Step 2: 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_timeline_chapter_style ON timeline_chapters(comic_style_id);
