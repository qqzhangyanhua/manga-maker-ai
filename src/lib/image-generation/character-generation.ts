/**
 * 角色图片生成工具函数
 * 包含三视图生成、姿势变体生成等专用功能
 */

import type { ImageGenerationOptions } from "./types";
import { callImageGenerationByType } from "./core";

/**
 * 生成角色视图（支持生成部分或全部视图）
 * @param characterDescription 角色描述
 * @param providerType 提供商类型
 * @param referenceImageUrl 参考图URL（可选）
 * @param viewTypes 要生成的视图类型数组，默认生成全部三个视图
 * @param userId 用户ID（可选，用于记录日志。注意：调用方应该已经扣除算力）
 * @returns 生成的视图图片（base64）和对应的提示词
 */
export async function generateCharacterViews(
  characterDescription: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string,
  viewTypes: string[] = ['front', 'side', 'back'],
  userId?: string
): Promise<{
  views: Record<string, string>;
  prompts: Record<string, string>;
}> {
  // 验证 viewTypes
  const validViewTypes = ['front', 'side', 'back'];
  const requestedViews = viewTypes.filter(v => validViewTypes.includes(v));

  if (requestedViews.length === 0) {
    throw new Error('至少需要指定一个有效的视图类型: front, side, back');
  }

  // 构建三视图提示词 - 根据是否有参考图采用不同策略
  let basePrompt: string;
  let negativePrompt: string;
  const allPrompts: Record<string, string> = {};

  if (referenceImageUrl) {
    // 【有参考图模式】提示词极简，强调严格遵循参考图
    console.log('\n========== 视图生成策略：参考图模式 ==========');
    console.log(`参考图: ${referenceImageUrl}`);
    console.log(`要生成的视图: ${requestedViews.join(', ')}`);
    console.log(`策略: 极简提示词，强调保持角色一致性`);
    console.log('==============================================\n');

    // 核心指令：必须与参考图一致
    const coreInstruction = [
      `IMPORTANT: You must draw the EXACT SAME character shown in the reference image.`,
      `Keep everything identical: face, facial features, body type, proportions, art style, colors, hair, eyes.`,
      `Character turnaround sheet, T-pose standing, full body, clean white background.`,
      `Do NOT change the character's appearance, face, or style.`
    ].join(" ");

    allPrompts.front = `${coreInstruction} Front view, facing forward, straight ahead, centered, symmetrical.`;
    allPrompts.side = `${coreInstruction} Side view, 90 degree profile, lateral view.`;
    allPrompts.back = `${coreInstruction} Back view, rear view, from behind.`;

    // 负面提示词：防止偏离参考图
    negativePrompt = `different character, altered face, changed facial features, different body type, different art style, modified proportions, different person, multiple characters, inconsistent style, different poses, sitting, action pose, blurry, low quality, bad anatomy, cropped, background elements, text, watermark`;
  } else {
    // 【无参考图模式】需要详细描述
    console.log('\n========== 视图生成策略：纯文本模式 ==========');
    console.log(`角色描述: ${characterDescription}`);
    console.log(`要生成的视图: ${requestedViews.join(', ')}`);
    console.log(`策略: 详细提示词，包含画质和风格描述`);
    console.log('==============================================\n');

    basePrompt = `${characterDescription}, character turnaround reference sheet, T-pose standing, full body, clean white background, professional character design, anime style, consistent detailed appearance, sharp focus, high quality illustration, character model sheet, reference design`;

    allPrompts.front = `${basePrompt}, front view, facing forward, straight ahead, centered composition, symmetrical`;
    allPrompts.side = `${basePrompt}, side view, 90 degree profile, side angle, lateral view, side perspective`;
    allPrompts.back = `${basePrompt}, back view, rear view, from behind, backside, posterior view`;

    negativePrompt = `blurry, low quality, distorted, deformed, ugly, bad anatomy, multiple characters, inconsistent style, cropped, background elements, scenery, text, watermark, signature, logo, different poses, sitting, action pose`;
  }

  // 打印要生成的提示词
  console.log('\n========== 视图提示词 ==========');
  requestedViews.forEach(viewType => {
    console.log(`【${viewType === 'front' ? '正面' : viewType === 'side' ? '侧面' : '背面'}】`);
    console.log(allPrompts[viewType]);
    console.log('');
  });
  console.log('【负面提示词】');
  console.log(negativePrompt);
  console.log('==================================\n');

  // 并行生成请求的视图
  // 注意：如果调用方已经扣除算力，应该传递 skipCreditsCheck=true 避免重复扣除
  const generationPromises = requestedViews.map(viewType =>
    callImageGenerationByType({
      providerType,
      prompt: allPrompts[viewType],
      negative_prompt: negativePrompt,
      width: 512,
      height: 768, // 3:4 比例，适合全身人物
      steps: 25,
      cfg_scale: 7.5,
      referenceImageUrl,
      options: { skipCreditsCheck: true }, // 调用方已扣除算力，跳过重复扣除
    }).then(result => ({ viewType, result }))
  );

  const results = await Promise.all(generationPromises);

  // 处理结果
  const views: Record<string, string> = {};
  const prompts: Record<string, string> = {};

  for (const { viewType, result } of results) {
    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(`${viewType} 视图生成失败: ${result.error || '未从响应中提取到图片数据'}`);
    }
    views[viewType] = result.images[0];
    prompts[viewType] = allPrompts[viewType];
  }

  return { views, prompts };
}

