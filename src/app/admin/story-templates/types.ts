export interface StoryTemplate {
  id: string;
  name: string;
  category: "suspense" | "romance" | "adventure" | "scifi" | "daily" | "fantasy";
  description: string | null;
  structure: Record<string, unknown>; // JSON structure
  prompts: Record<string, unknown>; // JSON prompts
  is_public: boolean;
  user_id: string | null; // null = system template
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export type StoryTemplateFormData = {
  name: string;
  category: "suspense" | "romance" | "adventure" | "scifi" | "daily" | "fantasy";
  description: string;
  structure: Record<string, unknown>;
  prompts: Record<string, unknown>;
  is_public: boolean;
  is_system: boolean; // 是否为系统模板 (user_id = null)
};

export const STORY_CATEGORIES = [
  { name: "悬疑", value: "suspense" },
  { name: "爱情", value: "romance" },
  { name: "冒险", value: "adventure" },
  { name: "科幻", value: "scifi" },
  { name: "日常", value: "daily" },
  { name: "奇幻", value: "fantasy" },
] as const;

// 默认的 structure 和 prompts 模板
export const DEFAULT_STRUCTURE = {
  acts: [
    { name: "第一幕：开端", description: "介绍角色和背景" },
    { name: "第二幕：发展", description: "冲突升级" },
    { name: "第三幕：高潮", description: "矛盾爆发" },
    { name: "第四幕：结局", description: "问题解决" },
  ],
  plotPoints: [
    "开场钩子",
    "激励事件",
    "中点转折",
    "黑暗时刻",
    "高潮决战",
    "结局收尾",
  ],
};

export const DEFAULT_PROMPTS = {
  systemPrompt: "你是一个专业的故事编剧，擅长创作引人入胜的故事。",
  examplePremises: [
    "一个侦探调查一起神秘失踪案",
    "两个陌生人在旅途中相遇",
    "一支探险队发现了未知文明",
  ],
};
