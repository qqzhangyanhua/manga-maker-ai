/**
 * 生成中界面
 */

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORKFLOW_PHASES, GeneratingProps } from "../types";

export function Generating({ state, onCancel }: GeneratingProps) {
  const { session, selectedTemplate } = state;

  const currentPhaseInfo = session
    ? WORKFLOW_PHASES.find((p) => p.phase === session.current_phase)
    : null;

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-pulse" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">AI 正在创作中...</h3>
        <p className="text-sm text-zinc-400 mt-1">
          {currentPhaseInfo?.displayName}: {selectedTemplate?.name}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="text-zinc-500 hover:text-zinc-300"
      >
        <X className="mr-2 h-4 w-4" />
        取消生成
      </Button>
    </div>
  );
}
