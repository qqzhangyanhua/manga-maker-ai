"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizationResult {
  analysis: string;
  optimized: string;
  suggestions: string[];
  original: string;
}

interface PromptOptimizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalPrompt: string;
  style: string | null;
  character: string | null;
  onApply: (optimizedPrompt: string) => void;
}

const PromptOptimizationDialog = ({
  open,
  onOpenChange,
  originalPrompt,
  style,
  character,
  onApply,
}: PromptOptimizationDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOptimize = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/prompt/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: originalPrompt,
          style,
          character,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "优化失败");
      }

      const data = await res.json();
      setResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络错误，请稍后再试";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.optimized) {
      navigator.clipboard.writeText(result.optimized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyOptimized = () => {
    if (result?.optimized) {
      onApply(result.optimized);
      onOpenChange(false);
    }
  };

  // 自动触发优化（当对话框打开时）
  useState(() => {
    if (open && !result && !isLoading && originalPrompt) {
      handleOptimize();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            AI 描述优化助手
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 原始描述 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-muted rounded-full" />
              <h3 className="font-semibold text-muted-foreground">你的原始描述</h3>
            </div>
            <div className="comic-card p-4 bg-muted/30">
              <p className="text-foreground">{originalPrompt}</p>
            </div>
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">AI 正在分析并优化...</p>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="comic-card p-4 bg-destructive/10 border-destructive/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive mb-1">优化失败</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleOptimize}
                  >
                    重试
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 优化结果 */}
          {result && (
            <>
              {/* AI 分析 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">AI 分析</h3>
                </div>
                <div className="relative">
                  {/* 漫画风格对话气泡 */}
                  <div className="comic-card p-4 bg-primary/5 border-primary/30 relative">
                    <p className="text-sm text-foreground">{result.analysis}</p>
                    {/* 气泡尾巴 */}
                    <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-primary/30 border-b-8 border-b-transparent" />
                  </div>
                </div>
              </div>

              {/* 优化后描述 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                    <h3 className="font-semibold text-primary">AI 优化后的描述</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        复制
                      </>
                    )}
                  </Button>
                </div>
                <div className="comic-card p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary">
                  <p className="text-foreground leading-relaxed">{result.optimized}</p>
                </div>
              </div>

              {/* 优化建议 */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-accent rounded-full" />
                    <h3 className="font-semibold text-foreground">优化建议</h3>
                  </div>
                  <div className="grid gap-2">
                    {result.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border hover:border-accent transition-colors"
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                          "bg-accent/20 text-accent"
                        )}>
                          {index + 1}
                        </div>
                        <p className="text-sm text-muted-foreground pt-0.5">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 操作按钮 */}
          {result && (
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                保持原样
              </Button>
              <Button
                variant="comic"
                className="flex-1"
                onClick={handleApplyOptimized}
              >
                <Sparkles className="w-4 h-4" />
                应用优化
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromptOptimizationDialog;
