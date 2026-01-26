/**
 * 分镜 Prompt 合成服务
 * 
 * 将角色身份证 Prompt、场景、动作等元素合成为最终的图像生成 Prompt
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { DEFAULT_NEGATIVE_PROMPT } from "@/types/character-prompt";

// 角色 Prompt 引用
export interface CharacterPromptRef {
  character_id: string;
  template_id: string;
  position_hint?: "left" | "center" | "right" | "foreground" | "background";
}

// 合成参数
export interface ComposePromptParams {
  shotDesignId: string;
  characterTemplateIds: string[];
  characterPositions?: Record<string, "left" | "center" | "right" | "foreground" | "background">;
  manualAdjustments?: string;
  userId: string;
}

// 合成结果
export interface ComposedPrompt {
  character_prompts: CharacterPromptRef[];
  scene_prompt: string;
  action_prompt: string;
  atmosphere_prompt: string;
  camera_prompt: string;
  final_prompt: string;
  final_negative_prompt: string;
}

// 摄像机角度映射
const CAMERA_ANGLE_PROMPTS: Record<string, string> = {
  eye_level: "eye level shot",
  high_angle: "high angle shot, looking down",
  low_angle: "low angle shot, looking up",
  bird_eye: "bird eye view, top-down",
  worm_eye: "worm eye view, extreme low angle",
  dutch_angle: "dutch angle, tilted frame",
};

// 景别映射
const SHOT_SIZE_PROMPTS: Record<string, string> = {
  extreme_close_up: "extreme close-up, detailed face",
  close_up: "close-up shot, head and shoulders",
  medium_shot: "medium shot, waist up",
  full_shot: "full body shot",
  long_shot: "long shot, environment visible",
  extreme_long_shot: "extreme long shot, establishing shot",
};

// 面板类型映射
const PANEL_TYPE_PROMPTS: Record<string, string> = {
  standard: "comic panel",
  splash: "splash page, dynamic composition",
  inset: "inset panel",
  borderless: "borderless panel, bleeding edges",
  multi_panel: "multi-panel composition",
};

/**
 * 构建摄像机/镜头 Prompt
 */
function buildCameraPrompt(
  cameraAngle: string,
  shotSize: string,
  panelType: string
): string {
  const parts: string[] = [];

  if (cameraAngle && CAMERA_ANGLE_PROMPTS[cameraAngle]) {
    parts.push(CAMERA_ANGLE_PROMPTS[cameraAngle]);
  }

  if (shotSize && SHOT_SIZE_PROMPTS[shotSize]) {
    parts.push(SHOT_SIZE_PROMPTS[shotSize]);
  }

  if (panelType && PANEL_TYPE_PROMPTS[panelType]) {
    parts.push(PANEL_TYPE_PROMPTS[panelType]);
  }

  return parts.join(", ");
}

/**
 * 构建角色位置提示
 */
function buildPositionHint(position?: string): string {
  if (!position) return "";

  const positionMap: Record<string, string> = {
    left: "positioned on the left side",
    center: "positioned in the center",
    right: "positioned on the right side",
    foreground: "in the foreground",
    background: "in the background",
  };

  return positionMap[position] || "";
}

/**
 * 从分镜描述中提取动作 Prompt
 */
function extractActionPrompt(
  shotDescription: string,
  compositionHint: string
): string {
  // 简单实现：直接使用描述
  // 实际项目中可以用 LLM 提取更精准的动作描述
  const parts: string[] = [];

  if (shotDescription) {
    parts.push(shotDescription);
  }

  if (compositionHint) {
    parts.push(compositionHint);
  }

  return parts.join(", ");
}

/**
 * 获取风格前缀 Prompt
 */
async function getStylePrompt(comicStyleId: string | null): Promise<string> {
  if (!comicStyleId) {
    return "manga style, detailed illustration";
  }

  const style = await prisma.comicStyle.findUnique({
    where: { id: comicStyleId },
  });

  if (!style) {
    return "manga style, detailed illustration";
  }

  // 组合风格 Prompt
  const parts: string[] = [];

  if (style.prompt_prefix) {
    parts.push(style.prompt_prefix);
  }

  if (style.name_en) {
    parts.push(`${style.name_en} style`);
  }

  return parts.join(", ") || "manga style, detailed illustration";
}

/**
 * 获取风格负面 Prompt（ComicStyle 没有 negative_prompt 字段，使用默认值）
 */
async function getStyleNegativePrompt(_comicStyleId: string | null): Promise<string> {
  // ComicStyle 模型没有 negative_prompt 字段，直接返回默认值
  return DEFAULT_NEGATIVE_PROMPT;
}

/**
 * 合成分镜 Prompt
 */
