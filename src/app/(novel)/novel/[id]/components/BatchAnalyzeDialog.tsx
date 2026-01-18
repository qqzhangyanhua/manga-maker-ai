/**
 * 批量质量分析对话框
 * 一次性分析所有未分析的版本
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { analyzeVersionQuality } from "../services/versionService";
import type { ChapterVersion } from "../types/version";
import { novelTheme } from "../../theme";

interface BatchAnalyzeDialogProps {
  versions: ChapterVersion[];
  onAnalysisComplete: () => Promise<void>;
}

interface AnalysisResult {
  versionId: string;
  versionNumber: number;
  status: "pending" | "analyzing" | "success" | "failed";
  error?: string;
}

export function BatchAnalyzeDialog({
  versions,
  onAnalysisComplete,
}: BatchAnalyzeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);

  // 获取未分析的版本
  const unanalyzedVersions = versions.filter((v) => v.quality_score === null);

  const handleStartAnalysis = async () => {
    if (unanalyzedVersions.length === 0) {
      toast.info("没有需要分析的版本");
      return;
    }

    setIsAnalyzing(true);

    // 初始化结果
    const initialResults: AnalysisResult[] = unanalyzedVersions.map((v) => ({
      versionId: v.id,
      versionNumber: v.version_number,
      status: "pending",
    }));
    setResults(initialResults);

    // 串行分析每个版本（避免并发太多导致 API 限流）
    for (let i = 0; i < unanalyzedVersions.length; i++) {
      const version = unanalyzedVersions[i];

      // 更新当前版本状态为 analyzing
      setResults((prev) =>
        prev.map((r) =>
          r.versionId === version.id ? { ...r, status: "analyzing" } : r
        )
      );

      try {
        await analyzeVersionQuality(version.id);

        // 更新为成功
        setResults((prev) =>
          prev.map((r) =>
            r.versionId === version.id ? { ...r, status: "success" } : r
          )
        );
      } catch (error) {
        // 更新为失败
        const errorMessage =
          error instanceof Error ? error.message : "分析失败";

        setResults((prev) =>
          prev.map((r) =>
            r.versionId === version.id
              ? { ...r, status: "failed", error: errorMessage }
              : r
          )
        );

        console.error(`Version ${version.version_number} analysis failed:`, error);
      }

      // 添加短暂延迟避免 API 限流 (500ms)
      if (i < unanalyzedVersions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsAnalyzing(false);

    // 刷新版本列表
    await onAnalysisComplete();

    // 显示完成通知
    const successCount = initialResults.filter((r) => r.status === "success").length;
    const failedCount = initialResults.filter((r) => r.status === "failed").length;

    toast.success(
      `批量分析完成！成功 ${successCount} 个，失败 ${failedCount} 个`
    );
  };

  const handleClose = () => {
    if (!isAnalyzing) {
      setOpen(false);
      setResults([]);
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const progress =
    results.length > 0 ? ((successCount + failedCount) / results.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="default"
          disabled={unanalyzedVersions.length === 0}
          className="border-purple-500/20 text-zinc-400 hover:bg-purple-500/10 hover:text-purple-300"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          批量分析
          {unanalyzedVersions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 rounded-full">
              {unanalyzedVersions.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>批量质量分析</DialogTitle>
          <DialogDescription>
            对所有未分析的版本进行 AI 质量评分和改进建议分析
          </DialogDescription>
        </DialogHeader>

        {results.length === 0 ? (
          // 初始状态
          <div className="space-y-4 py-4">
            <Alert className="bg-purple-900/20 border-purple-800/30">
              <AlertCircle className="h-4 w-4 text-purple-400" />
              <AlertDescription className="text-purple-300">
                将分析 {unanalyzedVersions.length} 个未评分的版本
                <br />
                预计耗时约 {Math.ceil(unanalyzedVersions.length * 4)} 秒
                <br />
                消耗算力约 {unanalyzedVersions.length * 10} credits
              </AlertDescription>
            </Alert>

            <div className="text-sm text-zinc-400">
              <p>分析内容包括：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>整体质量评分 (0-100 分)</li>
                <li>剧情连贯性、人物塑造、对话质量等多维度评分</li>
                <li>具体改进建议</li>
              </ul>
            </div>
          </div>
        ) : (
          // 分析进行中/完成状态
          <div className="space-y-4 py-4">
            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {isAnalyzing ? "分析进行中..." : "分析完成"}
                </span>
                <span className="text-zinc-300">
                  {successCount + failedCount} / {results.length}
                </span>
              </div>
              <Progress value={progress} className="h-2 bg-zinc-800 [&>div]:bg-purple-500" />
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-zinc-900/40 border border-purple-500/20">
                <div className="text-2xl font-bold text-zinc-300">
                  {results.length}
                </div>
                <div className="text-xs text-zinc-500 mt-1">总数</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-900/20 border border-green-800/30">
                <div className="text-2xl font-bold text-green-400">
                  {successCount}
                </div>
                <div className="text-xs text-green-600 mt-1">成功</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-800/30">
                <div className="text-2xl font-bold text-red-400">
                  {failedCount}
                </div>
                <div className="text-xs text-red-600 mt-1">失败</div>
              </div>
            </div>

            {/* 结果列表 */}
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {results.map((result) => (
                <div
                  key={result.versionId}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-purple-500/10"
                >
                  <span className="text-sm text-zinc-300">
                    版本 {result.versionNumber}
                  </span>

                  <div className="flex items-center gap-2">
                    {result.status === "pending" && (
                      <span className="text-xs text-zinc-500">等待中</span>
                    )}
                    {result.status === "analyzing" && (
                      <>
                        <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                        <span className="text-xs text-purple-400">分析中</span>
                      </>
                    )}
                    {result.status === "success" && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400">成功</span>
                      </>
                    )}
                    {result.status === "failed" && (
                      <>
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="text-xs text-red-400">
                          {result.error || "失败"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {results.length === 0 ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isAnalyzing}
              >
                取消
              </Button>
              <Button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || unanalyzedVersions.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    开始分析
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} disabled={isAnalyzing}>
              {isAnalyzing ? "分析中，请稍候..." : "关闭"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
