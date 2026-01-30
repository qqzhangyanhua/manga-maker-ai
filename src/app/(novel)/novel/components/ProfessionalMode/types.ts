/**
 * ProfessionalMode 类型定义
 */

import { Sparkles, Users, FileText, PenTool } from "lucide-react";

// ============ 基础类型 ============

export interface Template {
  id: string;
  code: string;
  name: string;
  description: string | null;
  phase: string;
  phase_display: string;
  category: string;
  genre: string | null;
  usage_count: number;
}

export interface Genre {
  genre: string;
  display_name: string;
  count: number;
}

export interface WorkflowSession {
  session_id: string;
  current_phase: string;
  completed_phases: string[];
  phase_data: Record<string, unknown>;
  available_templates: Template[];
  project_id: string | null;
  expires_at: string;
}

export interface OptimizationHistory {
  version: number;
  content: string;
  instruction?: string;
  timestamp: Date;
}

export interface GeneratedOption {
  id: string;
  content: string;
  summary: string;
}

export interface PhaseResult {
  phase: string;
  phaseName: string;
  content: string;
  summary: string;
}

// ============ 对话框阶段 ============

export type DialogStage =
  | "genre_select"
  | "options_generating"  // 新增：方案生成中
  | "options_select"      // 新增：方案选择
  | "editing"             // 新增：编辑确认
  | "preview"             // 新增：预览汇总
  | "completing"
  | "session_expired";

// ============ Props ============

export interface ProfessionalModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

// ============ 状态机 ============

export interface WorkflowState {
  stage: DialogStage;
  session: WorkflowSession | null;
  genres: Genre[];
  selectedGenre: string | null;
  selectedTemplate: Template | null;
  inputData: Record<string, string>;
  generatedResult: string;
  parsedResult: Record<string, unknown> | null;
  projectTitle: string;
  projectDescription: string;
  loading: boolean;
  optimizing: boolean;
  optimizationInput: string;
  optimizationHistory: OptimizationHistory[];
  showHistoryPanel: boolean;
  pendingSession: WorkflowSession | null;
  showResumePrompt: boolean;
  showCloseConfirm: boolean;
  // 新增字段
  generatedOptions: GeneratedOption[];
  selectedOptionId: string | null;
  editingContent: string;
  phaseResults: PhaseResult[];
}

export type WorkflowAction =
  | { type: "SET_STAGE"; payload: DialogStage }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_OPTIMIZING"; payload: boolean }
  | { type: "SET_GENRES"; payload: Genre[] }
  | { type: "SET_SELECTED_GENRE"; payload: string | null }
  | { type: "SET_SELECTED_TEMPLATE"; payload: Template | null }
  | { type: "SET_INPUT_DATA"; payload: Record<string, string> }
  | { type: "SET_GENERATED_RESULT"; payload: string }
  | { type: "SET_PARSED_RESULT"; payload: Record<string, unknown> | null }
  | { type: "SET_PROJECT_TITLE"; payload: string }
  | { type: "SET_PROJECT_DESCRIPTION"; payload: string }
  | { type: "SET_OPTIMIZATION_INPUT"; payload: string }
  | { type: "SET_SHOW_HISTORY_PANEL"; payload: boolean }
  | { type: "SET_SHOW_CLOSE_CONFIRM"; payload: boolean }
  | { type: "SET_SHOW_RESUME_PROMPT"; payload: boolean }
  | { type: "SET_PENDING_SESSION"; payload: WorkflowSession | null }
  | { type: "SET_SESSION"; payload: WorkflowSession | null }
  | {
      type: "START_WORKFLOW_SUCCESS";
      payload: WorkflowSession;
    }
  | {
      type: "EXECUTE_PHASE_SUCCESS";
      payload: {
        result: string;
        parsedResult: Record<string, unknown> | null;
      };
    }
  | {
      type: "NEXT_PHASE_SUCCESS";
      payload: {
        isFinal: boolean;
        currentPhase?: string;
        completedPhases?: string[];
        availableTemplates?: Template[];
      };
    }
  | {
      type: "PREVIOUS_PHASE_SUCCESS";
      payload: {
        currentPhase: string;
        completedPhases: string[];
        availableTemplates: Template[];
        previousInput?: Record<string, string>;
        previousOutput?: string;
      };
    }
  | {
      type: "OPTIMIZE_SUCCESS";
      payload: {
        result: string;
        parsedResult: Record<string, unknown> | null;
        instruction?: string;
      };
    }
  | { type: "REVERT_TO_VERSION"; payload: number }
  | { type: "SESSION_EXPIRED" }
  | { type: "RESUME_SESSION" }
  | { type: "START_NEW_SESSION" }
  | { type: "RESET" }
  // 新增 action types
  | { type: "GENERATE_OPTIONS_SUCCESS"; payload: GeneratedOption[] }
  | { type: "SELECT_OPTION"; payload: { id: string; content: string } }
  | { type: "SET_EDITING_CONTENT"; payload: string }
  | { type: "CONFIRM_PHASE"; payload: PhaseResult }
  | { type: "REDO_PHASE"; payload: string }
  | { type: "REGENERATE_OPTIONS" };

