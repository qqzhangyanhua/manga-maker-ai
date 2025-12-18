import {
  Character,
  CharacterExpression,
  CharacterOutfit,
  CharacterView,
  ComicStyle,
  Panel,
  Project,
  Scene,
} from "@prisma/client";
import { getLightingPromptModifier } from "./lighting-presets";

type PanelWithProject = Panel & { project: Project | null };
type CharacterWithAssets = Character & {
  views: CharacterView[];
  expressions: CharacterExpression[];
  outfits: CharacterOutfit[];
};

export type PromptBlocks = {
  references: string[];
  characterProfile: string;
  scene: string;
  lighting?: string;
  dialogue?: string | null;
  camera?: string;
  style: string;
  aspectRatio: string;
  negative: string;
};

export type BuildPanelPromptOptions = {
  panel: PanelWithProject;
  character?: CharacterWithAssets | null;
  scene?: Scene | null;
  style?: ComicStyle | null;
  soften?: boolean;
  aspectRatio?: string | null;
};

type ReplacementRecord = {
  from: string;
  to: string;
};

const DEFAULT_NEGATIVE =
  "No text bubbles, no dialogue text, no subtitles, no UI elements, watermark, signature, blurry, distorted hands, extra fingers, bad anatomy";

// 简单敏感词替换表，降低被安全过滤拦截的概率
const SENSITIVE_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /流血|喷血|血泊|血迹/gi, replacement: "红色颜料飞溅" },
  { pattern: /血/gi, replacement: "红色颜料" },
  { pattern: /杀死|杀掉|杀戮|致命|处决/gi, replacement: "击败" },
  { pattern: /\bkill(s|ed)?\b/gi, replacement: "defeat" },
  { pattern: /\bgun\b/gi, replacement: "prop foam weapon" },
  { pattern: /枪械|枪支|手枪|步枪/gi, replacement: "道具武器" },
  { pattern: /尸体|死亡|死去/gi, replacement: "失去战斗力" },
  { pattern: /鲜血/gi, replacement: "红色液体" },
];

/**
 * 对描述进行软化处理，避免触发图片生成安全审查
 */
export function softenSensitiveText(text: string): { text: string; replacements: ReplacementRecord[] } {
  let processed = text;
  const replacements: ReplacementRecord[] = [];

  for (const item of SENSITIVE_REPLACEMENTS) {
    const matches = processed.match(item.pattern);
    if (matches?.length) {
      matches.forEach((match) => {
        replacements.push({ from: match, to: item.replacement });
      });
      processed = processed.replace(item.pattern, item.replacement);
    }
  }

  return { text: processed, replacements };
}

/**
 * 推导推荐的画幅比例
 */
function inferAspectRatio(panel: PanelWithProject): string {
  if (panel.shot_size?.includes("特写") || panel.panel_type === "closeup") {
    return "3:4";
  }
  if (panel.panel_type === "action" || panel.panel_type === "wide") {
    return "16:9";
  }
  if (panel.panel_type === "dialogue") {
    return "4:3";
  }
  return "1:1";
}

function buildCharacterProfile(character?: CharacterWithAssets | null): {
  profile: string;
  referenceHints: string[];
} {
  if (!character) {
    return {
      profile: "Single main character stays consistent across panels.",
      referenceHints: [],
    };
  }

  const profileParts = [
    character.name,
    character.description,
    character.base_prompt,
    character.tags?.length ? `Tags: ${character.tags.join(", ")}` : "",
  ].filter(Boolean);

  const defaultOutfit = character.outfits?.find((o) => o.is_default);
  if (defaultOutfit?.prompt_modifier) {
    profileParts.push(`Outfit: ${defaultOutfit.outfit_name} - ${defaultOutfit.prompt_modifier}`);
  }

  const referenceHints: string[] = [];
  character.views?.forEach((view) => {
    referenceHints.push(`${view.view_type} view -> ${view.image_url}`);
  });
  character.expressions?.forEach((exp) => {
    referenceHints.push(`Expression: ${exp.expression_type} -> ${exp.image_url}`);
  });

  return {
    profile: profileParts.join(", "),
    referenceHints,
  };
}

function pickStyleText(style?: ComicStyle | null, fallback?: string | null): string {
  if (style?.prompt_prefix) return style.prompt_prefix;
  if (fallback) return fallback;
  return "manga / anime style, clean line art, cell shading, consistent tone";
}

/**
 * 构建分镜的“三明治”提示词
 */
export function buildPanelPrompt(options: BuildPanelPromptOptions) {
  const { panel, character, scene, style, soften = true, aspectRatio } = options;
  const sceneText = panel.visual_prompt || panel.description || "";
  const { text: softenedScene, replacements } = soften
    ? softenSensitiveText(sceneText)
    : { text: sceneText, replacements: [] };

  const { profile, referenceHints } = buildCharacterProfile(character);
  const camera = [panel.camera_angle, panel.shot_size].filter(Boolean).join(" / ");
  const mood = panel.emotion ? `Emotion: ${panel.emotion}` : "";
  const aspect = aspectRatio || inferAspectRatio(panel);
  const styleText = pickStyleText(style, panel.project?.style);

  // 获取场景光效
  const lightingModifier = scene && 'lighting_preset' in scene && scene.lighting_preset
    ? getLightingPromptModifier(scene.lighting_preset as any)
    : "";

  const blocks: PromptBlocks = {
    references: referenceHints,
    characterProfile: profile,
    scene: softenedScene,
    lighting: lightingModifier,
    dialogue: panel.dialogue,
    camera,
    style: styleText,
    aspectRatio: aspect,
    negative: DEFAULT_NEGATIVE,
  };

  const promptLines = [
    referenceHints.length > 0 ? `Reference images: ${referenceHints.join(" | ")}` : null,
    `Character profile: ${profile}`,
    `Scene: ${softenedScene}`,
    lightingModifier ? `Lighting: ${lightingModifier}` : null,
    panel.dialogue ? `Dialogue (do NOT render text, only use as mood): ${panel.dialogue}` : null,
    camera ? `Camera: ${camera}` : null,
    mood,
    `Style: ${styleText}`,
    `Aspect ratio target: ${aspect}`,
    `Constraints: keep character face/outfit consistent with references, no speech bubbles, no on-image text.`,
    `Negative: ${DEFAULT_NEGATIVE}`,
  ].filter(Boolean);

  return {
    prompt: promptLines.join("\n"),
    negativePrompt: DEFAULT_NEGATIVE,
    replacements,
    blocks,
  };
}
