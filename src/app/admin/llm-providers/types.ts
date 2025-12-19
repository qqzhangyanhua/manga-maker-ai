export type ProviderForm = {
  provider_type: string;
  provider_name: string;
  model: string;
  base_url: string;
  api_key: string;
  priority: number;
  enabled: boolean;
  desc?: string;
  credits_cost: number;
};

export type Provider = ProviderForm & {
  id: number;
};

export const KNOWN_PROVIDER_TYPES = [
  "storyboard",
  "story_generator",
  "chapter_generator",
  "script_analyzer",
  "workflow",
  "image_generation",
  "image_generation_turnaround",
  "image_generation_expression",
  "image_generation_outfit",
  "image_edit",
  "prompt_optimizer",
  "character_analyzer",
  "story_character_generator",
] as const;

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  storyboard: "分镜系统",
  story_generator: "故事生成",
  chapter_generator: "章节生成",
  script_analyzer: "脚本分析",
  workflow: "工作流",
  image_generation: "通用图像生成",
  image_generation_turnaround: "三视图生成",
  image_generation_expression: "表情生成",
  image_generation_outfit: "服装生成",
  image_edit: "图像编辑",
  prompt_optimizer: "提示词优化",
  character_analyzer: "角色分析",
  story_character_generator: "角色生成器",
};

export const getProviderTypeLabel = (type: string): string => {
  const label = PROVIDER_TYPE_LABELS[type];
  return label ? `${label} (${type})` : type;
};

export const CUSTOM_TYPE_VALUE = "__custom__";

export const emptyForm: ProviderForm = {
  provider_type: "",
  provider_name: "openai",
  model: "",
  base_url: "https://api.openai.com",
  api_key: "",
  priority: 1,
  enabled: true,
  desc: "",
  credits_cost: 0,
};










