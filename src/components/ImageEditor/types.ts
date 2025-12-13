export interface EditorTool {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface FilterConfig {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
}

export interface EditorState {
  currentTool: string;
  isDirty: boolean;
  isSaving: boolean;
  filters: FilterConfig;
  textOverlays: TextOverlay[];
}
