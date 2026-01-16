-- P1 功能增强 - 添加状态持久化和分析缓存表
-- 创建时间: 2026-01-16

-- 1. 渐进式生成会话表（解决用户刷新丢失问题）
CREATE TABLE IF NOT EXISTS progressive_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID,

    -- 会话状态
    step INT NOT NULL,
    state JSONB NOT NULL,

    -- 元数据
    session_type VARCHAR(50) DEFAULT 'outline' NOT NULL,

    -- 生命周期
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ(6) NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_progressive_sessions_user_expires
    ON progressive_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_progressive_sessions_project
    ON progressive_sessions(project_id);

-- 2. 智能分析结果缓存表（避免重复生成，节省 API 成本）
CREATE TABLE IF NOT EXISTS analysis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,

    -- 分析类型
    analysis_type VARCHAR(50) NOT NULL,

    -- 分析结果
    result JSONB NOT NULL,

    -- 输入内容哈希（用于检测是否需要重新生成）
    input_hash VARCHAR(64) NOT NULL,

    -- 元数据
    model_used VARCHAR(100),
    tokens_used INT,
    cost_usd FLOAT,

    -- 生命周期
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ(6) NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_analysis_reports_project_type
    ON analysis_reports(project_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_user_time
    ON analysis_reports(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_hash_type
    ON analysis_reports(input_hash, analysis_type);

-- 添加注释
COMMENT ON TABLE progressive_sessions IS 'P1功能增强：渐进式生成会话持久化，解决用户刷新丢失问题';
COMMENT ON TABLE analysis_reports IS 'P1功能增强：智能分析结果缓存，避免重复生成节省API成本';

-- 验证表创建成功
SELECT 'progressive_sessions' as table_name, COUNT(*) as row_count FROM progressive_sessions
UNION ALL
SELECT 'analysis_reports' as table_name, COUNT(*) as row_count FROM analysis_reports;
