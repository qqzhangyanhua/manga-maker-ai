/**
 * 完成界面
 */

import { Loader2, Check, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { novelTheme } from "../../../theme";
import { CompletingProps } from "../types";

export function Completing({ state, dispatch, onComplete }: CompletingProps) {
  const { loading, projectTitle, projectDescription } = state;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-white">创作流程完成</h3>
        <p className="text-sm text-zinc-400 mt-1">请为您的小说项目命名</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            项目标题 *
          </label>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) =>
              dispatch({ type: "SET_PROJECT_TITLE", payload: e.target.value })
            }
            placeholder="输入小说标题..."
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            项目描述（可选）
          </label>
          <Textarea
            value={projectDescription}
            onChange={(e) =>
              dispatch({
                type: "SET_PROJECT_DESCRIPTION",
                payload: e.target.value,
              })
            }
            placeholder="简要描述你的小说故事..."
            rows={3}
            className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "SET_STAGE", payload: "preview" })}
          className={novelTheme.button.outline}
        >
          返回
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
