/**
 * 表情生成服务
 * 为角色生成 9 种表情矩阵
 */

import { callImageGenerationByType, type ImageGenerationOptions } from "./image-generation";
import {
  EXPRESSION_TYPES,
  EXPRESSION_LABELS,
  EXPRESSION_PROMPTS,
  type ExpressionType,
} from "@/constants/expression-types";

// 重新导出常量，保持向后兼容
export { EXPRESSION_TYPES, EXPRESSION_LABELS, type ExpressionType };

/**
 * 生成单个表情
 *
 * @param characterDescription 角色描述
 * @param expressionType 表情类型
 * @param providerType Provider 类型（默认 "image_generation"）
 * @param referenceImageUrl 可选的参考图URL
 * @param options 图片生成选项（包含 userId）
 * @returns base64 编码的图片
 */
export async function generateExpression(
  characterDescription: string,
  expressionType: ExpressionType,
  providerType: string = "image_generation",
  referenceImageUrl?: string,
  options?: ImageGenerationOptions
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
    referenceImageUrl, // 传递参考图
    options, // 传递选项（包含 userId）
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
 * @param referenceImageUrl 可选的参考图URL
 * @param options 图片生成选项（包含 userId）
 * @returns 所有表情的 base64 图片
 */
export async function generateAllExpressions(
  characterDescription: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string,
  options?: ImageGenerationOptions
): Promise<Record<ExpressionType, string>> {
  // 并行生成所有表情
  const results = await Promise.all(
    EXPRESSION_TYPES.map((expType) =>
      generateExpression(characterDescription, expType, providerType, referenceImageUrl, options)
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
 * @param referenceImageUrl 可选的参考图URL
 * @param options 图片生成选项（包含 userId）
 * @returns 指定表情的 base64 图片
 */
export async function generateMultipleExpressions(
  characterDescription: string,
  expressionTypes: ExpressionType[],
  providerType: string = "image_generation",
  referenceImageUrl?: string,
  options?: ImageGenerationOptions
): Promise<Record<ExpressionType, string>> {
  // 并行生成指定表情
  const results = await Promise.all(
    expressionTypes.map((expType) =>
      generateExpression(characterDescription, expType, providerType, referenceImageUrl, options)
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
