/**
 * Lighting Presets - Definitions and utilities for scene lighting effects
 */

export type LightingPreset =
  | "golden_hour"       // 黄金时段（日出/日落）
  | "harsh_midday"      // 正午强光
  | "soft_diffused"     // 柔和漫射光
  | "dramatic_rim"      // 戏剧性边缘光
  | "neon_night"        // 霓虹夜景
  | "moonlight"         // 月光
  | "studio"            // 摄影棚光
  | "natural_window"    // 自然窗光
  | "none";             // 无特殊光效

export interface LightingPresetDefinition {
  key: LightingPreset;
  name_zh: string;
  name_en: string;
  description: string;
  promptModifier: string;        // 光效提示词片段
  suitableSceneTypes: string[];  // 适合的场景类型
  moodTags: string[];            // 氛围标签
  exampleImage?: string;         // 示例图片URL（可选）
}

export const LIGHTING_PRESETS: LightingPresetDefinition[] = [
  {
    key: "golden_hour",
    name_zh: "黄金时段",
    name_en: "Golden Hour",
    description: "日出/日落时的温暖柔和光线，营造浪漫温馨氛围",
    promptModifier: "golden hour lighting, warm orange and pink tones, soft shadows, rim lighting from low sun, cinematic glow",
    suitableSceneTypes: ["outdoor", "urban", "nature"],
    moodTags: ["romantic", "nostalgic", "peaceful"]
  },
  {
    key: "harsh_midday",
    name_zh: "正午强光",
    name_en: "Harsh Midday",
    description: "烈日当空，强烈阴影对比，适合表现酷热或紧张",
    promptModifier: "harsh midday sun, strong overhead light, deep sharp shadows, high contrast, intense brightness",
    suitableSceneTypes: ["outdoor", "urban", "nature"],
    moodTags: ["intense", "oppressive", "stark"]
  },
  {
    key: "soft_diffused",
    name_zh: "柔和漫射",
    name_en: "Soft Diffused",
    description: "阴天或室内柔光，阴影柔和，适合日常场景",
    promptModifier: "soft diffused lighting, even illumination, minimal shadows, gentle ambient light, overcast sky softness",
    suitableSceneTypes: ["indoor", "outdoor", "daily"],
    moodTags: ["calm", "everyday", "comfortable"]
  },
  {
    key: "dramatic_rim",
    name_zh: "戏剧边缘光",
    name_en: "Dramatic Rim Light",
    description: "背光勾勒轮廓，制造神秘或史诗感",
    promptModifier: "dramatic rim lighting, strong backlight, silhouette edges, chiaroscuro, high contrast between light and shadow",
    suitableSceneTypes: ["indoor", "fantasy", "action"],
    moodTags: ["dramatic", "mysterious", "epic"]
  },
  {
    key: "neon_night",
    name_zh: "霓虹夜景",
    name_en: "Neon Night",
    description: "赛博朋克风格彩色霓虹光，营造未来感",
    promptModifier: "neon night lighting, vibrant electric colors (blue, pink, purple), glowing signs, reflective wet surfaces, cyberpunk atmosphere",
    suitableSceneTypes: ["urban", "scifi", "night"],
    moodTags: ["futuristic", "vibrant", "edgy"]
  },
  {
    key: "moonlight",
    name_zh: "月光",
    name_en: "Moonlight",
    description: "冷色调月光，营造静谧或诡异氛围",
    promptModifier: "moonlight illumination, cool blue-silver tones, soft ethereal glow, long shadows, nighttime ambiance",
    suitableSceneTypes: ["outdoor", "fantasy", "night"],
    moodTags: ["serene", "eerie", "mystical"]
  },
  {
    key: "studio",
    name_zh: "摄影棚光",
    name_en: "Studio Lighting",
    description: "均匀专业照明，适合角色特写或对话",
    promptModifier: "studio lighting setup, three-point lighting, controlled illumination, clean professional look, minimal environmental shadows",
    suitableSceneTypes: ["indoor", "portrait"],
    moodTags: ["professional", "clean", "focused"]
  },
  {
    key: "natural_window",
    name_zh: "自然窗光",
    name_en: "Natural Window Light",
    description: "侧窗自然光，适合室内情感场景",
    promptModifier: "natural window light, soft directional lighting from side, gentle falloff, indoor ambient glow, realistic interior lighting",
    suitableSceneTypes: ["indoor", "daily"],
    moodTags: ["intimate", "realistic", "cozy"]
  },
  {
    key: "none",
    name_zh: "无预设",
    name_en: "None",
    description: "不应用特定光效预设",
    promptModifier: "",
    suitableSceneTypes: [],
    moodTags: []
  }
];

/**
 * Get lighting preset definition by key
 */
export function getLightingPreset(key: LightingPreset): LightingPresetDefinition | undefined {
  return LIGHTING_PRESETS.find((preset) => preset.key === key);
}

export function isLightingPreset(value: string | null | undefined): value is LightingPreset {
  if (!value) return false;
  return LIGHTING_PRESETS.some((preset) => preset.key === value);
}

/**
 * Get prompt modifier for lighting preset
 * @param key Lighting preset key
 * @returns Prompt modifier string for AI image generation
 */
export function getLightingPromptModifier(key?: LightingPreset | null): string {
  if (!key || key === "none") return "";
  const preset = getLightingPreset(key);
  return preset?.promptModifier || "";
}

/**
 * Get suitable lighting presets for a scene type
 * @param sceneType Scene type (e.g., "indoor", "outdoor", "urban")
 * @returns Array of suitable lighting presets
 */
export function getSuitableLightingPresets(sceneType: string): LightingPresetDefinition[] {
  return LIGHTING_PRESETS.filter(preset =>
    preset.suitableSceneTypes.includes(sceneType)
  );
}

/**
 * Get lighting presets by mood tag
 * @param moodTag Mood tag (e.g., "romantic", "dramatic")
 * @returns Array of matching lighting presets
 */
export function getLightingPresetsByMood(moodTag: string): LightingPresetDefinition[] {
  return LIGHTING_PRESETS.filter(preset =>
    preset.moodTags.includes(moodTag)
  );
}
