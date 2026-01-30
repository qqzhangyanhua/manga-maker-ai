/**
 * 结果展示界面
 */

import { Loader2, ArrowRight, Check, RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { novelTheme } from "../../../theme";
import { StructuredResultView } from "../../StructuredResultView";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { OptimizationPanel } from "../components/OptimizationPanel";
import { HistoryPanel } from "../components/HistoryPanel";
import { WORKFLOW_PHASES, ResultProps } from "../types";

export function Result({
  state,
  dispatch,
  onOptimize,
  onNextPhase,
}: ResultProps) {
  const {
    session,
    generatedResult,
    parsedResult,
    loading,
    optimizing,
    optimizationHistory,
    showHistoryPanel,
  } = state;

  const currentPhaseInfo = session
    ? WORKFLOW_PHASES.find((p) => p.phase === session.current_phase)
    : null;

  const currentPhaseIndex = session
    ? WORKFLOW_PHASES.findIndex((p) => p.phase === session.current_phase)
    : -1;

  const handleResultChange = (newResult: string) => {
    dispatch({ type: "SET_GENERATED_RESULT", payload: newResult });
    try {
      const parsed = JSON.parse(newResult);
      dispatch({ type: "SET_PARSED_RESULT", payload: parsed });
    } catch {
      dispatch({ type: "SET_PARSED_RESULT", payload: null });
    }
  };

  return (
    <div className="space-y-4">
      <ProgressIndicator state={state} />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {currentPhaseInfo?.displayName} - 生成结果
        </h3>
        {optimizationHistory.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              dispatch({
                type: "SET_SHOW_HISTORY_PANEL",
                payload: !showHistoryPanel,
              })
            }
            className="text-zinc-400 hover:text-zinc-200"
          >
            <History className="mr-2 h-4 w-4" />
            历史 ({optimizationHistory.length})
          </Button>
        )}
      </div>

      <HistoryPanel state={state} dispatch={dispatch} />

      <StructuredResultView
        result={generatedResult}
        parsedResult={parsedResult}
        phase={session?.current_phase || ""}
        editable={true}
        onResultChange={handleResultChange}
      />

      <OptimizationPanel
        state={state}
        dispatch={dispatch}
        onOptimize={onOptimize}
      />

      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "SET_STAGE", payload: "workflow" })}
          className={novelTheme.button.outline}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          重新生成
        </Button>
        <Button
          onClick={onNextPhase}
          disabled={loading || optimizing}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : currentPhaseIndex >= WORKFLOW_PHASES.length - 1 ? (
            <>
              完成创作
              <Check className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              下一阶段
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
