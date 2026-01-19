-- ================================================
-- Migration: Add Global Search System
-- Date: 2026-01-18
-- Description: 添加全局搜索所需的表和索引
-- ================================================

-- ============================================
-- Part 1: 创建搜索历史表
-- ============================================

CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER DEFAULT 0,
    clicked_result_id UUID,  -- 用户点击的结果(用于改进搜索排名)
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_search_history_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_search_history_user_created
    ON search_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_query
    ON search_history USING GIN(to_tsvector('chinese', query));

-- ============================================
-- Part 2: 创建保存的过滤器表
-- ============================================

CREATE TABLE IF NOT EXISTS saved_filter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_saved_filter_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_saved_filter_user
    ON saved_filter(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_filter_pinned
    ON saved_filter(user_id, is_pinned) WHERE is_pinned = TRUE;

-- ============================================
-- Part 3: 为 novel_chapters 添加全文搜索支持
-- ============================================

-- 添加 tsvector 列(如果不存在)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'novel_chapters' AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE novel_chapters ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- 更新现有数据的 search_vector
UPDATE novel_chapters
SET search_vector =
    setweight(to_tsvector('chinese', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('chinese', COALESCE(content, '')), 'B') ||
    setweight(to_tsvector('chinese', COALESCE(outline, '')), 'C')
WHERE search_vector IS NULL OR search_vector = '';

-- 创建 GIN 索引(全文搜索必须)
CREATE INDEX IF NOT EXISTS idx_chapter_search_vector
    ON novel_chapters USING GIN(search_vector);

-- 创建触发器函数(自动更新 search_vector)
CREATE OR REPLACE FUNCTION chapter_search_vector_update()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('chinese', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.outline, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器(仅在不存在时创建)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'tsvector_update_trigger'
    ) THEN
        CREATE TRIGGER tsvector_update_trigger
            BEFORE INSERT OR UPDATE OF title, content, outline
            ON novel_chapters
            FOR EACH ROW
            EXECUTE FUNCTION chapter_search_vector_update();
    END IF;
END $$;

-- ============================================
-- Part 4: 创建复合索引优化查询性能
-- ============================================

-- 用户+状态+创建时间(用于过滤和排序)
CREATE INDEX IF NOT EXISTS idx_chapters_user_status_created
    ON novel_chapters(project_id, status, created_at DESC);

-- 字数范围查询优化
CREATE INDEX IF NOT EXISTS idx_chapters_word_count
    ON novel_chapters(word_count) WHERE word_count > 0;

-- 项目+章节号(快速定位)
CREATE INDEX IF NOT EXISTS idx_chapters_project_number
    ON novel_chapters(project_id, chapter_number);

-- ============================================
-- Part 5: 添加cool_points字段(如果不存在)
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'novel_chapters' AND column_name = 'cool_points'
    ) THEN
        ALTER TABLE novel_chapters ADD COLUMN cool_points JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 为 cool_points 创建 GIN 索引(支持 JSONB 查询)
CREATE INDEX IF NOT EXISTS idx_chapters_cool_points
    ON novel_chapters USING GIN(cool_points);

-- ============================================
-- Part 6: 创建视图(可选 - 方便查询)
-- ============================================

CREATE OR REPLACE VIEW v_chapter_search_metadata AS
SELECT
    c.id,
    c.project_id,
    p.title as project_title,
    c.chapter_number,
    c.title as chapter_title,
    c.word_count,
    c.status,
    c.cool_points,
    c.created_at,
    c.updated_at,
    -- 提取爽点类型(用于聚合)
    jsonb_array_elements(c.cool_points) ->> 'type' as cool_point_type
FROM novel_chapters c
JOIN novel_projects p ON c.project_id = p.id;

-- ============================================
-- Part 7: 插入测试数据(开发环境)
-- ============================================

-- 仅在开发环境执行
-- INSERT INTO search_history (user_id, query, filters, result_count)
-- VALUES (
--     (SELECT id FROM users LIMIT 1),
--     '主角觉醒',
--     '{"status": ["completed"]}',
--     5
-- );

-- ============================================
-- Part 8: 授权(如果需要)
-- ============================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON search_history TO novel_backend_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON saved_filter TO novel_backend_user;

-- ============================================
-- Rollback Script (如果需要回滚)
-- ============================================

/*
-- 删除触发器
DROP TRIGGER IF EXISTS tsvector_update_trigger ON novel_chapters;
DROP FUNCTION IF EXISTS chapter_search_vector_update();

-- 删除索引
DROP INDEX IF EXISTS idx_chapter_search_vector;
DROP INDEX IF EXISTS idx_search_history_user_created;
DROP INDEX IF EXISTS idx_search_history_query;
DROP INDEX IF EXISTS idx_saved_filter_user;
DROP INDEX IF EXISTS idx_saved_filter_pinned;
DROP INDEX IF EXISTS idx_chapters_user_status_created;
DROP INDEX IF EXISTS idx_chapters_word_count;
DROP INDEX IF EXISTS idx_chapters_project_number;
DROP INDEX IF EXISTS idx_chapters_cool_points;

-- 删除列
ALTER TABLE novel_chapters DROP COLUMN IF EXISTS search_vector;
ALTER TABLE novel_chapters DROP COLUMN IF EXISTS cool_points;

-- 删除表
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS saved_filter CASCADE;

-- 删除视图
DROP VIEW IF EXISTS v_chapter_search_metadata;
*/

-- ============================================
-- Verification Queries
-- ============================================

-- 验证表是否创建成功
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('search_history', 'saved_filter');

-- 验证索引是否创建成功
SELECT indexname FROM pg_indexes
WHERE tablename IN ('novel_chapters', 'search_history', 'saved_filter');

-- 验证tsvector列是否正常
SELECT COUNT(*) as chapters_with_search_vector
FROM novel_chapters
WHERE search_vector IS NOT NULL;

-- ============================================
-- Performance Testing Query
-- ============================================

-- 测试全文搜索性能
EXPLAIN ANALYZE
SELECT
    id, title,
    ts_rank(search_vector, to_tsquery('chinese', '主角')) as rank
FROM novel_chapters
WHERE search_vector @@ to_tsquery('chinese', '主角')
ORDER BY rank DESC
LIMIT 20;
