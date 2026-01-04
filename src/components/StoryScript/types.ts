/**
 * StoryScript 组件的类型定义
 */

export interface ImportTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  projectId: string;
  onSuccess: (chapterId: string) => void;
}

export interface EstimateData {
  wordCount: number;
  estimatedPanels: number;
  estimatedCredits: number;
  creditsPerCall: number;
  currentCredits: number;
  hasEnoughCredits: boolean;
  warning: string | null;
}

export type ImportStage = "input" | "estimating" | "confirmed" | "generating" | "completed";
