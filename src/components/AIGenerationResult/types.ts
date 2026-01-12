/**
 * AI 生成结果增强类型定义
 */

/**
 * AI 推理依据
 */
export interface AIReasoning {
  /**
   * 参考作品
   */
  references?: string[];

  /**
   * 考虑因素
   */
  considerations?: string[];

  /**
   * 使用的写作技巧
   */
  techniques?: string[];

  /**
   * 遵循的故事原则
   */
  principles?: string[];
}

/**
 * AI 生成结果（增强版）
 */
export interface AIGenerationResult {
  /**
   * 生成的内容
   */
  content: string;

  /**
   * AI 推理过程
   */
  reasoning?: AIReasoning;

  /**
   * 置信度 (0-1)
   */
  confidence?: number;

  /**
   * 替代方案
   */
  alternatives?: AIGenerationAlternative[];

  /**
   * 使用的模型和参数
   */
  metadata?: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

/**
 * 替代方案
 */
export interface AIGenerationAlternative {
  id: string;
  title: string;
  preview: string;
  reasoning?: string;
}

/**
 * 流式生成状态
 */
export interface StreamingGenerationState {
  isStreaming: boolean;
  accumulatedContent: string;
  reasoning?: AIReasoning;
  error?: string;
}
