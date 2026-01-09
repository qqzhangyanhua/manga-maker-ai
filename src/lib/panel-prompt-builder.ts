/**
 * 分镜提示词构建器
 * 负责从分镜数据构建高质量的生成提示词
 */

import type { Panel, Character, Scene } from "@prisma/client";

export interface PromptBuildOptions {
  /**
   * 基础提示词来源
   * 优先级: description > visual_prompt > prompt_used
   */
  preferredSource?: "description" | "visual_prompt" | "prompt_used";
  
  /**
   * 是否包含镜头语言
   */
  includeCameraInfo?: boolean;
  
  /**
   * 是否包含风格指令
   */
  includeStyleInstructions?: boolean;
  
  /**
   * 自定义风格描述
   */
  customStyle?: string;
  
  /**
   * 是否包含角色一致性指令
   */
  includeConsistencyInstructions?: boolean;
}

/**
 * 从分镜数据构建基础提示词
 */
export function buildBasePrompt(
  panel: Panel,
  options: PromptBuildOptions = {}
): string {
  const { preferredSource = "description" } = options;
  
  // 根据优先级选择基础提示词
  let basePrompt = "";
  
  switch (preferredSource) {
    case "description":
      basePrompt = panel.description || panel.visual_prompt || panel.prompt_used || "";
      break;
    case "visual_prompt":
      basePrompt = panel.visual_prompt || panel.description || panel.prompt_used || "";
      break;
    case "prompt_used":
      // ⚠️ 不推荐：prompt_used 可能包含增强指令
      basePrompt = panel.prompt_used || panel.description || panel.visual_prompt || "";
      break;
  }
  
  // 清理可能存在的旧增强指令
  basePrompt = cleanEnhancedInstructions(basePrompt);
  
  return basePrompt.trim();
}

/**
 * 清理已增强的指令（避免重复增强）
 */
function cleanEnhancedInstructions(prompt: string): string {
  // 移除之前添加的增强指令
  const patterns = [
    /\n\nCharacters in this scene:.*$/s,
    /\n\nImportant: Please generate.*$/s,
    /\n\nArt style:.*$/s,
    /\n\nCamera:.*$/s,
    /\n\nStyle:.*$/s,
  ];
  
  let cleaned = prompt;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  
  return cleaned.trim();
}

/**
 * 添加镜头语言信息
 */
export function addCameraInfo(
  prompt: string,
  panel: Panel
): string {
  const cameraInfo: string[] = [];
  
  // 景别 (shot_size)
  if (panel.shot_size) {
    const shotSizeMap: Record<string, string> = {
      "特写": "Close-up shot",
      "近景": "Medium close-up shot",
      "中景": "Medium shot",
      "全景": "Full shot",
      "远景": "Long shot",
    };
    cameraInfo.push(shotSizeMap[panel.shot_size] || panel.shot_size);
  }
  
  // 镜头角度 (camera_angle)
  if (panel.camera_angle) {
    const angleMap: Record<string, string> = {
      "平视": "eye-level angle",
      "俯视": "high angle",
      "仰视": "low angle",
      "鸟瞰": "bird's eye view",
      "动态": "dynamic angle",
    };
    cameraInfo.push(angleMap[panel.camera_angle] || panel.camera_angle);
  }
  
  // 镜头运动 (camera_movement)
  if (panel.camera_movement && panel.camera_movement !== "static") {
    const movementMap: Record<string, string> = {
      "zoom": "zooming",
      "pan_left": "panning left",
      "pan_right": "panning right",
      "pull_out": "pulling out",
      "push_in": "pushing in",
    };
    cameraInfo.push(movementMap[panel.camera_movement] || panel.camera_movement);
  }
  
  if (cameraInfo.length > 0) {
    return `${prompt}\n\nCamera: ${cameraInfo.join(", ")}`;
  }
  
  return prompt;
}

/**
 * 添加角色信息
 */
export function addCharacterInfo(
  prompt: string,
  characters: Character[]
): string {
  if (characters.length === 0) {
    return prompt;
  }
  
  const characterNames = characters.map((c) => c.name).join(", ");
  return `${prompt}\n\nCharacters in this scene: ${characterNames}`;
}

/**
 * 添加风格一致性指令
 */
export function addStyleInstructions(
  prompt: string,
  options: {
    hasReferenceImages: boolean;
    customStyle?: string;
  }
): string {
  let enhanced = prompt;
  
  // 添加风格描述
  const style = options.customStyle || "Japanese manga/comic style";
  enhanced += `\n\nArt style: ${style}`;
  
  // 如果有参考图，添加一致性指令
  if (options.hasReferenceImages) {
    enhanced += `\n\nImportant: Please generate the image in the EXACT SAME STYLE as the reference images provided. `;
    enhanced += `Maintain consistent character appearance, art style, line work, and color palette. `;
    enhanced += `The characters should look identical to their reference images.`;
  }
  
  return enhanced;
}

/**
 * 完整的提示词构建流程
 */
export function buildCompletePrompt(
  panel: Panel,
  characters: Character[],
  options: PromptBuildOptions & {
    hasReferenceImages: boolean;
  }
): string {
  const {
    preferredSource = "description",
    includeCameraInfo = true,
    includeStyleInstructions = true,
    includeConsistencyInstructions = true,
    customStyle,
    hasReferenceImages = false,
  } = options;
  
  // 1. 构建基础提示词
  let prompt = buildBasePrompt(panel, { preferredSource });
  
  // 2. 添加镜头语言
  if (includeCameraInfo) {
    prompt = addCameraInfo(prompt, panel);
  }
  
  // 3. 添加角色信息
  if (characters.length > 0) {
    prompt = addCharacterInfo(prompt, characters);
  }
  
  // 4. 添加风格指令
  if (includeStyleInstructions) {
    prompt = addStyleInstructions(prompt, {
      hasReferenceImages,
      customStyle,
    });
  }
  
  return prompt;
}

/**
 * 从描述中提取角色名称（辅助函数）
 */
export function extractCharacterNames(description: string): string[] {
  // 简单的中文人名匹配
  const namePattern = /([一-龥]{2,4}(?:先生|女士|小姐|侠客)?)/g;
  const matches = description.match(namePattern) || [];
  
  // 去重
  return Array.from(new Set(matches));
}

/**
 * 验证提示词质量
 */
export function validatePrompt(prompt: string): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // 检查长度
  if (prompt.length < 20) {
    warnings.push("提示词过短，可能导致生成效果不佳");
    suggestions.push("添加更多场景细节描述");
  }
  
  if (prompt.length > 1000) {
    warnings.push("提示词过长，可能被截断");
    suggestions.push("简化描述，保留关键信息");
  }
  
  // 检查是否包含角色
  if (!prompt.includes("Characters")) {
    suggestions.push("考虑添加角色信息以提高一致性");
  }
  
  // 检查是否包含风格
  if (!prompt.includes("style") && !prompt.includes("Style")) {
    suggestions.push("添加风格描述以保持视觉统一");
  }
  
  // 检查重复指令
  const instructionCount = (prompt.match(/Important:/g) || []).length;
  if (instructionCount > 1) {
    warnings.push("检测到重复的增强指令");
    suggestions.push("使用 cleanEnhancedInstructions 清理提示词");
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
}
