export type LoadingStepStatus = "pending" | "loading" | "completed" | "error";

export interface LoadingStep {
  label: string;
  status: LoadingStepStatus;
}

export interface LoadingStateProps {
  title: string;
  steps: LoadingStep[];
  className?: string;
}
