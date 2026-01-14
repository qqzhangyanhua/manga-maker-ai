/**
 * 版本管理相关类型定义
 */

export interface DimensionScore {
  score: number; // 0-100
  details: string;
}

export interface QualityDimensions {
  readability: DimensionScore;
  emotional_depth: DimensionScore;
  pacing: DimensionScore;
  originality: DimensionScore;
  coherence: DimensionScore;
}

export interface ImprovementSuggestion {
  dimension: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
}

export interface QualityScore {
  id: string;
  version_id: string;
  overall_score: number; // 0-100
  dimensions: QualityDimensions;
  suggestions: ImprovementSuggestion[];
  analyzed_at: string;
  analyzer_version: string;
}

export interface ChapterVersion {
  id: string;
  chapter_id: string;
  version_number: number;
  content: string;
  word_count: number;
  prompt_used: string | null;
  model_used: string | null;
  temperature: number | null;
  is_selected: boolean;
  user_rating: number | null; // 1-5
  notes: string | null;
  created_at: string;
  quality_score: QualityScore | null;
}

export interface CreateVersionRequest {
  content: string;
  prompt_used?: string;
  model_used?: string;
  temperature?: number;
  notes?: string;
  auto_analyze?: boolean;
}

export interface UpdateVersionRequest {
  is_selected?: boolean;
  user_rating?: number;
  notes?: string;
}

export interface VersionComparisonRequest {
  version_ids: string[];
}

export interface TextDiff {
  type: "added" | "removed" | "unchanged";
  text: string;
}

export interface VersionComparisonResponse {
  versions: ChapterVersion[];
  text_diff: TextDiff[] | null;
  score_comparison: Record<string, unknown> | null;
  ai_recommendation: string | null;
}
