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