export async function composeShotPrompt(
  params: ComposePromptParams
): Promise<ComposedPrompt> {
  const { shotDesignId, characterTemplateIds, characterPositions, manualAdjustments, userId } = params;

  // 1. 获取分镜设计信息
  const shotDesign = await prisma.shotDesign.findUnique({
    where: { id: shotDesignId },
    include: {
      script_segment: {
        include: {
          timeline_chapter: {
            include: {
              timeline: true,
            },
          },
        },
      },
    },
  });

  if (!shotDesign) {
    throw new Error("分镜不存在");
  }

  // 2. 获取角色 Prompt 模板
  const characterTemplates = await prisma.characterPromptTemplate.findMany({
    where: {
      id: { in: characterTemplateIds },
      user_id: userId,
    },
  });

  if (characterTemplates.length !== characterTemplateIds.length) {
    throw new Error("部分角色 Prompt 模板不存在");
  }

  // 3. 构建角色 Prompt 引用
  const characterPrompts: CharacterPromptRef[] = characterTemplates.map((template) => ({
    character_id: template.character_id,
    template_id: template.id,
    position_hint: characterPositions?.[template.character_id],
  }));

  // 4. 构建各部分 Prompt
  const cameraPrompt = buildCameraPrompt(
    shotDesign.camera_angle,
    shotDesign.shot_size,
    shotDesign.panel_type
  );

  const actionPrompt = extractActionPrompt(
    shotDesign.shot_description,
    shotDesign.composition_hint
  );

  // 获取场景描述（从 script_segment）
  const scenePrompt = shotDesign.script_segment?.scene_description || "";

  // 获取氛围描述
  const atmospherePrompt = shotDesign.script_segment?.emotion_tone || "";

  // 5. 获取风格 Prompt
  const timelineConfig = shotDesign.script_segment?.timeline_chapter?.timeline?.config as Record<string, string> | null;
  const defaultStyleId = timelineConfig?.default_comic_style_id || null;
  const stylePrompt = await getStylePrompt(defaultStyleId);
  const styleNegativePrompt = await getStyleNegativePrompt(defaultStyleId);

  // 6. 合成最终 Prompt
  const promptParts: string[] = [];

  // 添加角色 Prompt（带位置提示）
  for (const template of characterTemplates) {
    const positionHint = buildPositionHint(characterPositions?.[template.character_id]);
    if (positionHint) {
      promptParts.push(`${template.full_prompt}, ${positionHint}`);
    } else {
      promptParts.push(template.full_prompt);
    }
  }

  // 添加场景 Prompt
  if (scenePrompt) {
    promptParts.push(scenePrompt);
  }

  // 添加动作 Prompt
  if (actionPrompt) {
    promptParts.push(actionPrompt);
  }

  // 添加氛围 Prompt
  if (atmospherePrompt) {
    promptParts.push(`${atmospherePrompt} atmosphere`);
  }

  // 添加摄像机 Prompt
  if (cameraPrompt) {
    promptParts.push(cameraPrompt);
  }

  // 添加风格 Prompt
  if (stylePrompt) {
    promptParts.push(stylePrompt);
  }

  // 添加用户手动调整
  if (manualAdjustments) {
    promptParts.push(manualAdjustments);
  }

  const finalPrompt = promptParts.filter(Boolean).join(", ");

  // 7. 合成负面 Prompt
  const negativePromptParts: string[] = [styleNegativePrompt];

  // 添加角色负面 Prompt
  for (const template of characterTemplates) {
    if (template.negative_prompt) {
      negativePromptParts.push(template.negative_prompt);
    }
  }

  // 去重
  const uniqueNegativePrompts = [...new Set(negativePromptParts.join(", ").split(", "))];
  const finalNegativePrompt = uniqueNegativePrompts.join(", ");

  return {
    character_prompts: characterPrompts,
    scene_prompt: scenePrompt,
    action_prompt: actionPrompt,
    atmosphere_prompt: atmospherePrompt,
    camera_prompt: cameraPrompt,
    final_prompt: finalPrompt,
    final_negative_prompt: finalNegativePrompt,
  };
}

/**
 * 保存 Prompt 合成记录到数据库
 */
export async function saveShotPromptComposition(
  shotDesignId: string,
  userId: string,
  composed: ComposedPrompt
): Promise<string> {
  // 创建或更新 Prompt 合成记录
  const existing = await prisma.shotPromptComposition.findFirst({
    where: { shot_design_id: shotDesignId },
  });

  if (existing) {
    // 更新现有记录
    await prisma.shotPromptComposition.update({
      where: { id: existing.id },
      data: {
        character_prompts: composed.character_prompts as unknown as Prisma.InputJsonValue,
        scene_prompt: composed.scene_prompt,
        action_prompt: composed.action_prompt,
        atmosphere_prompt: composed.atmosphere_prompt,
        camera_prompt: composed.camera_prompt,
        final_prompt: composed.final_prompt,
        final_negative_prompt: composed.final_negative_prompt,
        updated_at: new Date(),
      },
    });

    // 更新分镜状态
    await prisma.shotDesign.update({
      where: { id: shotDesignId },
      data: {
        prompt_composition_id: existing.id,
        final_prompt_status: "completed",
        character_prompt_template_ids: composed.character_prompts.map((cp) => cp.template_id),
      },
    });

    return existing.id;
  } else {
    // 创建新记录
    const composition = await prisma.shotPromptComposition.create({
      data: {
        shot_design_id: shotDesignId,
        user_id: userId,
        character_prompts: composed.character_prompts as unknown as Prisma.InputJsonValue,
        scene_prompt: composed.scene_prompt,
        action_prompt: composed.action_prompt,
        atmosphere_prompt: composed.atmosphere_prompt,
        camera_prompt: composed.camera_prompt,
        final_prompt: composed.final_prompt,
        final_negative_prompt: composed.final_negative_prompt,
      },
    });

    // 更新分镜关联
    await prisma.shotDesign.update({
      where: { id: shotDesignId },
      data: {
        prompt_composition_id: composition.id,
        final_prompt_status: "completed",
        character_prompt_template_ids: composed.character_prompts.map((cp) => cp.template_id),
      },
    });

    return composition.id;
  }
}

/**
 * 更新角色 Prompt 模板使用计数
 */
export async function incrementTemplateUsageCount(templateIds: string[]): Promise<void> {
  if (templateIds.length === 0) return;

  await prisma.characterPromptTemplate.updateMany({
    where: { id: { in: templateIds } },
    data: { usage_count: { increment: 1 } },
  });
}
