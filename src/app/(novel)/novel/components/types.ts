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

/**
 * 问题历史记录项（用于上一步功能）
 */
export interface QuestionHistoryItem {
  question: Question;
  answer: string;
}

export type InspirationFlowState =
  | { stage: "welcome" }
  | {
      stage: "questioning";
      sessionId: string;
      question: Question;
      currentAnswer: string;
      answers: Record<number, string>;
      questionsHistory: QuestionHistoryItem[]; // 问题历史，用于上一步
    }
  | {
      stage: "generating";
      sessionId: string;
      answers: Record<number, string>;
      questionsHistory: QuestionHistoryItem[];
    }
  | {
      stage: "generate_failed";
      sessionId: string;
      answers: Record<number, string>;
      questionsHistory: QuestionHistoryItem[];
      errorMessage: string;
    }
  | {
      stage: "result";
      sessionId: string;
      draft: StoryDraft;
      selectedTitle: string;
      answers: Record<number, string>;
      questionsHistory: QuestionHistoryItem[];
    };

/**
 * 会话恢复数据（localStorage 存储）
 */
export interface SavedSessionData {
  sessionId: string;
  stage: string;
  questionsHistory: QuestionHistoryItem[];
  answers: Record<number, string>;
  currentQuestion?: Question;
  currentAnswer?: string;
  savedAt: number; // 时间戳
}
