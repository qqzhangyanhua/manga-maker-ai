/**
 * 表情生成服务
 * 为角色生成 9 种表情矩阵
 */

import { callImageGenerationByType } from "./image-generation";

// 9 种表情类型
export const EXPRESSION_TYPES = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "surprised",
  "shy",
  "confident",
  "worried",
  "determined",
] as const;

export type ExpressionType = typeof EXPRESSION_TYPES[number];

// 表情中英文映射
export const EXPRESSION_LABELS: Record<ExpressionType, string> = {
  neutral: "平静",
  happy: "开心",
  sad: "悲伤",
  angry: "愤怒",
  surprised: "惊讶",
  shy: "害羞",
  confident: "自信",
  worried: "担忧",
  determined: "坚定",
};

// 表情提示词模板
const EXPRESSION_PROMPTS: Record<ExpressionType, string> = {
  neutral: "neutral expression, calm face, natural look, relaxed",
  happy: "happy expression, smiling, bright eyes, cheerful, joyful",
  sad: "sad expression, downcast eyes, melancholic, tears, sorrowful",
  angry: "angry expression, furrowed brows, intense gaze, clenched teeth, fierce",
  surprised: "surprised expression, wide eyes, open mouth, shocked, amazed",
  shy: "shy expression, blushing, looking away, timid, embarrassed",
  confident: "confident expression, determined eyes, smirk, self-assured, bold",
  worried: "worried expression, concerned look, furrowed brows, anxious, nervous",
  determined: "determined expression, focused eyes, serious face, resolute, strong-willed",
};

/**
 * 生成单个表情
 * 
 * @param characterDescription 角色描述
 * @param expressionType 表情类型
 * @param providerType Provider 类型（默认 "image_generation"）
 * @returns base64 编码的图片
 */
export async function generateExpression(
  characterDescription: string,
  expressionType: ExpressionType,
  providerType: string = "image_generation"
): Promise<string> {
  // 构建表情提示词
  const expressionPrompt = EXPRESSION_PROMPTS[expressionType];
  const fullPrompt = `${characterDescription}, ${expressionPrompt}, portrait, upper body, character portrait, anime style, detailed face, clean background, professional character design, 8k, ultra detailed`;

  const negativePrompt = `full body, blurry, low quality, distorted, multiple characters, inconsistent style, cropped body, background elements, text, watermark, signature`;

  // 调用图片生成 API
  const result = await callImageGenerationByType({
    providerType,
    prompt: fullPrompt,
    negative_prompt: negativePrompt,
    width: 512,
    height: 512, // 方形，适合表情
    steps: 25,
    cfg_scale: 7.5,
  });

  if (!result.success || result.images.length === 0) {
    throw new Error(
      `表情生成失败（${EXPRESSION_LABELS[expressionType]}）: ${result.error || "未知错误"}`
    );
  }

  return result.images[0];
}

/**
 * 批量生成所有表情
 * 
 * @param characterDescription 角色描述
 * @param providerType Provider 类型
 * @returns 所有表情的 base64 图片
 */
export async function generateAllExpressions(
  characterDescription: string,
  providerType: string = "image_generation"
): Promise<Record<ExpressionType, string>> {
  // 并行生成所有表情
  const results = await Promise.all(
    EXPRESSION_TYPES.map((expType) =>
      generateExpression(characterDescription, expType, providerType)
    )
  );

  // 构建返回对象
  const expressions: Record<string, string> = {};
  EXPRESSION_TYPES.forEach((expType, index) => {
    expressions[expType] = results[index];
  });

  return expressions as Record<ExpressionType, string>;
}

/**
 * 生成指定的多个表情
 * 
 * @param characterDescription 角色描述
 * @param expressionTypes 要生成的表情类型数组
 * @param providerType Provider 类型
 * @returns 指定表情的 base64 图片
 */
export async function generateMultipleExpressions(
  characterDescription: string,
  expressionTypes: ExpressionType[],
  providerType: string = "image_generation"
): Promise<Record<ExpressionType, string>> {
  // 并行生成指定表情
  const results = await Promise.all(
    expressionTypes.map((expType) =>
      generateExpression(characterDescription, expType, providerType)
    )
  );

  // 构建返回对象
  const expressions: Record<string, string> = {};
  expressionTypes.forEach((expType, index) => {
    expressions[expType] = results[index];
  });

  return expressions as Record<ExpressionType, string>;
}

/**
 * 使用队列系统生成单个表情 (异步)
 */
import { generateImage, waitForTaskCompletion } from "./unified-image-generation";

export async function generateExpressionAsync(
  characterDescription: string,
  expressionType: ExpressionType,
  userId: string,
  wait: boolean = false
): Promise<{ taskId: string; imageUrl?: string }> {
  const expressionPrompt = EXPRESSION_PROMPTS[expressionType];
  const fullPrompt = `${characterDescription}, ${expressionPrompt}, portrait, upper body, character portrait, anime style, detailed face, clean background, professional character design, 8k, ultra detailed`;

  const { taskId, status } = await generateImage(
    "expression",
    fullPrompt,
    userId,
    {
      negativePrompt: `full body, blurry, low quality, distorted, multiple characters, inconsistent style, cropped body, background elements, text, watermark, signature`,
      width: 512,
      height: 512,
      metadata: { expressionType, characterDescription },
    }
  );

  if (wait) {
    const result = await waitForTaskCompletion(taskId, 60000);
    if (result.status === "completed") {
      return { taskId, imageUrl: result.imageUrl };
    } else if (result.status === "failed") {
      throw new Error(result.error || "Expression generation failed");
    }
  }

  return { taskId, imageUrl: status.imageUrl };
}

/**
 * 使用队列系统批量生成表情 (异步)
 */
export async function generateAllExpressionsAsync(
  characterDescription: string,
  userId: string
): Promise<Record<ExpressionType, string>> {
  const taskIds: Record<string, string> = {};

  // 提交所有任务到队列
  for (const expType of EXPRESSION_TYPES) {
    const { taskId } = await generateExpressionAsync(
      characterDescription,
      expType,
      userId,
      false
    );
    taskIds[expType] = taskId;
  }

  return taskIds as Record<ExpressionType, string>;
}
