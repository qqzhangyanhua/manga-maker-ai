export interface ProgressIndicatorProps {
  completionRate: number; // 0-100
  totalChapters: number;
  completedChapters: number;
  totalPanels: number;
  completedPanels: number;
  stageLabel: string;
  estimatedMinutes?: number;
  className?: string;
}
