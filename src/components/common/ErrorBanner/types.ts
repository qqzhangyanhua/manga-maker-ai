import { ReactNode } from "react";

export interface ErrorBannerProps {
  message: string;
  action?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}
