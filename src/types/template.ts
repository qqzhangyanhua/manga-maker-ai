/**
 * Template Types - Phase 1
 *
 * TypeScript type definitions for Panel Templates, Batch Generation, and Version Control
 */

// ============================================================
// Panel Template Types
// ============================================================

export interface PanelTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  panel_count: number;
  template_data: TemplateData;
  tags: string[];
  is_public: boolean;
  is_official: boolean;
  likes_count: number;
  usage_count: number;
  thumbnail_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TemplateData {
  panels: TemplatePanelConfig[];
  meta?: TemplateMeta;
}

export interface TemplatePanelConfig {
  panel_type: string | null;
  camera_angle: string | null;
  shot_size: string | null;
  importance: "high" | "medium" | "low" | null;
  relative_position: number;
}

export type TemplateCategory = "short" | "strip" | "four" | "comic" | "blank";

export interface TemplateMeta {
  category?: TemplateCategory;
  recommendedPanelCount?: number;
  styleHint?: string;
  loglineExample?: string;
  beats?: Array<{
    title: string;
    summary: string;
    scene?: string;
  }>;
  dialogueGuidelines?: {
    maxLinesPerBubble?: number;
    maxCharsPerBubble?: number;
    tone?: string;
    tips?: string[];
  };
  cameraPlan?: {
    wide?: number;
    medium?: number;
    closeup?: number;
    special?: string[];
  };
  promptSnippets?: string[];
  negativePrompts?: string[];
  colorPalette?: string[];
  layoutPresets?: string[];
  recommendedGenres?: string[];
  recommendedCharacters?: {
    min?: number;
    max?: number;
    relationshipTips?: string;
  };
  complexityLevel?: "newbie" | "pro";
  autoFill?: {
    applyBeatsToStory?: boolean;
    applyCameraToPanels?: boolean;
    applyPromptSnippets?: boolean;
  };
  locks?: {
    layout?: boolean;
    beatCount?: boolean;
  };
  defaultLLMProviderType?: string;
  tags?: string[];
  version?: string;
  isFeatured?: boolean;
}

export type TemplateWithMeta = PanelTemplate & {
  template_data: TemplateData;
};

export interface CreateTemplateInput {
  name: string;
  description?: string;
  panelIds: string[];
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface ApplyTemplateInput {
  projectId: string;
  insertAfterOrder?: number;
  mode: "insert" | "replace";
  targetPanelIds?: string[];
}

// ============================================================
// Template Like Types
// ============================================================

export interface TemplateLike {
  id: string;
  template_id: string;
  user_id: string;
  created_at: Date;
}

// ============================================================
// Batch Generation Types
// ============================================================

export interface GenerationTask {
  id: string;
  user_id: string;
  project_id: string;
  panel_ids: string[];
  task_type: "batch" | "variant";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  current_panel_index: number;
  settings: GenerationSettings;
  error_logs: ErrorLog[] | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface GenerationSettings {
  style?: string;
  quality?: "standard" | "high";
  failureMode?: "skip" | "stop";
}

export interface ErrorLog {
  panelId: string;
  error: string;
  timestamp: string;
}

export interface BatchGenerateInput {
  projectId: string;
  panelIds: string[];
  settings: GenerationSettings;
}

export interface BatchGenerateResponse {
  taskId: string;
  panelCount: number;
  estimatedTime: number;
}

// ============================================================
// Panel Variant Types
// ============================================================

export interface PanelVariant {
  id: string;
  panel_id: string;
  image_url: string;
  prompt: string;
  variant_type: "original" | "composition" | "lighting" | "angle";
  is_selected: boolean;
  created_at: Date;
}

export interface GenerateVariantsInput {
  count?: number;
  variantTypes?: string[];
}

export interface GenerateVariantsResponse {
  variants: PanelVariant[];
}

// ============================================================
// Project Version Types
// ============================================================

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  label: string | null;
  version_data: VersionData;
  change_summary: string | null;
  is_auto: boolean;
  is_pinned: boolean;
  created_by_action: string | null;
  created_at: Date;
}

export interface VersionData {
  project: {
    title: string;
    description: string | null;
    style: string | null;
  };
  panels: VersionPanel[];
  script?: {
    content: string;
    segments: unknown[];
  };
}

export interface VersionPanel {
  id: string;
  panel_order: number;
  description: string;
  panel_type: string;
  importance: string;
  camera_angle: string | null;
  shot_size: string | null;
  dialogue: string | null;
  character_id: string | null; // FK to Character table
  emotion: string | null;
  generated_image: string | null;
  prompt_used: string | null;
}

export interface CreateVersionInput {
  label?: string;
  createdByAction?: string;
}

export interface RestoreVersionInput {
  versionId: string;
  createBackup?: boolean;
}

export interface CompareVersionsResponse {
  versionFrom: ProjectVersion;
  versionTo: ProjectVersion;
  diff: VersionDiff;
}

export interface VersionDiff {
  project: {
    changed: string[];
    values: {
      from: Record<string, unknown>;
      to: Record<string, unknown>;
    };
  };
  panels: {
    added: VersionPanel[];
    removed: VersionPanel[];
    modified: Array<{
      panelId: string;
      changes: string[];
    }>;
  };
}

// ============================================================
// Tag Types
// ============================================================

export interface Tag {
  id: string;
  name: string;
  type: "system" | "user";
  category: string | null;
  created_by: string | null;
  usage_count: number;
  created_at: Date;
}

export interface Tagging {
  id: string;
  tag_id: string;
  taggable_type: "Character" | "Scene" | "Project" | "Story" | "PanelTemplate";
  taggable_id: string;
  created_at: Date;
}

export interface CreateTagInput {
  name: string;
  category?: string;
}

export interface SuggestTagsInput {
  resourceType: "Character" | "Scene" | "Project" | "Story";
  description: string;
}

// ============================================================
// Search Types
// ============================================================

export interface SearchQuery {
  q: string;
  type?: string[];
  tags?: string[];
  limit?: number;
}

export interface SearchResult {
  characters: unknown[];
  scenes: unknown[];
  projects: unknown[];
  stories: unknown[];
  templates: PanelTemplate[];
}

export interface FilterQuery {
  tags?: string[];
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: "newest" | "oldest" | "name" | "usage";
  page?: number;
  limit?: number;
}

// ============================================================
// API Response Types
// ============================================================

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================================
// Usage & Quota Types
// ============================================================

export interface UsageInfo {
  count: number;
  limit: number;
}

export interface UsageResponse {
  usage: UsageInfo;
}
