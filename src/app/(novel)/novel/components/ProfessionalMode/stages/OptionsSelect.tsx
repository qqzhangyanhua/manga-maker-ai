/**
 * 方案选择界面
 * 展示 3 个方案卡片，用户选择其一
 */

import { RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { novelTheme } from "../../../theme";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { WORKFLOW_PHASES, OptionsSelectProps } from "../types";

export function OptionsSelect({
  state,
  dispatch,
  onSelectOption,
  onRegenerateOptions,
}: OptionsSelectProps) {
  const { generatedOptions, phaseResults, loading } = state;

  const currentPhaseIndex = phaseResults.length;
  const currentPhaseInfo = WORKFLOW_PHASES[currentPhaseIndex] || null;

  const handleSelect = (optionId: string, content: string) => {
    onSelectOption(optionId, content);
  };

  return (
    <div className="space-y-6">
      <ProgressIndicator state={state} />

      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white">
          {currentPhaseInfo?.displayName} - 选择您喜欢的方向
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          AI 为您生成了 3 个不同风格的方案，请选择最符合您创作意图的一个
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {generatedOptions.map((option, index) => (
          <div
            key={option.id}
            className={cn(
              "group relative rounded-lg border border-zinc-700 bg-zinc-800/50 p-4",
              "hover:border-purple-500/50 hover:bg-zinc-800 transition-all cursor-pointer"
            )}
            onClick={() => handleSelect(option.id, option.content)}
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-5 w-5 text-purple-400" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <h4 className="font-medium text-white text-sm line-clamp-1">
                  {option.summary}
                </h4>
              </div>

              <div className="text-sm text-zinc-400 line-clamp-6 whitespace-pre-wrap">
                {option.content.slice(0, 300)}
                {option.content.length > 300 && "..."}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option.id, option.content);
                }}
              >
                选择此方案
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onRegenerateOptions}
          disabled={loading}
          className={novelTheme.button.outline}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          {loading ? "重新生成中..." : "重新生成方案"}
        </Button>
      </div>
    </div>
  );
}
