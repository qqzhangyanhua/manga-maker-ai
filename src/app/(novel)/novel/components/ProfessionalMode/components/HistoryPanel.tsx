/**
 * 历史面板组件
 */

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkflowState, WorkflowAction } from "../types";

interface HistoryPanelProps {
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;
}

export function HistoryPanel({ state, dispatch }: HistoryPanelProps) {
  const { optimizationHistory, showHistoryPanel } = state;

  if (!showHistoryPanel || optimizationHistory.length <= 1) {
    return null;
  }

  const handleRevert = (version: number) => {
    dispatch({ type: "REVERT_TO_VERSION", payload: version });
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 space-y-2 mb-4">
      <div className="text-sm font-medium text-zinc-300">优化历史</div>
      <div className="space-y-1 max-h-[120px] overflow-y-auto">
        {optimizationHistory.map((item, index) => (
          <div
            key={item.version}
            className={cn(
              "flex items-center justify-between p-2 rounded text-sm",
              index === optimizationHistory.length - 1
                ? "bg-purple-500/10 border border-purple-500/30"
                : "bg-zinc-800/50 hover:bg-zinc-700/50"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">v{item.version}</span>
              {item.instruction && (
                <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                  {item.instruction}
                </span>
              )}
            </div>
            {index < optimizationHistory.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevert(item.version)}
                className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                <Undo2 className="h-3 w-3 mr-1" />
                恢复
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
