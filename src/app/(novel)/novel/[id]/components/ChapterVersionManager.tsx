/**
 * 章节版本管理器
 * 包装 ChapterVersionList,提供章节选择和版本管理功能
 */
"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { AlertCircle, GitCompare, X, Edit3 } from "lucide-react";
import { ChapterVersionList } from "./ChapterVersionList";
import { ChapterSelector } from "./ChapterSelector";
import { VersionDiff } from "./VersionDiff";
import { QuickChapterEditor } from "./QuickChapterEditor";
import { VersionFilter, VersionFilterOptions } from "./VersionFilter";
import { BatchAnalyzeDialog } from "./BatchAnalyzeDialog";
import {
  useChapterVersions,
  useUpdateVersion,
  useDeleteVersion,
} from "../hooks/useChapterVersions";
import { useVersionComparisonStore } from "../stores/versionComparisonStore";
import type { ChapterVersion } from "../types/version";
import { novelTheme } from "../../theme";

interface ChapterVersionManagerProps {
  projectId: string;
  selectedChapter: { id: string } | null; // 从父组件接收当前选中的章节
}

export function ChapterVersionManager({
  projectId,
  selectedChapter: initialChapter,
}: ChapterVersionManagerProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    initialChapter?.id || null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // 版本过滤器状态
  const [filters, setFilters] = useState<VersionFilterOptions>({
    searchQuery: "",
    minScore: null,
    maxScore: null,
    startDate: null,
    endDate: null,
    sortBy: "created_desc",
  });

  // 获取章节详细数据
  const { data: chapterData } = useQuery({
    queryKey: ["novel-chapter", selectedChapterId],
    queryFn: async () => {
      if (!selectedChapterId) return null;

      const response = await fetch(`/api/novel/chapters/${selectedChapterId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("获取章节数据失败");
      }

      return response.json();
    },
    enabled: !!selectedChapterId,
  });

  // 版本对比状态
  const {
    isComparisonMode,
    setComparisonMode,
    selectedVersionsForCompare,
    clearComparisonSelection,
  } = useVersionComparisonStore();

  // 获取版本列表
  const {
    data: versions = [],
    isLoading,
    error,
    refetch,
  } = useChapterVersions(selectedChapterId);

  // 更新版本 mutation
  const updateVersionMutation = useUpdateVersion(selectedChapterId || "");
  const deleteVersionMutation = useDeleteVersion(selectedChapterId || "");

  // 获取用于对比的两个版本
  const [version1, version2] = useMemo(() => {
    if (selectedVersionsForCompare.length !== 2) return [null, null];

    const v1 = versions.find((v) => v.id === selectedVersionsForCompare[0]);
    const v2 = versions.find((v) => v.id === selectedVersionsForCompare[1]);

    return [v1, v2];
  }, [selectedVersionsForCompare, versions]);

  // 过滤和排序版本
  const filteredAndSortedVersions = useMemo(() => {
    let result: ChapterVersion[] = [...versions];

    // 搜索过滤
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.version_number.toString().includes(query) ||
          v.notes?.toLowerCase().includes(query)
      );
    }

    // 评分范围过滤
    if (filters.minScore !== null) {
      result = result.filter(
        (v) => v.quality_score?.overall_score !== undefined && v.quality_score.overall_score >= filters.minScore!
      );
    }
    if (filters.maxScore !== null) {
      result = result.filter(
        (v) => v.quality_score?.overall_score !== undefined && v.quality_score.overall_score <= filters.maxScore!
      );
    }

    // 日期范围过滤
    if (filters.startDate) {
      const startTime = filters.startDate.getTime();
      result = result.filter((v) => new Date(v.created_at).getTime() >= startTime);
    }
    if (filters.endDate) {
      const endTime = filters.endDate.getTime() + 86400000; // 加一天，包含结束日期当天
      result = result.filter((v) => new Date(v.created_at).getTime() < endTime);
    }

    // 排序
    switch (filters.sortBy) {
      case "created_desc":
        result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "created_asc":
        result.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "score_desc":
        result.sort((a, b) => (b.quality_score?.overall_score ?? 0) - (a.quality_score?.overall_score ?? 0));
        break;
      case "score_asc":
        result.sort((a, b) => (a.quality_score?.overall_score ?? 0) - (b.quality_score?.overall_score ?? 0));
        break;
      case "version_desc":
        result.sort((a, b) => b.version_number - a.version_number);
        break;
      case "version_asc":
        result.sort((a, b) => a.version_number - b.version_number);
        break;
    }

    return result;
  }, [versions, filters]);

  // 选择版本
  const handleSelectVersion = async (versionId: string) => {
    if (!selectedChapterId) return;

    await updateVersionMutation.mutateAsync({
      versionId,
      request: { is_selected: true },
    });
  };

  // 删除版本
  const handleDeleteVersion = async (versionId: string) => {
    if (!selectedChapterId) return;
    await deleteVersionMutation.mutateAsync(versionId);
  };

  // 评分版本
  const handleRateVersion = async (versionId: string, rating: number) => {
    if (!selectedChapterId) return;

    await updateVersionMutation.mutateAsync({
      versionId,
      request: { user_rating: rating },
    });
  };

  // 切换对比模式
  const handleToggleComparisonMode = () => {
    setComparisonMode(!isComparisonMode);
    if (isComparisonMode) {
      clearComparisonSelection();
    }
  };

  // 如果没有选择章节,显示章节选择器
  if (!selectedChapterId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">版本管理</h2>
            <p className="text-zinc-400 text-sm">
              管理章节的不同版本,查看质量评分,选择最佳版本
            </p>
          </div>
        </div>

        <GlassCard className="p-12 text-center bg-zinc-900/40 border-purple-500/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-900/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                请先选择章节
              </h3>
              <p className="text-zinc-400 max-w-md mb-4">
                从下方选择一个章节,开始管理该章节的版本历史
              </p>
              <ChapterSelector
                projectId={projectId}
                value={selectedChapterId}
                onChange={setSelectedChapterId}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <GlassCard className={cn("p-12 text-center", novelTheme.card.base)}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">加载失败</h3>
            <p className="text-zinc-400 mb-4">{(error as Error).message}</p>
            <Button onClick={() => void refetch()} variant="outline">
              重试
            </Button>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部: 标题 + 章节选择器 + 对比按钮 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-1">版本管理</h2>
          <p className="text-zinc-400 text-sm">
            管理章节的不同版本,查看质量评分,选择最佳版本
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 章节切换器 */}
          <ChapterSelector
            projectId={projectId}
            value={selectedChapterId}
            onChange={setSelectedChapterId}
          />

          {/* 批量分析按钮 */}
          {selectedChapterId && (
            <BatchAnalyzeDialog
              versions={versions}
              onAnalysisComplete={async () => {
                await refetch();
              }}
            />
          )}

          {/* 编辑模式按钮 */}
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="default"
            onClick={() => setIsEditMode(!isEditMode)}
            disabled={isComparisonMode}
            className={
              isEditMode
                ? "bg-green-600 hover:bg-green-700"
                : "border-purple-500/20 text-zinc-400 hover:bg-purple-500/10 hover:text-purple-300"
            }
          >
            {isEditMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                退出编辑
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                编辑内容
              </>
            )}
          </Button>

          {/* 对比模式按钮 */}
          <Button
            variant={isComparisonMode ? "default" : "outline"}
            size="default"
            onClick={handleToggleComparisonMode}
            disabled={isEditMode}
            className={
              isComparisonMode
                ? "bg-blue-600 hover:bg-blue-700"
                : "border-purple-500/20 text-zinc-400 hover:bg-purple-500/10 hover:text-purple-300"
            }
          >
            {isComparisonMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                退出对比
              </>
            ) : (
              <>
                <GitCompare className="h-4 w-4 mr-2" />
                对比版本
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 对比模式提示 */}
      {isComparisonMode && (
        <GlassCard className="p-4 bg-blue-900/10 border-blue-800/30">
          <div className="flex items-center gap-2 text-sm">
            <GitCompare className="h-4 w-4 text-blue-400" />
            <span className="text-blue-300">
              对比模式已启用，请选择两个版本进行对比 (
              {selectedVersionsForCompare.length}/2)
            </span>
          </div>
        </GlassCard>
      )}

      {/* 版本对比视图 */}
      {isComparisonMode && version1 && version2 && (
        <VersionDiff version1={version1} version2={version2} />
      )}

      {/* 章节编辑器 */}
      {isEditMode && chapterData && (
        <QuickChapterEditor chapter={chapterData} />
      )}

      {/* 版本过滤器 */}
      {!isLoading && versions.length > 0 && (
        <VersionFilter
          filters={filters}
          onFilterChange={setFilters}
          totalCount={versions.length}
          filteredCount={filteredAndSortedVersions.length}
        />
      )}

      {/* 版本列表 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn("h-48 rounded-lg", novelTheme.card.skeleton)}
            />
          ))}
        </div>
      ) : (
        <ChapterVersionList
          chapterId={selectedChapterId}
          versions={filteredAndSortedVersions}
          onSelectVersion={handleSelectVersion}
          onDeleteVersion={handleDeleteVersion}
          onRateVersion={handleRateVersion}
          onRefresh={async () => {
            await refetch();
          }}
        />
      )}
    </div>
  );
}
