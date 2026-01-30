/**
 * 优化面板组件
 */

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OPTIMIZATION_PRESETS, WorkflowState, WorkflowAction } from "../types";

interface OptimizationPanelProps {
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;
  onOptimize: (instruction?: string) => Promise<void>;
}

export function OptimizationPanel({
  state,
  dispatch,
  onOptimize,
}: OptimizationPanelProps) {
  const { optimizing, optimizationInput, generatedResult } = state;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-zinc-300">AI 智能优化</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {OPTIMIZATION_PRESETS.map((preset) => (
          <Badge
            key={preset.id}
            variant="outline"
            className="cursor-pointer hover:bg-purple-500/20 hover:border-purple-500/50 transition-colors text-xs"
            onClick={() => onOptimize(preset.instruction)}
          >
            {preset.label}
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={optimizationInput}
          onChange={(e) =>
            dispatch({ type: "SET_OPTIMIZATION_INPUT", payload: e.target.value })
          }
          placeholder="或输入自定义优化指令..."
          className="flex-1 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          onKeyDown={(e) =>
            e.key === "Enter" && !optimizing && onOptimize()
          }
        />
        <Button
          onClick={() => onOptimize()}
          disabled={optimizing || !generatedResult}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {optimizing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              优化中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              优化
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
