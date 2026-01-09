/**
 * AI 角色推荐系统类型定义
 * Phase 2.1
 */

import type { CharacterRole } from "@/components/character/RoleSelector";

/**
 * 推荐优先级
 */
export type RecommendationPriority = "high" | "medium" | "low";

/**
 * 单个角色推荐
 */
export interface CharacterRecommendation {
  role: CharacterRole;
  reason: string; // 推荐理由（中文）
  suggested_description: string; // AI 生成的典型角色描述（中文）
  priority: RecommendationPriority;
}

/**
 * 角色类型分布
 */
export interface CharacterDistribution {
  protagonist: number;
  antagonist: number;
  supporting: number;
  minor: number;
}

/**
 * AI 推荐响应
 */
export interface RecommendCharactersResponse {
  recommendations: CharacterRecommendation[];
  current_distribution: CharacterDistribution;
  story_summary: string; // 剧本摘要（用于上下文）
}
