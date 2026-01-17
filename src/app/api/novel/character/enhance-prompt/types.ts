/**
 * 提示词强化 API 类型定义
 */

/**
 * 请求参数
 */
export interface EnhancePromptRequest {
  characterName: string;
  characterDescription: string;
  traits?: string[];
  basePrompt?: string;
}

/**
 * 响应结果
 */
export interface EnhancePromptResponse {
  success: boolean;
  enhancedPrompt: string;
  suggestions: string[];
  message: string;
}
