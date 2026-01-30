/**
 * 预览汇总界面
 * 四阶段完成后展示所有结果，支持回退重做
 */

import { Check, RotateCcw, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { novelTheme } from "../../../theme";
import { WORKFLOW_PHASES, PreviewProps } from "../types";

export function Preview({
  state,
  dispatch,
  onRedoPhase,
  onComplete,
}: PreviewProps) {
  const { phaseResults, projectTitle, projectDescription, loading } = state;

  const handleTitleChange = (value: string) => {
    dispatch({ type: "SET_PROJECT_TITLE", payload: value });
  };

  const handleDescriptionChange = (value: string) => {
    dispatch({ type: "SET_PROJECT_DESCRIPTION", payload: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-white">创作完成 - 预览汇总</h3>
        <p className="text-sm text-zinc-400 mt-1">
          请确认以下创作内容，您可以点击"重做"返回任意阶段修改
        </p>
      </div>

      <div className="space-y-3">
        {WORKFLOW_PHASES.map((phaseInfo) => {
          const result = phaseResults.find((r) => r.phase === phaseInfo.phase);
          const PhaseIcon = phaseInfo.icon;

          return (
            <div
              key={phaseInfo.phase}
              className={cn(
                "rounded-lg border bg-zinc-800/50 overflow-hidden",
                result ? "border-green-500/30" : "border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      result ? "bg-green-500/20" : "bg-zinc-700/50"
                    )}
                  >
                    {result ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <PhaseIcon className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">
                      {phaseInfo.displayName}
                    </h4>
                    {result && (
                      <p className="text-xs text-zinc-400">{result.summary}</p>
                    )}
                  </div>
                </div>
                {result && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRedoPhase(phaseInfo.phase)}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    重做
                  </Button>
                )}
              </div>
              {result && (
                <div className="px-4 py-3 max-h-32 overflow-y-auto">
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap line-clamp-4">
                    {result.content.slice(0, 500)}
                    {result.content.length > 500 && "..."}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            项目名称 *
          </label>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="输入小说标题..."
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            项目描述（可选）
          </label>
          <textarea
            value={projectDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="简要描述你的小说故事..."
            rows={2}
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "SET_STAGE", payload: "genre_select" })}
          className={novelTheme.button.outline}
        >
          取消
        </Button>
        <Button
          onClick={onComplete}
          disabled={loading || !projectTitle.trim()}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              创建中...
            </>
          ) : (
            <>
              创建项目
              <Check className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
