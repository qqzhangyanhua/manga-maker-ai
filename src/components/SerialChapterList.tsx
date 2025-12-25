/**
 * 杩炶浇绔犺妭鍒楄〃缁勪欢锛堝寮虹増锛?
 * 鍔熻兘锛?
 * 1. 绔犺妭缂栬緫
 * 2. 鍙戝竷鍓嶆鏌?
 * 3. 鏅鸿兘鎺ㄨ崘涓嬩竴姝ユ搷浣?
 * 4. 鎵归噺鎿嶄綔
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
} from "lucide-react";
import { EditChapterDialog } from "./EditChapterDialog";

interface Chapter {
  id: string;
  title: string;
  summary: string | null;
  chapter_order: number;
  publish_status: string;
  published_at: string | null;
  created_at: string;
}

interface Panel {
  id: string;
  chapter_id?: string;
  generated_image?: string;
  image_url?: string;
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

  // 鐘舵€佺鐞?
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [publishCheckDialog, setPublishCheckDialog] = useState<{
    open: boolean;
    chapter: Chapter | null;
    warnings: string[];
  }>({ open: false, chapter: null, warnings: [] });
  const [batchOperating, setBatchOperating] = useState(false);

  const sortedChapters = [...chapters].sort((a, b) => a.chapter_order - b.chapter_order);
  const publishedCount = chapters.filter((c) => c.publish_status === "published").length;
  const draftCount = chapters.filter((c) => c.publish_status === "draft").length;
  const isBatchMode = selectedChapters.size > 0;

  // 璁＄畻绔犺妭缁熻
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

  // 鏅鸿兘鎺ㄨ崘锛氭牴鎹珷鑺傜姸鎬佽繑鍥炰富瑕佹搷浣?
  function getRecommendedAction(chapter: Chapter) {
    const stats = getChapterStats(chapter.id);

    if (stats.panelCount === 0) {
      return {
        label: "鐢熸垚鍒嗛暅",
        icon: Layers,
        color: "border-blue-500 text-blue-500 hover:bg-blue-500/10",
        onClick: () => onGeneratePanels(chapter.id),
      };
    }

    if (!stats.hasAllImages) {
      return {
        label: `鐢熸垚鍥剧墖 (${stats.generatedCount}/${stats.panelCount})`,
        icon: ImageIcon,
        color: "border-purple-500 text-purple-500 hover:bg-purple-500/10",
        onClick: () => onViewPanels(chapter.id),
      };
    }

    if (chapter.publish_status === "draft") {
      return {
        label: "鍙戝竷绔犺妭",
        icon: Eye,
        color: "border-green-500 text-green-500 hover:bg-green-500/10",
        onClick: () => handlePublishWithCheck(chapter),
      };
    }

    return null;
  }

  // 鍙戝竷鍓嶆鏌?
  function handlePublishWithCheck(chapter: Chapter) {
    const stats = getChapterStats(chapter.id);
    const warnings: string[] = [];

    if (stats.panelCount === 0) {
      toast({
        title: "鏃犳硶鍙戝竷",
        description: "绔犺妭杩樻病鏈夌敓鎴愬垎闀滐紝璇峰厛鐢熸垚鍒嗛暅",
        variant: "destructive",
      });
      return;
    }

    if (!stats.hasAllImages) {
      warnings.push(
        `鍒嗛暅鍥剧墖鏈叏閮ㄧ敓鎴?(${stats.generatedCount}/${stats.panelCount})`
      );
    }

    if (warnings.length > 0) {
      setPublishCheckDialog({
        open: true,
        chapter,
        warnings,
      });
    } else {
      handlePublish(chapter.id, chapter.publish_status);
    }
  }

  // 鍙戝竷/鍙栨秷鍙戝竷
  async function handlePublish(chapterId: string, currentStatus: string) {
    setPublishingId(chapterId);

    try {
      const method = currentStatus === "published" ? "DELETE" : "POST";
      const response = await fetch(`/api/chapter/${chapterId}/publish`, {
        method,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "鎿嶄綔澶辫触");
      }

      toast({
        title: currentStatus === "published" ? "宸插彇娑堝彂甯? : "鍙戝竷鎴愬姛",
        description: data.message,
      });

      await Promise.resolve(onRefresh());
    } catch (error) {
      console.error("Failed to toggle publish status:", error);
      toast({
        title: "鎿嶄綔澶辫触",
        description: error instanceof Error ? error.message : "鏈煡閿欒",
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  }

  // 鎵归噺閫夋嫨
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

  // 鎵归噺鐢熸垚鍒嗛暅
  async function batchGeneratePanels() {
    const chaptersToGenerate = sortedChapters.filter(
      (c) => selectedChapters.has(c.id) && getChapterStats(c.id).panelCount === 0
    );

    if (chaptersToGenerate.length === 0) {
      toast({
        title: "娌℃湁鍙敓鎴愮殑绔犺妭",
        description: "鎵€閫夌珷鑺傞兘宸叉湁鍒嗛暅",
        variant: "destructive",
      });
      return;
    }

    setBatchOperating(true);
    toast({
      title: "鎵归噺鐢熸垚鍒嗛暅",
      description: `姝ｅ湪涓?${chaptersToGenerate.length} 涓珷鑺傜敓鎴愬垎闀?..`,
    });

    // 閫愪釜鐢熸垚锛堥伩鍏嶅苟鍙戣繃澶氾級
    for (const chapter of chaptersToGenerate) {
      try {
        onGeneratePanels(chapter.id);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 闂撮殧1绉?
      } catch (error) {
        console.error(`Failed to generate panels for ${chapter.id}:`, error);
      }
    }

    setBatchOperating(false);
    setSelectedChapters(new Set());
    await Promise.resolve(onRefresh());
  }

  // 鎵归噺鍙戝竷
  async function batchPublish() {
    const chaptersToPublish = sortedChapters.filter(
      (c) => selectedChapters.has(c.id) && c.publish_status === "draft"
    );

    if (chaptersToPublish.length === 0) {
      toast({
        title: "娌℃湁鍙彂甯冪殑绔犺妭",
        description: "鎵€閫夌珷鑺傞兘宸插彂甯冩垨涓嶇鍚堝彂甯冩潯浠?,
        variant: "destructive",
      });
      return;
    }

    setBatchOperating(true);

    for (const chapter of chaptersToPublish) {
      try {
        await handlePublish(chapter.id, chapter.publish_status);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to publish ${chapter.id}:`, error);
      }
    }

    setBatchOperating(false);
    setSelectedChapters(new Set());
    toast({
      title: "鎵归噺鍙戝竷瀹屾垚",
      description: `鎴愬姛鍙戝竷 ${chaptersToPublish.length} 涓珷鑺俙,
    });
  }

  function getStatusBadge(status: string) {
    const variants = {
      draft: { label: "鑽夌", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
      published: { label: "宸插彂甯?, color: "bg-green-500/20 text-green-400 border-green-500/30" },
      archived: { label: "宸插綊妗?, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
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
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                杩炶浇绔犺妭
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                宸插彂甯?{publishedCount} 绔?路 鑽夌 {draftCount} 绔?
                {isBatchMode && ` 路 宸查€?${selectedChapters.size} 绔燻}
              </p>
            </div>
            <div className="flex gap-2">
              {isBatchMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={batchGeneratePanels}
                    disabled={batchOperating}
                    className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                  >
                    {batchOperating ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Layers className="w-4 h-4 mr-1" />
                    )}
                    鎵归噺鐢熸垚鍒嗛暅
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={batchPublish}
                    disabled={batchOperating}
                    className="border-green-500 text-green-500 hover:bg-green-500/10"
                  >
                    {batchOperating ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-1" />
                    )}
                    鎵归噺鍙戝竷
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedChapters(new Set())}
                    className="border-gray-700 hover:bg-gray-800"
                  >
                    鍙栨秷
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onGenerateNext}
                    className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    AI 缁啓
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateChapter}
                    className="border-gray-700 hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    鍒涗綔涓嬩竴绔?
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedChapters.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="mb-4">杩樻病鏈夌珷鑺?/p>
              <Button variant="outline" onClick={onCreateChapter}>
                <Plus className="w-4 h-4 mr-2" />
                鍒涘缓绗竴绔?
              </Button>
            </div>
          ) : (
            <>
              {/* 鎵归噺鎿嶄綔宸ュ叿鏍?*/}
              {sortedChapters.length > 1 && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-md">
                  <Checkbox
                    checked={selectedChapters.size === sortedChapters.length}
                    onCheckedChange={selectAll}
                    className="border-gray-600"
                  />
                  <span className="text-sm text-gray-400">
                    {isBatchMode ? `宸查€?${selectedChapters.size} 绔燻 : "鍏ㄩ€?}
                  </span>
                  {!isBatchMode && (
                    <span className="text-xs text-gray-500 ml-auto">
                      <CheckSquare className="w-3 h-3 inline mr-1" />
                      鎻愮ず锛氬嬀閫夌珷鑺傚彲鎵归噺鎿嶄綔
                    </span>
                  )}
                </div>
              )}

              {/* 绔犺妭鍒楄〃 */}
              <div className="space-y-3">
                {sortedChapters.map((chapter) => {
                  const stats = getChapterStats(chapter.id);
                  const recommendedAction = getRecommendedAction(chapter);
                  const isSelected = selectedChapters.has(chapter.id);

                  return (
                    <div
                      key={chapter.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-500/5"
                          : "border-gray-800 bg-gray-800/30 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {/* 澶嶉€夋 */}
                        {sortedChapters.length > 1 && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleChapterSelection(chapter.id)}
                            className="mt-1 border-gray-600"
                          />
                        )}

                        {/* 绔犺妭淇℃伅 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-white">
                              {chapter.title}
                            </h4>
                            {getStatusBadge(chapter.publish_status)}
                          </div>

                          {chapter.summary && (
                            <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                              {chapter.summary}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span>绗?{chapter.chapter_order} 绔?/span>
                            {chapter.published_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(chapter.published_at).toLocaleDateString("zh-CN")}
                              </span>
                            )}
                          </div>

                          {/* 鍒嗛暅鍜屽浘鐗囩粺璁?*/}
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1 text-gray-400">
                                <Film className="w-4 h-4" />
                                <span>{stats.panelCount} 涓垎闀?/span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <ImageIcon className="w-4 h-4" />
                                <span>
                                  {stats.generatedCount}/{stats.panelCount} 鍥剧墖
                                </span>
                              </div>
                            </div>

                            {stats.panelCount > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>鍥剧墖鐢熸垚杩涘害</span>
                                  <span>{Math.round(stats.progress)}%</span>
                                </div>
                                <Progress value={stats.progress} className="h-1" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 鎿嶄綔鎸夐挳缁?*/}
                      <div className="flex gap-2 flex-wrap">
                        {/* 鏅鸿兘鎺ㄨ崘鐨勪富瑕佹搷浣?*/}
                        {recommendedAction && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={recommendedAction.onClick}
                            className={recommendedAction.color}
                          >
                            <recommendedAction.icon className="w-4 h-4 mr-1" />
                            {recommendedAction.label}
                          </Button>
                        )}

                        {/* 鏌ョ湅鍒嗛暅 */}
                        {stats.panelCount > 0 && !recommendedAction && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewPanels(chapter.id)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-700"
                          >
                            <Film className="w-4 h-4 mr-1" />
                            鏌ョ湅鍒嗛暅 ({stats.panelCount})
                          </Button>
                        )}

                        {/* 缂栬緫鎸夐挳 */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingChapter(chapter)}
                          className="border-gray-700 text-gray-400 hover:bg-gray-800"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          缂栬緫
                        </Button>

                        {/* 鍙栨秷鍙戝竷 */}
                        {chapter.publish_status === "published" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublish(chapter.id, chapter.publish_status)}
                            disabled={publishingId === chapter.id}
                            className="border-gray-700 text-gray-400 hover:bg-gray-800"
                          >
                            {publishingId === chapter.id ? (
                              "澶勭悊涓?.."
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                鍙栨秷鍙戝竷
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 缂栬緫绔犺妭瀵硅瘽妗?*/}
      <EditChapterDialog
        open={!!editingChapter}
        onOpenChange={(open) => !open && setEditingChapter(null)}
        chapter={editingChapter}
        onSuccess={() => { void onRefresh(); }}
      />

      {/* 鍙戝竷妫€鏌ュ璇濇 */}
      <AlertDialog
        open={publishCheckDialog.open}
        onOpenChange={(open) =>
          !open && setPublishCheckDialog({ open: false, chapter: null, warnings: [] })
        }
      >
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">鍙戝竷鎻愮ず</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              璇ョ珷鑺傚瓨鍦ㄤ互涓嬮棶棰橈紝纭畾瑕佸彂甯冨悧锛?
              <ul className="mt-3 space-y-1 text-yellow-400">
                {publishCheckDialog.warnings.map((warning, idx) => (
                  <li key={idx}>鈿狅笍 {warning}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-400">
              鍙栨秷
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (publishCheckDialog.chapter) {
                  handlePublish(
                    publishCheckDialog.chapter.id,
                    publishCheckDialog.chapter.publish_status
                  );
                }
                setPublishCheckDialog({ open: false, chapter: null, warnings: [] });
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              纭鍙戝竷
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}




