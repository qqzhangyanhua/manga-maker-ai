/**
 * 提示词模板管理类型定义
 */

export interface ChainOfThoughtLevel {
  level: string;
  title: string;
  content: string[];
}

export interface TemplateSlot {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  slot_type: "input" | "output";
  data_type: string;
  required: boolean;
  default_value: string | null;
  options: Record<string, unknown> | null;
}

export interface PromptTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  phase: string;
  category: string;
  genre: string | null;
  function_code: string | null;
  system_role: string;
  chain_of_thought: ChainOfThoughtLevel[];
  output_schema: Record<string, unknown> | null;
  sort_order: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  slots?: TemplateSlot[];
}

export interface PromptTemplateFormData {
  code: string;
  name: string;
  description: string;
  phase: string;
  category: string;
  genre: string;
  function_code: string;
  system_role: string;
  chain_of_thought: ChainOfThoughtLevel[];
  output_schema: string; // JSON string for editing
  sort_order: number;
  is_active: boolean;
}

export interface PromptTemplateFilter extends Record<string, unknown> {
  phase?: string;
  genre?: string;
  function_code?: string;
  search?: string;
  includeInactive?: boolean;
}

// 8 个功能代码
export const FUNCTION_CODES = [
  { value: "creative_generate_options", label: "创意阶段 - 生成方案" },
  { value: "setting_generate_options", label: "设定阶段 - 生成方案" },
  { value: "framework_generate_options", label: "框架阶段 - 生成方案" },
  { value: "writing_generate_options", label: "创作阶段 - 生成方案" },
  { value: "optimize_result", label: "优化结果" },
  { value: "generate_project_info", label: "生成项目信息" },
  { value: "generate_style_guide", label: "生成风格指导" },
  { value: "convert_text_to_outlines", label: "文本转大纲" },
];

// 阶段选项
export const PHASE_OPTIONS = [
  { value: "creative", label: "创意阶段" },
  { value: "setting", label: "设定阶段" },
  { value: "framework", label: "框架阶段" },
  { value: "writing", label: "创作阶段" },
  { value: "advanced", label: "进阶技巧" },
  { value: "analysis", label: "数据分析" },
  { value: "commercial", label: "商业化" },
  { value: "auxiliary", label: "辅助工具" },
];

export function getEmptyForm(): PromptTemplateFormData {
  return {
    code: "",
    name: "",
    description: "",
    phase: "creative",
    category: "general",
    genre: "",
    function_code: "",
    system_role: "",
    chain_of_thought: [],
    output_schema: "",
    sort_order: 0,
    is_active: true,
  };
}

export function getPhaseLabel(phase: string): string {
  return PHASE_OPTIONS.find((p) => p.value === phase)?.label || phase;
}

export function getFunctionCodeLabel(code: string): string {
  return FUNCTION_CODES.find((c) => c.value === code)?.label || code;
}
