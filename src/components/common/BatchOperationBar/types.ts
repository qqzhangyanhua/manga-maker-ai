import { ReactNode } from "react";

export interface BatchOperationBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchGenerate?: () => void;
  onBatchDelete?: () => void;
  isGenerating?: boolean;
  generatingProgress?: {
    current: number;
    total: number;
  };
  className?: string;
}
