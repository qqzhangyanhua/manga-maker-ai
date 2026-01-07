/**
 * Type definitions for Suggested Scenes feature
 * Two-step background generation: AI analysis → User review → Image generation
 */

// Scene analysis result from LLM
export interface AnalyzedScene {
  name: string; // Scene name in Chinese (e.g., "夕阳下的操场")
  description: string; // Detailed Chinese description (100-200 chars)
  scene_prompt: string; // English scene description for AI image generation
  scene_type: SceneType;
  atmosphere?: string; // Atmosphere tags (e.g., "温馨", "紧张", "神秘")
  lighting_hint?: string; // Lighting hint (e.g., "golden_hour", "moonlight")
}

// Scene types
export type SceneType =
  | "indoor"
  | "outdoor"
  | "urban"
  | "nature"
  | "fantasy"
  | "scifi"
  | "historical"
  | "abstract";

// Suggested scene (stored in database, before image generation)
export interface SuggestedScene {
  id: string;
  chapter_id: string;
  name: string;
  description: string;
  scene_prompt: string;
  scene_type: SceneType;
  atmosphere: string | null;
  lighting_hint: string | null;

  // Generation tracking
  generated: boolean;
  scene_id: string | null;
  image_url: string | null;
  optimized_prompt: string | null;
  generated_at: Date | null;
  generation_cost: number;

  // Metadata
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

// API request/response types

export interface AnalyzeScenesRequest {
  count?: number; // Expected number of scenes (default: 3-5)
  force_regenerate?: boolean; // Force re-analysis even if scenes exist
}

export interface AnalyzeScenesResponse {
  success: boolean;
  suggested_scenes: SuggestedScene[];
  chapter_context: {
    id: string;
    title: string;
    chapter_order: number;
    summary?: string;
  };
  credits_used: number;
}

export interface BatchGenerateScenesRequest {
  ids: string[]; // SuggestedScene IDs (max 5)
  auto_save?: boolean; // Auto-save to Scene library (default: true)
  comic_style_id?: string; // Override comic style
}

export interface SceneGenerationResult {
  suggested_scene_id: string;
  success: boolean;
  scene_id?: string; // Scene ID if auto_save=true
  image_url?: string;
  credits_used?: number;
  error?: string;
}

export interface BatchGenerateScenesResponse {
  success: boolean;
  results: SceneGenerationResult[];
  saved_count: number;
  total_credits_used: number;
}

export interface UpdateSuggestedSceneRequest {
  id: string;
  action: "update" | "delete";
  updates?: {
    name?: string;
    description?: string;
    scene_prompt?: string;
    scene_type?: SceneType;
    atmosphere?: string;
    lighting_hint?: string;
  };
}

// Scene prompt builder types
export interface ScenePromptBuildOptions {
  basePrompt: string; // English scene description
  comicStylePrompt?: string | null; // Comic style prompt_prefix
  atmosphere?: string | null; // Atmosphere tag
  lightingHint?: string | null; // Lighting hint
}

// Atmosphere to prompt mapping
export const ATMOSPHERE_PROMPTS: Record<string, string> = {
  "温馨浪漫": "warm atmosphere, romantic mood, soft colors",
  "温馨": "warm atmosphere, cozy, inviting",
  "浪漫": "romantic mood, dreamy, soft lighting",
  "紧张": "tense atmosphere, dramatic lighting, high contrast",
  "神秘": "mysterious atmosphere, foggy, dim lighting",
  "孤独": "lonely atmosphere, empty space, cold colors",
  "欢乐": "joyful atmosphere, bright colors, vibrant",
  "悲伤": "sad atmosphere, gloomy, desaturated colors",
  "恐怖": "horror atmosphere, dark shadows, eerie",
  "宁静": "peaceful atmosphere, calm, serene",
  "激烈": "intense atmosphere, dynamic, energetic"
};

// Lighting hints
export type LightingHint =
  | "golden_hour"      // 黄金时段
  | "harsh_midday"     // 强烈正午光
  | "soft_diffused"    // 柔和漫射光
  | "dramatic_rim"     // 戏剧性边缘光
  | "neon_night"       // 霓虹夜景
  | "moonlight"        // 月光
  | "studio"           // 摄影棚光
  | "natural_window"   // 自然窗光
  | "dawn"             // 黎明
  | "dusk"             // 黄昏
  | "none";            // 无特殊光线
