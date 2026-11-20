// API类型定义
export type ApiPanel = {
  id: string;
  panel_order: number;
  panel_type: string;
  importance: string;
  description: string;
  dialogue: string | null;
  character_id: string | null; // FK to Character table
  character?: { id: string; name: string } | null; // Joined character data
  emotion: string | null;
  prompt_used: string | null;
  generated_image: string | null;
  segment_id?: string | null;
  script_segment_id: string | null;
  script_start: number | null;
  script_end: number | null;
  camera_angle: string | null;
  shot_size: string | null;
  visual_prompt: string | null;
  created_at: string;
};

export type ApiScriptSegment = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export type ApiScript = {
  id: string;
  project_id: string;
  content: string;
  segments: ApiScriptSegment[];
  created_at: string;
  updated_at: string;
};

export type ApiProject = {
  id: string;
  title: string;
  description: string | null;
  style: string | null;
  status: string;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  panels: ApiPanel[];
  script?: ApiScript;
};

export type CharacterOption = {
  id: string;
  name: string;
  viewCount: number;
};

export type StyleOption = {
  style_key: string;
  name_zh: string;
  name_en: string;
  description?: string | null;
};

// 组件 Props 类型
export type UsageBadgeProps = {
  label: string;
  item?: { remaining: number | null; limit: number | null; count: number };
  loading: boolean;
};

export type GenerationStrategyProps = {
  characters: CharacterOption[];
  styles: StyleOption[];
  defaultCharacterId: string | undefined;
  defaultStyleKey: string | undefined;
  softMode: boolean;
  promptErrors: Record<string, string>;
};

export type GenerationSettingsProps = {
  characters: CharacterOption[];
  styles: StyleOption[];
  defaultCharacterId: string | undefined;
  defaultStyleKey: string | undefined;
  softMode: boolean;
  onCharacterChange: (id: string | undefined) => void;
  onStyleChange: (key: string | undefined) => void;
  onSoftModeChange: (enabled: boolean) => void;
};

export type UseStoryboardGenerationOptions = {
  project: ApiProject;
  onPanelsUpdate: (updatedPanels: ApiPanel[]) => void;
  onGenerationStart: () => void;
  onGenerationEnd: () => void;
  onError: (message: string) => void;
};

export type UseImageGenerationOptions = {
  panelId: string;
  prompt: string;
  onSuccess: (imageUrl: string) => void;
  onError: (error: string) => void;
};


