export interface TrialPanel {
  order: number;
  description: string;
  imageUrl: string;
}

export interface TrialGenerateRequest {
  prompt: string;
  styleId?: string;
  fingerprint: string;
}

export interface TrialGenerateResponse {
  success: boolean;
  panels: TrialPanel[];
  remainingTrials: number;
  trialId: string;
  error?: string;
}

export interface TrialRateLimitResponse {
  remaining: number;
  resetAt: string;
}

export type TrialStep = "input" | "generating" | "result";

export interface TrialState {
  step: TrialStep;
  prompt: string;
  selectedStyle: string | null;
  progress: number;
  progressText: string;
  result: TrialGenerateResponse | null;
  error: string | null;
  remainingTrials: number;
}

export const TRIAL_STYLES = [
  { id: "manga", name: "日式漫画", description: "经典日本漫画风格" },
  { id: "american", name: "美式漫画", description: "美国超级英雄漫画风格" },
  { id: "webtoon", name: "韩式条漫", description: "韩国网络漫画风格" },
] as const;

export const TRIAL_EXAMPLES = [
  "一个程序员加班到深夜，被办公室的猫咪救赎的温馨故事",
  "勇敢的少女在魔法森林中与神秘生物成为朋友",
  "两个老朋友在咖啡馆重逢，回忆起学生时代的趣事",
  "机器人第一次看到日出时产生了自我意识",
];
