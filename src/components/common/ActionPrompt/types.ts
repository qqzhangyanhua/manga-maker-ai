import { ReactNode } from "react";

export type ActionPromptVariant = "info" | "success" | "warning";

export interface ActionPromptProps {
  icon: ReactNode;
  message: string;
  action: ReactNode;
  variant?: ActionPromptVariant;
  className?: string;
}
