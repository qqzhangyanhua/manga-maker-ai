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

// 表情提示词模板 - 优化为更精确的描述
const EXPRESSION_PROMPTS: Record<ExpressionType, string> = {
  neutral: "neutral calm expression, peaceful face, natural relaxed look, soft eyes, gentle demeanor, serene",
  happy: "happy joyful expression, bright genuine smile, sparkling cheerful eyes, radiant face, delighted, beaming with joy",
  sad: "sad melancholic expression, downcast teary eyes, sorrowful face, dejected look, tears welling up, emotional sadness",
  angry: "angry fierce expression, furrowed angry brows, intense glaring eyes, clenched jaw, scowling face, showing anger",
  surprised: "surprised shocked expression, wide open eyes, raised eyebrows, open mouth, amazed look, astonished face",
  shy: "shy embarrassed expression, blushing cheeks, looking away bashfully, timid demeanor, flustered, coy smile",
  confident: "confident self-assured expression, determined sharp eyes, slight smirk, bold gaze, strong presence, assertive look",
  worried: "worried anxious expression, concerned furrowed brows, nervous eyes, troubled look, uneasy demeanor, apprehensive",
  determined: "determined resolute expression, focused intense eyes, serious stern face, unwavering gaze, strong-willed, firm expression",
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
  // 构建表情提示词 - 参考专业角色表情设计
  const expressionPrompt = EXPRESSION_PROMPTS[expressionType];
  const fullPrompt = `${characterDescription}, ${expressionPrompt}, portrait shot, upper body view, expressive character portrait, anime manga style, highly detailed facial features, clean simple background, professional character expression sheet, sharp focus, high quality illustration, emotional depth`;

  const negativePrompt = `full body, blurry, low quality, distorted, deformed, ugly, bad anatomy, bad hands, bad face, multiple characters, multiple faces, inconsistent style, cropped awkwardly, complex background, scenery, text, watermark, signature, logo, extra limbs`;

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
