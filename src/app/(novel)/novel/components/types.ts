/**
 * 灵感模式对话框类型定义
 */

export interface Question {
  step: number;
  question: string;
  type: "choice" | "text";
  options?: string[];
  hint: string;
  suggestions?: string[];
  is_last?: boolean;
  total_steps: number;
  progress: number;
}

export interface StoryDraft {
  title_suggestions: string[];
  description: string;
  protagonist: {
    name: string;
    role: string;
    description: string;
    traits: string[];
    appearance: string;
    background: string;
  };
  world_setting: {
    locations: Array<{ name: string; description: string }>;
    factions: Array<{ name: string; description: string }>;
    rules: Array<{ name: string; description: string }>;
    timeline: Array<{ time: string; event: string }>;
  };
  outline: Array<{
    chapter_number: number;
    title: string;
    outline: string;
    key_events: string[];
    characters: string[];
    plot_lines: string[];
    is_key_chapter: boolean;
  }>;
}

export type InspirationFlowState =
  | { stage: "welcome" }
  | {
      stage: "questioning";
      sessionId: string;
      question: Question;
      currentAnswer: string;
      answers: Record<number, string>;
    }
  | {
      stage: "generating";
      sessionId: string;
      answers: Record<number, string>; // 保留答案以便失败后重试
    }
  | {
      stage: "generate_failed";
      sessionId: string;
      answers: Record<number, string>;
      errorMessage: string;
    }
  | {
      stage: "result";
      sessionId: string;
      draft: StoryDraft;
      selectedTitle: string;
      answers: Record<number, string>;
    };
