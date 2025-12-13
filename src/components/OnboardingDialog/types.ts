export type OnboardingChoice = "trial" | "full" | "explore";

export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  icon: "story" | "character" | "panel" | "export";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    title: "输入故事想法",
    description: "AI 生成剧本大纲",
    icon: "story",
  },
  {
    step: 2,
    title: "创建/选择角色",
    description: "保持风格一致",
    icon: "character",
  },
  {
    step: 3,
    title: "生成分镜图像",
    description: "AI 绘制每一格",
    icon: "panel",
  },
  {
    step: 4,
    title: "导出完成作品",
    description: "PNG/PDF/打印",
    icon: "export",
  },
];

export const ONBOARDING_CHOICES = [
  {
    id: "trial" as const,
    title: "快速体验",
    description: "输入一句话，30秒生成4格漫画预览",
    recommended: true,
  },
  {
    id: "full" as const,
    title: "完整创作",
    description: "从故事开始，完整体验创作流程",
    recommended: false,
  },
  {
    id: "explore" as const,
    title: "浏览示例",
    description: "查看其他用户的漫画作品",
    recommended: false,
  },
];

export const STORAGE_KEY = "onboarding_completed";
export const STORAGE_CHOICE_KEY = "onboarding_choice";
