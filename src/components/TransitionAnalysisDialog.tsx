/**
 * 章节过渡分析对话框
 * 显示AI分析的章节衔接问题和改进建议
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ArrowRight,
  Clock,
  MapPin,
  Users,
  GitBranch,
  FileText,
} from "lucide-react";

interface TransitionIssue {
  type: "plot" | "time" | "scene" | "character" | "causality";
  severity: "high" | "medium" | "low";
  description: string;
  suggestion: string;
}

interface TransitionAnalysis {
  hasIssues: boolean;
  overallScore: number;
  issues: TransitionIssue[];
  summary: string;
}

interface ChapterInfo {
  id: string;
  title: string;
  order: number;
}

interface TransitionAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
}

const ISSUE_TYPE_CONFIG = {
  plot: { label: "情节", icon: FileText, color: "text-blue-400" },
  time: { label: "时间", icon: Clock, color: "text-purple-400" },
  scene: { label: "场景", icon: MapPin, color: "text-green-400" },
  character: { label: "角色", icon: Users, color: "text-orange-400" },
  causality: { label: "因果", icon: GitBranch, color: "text-pink-400" },
};

const SEVERITY_CONFIG = {
  high: { label: "严重", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  medium: { label: "中等", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  low: { label: "轻微", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export function TransitionAnalysisDialog({
  open,
  onOpenChange,
  chapterId,
}: TransitionAnalysisDialogProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TransitionAnalysis | null>(null);
  const [previousChapter, setPreviousChapter] = useState<ChapterInfo | null>(null);
  const [currentChapter, setCurrentChapter] = useState<ChapterInfo | null>(null);
  const [creditsCost, setCreditsCost] = useState<number>(0);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await fetch(`/api/chapter/${chapterId}/check-transition`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "分析失败");
      }

      if (!data.analysis) {
        toast({
          title: data.message || data.error || "无法分析",
          variant: "default",
        });
        onOpenChange(false);
        return;
      }

      setAnalysis(data.analysis);
      setPreviousChapter(data.previousChapter);
      setCurrentChapter(data.currentChapter);
      setCreditsCost(data.creditsCost || 0);

      if (!data.analysis.hasIssues) {
        toast({
          title: "章节衔接良好",
          description: `评分: ${data.analysis.overallScore}/10`,
        });
      }
    } catch (error) {
      console.error("Failed to analyze transition:", error);
      toast({
        title: "分析失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 8) return "text-green-400";
    if (score >= 6) return "text-yellow-400";
    return "text-red-400";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-100 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            章节过渡分析
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            AI 分析章节间的衔接问题，帮助提升故事连贯性
          </DialogDescription>
        </DialogHeader>

        {!analysis && !isAnalyzing && (
          <div className="py-8 text-center">
            <div className="mb-6">
              <Info className="w-12 h-12 mx-auto text-blue-400 mb-3" />
              <p className="text-gray-300 mb-2">点击下方按钮开始分析</p>
              <p className="text-sm text-gray-500">
                AI 将检查当前章节与前一章节的衔接质量
              </p>
            </div>
            <Button
              onClick={handleAnalyze}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              开始分析
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-400 mb-3" />
            <p className="text-gray-300">AI 正在分析章节过渡...</p>
            <p className="text-sm text-gray-500 mt-2">这可能需要几秒钟</p>
          </div>
        )}

        {analysis && previousChapter && currentChapter && (
          <div className="space-y-6">
            {/* 章节信息 */}
            <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
              <span>第 {previousChapter.order} 章: {previousChapter.title}</span>
              <ArrowRight className="w-4 h-4" />
              <span>第 {currentChapter.order} 章: {currentChapter.title}</span>
            </div>

            {/* 总体评分 */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">衔接质量评分</span>
                <span className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore}/10
                </span>
              </div>
              <Progress value={analysis.overallScore * 10} className="h-2" />
            </div>

            {/* 总体评价 */}
            {analysis.summary && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">总体评价</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {/* 问题列表 */}
            {analysis.issues && analysis.issues.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  发现 {analysis.issues.length} 个问题
                </h4>

                {analysis.issues.map((issue, index) => {
                  const typeConfig = ISSUE_TYPE_CONFIG[issue.type];
                  const severityConfig = SEVERITY_CONFIG[issue.severity];
                  const IconComponent = typeConfig.icon;

                  return (
                    <div
                      key={index}
                      className="border border-gray-800 rounded-lg p-4 bg-gray-800/30"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <IconComponent className={`w-5 h-5 mt-0.5 ${typeConfig.color}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={severityConfig.color}>
                              {severityConfig.label}
                            </Badge>
                            <span className="text-xs text-gray-500">{typeConfig.label}问题</span>
                          </div>
                          <p className="text-sm text-gray-300 mb-3">{issue.description}</p>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                            <p className="text-xs text-blue-400 font-semibold mb-1">
                              💡 改进建议
                            </p>
                            <p className="text-xs text-gray-300">{issue.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-green-400">章节衔接良好</p>
                  <p className="text-xs text-gray-400 mt-1">未发现明显的过渡问题</p>
                </div>
              </div>
            )}

            {/* 算力消耗 */}
            {creditsCost > 0 && (
              <div className="text-xs text-gray-500 text-center">
                本次分析消耗 {creditsCost} 算力
              </div>
            )}

            {/* 重新分析按钮 */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="border-gray-700 text-gray-400 hover:bg-gray-800"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  "重新分析"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
