/**
 * Phase 2 Type Definitions
 *
 * Types for the serialized manga workflow feature including:
 * - Story-Character relationships
 * - Panel asset bindings
 * - Variants and exports
 */

import type {
  Character,
  CharacterExpression,
  CharacterOutfit,
  Panel,
  Scene,
  Story,
  StoryCharacter,
} from "@prisma/client";

// ============================================================
// Enums and Literal Types
// ============================================================

/**
 * Character role in a story
 */
export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "minor";

/**
 * Valid expression types for characters
 */
export type ExpressionType =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "shy"
  | "confident"
  | "worried"
  | "determined";

/**
 * Panel variant types for alternative generation
 */
export type VariantType = "original" | "composition" | "lighting" | "angle";

/**
 * Export file formats
 */
export type ExportFormat = "png" | "pdf" | "zip";

/**
 * Export layout styles
 */
export type ExportLayout = "grid" | "scroll";

/**
 * Export job status
 */
export type ExportStatus = "pending" | "processing" | "completed" | "failed";

// ============================================================
// API Request Types
// ============================================================

/**
 * Request body for adding character to story
 */
export interface AddStoryCharacterRequest {
  character_id: string;
  role: CharacterRole;
  character_arc?: string;
}

/**
 * Request body for updating story character
 */
export interface UpdateStoryCharacterRequest {
  role?: CharacterRole;
  character_arc?: string;
  display_order?: number;
}

/**
 * Request body for updating panel assets
 */
export interface UpdatePanelAssetsRequest {
  character_id?: string | null;
  expression_type?: ExpressionType | null;
  outfit_id?: string | null;
  scene_id?: string | null;
}

/**
 * Request body for batch updating panels
 */
export interface BatchUpdatePanelsRequest {
  panel_ids: string[];
  updates: UpdatePanelAssetsRequest;
}

/**
 * Request body for generating variants
 */
export interface GenerateVariantsRequest {
  variant_types: VariantType[];
}

/**
 * Request body for exporting project
 */
export interface ExportProjectRequest {
  format: ExportFormat;
  layout: ExportLayout;
  options: {
    watermark?: boolean;
    watermark_text?: string;
    resolution: "high" | "medium" | "low";
    columns?: number;
    gap?: number;
  };
}

// ============================================================
// API Response Types
// ============================================================

/**
 * Character with all related assets loaded
 */
export interface CharacterWithAssets extends Character {
  expressions: CharacterExpression[];
  outfits: CharacterOutfit[];
}

/**
 * Story character with full character details
 */
export interface StoryCharacterWithDetails extends StoryCharacter {
  character: CharacterWithAssets;
}

/**
 * Panel with all bound assets loaded
 */
export interface PanelWithAssets extends Panel {
  character: CharacterWithAssets | null;
  outfit: CharacterOutfit | null;
  scene: Scene | null;
}

/**
 * Story with story_characters loaded
 */
export interface StoryWithCharacters extends Story {
  story_characters: StoryCharacterWithDetails[];
}

/**
 * Response for build-prompt API with binding info
 */
export interface BuildPromptResponse {
  success: boolean;
  prompt: string;
  negative_prompt: string;
  bindings: {
    character: { id: string; name: string } | null;
    expression: ExpressionType | null;
    outfit: { id: string; name: string } | null;
    scene: { id: string; name: string } | null;
  };
  blocks: {
    style?: string;
    character?: string;
    expression?: string;
    outfit?: string;
    scene?: string;
    action?: string;
    quality?: string;
  };
  panel: Panel;
}

/**
 * Variant item in gallery
 */
export interface PanelVariantItem {
  id: string;
  image_url: string;
  variant_type: VariantType;
  is_selected: boolean;
  created_at: string;
}

/**
 * Export task status response
 */
export interface ExportStatusResponse {
  success: boolean;
  status: ExportStatus;
  progress: number;
  download_url?: string;
  error?: string;
}

// ============================================================
// UI Component Props Types
// ============================================================

/**
 * Props for CharacterSelector component
 */
export interface CharacterSelectorProps {
  storyCharacters: StoryCharacterWithDetails[];
  selectedCharacterId: string | null;
  onSelect: (characterId: string | null) => void;
  disabled?: boolean;
}

/**
 * Props for ExpressionGrid component
 */
export interface ExpressionGridProps {
  characterId: string;
  expressions: CharacterExpression[];
  selectedExpression: ExpressionType | null;
  onSelect: (expression: ExpressionType | null) => void;
  disabled?: boolean;
}

/**
 * Props for OutfitSelector component
 */
export interface OutfitSelectorProps {
  characterId: string;
  outfits: CharacterOutfit[];
  selectedOutfitId: string | null;
  onSelect: (outfitId: string | null) => void;
  disabled?: boolean;
}

/**
 * Props for SceneSelector component
 */
export interface SceneSelectorProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelect: (sceneId: string | null) => void;
  disabled?: boolean;
}

/**
 * Props for BatchGenerationModal component
 */
export interface BatchGenerationModalProps {
  projectId: string;
  panels: Panel[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/**
 * Props for VariantGallery component
 */
export interface VariantGalleryProps {
  panelId: string;
  variants: PanelVariantItem[];
  currentImageUrl: string | null;
  onSelectVariant: (variantId: string) => Promise<void>;
  onGenerateMore: () => Promise<void>;
  isGenerating?: boolean;
}

/**
 * Props for ExportModal component
 */
export interface ExportModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================
// Utility Types
// ============================================================

/**
 * Assets that can be bound to a panel
 */
export interface PanelAssets {
  character_id: string | null;
  expression_type: ExpressionType | null;
  outfit_id: string | null;
  scene_id: string | null;
}

/**
 * Batch generation settings
 */
export interface BatchGenerationSettings {
  style_key?: string;
  quality: "high" | "standard" | "fast";
  failure_mode: "skip" | "stop";
}

/**
 * Batch generation progress
 */
export interface BatchGenerationProgress {
  total: number;
  completed: number;
  failed: number;
  current_panel_id: string | null;
  status: "idle" | "running" | "paused" | "completed" | "cancelled";
}

/**
 * Role display mapping
 */
export const ROLE_DISPLAY_MAP: Record<CharacterRole, string> = {
  protagonist: "主角",
  antagonist: "反派",
  supporting: "配角",
  minor: "龙套",
};

/**
 * Expression display mapping
 */
export const EXPRESSION_DISPLAY_MAP: Record<ExpressionType, string> = {
  neutral: "平静",
  happy: "开心",
  sad: "悲伤",
  angry: "愤怒",
  surprised: "惊讶",
  shy: "害羞",
  confident: "自信",
  worried: "担忧",
  determined: "坚定",
};

/**
 * All valid expression types
 */
export const EXPRESSION_TYPES: ExpressionType[] = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "surprised",
  "shy",
  "confident",
  "worried",
  "determined",
];

/**
 * All valid character roles
 */
export const CHARACTER_ROLES: CharacterRole[] = [
  "protagonist",
  "antagonist",
  "supporting",
  "minor",
];
