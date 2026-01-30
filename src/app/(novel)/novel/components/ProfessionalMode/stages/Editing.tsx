/**
 * 编辑确认界面
 * 用户可编辑选中的方案，确认后进入下一阶段
 */

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { novelTheme } from "../../../theme";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { WORKFLOW_PHASES, EditingProps } from "../types";

export function Editing({
  state,
  dispatch,
  onConfirm,
  onBackToSelect,
}: EditingProps) {
  const { editingContent, phaseResults, loading } = state;

  const currentPhaseIndex = phaseResults.length;
  const currentPhaseInfo = WORKFLOW_PHASES[currentPhaseIndex] || null;

  const handleContentChange = (value: string) => {
    dispatch({ type: "SET_EDITING_CONTENT", payload: value });
  };

  return (
    <div className="space-y-6">
      <ProgressIndicator state={state} />

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          {currentPhaseInfo?.displayName} - 编辑确认
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          您可以对选中的方案进行编辑调整，满意后确认进入下一阶段
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">
          方案内容（可编辑）
        </label>
        <Textarea
          value={editingContent}
          onChange={(e) => handleContentChange(e.target.value)}
          rows={16}
          className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 resize-none font-mono text-sm"
          placeholder="方案内容..."
        />
        <p className="text-xs text-zinc-500">
          提示：您可以自由修改内容，系统会保存您编辑后的版本
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onBackToSelect}
          className={novelTheme.button.outline}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回重选
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading || !editingContent.trim()}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              确认，进入下一阶段
              <Check className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
