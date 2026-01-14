-- 章节质量评分表（AI 评估）
CREATE TABLE IF NOT EXISTS quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL UNIQUE,
  overall_score SMALLINT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  dimensions JSONB NOT NULL,
  suggestions JSONB,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzer_version VARCHAR(50) NOT NULL DEFAULT '1.0',

  CONSTRAINT fk_quality_scores_version
    FOREIGN KEY (version_id)
    REFERENCES novel_chapter_versions(id)
    ON DELETE CASCADE
);

-- 添加索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_quality_scores_version ON quality_scores(version_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_overall_score ON quality_scores(overall_score);

-- 添加注释
COMMENT ON TABLE quality_scores IS '章节质量评分表 - AI多维度评估';
COMMENT ON COLUMN quality_scores.overall_score IS '总体评分 1-100';
COMMENT ON COLUMN quality_scores.dimensions IS 'JSON格式多维度评分: readability, emotional_depth, pacing, originality, coherence';
COMMENT ON COLUMN quality_scores.suggestions IS 'JSON格式改进建议数组';
COMMENT ON COLUMN quality_scores.analyzer_version IS '评分算法版本号（用于追踪模型变化）';
