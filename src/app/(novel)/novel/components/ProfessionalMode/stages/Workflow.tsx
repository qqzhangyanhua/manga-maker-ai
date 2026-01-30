/**
 * 工作流界面
 */

import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { novelTheme } from "../../../theme";
import { TemplateSelector } from "../../TemplateSelector";
import { WorkflowStep } from "../../WorkflowStep";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { WORKFLOW_PHASES, WorkflowStageProps } from "../types";

export function Workflow({
  state,
  dispatch,
  onExecutePhase,
  onPreviousPhase,
  onClose,
}: WorkflowStageProps) {
  const { session, selectedTemplate, inputData, loading } = state;

  const currentPhaseInfo = session
    ? WORKFLOW_PHASES.find((p) => p.phase === session.current_phase)
    : null;

  const currentPhaseIndex = session
    ? WORKFLOW_PHASES.findIndex((p) => p.phase === session.current_phase)
    : -1;

  return (
    <div className="space-y-4">
      <ProgressIndicator state={state} />

      {currentPhaseInfo && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            {currentPhaseInfo.displayName}
          </h3>
          <p className="text-sm text-zinc-400">{currentPhaseInfo.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">选择模板</h4>
          <TemplateSelector
            templates={session?.available_templates || []}
            selectedTemplate={selectedTemplate}
            onSelect={(template) =>
              dispatch({ type: "SET_SELECTED_TEMPLATE", payload: template })
            }
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">输入参数</h4>
          <WorkflowStep
            template={selectedTemplate}
            inputData={inputData}
            onInputChange={(data) =>
              dispatch({ type: "SET_INPUT_DATA", payload: data })
            }
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className={novelTheme.button.outline}
          >
            取消
          </Button>
          {currentPhaseIndex > 0 && (
            <Button
              variant="outline"
              onClick={onPreviousPhase}
              disabled={loading}
              className={novelTheme.button.outline}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              上一步
            </Button>
          )}
        </div>
        <Button
          onClick={onExecutePhase}
          disabled={loading || !selectedTemplate}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              开始生成
              <Sparkles className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
