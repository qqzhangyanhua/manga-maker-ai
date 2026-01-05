-- 创建全文搜索索引
-- 用于小说章节的快速搜索

-- 确保 pg_trgm 扩展已安装（用于模糊匹配）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 为章节标题创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_title_gin 
ON novel_chapters USING gin(to_tsvector('simple', title));

-- 为章节内容创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_content_gin 
ON novel_chapters USING gin(to_tsvector('simple', content));

-- 为章节大纲创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_outline_gin 
ON novel_chapters USING gin(to_tsvector('simple', COALESCE(outline, '')));

-- 添加注释
COMMENT ON INDEX idx_novel_chapters_title_gin IS '章节标题全文搜索索引';
COMMENT ON INDEX idx_novel_chapters_content_gin IS '章节内容全文搜索索引';
COMMENT ON INDEX idx_novel_chapters_outline_gin IS '章节大纲全文搜索索引';
