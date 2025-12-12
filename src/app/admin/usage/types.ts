/**
 * 用量统计与生成日志相关类型定义
 */

export type UsageStat = {
  id: number;
  user_id: string;
  action: string;
  provider_type: string | null;
  date: string;
  count: number;
  last_used_at: string;
};

export type GenerationLog = {
  id: string;
  user_id: string;
  project_id: string | null;
  action: string;
  provider_type: string | null;
  status: string;
  duration_ms: number | null;
  created_at: string;
  error_message: string | null;
};

export const actionLabels: Record<string, string> = {
  storyboard_generation: "分镜生成",
  image_generation: "图像生成",
  llm_chat: "聊天/LLM",
};
