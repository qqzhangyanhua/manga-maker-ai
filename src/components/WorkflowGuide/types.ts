export interface StepProgress {
  completed: boolean;
  count?: number;
  total?: number;
  title?: string;
  id?: string;
}

export interface WorkflowProgress {
  currentStep: 1 | 2 | 3 | 4;
  steps: {
    story: StepProgress & {
      storyId?: string;
      storyTitle?: string;
    };
    characters: StepProgress;
    panels: StepProgress & {
      generated?: number;
    };
    exported: StepProgress;
  };
}

export interface WorkflowStepConfig {
  step: number;
  title: string;
  description: string;
  href: string;
  completedText: (progress: WorkflowProgress) => string;
  icon: "story" | "character" | "panel" | "export";
}

export const WORKFLOW_STEPS: WorkflowStepConfig[] = [
  {
    step: 1,
    title: "构思故事",
    description: "输入故事前提，AI 生成大纲",
    href: "/story",
    completedText: (p) =>
      p.steps.story.storyTitle
        ? `已创建：${p.steps.story.storyTitle}`
        : "已完成",
    icon: "story",
  },
  {
    step: 2,
    title: "设计角色",
    description: "创建或选择角色绑定到故事",
    href: "/assets",
    completedText: (p) =>
      p.steps.characters.count
        ? `已添加 ${p.steps.characters.count} 个角色`
        : "已完成",
    icon: "character",
  },
  {
    step: 3,
    title: "生成分镜",
    description: "生成分镜图像",
    href: "/scripts",
    completedText: (p) =>
      p.steps.panels.generated !== undefined
        ? `${p.steps.panels.generated}/${p.steps.panels.total} 已生成`
        : "已完成",
    icon: "panel",
  },
  {
    step: 4,
    title: "导出作品",
    description: "导出为 PNG/PDF",
    href: "/projects",
    completedText: () => "已完成",
    icon: "export",
  },
];
