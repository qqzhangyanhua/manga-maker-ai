export interface PanelPromptData {
  panel_order: number;
  description: string | null;
  visual_prompt: string | null;
  prompt_used: string | null;
  character_name: string | null;
  emotion: string | null;
  camera_angle: string | null;
  shot_size: string | null;
}

const CAMERA_ANGLE_MAP: Record<string, string> = {
  "俯视": "top-down view",
  "仰视": "low-angle view",
  "平视": "eye-level view",
  "荷兰角": "dutch angle",
};

const SHOT_SIZE_MAP: Record<string, string> = {
  "特写": "close-up",
  "近景": "close shot",
  "中景": "medium shot",
  "全景": "full shot",
  "远景": "long shot",
};

const DEFAULT_STYLE = "Hand-painted anime cinematic illustration, atmospheric lighting, moody, high detail";

const DEFAULT_ATMOSPHERE = "Unified atmosphere";

const NEGATIVE_PROMPT = [
  "comic page",
  "manga page",
  "printed page",
  "book page",
  "page layout",
  "paper background",
  "paper texture",
  "printed material",
  "panel frames",
  "panel borders",
  "frame borders",
  "black borders",
  "white borders",
  "panel dividers",
  "separation lines",
  "dividing lines",
  "border lines",
  "grid layout",
  "comic grid",
  "manga grid",
  "regular grid",
  "aligned panels",
  "equal panels",
  "symmetrical panels",
  "white background",
  "empty background",
  "white space",
  "whitespace",
  "empty space",
  "blank space",
  "margins",
  "padding",
  "gutters",
  "photograph",
  "photo",
  "scanned",
  "book binding",
  "desk",
  "table",
  "hands holding",
  "3d rendering",
  "blurry",
  "low quality",
  "pixelated",
  "watermark",
  "signature",
  "text",
  "speech bubbles",
  "text boxes",
].join(", ");

export function getImageDimensions(count: number): { width: number; height: number } {
  if (count <= 2) {
    return { width: 1024, height: 512 };
  }
  if (count <= 4) {
    return { width: 1024, height: 1024 };
  }
  return { width: 1536, height: 1024 };
}

export function buildMultiPanelPrompt(
  panels: PanelPromptData[],
  options?: {
    style?: string;
    referenceImageCount?: number;
  }
): { positive: string; negative: string } {
  const characters = new Set<string>();
  panels.forEach((panel) => {
    if (panel.character_name) {
      characters.add(panel.character_name);
    }
  });

  let characterReference = "";
  if (characters.size > 0) {
    const characterList = Array.from(characters).join(", ");
    characterReference = `Characters: ${characterList}, consistent appearance.`;
  }

  const referenceHint =
    (options?.referenceImageCount ?? 0) > 0
      ? "Use reference images for character consistency."
      : "";

  const firstPanel = panels[0];
  const firstDesc = firstPanel.visual_prompt || firstPanel.prompt_used || firstPanel.description || "";

  let atmosphere = DEFAULT_ATMOSPHERE;
  if (firstDesc.toLowerCase().includes("night") || firstDesc.toLowerCase().includes("夜")) {
    atmosphere = "Nighttime atmosphere";
  } else if (firstDesc.toLowerCase().includes("day") || firstDesc.toLowerCase().includes("日")) {
    atmosphere = "Daytime atmosphere";
  } else if (firstDesc.toLowerCase().includes("sunset") || firstDesc.toLowerCase().includes("黄昏")) {
    atmosphere = "Sunset atmosphere";
  } else if (firstDesc.toLowerCase().includes("rain") || firstDesc.toLowerCase().includes("雨")) {
    atmosphere = "Rainy atmosphere";
  }

  const sceneDescriptions = panels
    .map((panel, index) => {
      const visualWeight = getSceneVisualWeight(panel, index === 0);
      const content = panel.visual_prompt || panel.prompt_used || panel.description || "scene";
      const parts: string[] = [];
      const angleEn = translateCameraTerm(panel.camera_angle, CAMERA_ANGLE_MAP);
      const shotEn = translateCameraTerm(panel.shot_size, SHOT_SIZE_MAP);

      parts.push(content);

      if (panel.character_name) {
        let charDesc = panel.character_name;
        if (panel.emotion) {
          charDesc += ` with ${panel.emotion} expression`;
        }
        parts.push(charDesc);
      }

      if (angleEn || shotEn) {
        const cameraInfo = [shotEn, angleEn].filter(Boolean).join(", ");
        parts.push(`(${cameraInfo})`);
      }

      return `– ${visualWeight} of ${parts.join(", ")}.`;
    })
    .join("\n");

  const baseStyle = options?.style?.trim() || DEFAULT_STYLE;

  const positive = [
    "A single continuous cinematic illustration.",
    "The entire image is filled edge to edge with artwork.",
    "",
    "This is NOT a comic page.",
    "This is NOT a printed page.",
    "There is no paper background.",
    "",
    "The image is a cinematic storyboard collage,",
    "where multiple story moments coexist in one painted scene.",
    "",
    "Different scenes appear as naturally separated visual areas",
    "through lighting, perspective, depth, and composition,",
    "not through frames or panel borders.",
    "",
    "Some scenes are large and dominant,",
    "others are smaller and embedded into the environment.",
    "All visual areas touch the image edges.",
    "",
    `${atmosphere} connects all scenes seamlessly.`,
    "",
    referenceHint,
    characterReference,
    "",
    "Scenes included:",
    sceneDescriptions,
    "",
    "Objects, buildings, and characters are cut off by the image boundaries.",
    "No empty space anywhere.",
    "No white background.",
    "",
    `Style:\n${baseStyle}.`,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  return { positive, negative: NEGATIVE_PROMPT };
}

function getSceneVisualWeight(
  panel: {
    shot_size: string | null;
    camera_angle: string | null;
  },
  isFirst: boolean
): string {
  if (isFirst) {
    return "A large aerial view";
  }

  const shotSize = panel.shot_size;
  if (shotSize === "特写" || shotSize === "close-up") {
    return "A closer emotional moment";
  }
  if (shotSize === "远景" || shotSize === "long shot") {
    return "A wide panoramic view";
  }
  if (shotSize === "全景" || shotSize === "full shot") {
    return "A full scene showing";
  }
  if (shotSize === "中景" || shotSize === "medium shot") {
    return "A medium view of";
  }
  return "A visual area showing";
}

function translateCameraTerm(term: string | null, map: Record<string, string>): string | null {
  if (!term) return null;
  return map[term] || term;
}
