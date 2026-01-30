/**
 * 专题选择界面
 */

import { Loader2, ArrowRight, History, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { novelTheme } from "../../../theme";
import { GenreSelectProps } from "../types";

export function GenreSelect({
  state,
  dispatch,
  onStartWorkflow,
  onResumeSession,
  onClose,
}: GenreSelectProps) {
  const {
    genres,
    selectedGenre,
    loading,
    showResumePrompt,
    pendingSession,
  } = state;

  return (
    <div className="space-y-6">
      {showResumePrompt && pendingSession && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">
              发现未完成的创作
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            您有一个未完成的创作会话，是否继续？
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onResumeSession}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              继续创作
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatch({ type: "START_NEW_SESSION" })}
              className={novelTheme.button.outline}
            >
              开始新的
            </Button>
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">选择创作类型</h3>
        <p className="text-sm text-zinc-400">
          选择一个专题类型以获取针对性的创作模板
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button
          onClick={() =>
            dispatch({ type: "SET_SELECTED_GENRE", payload: "general" })
          }
          className={cn(
            "p-4 rounded-lg border-2 border-dashed transition-all text-left",
            selectedGenre === "general"
              ? "border-purple-500 bg-purple-500/10"
              : "border-zinc-600 bg-zinc-800/30 hover:border-zinc-500"
          )}
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-zinc-400" />
            <span className="font-medium text-zinc-300">通用模板</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">适用于所有类型</div>
        </button>

        {genres.map((genre) => (
          <button
            key={genre.genre}
            onClick={() =>
              dispatch({ type: "SET_SELECTED_GENRE", payload: genre.genre })
            }
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              selectedGenre === genre.genre
                ? "border-purple-500 bg-purple-500/10"
                : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
            )}
          >
            <div className="font-medium text-white">{genre.display_name}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {genre.count} 个模板
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => onClose(true)}
          className={novelTheme.button.outline}
        >
          取消
        </Button>
        <Button
          onClick={() => onStartWorkflow(selectedGenre)}
          disabled={loading}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              启动中...
            </>
          ) : (
            <>
              开始创作
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