// ============ Stage 组件 Props ============

export interface StageProps {
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;
}

export interface GenreSelectProps extends StageProps {
  onStartWorkflow: (genre: string | null) => Promise<void>;
  onResumeSession: () => void;
  onClose: (force?: boolean) => void;
}

export interface CompletingProps extends StageProps {
  onComplete: () => Promise<void>;
}

export interface OptionsGeneratingProps extends StageProps {}

export interface OptionsSelectProps extends StageProps {
  onSelectOption: (optionId: string, content: string) => void;
  onRegenerateOptions: () => Promise<void>;
}

export interface EditingProps extends StageProps {
  onConfirm: () => Promise<void>;
  onBackToSelect: () => void;
}

export interface PreviewProps extends StageProps {
  onRedoPhase: (phase: string) => Promise<void>;
  onComplete: () => void;
}

// ============ 常量 ============

export const WORKFLOW_PHASES = [
  {
    phase: "creative",
    displayName: "创意阶段",
    shortName: "创意",
    description: "确定创意方向和市场定位",
    icon: Sparkles,
  },
  {
    phase: "setting",
    displayName: "设定阶段",
    shortName: "设定",
    description: "构建世界观和角色设定",
    icon: Users,
  },
  {
    phase: "framework",
    displayName: "框架阶段",
    shortName: "框架",
    description: "制作故事大纲和章节规划",
    icon: FileText,
  },
  {
    phase: "writing",
    displayName: "创作阶段",
    shortName: "创作",
    description: "生成章节内容",
    icon: PenTool,
  },
] as const;

export const OPTIMIZATION_PRESETS = [
  {
    id: "detail",
    label: "更详细",
    instruction: "请增加更多具体的描写和细节，让内容更加丰富",
  },
  {
    id: "concise",
    label: "更简洁",
    instruction: "请精简内容，突出重点，去除冗余信息",
  },
  {
    id: "creative",
    label: "更有创意",
    instruction: "请增加独特性和新颖感，让内容更有吸引力",
  },
  {
    id: "logical",
    label: "加强逻辑",
    instruction: "请检查并修复逻辑漏洞，加强内容的合理性",
  },
  {
    id: "emotional",
    label: "增强情感",
    instruction: "请增加情感张力，让读者更有代入感",
  },
] as const;

// ============ 初始状态 ============

export const initialState: WorkflowState = {
  stage: "genre_select",
  session: null,
  genres: [],
  selectedGenre: null,
  selectedTemplate: null,
  inputData: {},
  generatedResult: "",
  parsedResult: null,
  projectTitle: "",
  projectDescription: "",
  loading: false,
  optimizing: false,
  optimizationInput: "",
  optimizationHistory: [],
  showHistoryPanel: false,
  pendingSession: null,
  showResumePrompt: false,
  showCloseConfirm: false,
  // 新增字段初始值
  generatedOptions: [],
  selectedOptionId: null,
  editingContent: "",
  phaseResults: [],
};
