import type { ScenePromptBuildOptions } from "@/types/suggested-scenes.types";
import { ATMOSPHERE_PROMPTS } from "@/types/suggested-scenes.types";

/**
 * Build complete image generation prompt for scene backgrounds
 * Combines: base scene description + comic style + atmosphere + lighting + quality suffixes
 */
export function buildSceneImagePrompt(options: ScenePromptBuildOptions): string {
  const { basePrompt, comicStylePrompt, atmosphere, lightingHint } = options;

  const parts: string[] = [];

  // 1. Base scene description (English)
  parts.push(basePrompt);

  // 2. Comic style
  if (comicStylePrompt !== null && comicStylePrompt !== undefined) {
    parts.push(comicStylePrompt);
  } else {
    parts.push("manga style, anime background art, detailed illustration");
  }

  // 3. Atmosphere mapping
  if (atmosphere && ATMOSPHERE_PROMPTS[atmosphere]) {
    parts.push(ATMOSPHERE_PROMPTS[atmosphere]);
  }

  // 4. Lighting hint
  if (lightingHint) {
    parts.push(lightingHint);
  }

  // 5. Quality suffixes
  parts.push(
    "high quality, detailed background, professional illustration, 4k, masterpiece, no humans, no characters"
  );

  return parts.join(", ");
}

/**
 * Default negative prompt for scene generation
 */
export const SCENE_NEGATIVE_PROMPT =
  "people, humans, characters, faces, hands, body, person, man, woman, child, " +
  "text, watermark, signature, username, artist name, " +
  "low quality, blurry, jpeg artifacts, distorted, deformed, ugly, amateur, " +
  "cropped, out of frame";

/**
 * Build scene name for file storage
 * Format: ch{order}_scene{index}_{type}
 */
export function buildSceneName(
  chapterOrder: number,
  sceneIndex: number,
  sceneType: string
): string {
  return `ch${String(chapterOrder).padStart(2, "0")}_scene${String(sceneIndex + 1).padStart(2, "0")}_${sceneType}`;
}
