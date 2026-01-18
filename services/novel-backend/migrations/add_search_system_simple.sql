-- ================================================
-- Migration: Add Global Search System (Simple Version)
-- Date: 2026-01-18
-- Description: 使用simple配置代替chinese(兼容版本)
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
    clicked_result_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_search_history_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_created
    ON search_history(user_id, created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_saved_filter_user
    ON saved_filter(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_filter_pinned
    ON saved_filter(user_id, is_pinned) WHERE is_pinned = TRUE;

-- ============================================
-- Part 3: 为 novel_chapters 添加全文搜索支持
-- ============================================

-- 添加 tsvector 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'novel_chapters' AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE novel_chapters ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- 更新现有数据的 search_vector (使用simple配置)
UPDATE novel_chapters
SET search_vector =
    setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(content, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(outline, '')), 'C')
WHERE search_vector IS NULL OR content IS NOT NULL;

-- 创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_chapter_search_vector
    ON novel_chapters USING GIN(search_vector);

-- 创建触发器函数
CREATE OR REPLACE FUNCTION chapter_search_vector_update()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.outline, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
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

CREATE INDEX IF NOT EXISTS idx_chapters_user_status_created
    ON novel_chapters(project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chapters_word_count
    ON novel_chapters(word_count) WHERE word_count > 0;

CREATE INDEX IF NOT EXISTS idx_chapters_project_number
    ON novel_chapters(project_id, chapter_number);

-- ============================================
-- Part 5: 添加cool_points字段
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

CREATE INDEX IF NOT EXISTS idx_chapters_cool_points
    ON novel_chapters USING GIN(cool_points);

-- ============================================
-- 验证
-- ============================================

SELECT 'Migration completed successfully!' as status;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('search_history', 'saved_filter');

SELECT COUNT(*) as chapters_with_search_vector
FROM novel_chapters
WHERE search_vector IS NOT NULL;
