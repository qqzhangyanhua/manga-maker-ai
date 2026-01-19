-- ================================================
-- Migration: Add World Memory & Foreshadowing System
-- Date: 2026-01-18
-- Description: 世界观记忆库与伏笔管理系统
-- ================================================

-- ============================================
-- Part 1: 创建世界观条目表
-- ============================================

CREATE TABLE IF NOT EXISTS world_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,

    -- 基础字段
    type VARCHAR(50) NOT NULL,  -- location/character/event/item/rule/foreshadowing
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- 结构化属性 (按类型不同)
    properties JSONB DEFAULT '{}'::jsonb,

    -- 自定义扩展字段
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- 伏笔专用字段 (type='foreshadowing' 时使用)
    foreshadow_status VARCHAR(20),  -- planted/brewing/revealed
    planted_chapter INT,
    planned_reveal_chapter INT,
    actual_reveal_chapter INT,
    hint_text TEXT,

    -- 元数据
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 外键约束
    CONSTRAINT fk_world_entries_project FOREIGN KEY (project_id)
        REFERENCES novel_projects(id) ON DELETE CASCADE,

    -- 检查约束
    CONSTRAINT chk_entry_type CHECK (type IN ('location', 'character', 'event', 'item', 'rule', 'foreshadowing')),
    CONSTRAINT chk_foreshadow_status CHECK (
        foreshadow_status IS NULL OR
        foreshadow_status IN ('planted', 'brewing', 'revealed')
    )
);

-- 条目索引
CREATE INDEX IF NOT EXISTS idx_world_entries_project_type
    ON world_entries(project_id, type);

CREATE INDEX IF NOT EXISTS idx_world_entries_project_name
    ON world_entries(project_id, name);

CREATE INDEX IF NOT EXISTS idx_world_entries_foreshadow
    ON world_entries(project_id, foreshadow_status)
    WHERE type = 'foreshadowing';

CREATE INDEX IF NOT EXISTS idx_world_entries_tags
    ON world_entries USING GIN(tags);

-- ============================================
-- Part 2: 创建条目关系表
-- ============================================

CREATE TABLE IF NOT EXISTS entry_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    relation_type VARCHAR(100) NOT NULL,  -- 发生地点/参与者/触发事件/关联伏笔...
    description TEXT,
    chapter_context INT,  -- 可选：这个关系在哪章建立
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 外键约束
    CONSTRAINT fk_entry_relations_source FOREIGN KEY (source_id)
        REFERENCES world_entries(id) ON DELETE CASCADE,
    CONSTRAINT fk_entry_relations_target FOREIGN KEY (target_id)
        REFERENCES world_entries(id) ON DELETE CASCADE,

    -- 唯一约束：同一对条目之间同一类型的关系只能有一个
    CONSTRAINT uq_entry_relation UNIQUE(source_id, target_id, relation_type)
);

-- 关系索引
CREATE INDEX IF NOT EXISTS idx_entry_relations_source
    ON entry_relations(source_id);

CREATE INDEX IF NOT EXISTS idx_entry_relations_target
    ON entry_relations(target_id);

CREATE INDEX IF NOT EXISTS idx_entry_relations_type
    ON entry_relations(relation_type);

-- ============================================
-- Part 3: 创建触发器 - 自动更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_world_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_world_entries_updated_at'
    ) THEN
        CREATE TRIGGER trg_world_entries_updated_at
            BEFORE UPDATE ON world_entries
            FOR EACH ROW
            EXECUTE FUNCTION update_world_entries_updated_at();
    END IF;
END $$;

-- ============================================
-- Part 4: 常用关系类型参考 (可选: 创建枚举视图)
-- ============================================

-- 常用关系类型:
-- 地点相关: 发生地点, 出生地, 居住地, 势力范围
-- 人物相关: 参与者, 创造者, 拥有者, 师徒关系, 敌对关系
-- 事件相关: 触发事件, 导致结果, 前置事件, 后续事件
-- 伏笔相关: 关联伏笔, 伏笔线索, 伏笔揭示

-- ============================================
-- Part 5: 验证
-- ============================================

SELECT 'Migration completed successfully!' as status;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('world_entries', 'entry_relations');

-- 检查索引
SELECT indexname FROM pg_indexes
WHERE tablename IN ('world_entries', 'entry_relations')
ORDER BY tablename, indexname;
