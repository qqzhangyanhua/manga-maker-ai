/**
 * 连载章节列表组件（增强版）
 * 功能：
 * 1. 章节编辑
 * 2. 发布前检查
 * 3. 智能推荐下一步操作
 * 4. 批量操作
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  Calendar,
  Film,
  Image as ImageIcon,
  Layers,
  Edit2,
  CheckSquare,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { EditChapterDialog } from "./EditChapterDialog";

interface Chapter {
  id: string;
  title: string;
  summary: string | null;
  chapter_order: number;
  publish_status?: string;  // 可选，兼容不同来源的数据
  published_at?: string | null;
  created_at: string;
}

interface Panel {
  id: string;
  chapter_id?: string;
  generated_image?: string;
  image_url?: string;
  panel_order?: number;
  title?: string;
  description?: string;
  visual_description?: string;
  character_descriptions?: string;
}

interface SerialChapterListProps {
  storyId: string;
  chapters: Chapter[];
  panels: Panel[];
  onRefresh: () => Promise<void> | void;
  onCreateChapter: () => void;
  onGenerateNext: () => void;
  onGeneratePanels: (chapterId: string) => void;
  onViewPanels: (chapterId: string) => void;
}

export function SerialChapterList({
  storyId,
  chapters,
  panels,
  onRefresh,
  onCreateChapter,
  onGenerateNext,
  onGeneratePanels,
  onViewPanels,
}: SerialChapterListProps) {
  const { toast } = useToast();

  // 状态管理
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [publishCheckDialog, setPublishCheckDialog] = useState<{
    open: boolean;
    chapter: Chapter | null;
    warnings: string[];
  }>({ open: false, chapter: null, warnings: [] });
  const [batchOperating, setBatchOperating] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const sortedChapters = [...chapters].sort((a, b) => a.chapter_order - b.chapter_order);
  const publishedCount = chapters.filter((c) => c.publish_status === "published").length;
  const draftCount = chapters.filter((c) => c.publish_status === "draft").length;
  const isBatchMode = selectedChapters.size > 0;

  // 计算章节统计
  function getChapterStats(chapterId: string) {
    const chapterPanels = panels.filter((p) => p.chapter_id === chapterId);
    const panelCount = chapterPanels.length;
    const generatedCount = chapterPanels.filter(
      (p) => p.generated_image || p.image_url
    ).length;
    const progress = panelCount > 0 ? (generatedCount / panelCount) * 100 : 0;
    const hasAllImages = panelCount > 0 && generatedCount === panelCount;

    return { panelCount, generatedCount, progress, hasAllImages };
  }

  // 智能推荐：根据章节状态返回主要操作
  function getRecommendedAction(chapter: Chapter) {
    const stats = getChapterStats(chapter.id);

    if (stats.panelCount === 0) {
      return {
        label: "生成分镜",
        icon: Layers,
        color: "border-blue-500 text-blue-500 hover:bg-blue-500/10",
        onClick: () => onGeneratePanels(chapter.id),
      };
    }

    if (!stats.hasAllImages) {
      return {
        label: `生成图片 (${stats.generatedCount}/${stats.panelCount})`,
        icon: ImageIcon,
        color: "border-purple-500 text-purple-500 hover:bg-purple-500/10",
        onClick: () => onViewPanels(chapter.id),
      };
    }

    if (chapter.publish_status === "draft") {
      return {
        label: "发布章节",
        icon: Eye,
        color: "border-green-500 text-green-500 hover:bg-green-500/10",
        onClick: () => handlePublishWithCheck(chapter),
      };
    }

    return null;
  }

  // 发布前检查
  function handlePublishWithCheck(chapter: Chapter) {
    const stats = getChapterStats(chapter.id);
    const warnings: string[] = [];

    if (stats.panelCount === 0) {
      toast({
        title: "无法发布",
        description: "章节还没有生成分镜，请先生成分镜",
        variant: "destructive",
      });
      return;
    }

    if (!stats.hasAllImages) {
      warnings.push(
        `分镜图片未全部生成 (${stats.generatedCount}/${stats.panelCount})`
      );
    }

    if (warnings.length > 0) {
      setPublishCheckDialog({
        open: true,
        chapter,
        warnings,
      });
    } else {
      handlePublish(chapter.id, chapter.publish_status || "draft");
    }
  }

  // 发布/取消发布
  async function handlePublish(chapterId: string, currentStatus: string) {
    setPublishingId(chapterId);

    try {
      const method = currentStatus === "published" ? "DELETE" : "POST";
      const response = await fetch(`/api/chapter/${chapterId}/publish`, {
        method,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "操作失败");
      }

      toast({
        title: currentStatus === "published" ? "已取消发布" : "发布成功",
        description: data.message,
      });

      await Promise.resolve(onRefresh());
    } catch (error) {
      console.error("Failed to toggle publish status:", error);
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  }

  // 展开/折叠章节
  function toggleChapterExpand(chapterId: string) {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  }

  // 批量选择
  function toggleChapterSelection(chapterId: string) {
    const newSelection = new Set(selectedChapters);
    if (newSelection.has(chapterId)) {
      newSelection.delete(chapterId);
    } else {
      newSelection.add(chapterId);
    }
    setSelectedChapters(newSelection);
  }

  function selectAll() {
    if (selectedChapters.size === sortedChapters.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(sortedChapters.map((c) => c.id)));
    }
  }

  // 批量生成分镜
  async function batchGeneratePanels() {
    const chaptersToGenerate = sortedChapters.filter(
      (c) => selectedChapters.has(c.id) && getChapterStats(c.id).panelCount === 0
    );

    if (chaptersToGenerate.length === 0) {
      toast({
        title: "没有可生成的章节",
        description: "所选章节都已有分镜",
        variant: "destructive",
      });
      return;
    }

    setBatchOperating(true);
    toast({
      title: "批量生成分镜",
      description: `正在为 ${chaptersToGenerate.length} 个章节生成分镜...`,
    });

    // 逐个生成（避免并发过多）
    for (const chapter of chaptersToGenerate) {
      try {
        onGeneratePanels(chapter.id);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 间隔1秒
      } catch (error) {
        console.error(`Failed to generate panels for ${chapter.id}:`, error);
      }
    }

    setBatchOperating(false);
    setSelectedChapters(new Set());
    await Promise.resolve(onRefresh());
  }

  // 批量发布
  async function batchPublish() {
    const chaptersToPublish = sortedChapters.filter(
      (c) => selectedChapters.has(c.id) && c.publish_status === "draft"
    );

    if (chaptersToPublish.length === 0) {
      toast({
        title: "没有可发布的章节",
        description: "所选章节都已发布或不符合发布条件",
        variant: "destructive",
      });
      return;
    }

    setBatchOperating(true);

    for (const chapter of chaptersToPublish) {
      try {
        await handlePublish(chapter.id, chapter.publish_status || "draft");
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to publish ${chapter.id}:`, error);
      }
    }

    setBatchOperating(false);
    setSelectedChapters(new Set());
    toast({
      title: "批量发布完成",
      description: `成功发布 ${chaptersToPublish.length} 个章节`,
    });
  }

  function getStatusBadge(status: string) {
    const variants = {
      draft: { label: "草稿", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
      published: { label: "已发布", color: "bg-green-500/20 text-green-400 border-green-500/30" },
      archived: { label: "已归档", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    };

    const variant = variants[status as keyof typeof variants] || variants.draft;

    return (
      <Badge variant="outline" className={variant.color}>
        {variant.label}
      </Badge>
    );
  }

  return (
    <>
      <div>
        {sortedChapters.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-[#1a1a1f]/60 rounded-xl border border-gray-800/50">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">还没有章节</p>
            <Button
              onClick={onCreateChapter}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建第一章
            </Button>
          </div>
        ) : (
          <>

              {/* 章节列表 */}
              <div className="space-y-3">
                {sortedChapters.map((chapter) => {
                  const stats = getChapterStats(chapter.id);
                  const recommendedAction = getRecommendedAction(chapter);
                  const isSelected = selectedChapters.has(chapter.id);
                  const isExpanded = expandedChapters.has(chapter.id);
                  const chapterPanels = panels
                    .filter((p) => p.chapter_id === chapter.id)
                    .sort((a, b) => (a.panel_order || 0) - (b.panel_order || 0));

                  return (
                    <div
                      key={chapter.id}
                      className={`border rounded-lg overflow-hidden transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-500/5"
                          : "border-gray-800/50 bg-[#1a1a1f]/60"
                      }`}
                    >
                      {/* 章节头部 - 可点击展开 */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-800/20 transition-colors"
                        onClick={() => toggleChapterExpand(chapter.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* 展开/折叠图标 */}
                          <button
                            className="mt-1 text-gray-400 hover:text-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleChapterExpand(chapter.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>

                          {/* 复选框 */}
                          {sortedChapters.length > 1 && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleChapterSelection(chapter.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 border-gray-600"
                            />
                          )}

                          {/* 章节信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500">第{chapter.chapter_order}章</span>
                              {getStatusBadge(chapter.publish_status || "draft")}
                            </div>
                            <h4 className="font-semibold text-white text-lg mb-2">
                              {chapter.title}
                            </h4>

                            {chapter.summary && !isExpanded && (
                              <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                                {chapter.summary}
                              </p>
                            )}

                            {/* 统计信息 */}
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>共 {stats.panelCount} 个分镜</span>
                              <span>•</span>
                              <span>已发布 {stats.generatedCount} 章</span>
                              <span>•</span>
                              <span>{Math.floor(stats.panelCount * 0.6)} 分钟</span>
                              <span>•</span>
                              <span>{stats.generatedCount} 张图片</span>
                            </div>

                            {stats.panelCount > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center text-xs text-gray-500 mb-1">
                                  <span>图片生成进度</span>
                                  <span className="ml-auto">{Math.round(stats.progress)}%</span>
                                </div>
                                <Progress value={stats.progress} className="h-1.5 bg-gray-800" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 展开的分镜内容 */}
                      {isExpanded && (
                        <div className="border-t border-gray-800/50 bg-[#16161a]/80">
                          <div className="p-4">
                            {/* 操作按钮组 */}
                            <div className="flex gap-2 mb-4 flex-wrap">
                              {/* 生成分镜按钮 */}
                              {stats.panelCount === 0 ? (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onGeneratePanels(chapter.id);
                                  }}
                                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                                >
                                  <Layers className="w-4 h-4 mr-1" />
                                  生成分镜
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onGeneratePanels(chapter.id);
                                  }}
                                  className="border-gray-700 hover:bg-gray-800"
                                >
                                  <Layers className="w-4 h-4 mr-1" />
                                  收起分镜
                                </Button>
                              )}

                              {/* 展开分镜 */}
                              {stats.panelCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewPanels(chapter.id);
                                  }}
                                  className="border-gray-700 hover:bg-gray-800"
                                >
                                  <Film className="w-4 h-4 mr-1" />
                                  展开分镜
                                </Button>
                              )}

                              {/* 编辑按钮 */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingChapter(chapter);
                                }}
                                className="border-gray-700 text-gray-400 hover:bg-gray-800"
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                编辑
                              </Button>
                            </div>

                            {/* 分镜列表 */}
                            {chapterPanels.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="text-sm font-medium text-gray-300">分镜列表</h5>
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                  {chapterPanels.map((panel, idx) => {
                                    const hasImage = !!(panel.generated_image || panel.image_url);
                                    return (
                                      <div
                                        key={panel.id}
                                        className="group relative bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600 transition-colors"
                                      >
                                        <div className="aspect-square flex items-center justify-center bg-gray-900/50">
                                          {hasImage ? (
                                            <img
                                              src={panel.generated_image || panel.image_url}
                                              alt={`分镜 ${idx + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="text-center p-2">
                                              <ImageIcon className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                                              <span className="text-xs text-gray-500">#{idx + 1}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                          <span className="text-xs text-white font-medium">#{idx + 1}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">暂无分镜内容</p>
                                <p className="text-xs mt-1">点击上方"生成分镜"按钮开始创作</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
      </div>

      {/* 编辑章节对话框 */}
      <EditChapterDialog
        open={!!editingChapter}
        onOpenChange={(open) => !open && setEditingChapter(null)}
        chapter={editingChapter}
        onSuccess={() => { void onRefresh(); }}
      />

      {/* 发布检查对话框 */}
      <AlertDialog
        open={publishCheckDialog.open}
        onOpenChange={(open) =>
          !open && setPublishCheckDialog({ open: false, chapter: null, warnings: [] })
        }
      >
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">发布提示</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              该章节存在以下问题，确定要发布吗？
              <ul className="mt-3 space-y-1 text-yellow-400">
                {publishCheckDialog.warnings.map((warning, idx) => (
                  <li key={idx}>⚠️ {warning}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-400">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (publishCheckDialog.chapter) {
                  handlePublish(
                    publishCheckDialog.chapter.id,
                    publishCheckDialog.chapter.publish_status || "draft"
                  );
                }
                setPublishCheckDialog({ open: false, chapter: null, warnings: [] });
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              确认发布
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