/**
 * 生成三视图（保持向后兼容）
 * @param characterDescription 角色描述
 * @param providerType 提供商类型
 * @param referenceImageUrl 参考图URL（可选）
 * @param userId 用户ID（可选，用于记录日志。注意：调用方应该已经扣除算力）
 * @deprecated 建议使用 generateCharacterViews 以获得更灵活的控制
 */
export async function generateThreeViews(
  characterDescription: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string,
  userId?: string
): Promise<{
  front: string;
  side: string;
  back: string;
  prompts: {
    front: string;
    side: string;
    back: string;
  };
}> {
  // 调用新的灵活函数，生成全部三个视图
  const result = await generateCharacterViews(
    characterDescription,
    providerType,
    referenceImageUrl,
    ['front', 'side', 'back'],
    userId
  );

  // 转换返回格式以保持向后兼容
  return {
    front: result.views.front,
    side: result.views.side,
    back: result.views.back,
    prompts: {
      front: result.prompts.front,
      side: result.prompts.side,
      back: result.prompts.back,
    },
  };
}

/**
 * 生成角色姿势变体（专门用于生成特定姿势的角色图片）
 * 与 generateCharacterViews 不同：
 * - 不强制 T-pose 站姿
 * - 不排除动作姿势
 * - 专注于单一姿势的生成
 *
 * @param characterDescription 角色描述
 * @param poseDescription 姿势描述（如"思考姿势，一只手托着下巴"）
 * @param providerType 图片生成模型类型
 * @param referenceImageUrl 可选的参考图URL
 * @param options 图片生成选项（包含 userId）
 * @returns 生成的图片（base64）和使用的提示词
 */
export async function generatePoseVariant(
  characterDescription: string,
  poseDescription: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string,
  options?: ImageGenerationOptions
): Promise<{
  image: string;
  prompt: string;
}> {
  console.log('\n========== 姿势变体生成 ==========');
  console.log(`角色描述: ${characterDescription}`);
  console.log(`姿势描述: ${poseDescription}`);
  console.log(`参考图: ${referenceImageUrl || '无'}`);
  console.log('====================================\n');

  let fullPrompt: string;
  let negativePrompt: string;

  if (referenceImageUrl) {
    // 【有参考图模式】参考三视图策略，强调保持角色一致性
    console.log('策略: 参考图模式 - 严格保持角色外观，仅改变姿势');

    // 核心指令：参考三视图的严格一致性要求
    const coreInstruction = [
      `IMPORTANT: You must draw the EXACT SAME character shown in the reference image.`,
      `Keep everything identical: face, facial features, body type, proportions, art style, colors, hair, eyes, clothing.`,
      `Do NOT change the character's appearance, face, style, or any visual details.`,
      `Only change: the pose/gesture of the character.`
    ].join(" ");

    fullPrompt = [
      coreInstruction,
      `Character pose: ${poseDescription}.`,
      `Full body shot, clean background, high quality, detailed, professional illustration.`
    ].join(' ');

    // 负面提示词：排除角色变化，但允许姿势变化
    negativePrompt = `different character, altered face, changed facial features, different body type, different art style, modified proportions, different person, different hair, different eyes, different clothing, multiple characters, inconsistent style, blurry, low quality, bad anatomy, cropped, text, watermark, signature`;

  } else {
    // 【无参考图模式】详细描述角色和姿势
    console.log('策略: 纯文本模式 - 详细描述角色和姿势');

    fullPrompt = [
      characterDescription,
      poseDescription,
      `full body shot, clean background,`,
      `professional character illustration, anime style,`,
      `detailed, high quality, sharp focus, consistent appearance`
    ].join(', ');

    // 只排除质量问题，不排除姿势变化
    negativePrompt = `multiple characters, blurry, low quality, distorted, deformed, ugly, bad anatomy, cropped, text, watermark, signature`;
  }

  console.log('\n========== 生成提示词 ==========');
  console.log('【正面提示】');
  console.log(fullPrompt);
  console.log('\n【负面提示】');
  console.log(negativePrompt);
  console.log('=================================\n');

  // 调用图片生成
  const result = await callImageGenerationByType({
    providerType,
    prompt: fullPrompt,
    negative_prompt: negativePrompt,
    width: 512,
    height: 768, // 3:4 比例，适合全身人物
    steps: 25,
    cfg_scale: 7.5,
    referenceImageUrl,
    options,
  });

  if (!result.success || !result.images || result.images.length === 0) {
    throw new Error(`姿势变体生成失败: ${result.error || '未从响应中提取到图片数据'}`);
  }

  console.log('✅ 姿势变体生成成功\n');

  return {
    image: result.images[0],
    prompt: fullPrompt,
  };
}
