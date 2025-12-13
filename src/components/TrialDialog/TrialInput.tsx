"use client";

import { Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRIAL_STYLES, TRIAL_EXAMPLES, TrialState } from "./types";

interface TrialInputProps {
  state: TrialState;
  onPromptChange: (prompt: string) => void;
  onStyleChange: (styleId: string | null) => void;
  onGenerate: () => void;
}

export function TrialInput({
  state,
  onPromptChange,
  onStyleChange,
  onGenerate,
}: TrialInputProps) {
  const canGenerate = state.prompt.trim().length > 10 && state.remainingTrials > 0;

  const handleExampleClick = (example: string) => {
    onPromptChange(example);
  };

  return (
    <div className="space-y-6">
      {/* 输入区域 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          输入你的故事想法
        </label>
        <textarea
          value={state.prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="例如：一个程序员加班到深夜，被猫咪救赎的故事..."
          className={cn(
            "w-full h-28 p-4 rounded-lg bg-muted/50 border border-border",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            "resize-none transition-all duration-200"
          )}
          maxLength={200}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>AI 将为你生成 4 格漫画预览</span>
          <span>{state.prompt.length}/200</span>
        </div>
      </div>

      {/* 示例提示 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="w-4 h-4" />
          <span>试试这些创意</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRIAL_EXAMPLES.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs",
                "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                "transition-colors truncate max-w-[200px]"
              )}
              title={example}
            >
              {example.slice(0, 20)}...
            </button>
          ))}
        </div>
      </div>

      {/* 风格选择 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          选择漫画风格
        </label>
        <div className="grid grid-cols-3 gap-3">
          {TRIAL_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                state.selectedStyle === style.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="font-medium text-sm text-foreground">
                {style.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {style.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {state.error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {state.error}
        </div>
      )}

      {/* 剩余次数和生成按钮 */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-muted-foreground">
          今日剩余体验次数：
          <span
            className={cn(
              "font-semibold",
              state.remainingTrials > 0 ? "text-primary" : "text-destructive"
            )}
          >
            {state.remainingTrials}/3
          </span>
        </div>
        <Button
          variant="comic"
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          生成预览
        </Button>
      </div>

      {state.remainingTrials === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          今日体验次数已用完，
          <a href="/auth/register" className="text-primary hover:underline">
            注册账号
          </a>
          获取更多生成配额
        </p>
      )}
    </div>
  );
}
