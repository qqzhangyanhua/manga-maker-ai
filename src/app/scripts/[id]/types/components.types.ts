/**
 * scripts/[id] 模块组件 Props 类型定义
 */

import { Panel } from "./script-editor.types";
import { CharacterReference } from "./character.types";

// PanelEditor 组件 Props
export interface PanelCardProps {
  panel: Panel;
  index: number;
  onEdit: (panel: Panel) => void;
  onDelete: (panelId: string) => void;
  onGenerate: (panelId: string) => void;
  generating: boolean;
}

export interface PanelCardActionsProps {
  panel: Panel;
  generating: boolean;
  onEdit: (panel: Panel) => void;
  onDelete: (panelId: string) => void;
  onGenerate: (panelId: string) => void;
  onInsert: (afterOrder: number) => void;
  onSplit: (panel: Panel) => void;
  onMerge: (panel: Panel) => void;
}

export interface InsertPanelDialogProps {
  open: boolean;
  afterOrder: number;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface SplitPanelDialogProps {
  open: boolean;
  panel: Panel | null;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface PanelEditDialogProps {
  open: boolean;
  panel: Panel | null;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedPanel: Partial<Panel>) => void;
}

export interface PanelGenerationProgressProps {
  generating: boolean;
  generatingPanelIds: Set<string>;
  totalPanels: number;
}

export interface SortablePanelCardProps {
  panel: Panel;
  index: number;
  onEdit: (panel: Panel) => void;
  onDelete: (panelId: string) => void;
  onGenerate: (panelId: string) => void;
  generating: boolean;
}

export interface CharacterSelectorProps {
  value: string;
  characters: CharacterReference[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export interface CharacterReferencePickerProps {
  characterId: string;
  viewType: "front" | "side" | "back";
  expressionType: string;
  onViewTypeChange: (viewType: "front" | "side" | "back") => void;
  onExpressionTypeChange: (expressionType: string) => void;
  disabled?: boolean;
}

export interface ReferenceGuidedGenerationDialogProps {
  open: boolean;
  panel: Panel | null;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface PanelListViewProps {
  panels: Panel[];
  loading: boolean;
  generatingPanelIds: Set<string>;
  onEditPanel: (panel: Panel) => void;
  onDeletePanel: (panelId: string) => void;
  onGeneratePanel: (panelId: string) => void;
  onReorderPanels: (panels: Panel[]) => void;
}

export interface StoryInfoPanelProps {
  story: {
    id: string;
    title: string;
    genre: string;
    premise: string;
    status: string;
    characters: Array<{
      name: string;
      role: string;
      description: string;
    }>;
  };
  projectId: string | null;
  onCreateProject: () => void;
}

export interface BatchGenerationDialogProps {
  open: boolean;
  projectId: string;
  panels: Panel[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
