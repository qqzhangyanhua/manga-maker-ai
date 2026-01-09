"use client";

/**
 * 批量生成对话框
 * 支持批量生成当前章节的所有分镜
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { Panel, Chapter } from "@prisma/client";

interface BatchGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: Chapter | null;
  panels: Panel[];
  onGenerate: (panelIds: string[]) => Promise<void>;
}

export function BatchGenerationDialog({
  open,
  onOpenChange,
  chapter,
  panels,
  onGenerate,
}: BatchGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    total: number;
  }>({ success: 0, failed: 0, total: 0 });

  // 筛选当前章节的分镜
  const chapterPanels = chapter
    ? panels.filter((p) => p.chapter_id === chapter.id)
    : [];

  // 筛选需要生成的分镜（有提示词但没有图片的）
  const panelsToGenerate = chapterPanels.filter(
    (p) => p.prompt_used && !p.generated_image
  );

  const handleGenerate = async () => {
    if (panelsToGenerate.length === 0) return;

    setIsGenerating(true);
    setProgress(0);
    setResults({ success: 0, failed: 0, total: panelsToGenerate.length });

    try {
      // 调用批量生成
      await onGenerate(panelsToGenerate.map((p) => p.id));

      // 模拟进度更新（实际应该从 API 获取）
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      // 等待完成
      setTimeout(() => {
        clearInterval(interval);
        setProgress(100);
        setResults({
          success: panelsToGenerate.length,
          failed: 0,
          total: panelsToGenerate.length,
        });
        setIsGenerating(false);
      }, 5000);
    } catch (error) {
      console.error("批量生成失败:", error);
      setIsGenerating(false);
      setResults((prev) => ({
        ...prev,
        failed: prev.total - prev.success,
      }));
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onOpenChange(false);
      // 重置状态
      setTimeout(() => {
        setProgress(0);
        setResults({ success: 0, failed: 0, total: 0 });
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#1a1a1f] border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-orange-400" />
            批量生成分镜图片
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {chapter && `第 ${chapter.chapter_order} 章`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {chapterPanels.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">总分镜数</div>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-400">
                {panelsToGenerate.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">待生成</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {chapterPanels.filter((p) => p.generated_image).length}
              </div>
              <div className="text-xs text-gray-400 mt-1">已完成</div>
            </div>
          </div>

          {/* 进度条 */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">生成进度</span>
                <span className="text-white font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {results.success} / {results.total} 已完成
                </span>
                {results.failed > 0 && (
                  <span className="text-red-400">{results.failed} 失败</span>
                )}
              </div>
            </div>
          )}

          {/* 结果显示 */}
          {!isGenerating && results.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">
                  成功生成 {results.success} 个分镜
                </span>
              </div>
              {results.failed > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm">失败 {results.failed} 个</span>
                </div>
              )}
            </div>
          )}

          {/* 提示信息 */}
          {panelsToGenerate.length === 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-400">
              当前章节没有需要生成的分镜。只有包含提示词且未生成图片的分镜才会被处理。
            </div>
          )}

          {panelsToGenerate.length > 0 && !isGenerating && results.total === 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-2">
              <div className="text-sm text-orange-400 font-medium">
                即将生成 {panelsToGenerate.length} 个分镜
              </div>
              <div className="text-xs text-gray-400">
                • 使用当前配置的模型和参数
                <br />
                • 预计耗时：{Math.ceil(panelsToGenerate.length * 0.5)} 分钟
                <br />• 消耗额度：{panelsToGenerate.length} 点
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            {isGenerating ? "生成中..." : results.total > 0 ? "关闭" : "取消"}
          </Button>
          {panelsToGenerate.length > 0 && results.total === 0 && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始生成
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
