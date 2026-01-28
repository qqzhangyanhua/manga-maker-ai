"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import type { ChapterOutline } from "../../type";

interface AddChapterDialogProps {
  open: boolean;
  onClose: () => void;
  timelineId: string;
  novelProjectId: string; // 从 Timeline 传入
  projectTitle: string; // 从 Timeline 传入
  onAdded: () => void;
}

export function AddChapterDialog({
  open,
  onClose,
  timelineId,
  novelProjectId,
  projectTitle,
  onAdded
}: AddChapterDialogProps) {
  const [chapters, setChapters] = useState<ChapterOutline[]>([]);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const loadChapters = useCallback(async () => {
    setLoadingChapters(true);
    try {
      // 获取项目的 outlines（章节大纲）
      const projectResponse = await fetch(`/api/novel/projects/${novelProjectId}`);
      if (!projectResponse.ok) {
        throw new Error("获取项目信息失败");
      }
      const project = await projectResponse.json();
      const outlines = project.outlines || [];

      // 获取实际已生成的章节内容
      const chaptersResponse = await fetch(`/api/novel/chapters/project/${novelProjectId}`);
      if (!chaptersResponse.ok) {
        throw new Error("获取章节内容失败");
      }
      const generatedChapters = await chaptersResponse.json();

      // 合并 outline 和实际生成的章节内容
      let mergedChapters: ChapterOutline[];
      
      if (outlines.length > 0) {
        // 以 outlines 为基础合并
        mergedChapters = outlines.map((outline: ChapterOutline) => {
          const chapterNum = outline.chapterNumber || outline.chapter_number;
          const generatedChapter = generatedChapters.find(
            (gc: { chapter_number: number; content: string }) => gc.chapter_number === chapterNum
          );

          return {
            ...outline,
            chapter_number: chapterNum,
            content: generatedChapter?.content || outline.content || "",
          };
        });
      } else {
        // outlines 为空时，使用 generatedChapters
        mergedChapters = generatedChapters.map((gc: { chapter_number: number; title: string; content: string; outline?: string }) => ({
          chapter_number: gc.chapter_number,
          title: gc.title,
          content: gc.content || "",
          outline: gc.outline,
        }));
      }

      console.log("[AddChapterDialog] 加载章节成功", {
        projectId: novelProjectId,
        outlinesCount: outlines.length,
        generatedChaptersCount: generatedChapters.length,
        mergedChapters: mergedChapters.map((o: ChapterOutline) => ({
          chapterNumber: o.chapterNumber || o.chapter_number,
          title: o.title,
          hasContent: !!o.content,
          contentLength: o.content?.length || 0,
        })),
      });

      setChapters(mergedChapters);
    } catch (error) {
      console.error("加载章节失败:", error);
      toast({
        title: "加载失败",
        description: "无法获取章节列表",
        variant: "destructive",
      });
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  }, [novelProjectId]); // toast 是稳定的引用，不需要作为依赖项

  // 加载章节列表（从 NovelProject.outlines）
  useEffect(() => {
    if (open && novelProjectId) {
      loadChapters();
    }
  }, [open, novelProjectId, loadChapters]);

  const handleAdd = async () => {
    if (selectedChapterNumber === undefined) {
      toast({
        title: "请选择章节",
        description: "请先选择要添加的章节",
        variant: "destructive",
      });
      return;
    }

    const selectedChapter = chapters.find(
      (c) => (c.chapterNumber || c.chapter_number) === selectedChapterNumber
    );

    if (!selectedChapter) {
      toast({
        title: "错误",
        description: "未找到选中的章节",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log("[AddChapterDialog] 开始添加章节", {
      chapterNumber: selectedChapterNumber,
      projectId: novelProjectId,
      timelineId,
    });

    try {
      const response = await fetch(`/api/canvas/timeline/${timelineId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_project_id: novelProjectId,
          chapter_number: selectedChapterNumber,
        }),
      });

      console.log("[AddChapterDialog] API 响应", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AddChapterDialog] API 返回错误", errorData);
        throw new Error(errorData.error || errorData.suggestion || "添加章节失败");
      }

      const result = await response.json();
      console.log("[AddChapterDialog] API 成功", result);

      toast({
        title: "添加成功",
        description: `章节 ${selectedChapterNumber}: ${selectedChapter.title} 已添加到时间线`,
      });

      onAdded();
      onClose();
      setSelectedChapterNumber(undefined);
    } catch (error) {
      console.error("[AddChapterDialog] 添加章节失败:", error);
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWordCount = (content: string | undefined) => {
    if (!content) return 0;
    return content.length;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f13] border-zinc-800 text-white max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle>添加章节到时间线</DialogTitle>
          <DialogDescription className="text-zinc-400">
            项目：{projectTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 章节选择 */}
          <div className="space-y-2">
            <Label htmlFor="chapter">选择章节</Label>
            <Select
              value={selectedChapterNumber !== undefined ? String(selectedChapterNumber) : ""}
              onValueChange={(value) => {
                const chapterNumber = parseInt(value, 10);
                console.log("[AddChapterDialog] 章节选择变化", {
                  newValue: chapterNumber,
                  previousValue: selectedChapterNumber,
                });
                setSelectedChapterNumber(chapterNumber);
              }}
              disabled={loadingChapters}
            >
              <SelectTrigger
                id="chapter"
                className="bg-zinc-900/50 border-zinc-800 focus:ring-purple-500/50"
              >
                <SelectValue
                  placeholder={loadingChapters ? "加载中..." : "选择章节"}
                />
              </SelectTrigger>
              <SelectContent
                className="z-[110] bg-zinc-900 border-zinc-800 text-white max-h-[300px]"
                position="popper"
                sideOffset={4}
              >
                {chapters.length > 0 ? (
                  chapters.map((chapter, index) => {
                    const chapterNum = chapter.chapterNumber || chapter.chapter_number || index + 1;
                    const wordCount = getWordCount(chapter.content);

                    return (
                      <SelectItem
                        key={chapterNum}
                        value={String(chapterNum)}
                        className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-purple-400"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>第{chapterNum}章: {chapter.title}</span>
                          {wordCount > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({wordCount.toLocaleString()}字)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <div className="p-2 text-sm text-gray-400 text-center space-y-1">
                    <p>{loadingChapters ? "加载中..." : "该项目暂无章节大纲"}</p>
                    {!loadingChapters && chapters.length === 0 && (
                      <p className="text-xs text-purple-400">
                        提示：请先在小说管理页面生成章节大纲
                      </p>
                    )}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 justify-end relative z-[120]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            取消
          </Button>
          <Button
            onClick={handleAdd}
            disabled={loading || selectedChapterNumber === undefined}
            className="bg-purple-600 hover:bg-purple-700 text-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {loading ? "添加中..." : "添加"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
