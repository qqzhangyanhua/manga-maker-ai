/**
 * Camera Movement - Definitions and utilities for camera movements in panels
 */

export type CameraMovement =
  | "static"        // 静止镜头（无运镜）
  | "push_in"       // 推镜（推进）
  | "pull_out"      // 拉镜（拉远）
  | "pan_left"      // 摇镜左
  | "pan_right"     // 摇镜右
  | "tilt_up"       // 摇镜上
  | "tilt_down"     // 摇镜下
  | "dolly"         // 移动镜头（跟随）
  | "zoom";         // 变焦

export type MovementSpeed =
  | "slow"          // 缓慢（3-5秒）
  | "medium"        // 中速（1-2秒）
  | "fast"          // 快速（0.5-1秒）
  | "sudden";       // 突然（瞬间）

export interface CameraMovementDefinition {
  key: CameraMovement;
  name_zh: string;
  name_en: string;
  description: string;
  promptModifier: string;
  suitableScenes: string[];  // action, dialogue, establishing, emotional
}

export const CAMERA_MOVEMENTS: CameraMovementDefinition[] = [
  {
    key: "static",
    name_zh: "静止镜头",
    name_en: "Static Shot",
    description: "摄影机完全静止，适合对话或稳定场景",
    promptModifier: "",
    suitableScenes: ["dialogue", "portrait", "establishing"]
  },
  {
    key: "push_in",
    name_zh: "推镜",
    name_en: "Push In / Dolly In",
    description: "摄影机向主体推进，强化情感或细节",
    promptModifier: "camera slowly pushing in towards subject, gradual zoom effect, increasing intimacy",
    suitableScenes: ["emotional", "revelation", "closeup"]
  },
  {
    key: "pull_out",
    name_zh: "拉镜",
    name_en: "Pull Out / Dolly Out",
    description: "摄影机拉远，揭示环境或制造孤独感",
    promptModifier: "camera pulling back from subject, revealing wider environment, increasing distance",
    suitableScenes: ["establishing", "emotional", "epic"]
  },
  {
    key: "pan_left",
    name_zh: "左摇",
    name_en: "Pan Left",
    description: "摄影机水平向左移动，展示横向空间",
    promptModifier: "camera panning left horizontally, smooth lateral movement, revealing space to the left",
    suitableScenes: ["action", "establishing", "chase"]
  },
  {
    key: "pan_right",
    name_zh: "右摇",
    name_en: "Pan Right",
    description: "摄影机水平向右移动",
    promptModifier: "camera panning right horizontally, smooth lateral movement, revealing space to the right",
    suitableScenes: ["action", "establishing", "chase"]
  },
  {
    key: "tilt_up",
    name_zh: "上摇",
    name_en: "Tilt Up",
    description: "摄影机向上仰视，展现高大或威严",
    promptModifier: "camera tilting upward, vertical ascent, revealing height or grandeur",
    suitableScenes: ["epic", "revelation", "establishing"]
  },
  {
    key: "tilt_down",
    name_zh: "下摇",
    name_en: "Tilt Down",
    description: "摄影机向下俯视",
    promptModifier: "camera tilting downward, vertical descent, top-down reveal",
    suitableScenes: ["suspense", "establishing"]
  },
  {
    key: "dolly",
    name_zh: "移动镜头",
    name_en: "Dolly / Tracking",
    description: "摄影机跟随主体移动",
    promptModifier: "camera tracking alongside subject, smooth following movement, maintaining relative distance",
    suitableScenes: ["action", "chase", "walking"]
  },
  {
    key: "zoom",
    name_zh: "变焦",
    name_en: "Zoom",
    description: "镜头焦距变化（非物理移动）",
    promptModifier: "camera zoom effect, focal length change, rapid magnification",
    suitableScenes: ["dramatic", "shock", "revelation"]
  }
];

/**
 * Get camera movement definition by key
 */
export function getCameraMovement(key?: CameraMovement | null): CameraMovementDefinition | undefined {
  if (!key) return undefined;
  return CAMERA_MOVEMENTS.find(m => m.key === key);
}

/**
 * Format camera movement for display
 * @param movement Camera movement type
 * @param speed Movement speed
 * @param direction Additional direction info
 * @returns Formatted string like "推镜 (缓慢)"
 */
export function formatCameraMovement(
  movement?: CameraMovement | null,
  speed?: MovementSpeed | null,
  direction?: string | null
): string {
  if (!movement || movement === "static") return "";

  const def = getCameraMovement(movement);
  if (!def) return "";

  const speedMap: Record<MovementSpeed, string> = {
    slow: "缓慢",
    medium: "匀速",
    fast: "快速",
    sudden: "突然"
  };

  const parts = [
    def.name_zh,
    speed ? `(${speedMap[speed]})` : "",
    direction ? `[${direction}]` : ""
  ].filter(Boolean);

  return parts.join(" ");
}

/**
 * Get prompt modifier for camera movement
 * @param movement Camera movement type
 * @param speed Movement speed (optional, affects prompt intensity)
 * @returns Prompt modifier string for AI image generation
 */
export function getCameraMovementPromptModifier(
  movement?: CameraMovement | null,
  speed?: MovementSpeed | null
): string {
  if (!movement || movement === "static") return "";

  const def = getCameraMovement(movement);
  if (!def) return "";

  let modifier = def.promptModifier;

  // Add speed-specific modifiers
  if (speed) {
    switch (speed) {
      case "slow":
        modifier += ", slow deliberate movement, gentle transition";
        break;
      case "medium":
        modifier += ", steady paced movement, smooth transition";
        break;
      case "fast":
        modifier += ", quick movement, dynamic transition";
        break;
      case "sudden":
        modifier += ", sudden rapid movement, dramatic shift";
        break;
    }
  }

  return modifier;
}
