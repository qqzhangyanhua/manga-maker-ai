/**
 * 章节版本管理组件
 * 显示版本列表、质量评分、版本对比
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Star, Trash2, Check, Clock, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ChapterVersion } from "../types/version";
import { QualityScoreCard } from "./QualityScoreCard";
import { useVersionComparisonStore } from "../stores/versionComparisonStore";
import { novelTheme } from "../../theme";
import { cn } from "@/lib/utils";

interface ChapterVersionListProps {
  chapterId: string;
  versions: ChapterVersion[];
  onSelectVersion: (versionId: string) => Promise<void>;
  onDeleteVersion: (versionId: string) => Promise<void>;
  onRateVersion: (versionId: string, rating: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function ChapterVersionList({
  chapterId,
  versions,
  onSelectVersion,
  onDeleteVersion,
  onRateVersion,
  onRefresh,
}: ChapterVersionListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<ChapterVersion | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 对比模式状态
  const {
    isComparisonMode,
    selectedVersionsForCompare,
    toggleVersionForCompare,
  } = useVersionComparisonStore();

  const handleSelectVersion = async (version: ChapterVersion) => {
    if (version.is_selected) {
      toast.info("该版本已被选中");
      return;
    }

    setActionLoading(version.id);
    try {
      await onSelectVersion(version.id);
      toast.success(`已切换到版本 ${version.version_number}`);
    } catch (error) {
      toast.error("切换版本失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (version: ChapterVersion) => {
    if (version.is_selected) {
      toast.error("无法删除当前选中的版本");
      return;
    }
    setVersionToDelete(version);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!versionToDelete) return;

    setActionLoading(versionToDelete.id);
    try {
      await onDeleteVersion(versionToDelete.id);
      toast.success("版本已删除");
      setDeleteDialogOpen(false);
      setVersionToDelete(null);
    } catch (error) {
      toast.error("删除版本失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRate = async (version: ChapterVersion, rating: number) => {
    setActionLoading(version.id);
    try {
      await onRateVersion(version.id, rating);
      toast.success("评分已保存");
    } catch (error) {
      toast.error("保存评分失败");
    } finally {
      setActionLoading(null);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-purple-400";
    return "text-red-400";
  };

  const getScoreGrade = (score: number): string => {
    if (score >= 90) return "优秀";
    if (score >= 80) return "良好";
    if (score >= 70) return "中等";
    if (score >= 60) return "及格";
    return "需改进";
  };

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          版本历史 <span className="text-zinc-500">({versions.length} 个版本)</span>
        </h3>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          刷新列表
        </Button>
      </div>

      {/* 版本列表 */}
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {versions.map((version) => (
            <GlassCard
              key={version.id}
              className={cn("p-5 transition-all duration-300", version.is_selected
                ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10 backdrop-blur-sm"
                : cn(novelTheme.card.base, "hover:border-purple-500/30 hover:bg-zinc-900/60")
              )}
            >
              {/* 版本头部 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* 对比模式复选框 */}
                  {isComparisonMode && (
                    <Checkbox
                      checked={selectedVersionsForCompare.includes(version.id)}
                      onCheckedChange={() => toggleVersionForCompare(version.id)}
                      disabled={
                        selectedVersionsForCompare.length >= 2 &&
                        !selectedVersionsForCompare.includes(version.id)
                      }
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  )}

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-zinc-400">
                        v{version.version_number}
                      </span>
                      {version.is_selected && (
                        <Badge className="bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/20 shadow-sm">
                          <Check className="h-3 w-3 mr-1" />
                          当前版本
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {new Date(version.created_at).toLocaleString("zh-CN")}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  {!version.is_selected && !isComparisonMode && (
                    <>
                      <Button
                        onClick={() => handleSelectVersion(version)}
                        disabled={actionLoading === version.id}
                        size="sm"
                        variant="outline"
                        className={novelTheme.button.outline}
                      >
                        {actionLoading === version.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "选择此版本"
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(version)}
                        disabled={actionLoading === version.id}
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center gap-4 mb-4 text-sm text-zinc-400">
                <span>{version.word_count.toLocaleString()} 字</span>
                {version.model_used && <span>模型: {version.model_used}</span>}
                {version.temperature && <span>温度: {version.temperature}</span>}
              </div>

              {/* 质量评分 */}
              {version.quality_score && (
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">质量评分</span>
                    <Badge
                      className={`${getScoreColor(
                        version.quality_score.overall_score
                      )} bg-transparent border-current`}
                    >
                      {version.quality_score.overall_score} 分 -{" "}
                      {getScoreGrade(version.quality_score.overall_score)}
                    </Badge>
                  </div>
                  <QualityScoreCard qualityScore={version.quality_score} compact />
                </div>
              )}

              {/* 用户评分 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-zinc-400">我的评分:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRate(version, rating)}
                      disabled={actionLoading === version.id}
                      className={`transition-colors ${version.user_rating && rating <= version.user_rating
                        ? "text-purple-400"
                        : "text-zinc-600 hover:text-purple-400"
                        }`}
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 备注 */}
              {version.notes && (
                <div className={cn("text-sm text-zinc-500 rounded-lg p-3", novelTheme.card.base)}>
                  {version.notes}
                </div>
              )}
            </GlassCard>
          ))}

          {versions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500">暂无版本记录</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">确认删除版本?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              确定要删除版本 v{versionToDelete?.version_number} 吗?
              <br />
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
