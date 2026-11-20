import type {
  Character,
  CharacterExpression,
  CharacterOutfit,
  CharacterView,
  ComicStyle as ComicStyleModel,
  Panel,
  Project,
  Scene,
} from "@prisma/client";
import type { StoryGenre } from "./story-generator";

export type WorkflowStep = "story" | "script" | "storyboard" | "images" | "export" | "complete";
export type WorkflowStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type WorkflowConfig = {
  premise: string;
  genre?: StoryGenre;
  characterCount?: number;
  storyLength?: "short" | "medium" | "long";
  templateId?: string;
  panelCount?: number;
  style?: string;
  generateImages?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  exportFormat?: "pdf" | "images" | "both";
};

export type WorkflowResult = {
  storyId?: string;
  projectId?: string;
  panelCount?: number;
  generatedImages?: number;
  exportUrls?: string[];
};

export type StoryOutlineAct = {
  name: string;
  summary?: string;
  scenes?: string[];
};

export type StoryOutline = {
  title?: string;
  genre?: string;
  logline?: string;
  acts?: StoryOutlineAct[];
  characters?: Array<unknown>;
  themes?: string[];
  setting?: string;
};

export type StoryboardPanelData = {
  panel_order?: number;
  script_segment_id?: string | null;
  panel_type?: string | null;
  importance?: string | null;
  description?: string | null;
  dialogue?: string | null;
  character_name?: string | null;
  emotion?: string | null;
  english_prompt?: string | null;
  visual_prompt?: string | null;
  camera_angle?: string | null;
  shot_size?: string | null;
};

export type StoryboardData = {
  style?: string;
  panels?: StoryboardPanelData[];
  script_segments?: unknown[];
};

export type StoryHistoryItem = {
  id: string;
  premise: string;
  title?: string;
  genre?: string;
  status: "draft" | "generating" | "completed";
  createdAt: number;
  updatedAt: number;
  outline?: StoryOutline;
};

export type PdfParseProgress = {
  current: number;
  total: number;
  percentage: number;
};

export type PdfParseResult = {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
  };
};

export type PanelWithProject = Panel & { project: Project | null };

export type ComicStyle = ComicStyleModel;

export type CharacterWithAssets = Character & {
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

export type JsonRecord = Record<string, unknown>;

export type StoryTemplateData = {
  name: string;
  category: "suspense" | "romance" | "adventure" | "scifi" | "daily" | "fantasy";
  description: string;
  structure: {
    acts: {
      name: string;
      purpose: string;
      keyElements: string[];
    }[];
    plotPoints: string[];
  };
  prompts: {
    systemPrompt: string;
    examplePremises: string[];
  };
};

export type ChineseStoryTemplate = {
  id: string;
  name: string;
  category: string;
  genre: string;
  description: string;
  structure: {
    actCount: number;
    acts: {
      name: string;
      chapterCount: number;
      description: string;
      keyPoints: string[];
      suggestedLength: number;
    }[];
  };
  characterArchetypes: string[];
  commonTropes: string[];
  writingTips: string[];
  examples: string[];
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
};
