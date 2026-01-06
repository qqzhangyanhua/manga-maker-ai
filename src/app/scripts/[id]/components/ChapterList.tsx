/**
 * Chapter List Component - Left sidebar showing story chapters
 * Phase 4: Enhanced with content management and character state tracking
 */

"use client";

import { useState } from "react";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useChapters,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useGenerateChapters,
} from "../hooks/useChapterData";
import type { Chapter } from "../types/script-editor.types";
import { ChapterItem } from "./ChapterItem";
import { ChapterWorkflowGuide } from "./ChapterWorkflowGuide";
import {
  CreateChapterDialog,
  EditChapterDialog,
  KeyChapterDialog,
  DeleteConfirmDialog,
  OverwriteConfirmDialog,
} from "./ChapterDialogs";

interface ChapterListProps {
  storyId: string;
  currentChapterId: string | null;
  onChapterSelect: (chapterId: string) => void;
}

export function ChapterList({
  storyId,
  currentChapterId,
  onChapterSelect,
}: ChapterListProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [formData, setFormData] = useState({ title: "", summary: "" });
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandingContent, setExpandingContent] = useState<string | null>(null);
  const [analyzingStates, setAnalyzingStates] = useState<string | null>(null);
  const [togglingKeyChapter, setTogglingKeyChapter] = useState<string | null>(null);
  const [generatingBackground, setGeneratingBackground] = useState<string | null>(null);

  // Dialog states for confirmations
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [keyChapterDialogOpen, setKeyChapterDialogOpen] = useState(false);
  const [keyChapterReason, setKeyChapterReason] = useState("");
  const [chapterToMarkAsKey, setChapterToMarkAsKey] = useState<Chapter | null>(null);

  const { data: chapters = [], isLoading } = useChapters(storyId);
  const createChapter = useCreateChapter(storyId);
  const updateChapter = useUpdateChapter(editingChapter?.id || "");
  const deleteChapter = useDeleteChapter();
  const generateChapters = useGenerateChapters(storyId);

  function toggleChapterExpansion(chapterId: string) {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  }

  async function handleExpandContent(chapter: Chapter) {
    setExpandingContent(chapter.id);
    try {
      const response = await fetch(`/api/chapter/${chapter.id}/expand-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      toast({
        title: "内容已生成",
        description: `生成了 ${data.contentLength} 字详细内容${data.creditsUsed ? `，消耗 ${data.creditsUsed} 算力` : ""}`,
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setExpandingContent(null);
    }
  }

  async function handleAnalyzeCharacterStates(chapter: Chapter) {
    if (!chapter.content) {
      toast({
        title: "无法分析",
        description: "请先生成章节详细内容",
        variant: "destructive",
      });
      return;
    }

    setAnalyzingStates(chapter.id);
    try {
      const response = await fetch(`/api/chapter/${chapter.id}/analyze-character-states`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "分析失败");
      }

      toast({
        title: "分析完成",
        description: data.message || "角色状态已更新",
      });

      toggleChapterExpansion(chapter.id);
    } catch (error) {
      toast({
        title: "分析失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setAnalyzingStates(null);
    }
  }

  async function handleToggleKeyChapter(chapter: Chapter) {
    if (!chapter.is_key_chapter) {
      setChapterToMarkAsKey(chapter);
      setKeyChapterReason("");
      setKeyChapterDialogOpen(true);
    } else {
      await confirmToggleKeyChapter(chapter, null);
    }
  }

  async function confirmToggleKeyChapter(chapter: Chapter, reason: string | null) {
    setTogglingKeyChapter(chapter.id);
    try {
      const response = await fetch(`/api/chapter/${chapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_key_chapter: !chapter.is_key_chapter,
          key_chapter_reason: !chapter.is_key_chapter ? reason : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "操作失败");
      }

      toast({
        title: chapter.is_key_chapter ? "已取消关键标记" : "已标记为关键章节",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setTogglingKeyChapter(null);
    }
  }

  async function handleGenerateBackground(chapter: Chapter) {
    setGeneratingBackground(chapter.id);
    try {
      const response = await fetch(`/api/chapter/${chapter.id}/generate-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_type: "outdoor",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      toast({
        title: "背景图生成成功",
        description: "章节背景图已生成并保存",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setGeneratingBackground(null);
    }
  }

  function handleCreate() {
    if (!formData.title.trim()) {
      toast({ title: "章节标题不能为空", variant: "destructive" });
      return;
    }

    createChapter.mutate(formData, {
      onSuccess: (chapter) => {
        toast({ title: "章节已创建" });
        setIsCreateDialogOpen(false);
        setFormData({ title: "", summary: "" });
        onChapterSelect(chapter.id);
      },
      onError: (error) => {
        toast({
          title: "创建失败",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }

  function handleEdit(chapter: Chapter) {
    setEditingChapter(chapter);
    setFormData({ title: chapter.title, summary: chapter.summary || "" });
    setIsEditDialogOpen(true);
  }

  function handleUpdate() {
    if (!formData.title.trim()) {
      toast({ title: "章节标题不能为空", variant: "destructive" });
      return;
    }

    updateChapter.mutate(formData, {
      onSuccess: () => {
        toast({ title: "章节已更新" });
        setIsEditDialogOpen(false);
        setEditingChapter(null);
      },
      onError: (error) => {
        toast({
          title: "更新失败",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }

  function handleDelete(chapter: Chapter) {
    setChapterToDelete(chapter);
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    if (!chapterToDelete) return;

    deleteChapter.mutate(
      { chapterId: chapterToDelete.id, storyId },
      {
        onSuccess: () => {
          toast({ title: "章节已删除" });
          if (currentChapterId === chapterToDelete.id) {
            const remainingChapters = chapters.filter((c) => c.id !== chapterToDelete.id);
            if (remainingChapters.length > 0) {
              onChapterSelect(remainingChapters[0].id);
            }
          }
          setDeleteConfirmOpen(false);
          setChapterToDelete(null);
        },
        onError: (error) => {
          toast({
            title: "删除失败",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  }

  function handleGenerateChapters() {
    if (chapters.length > 0) {
      setOverwriteConfirmOpen(true);
    } else {
      confirmGenerateChapters();
    }
  }

  function confirmGenerateChapters() {
    generateChapters.mutate(
      { overwrite: chapters.length > 0 },
      {
        onSuccess: (newChapters) => {
          toast({
            title: "章节已生成",
            description: `成功生成 ${newChapters.length} 个章节`,
          });
          if (newChapters.length > 0) {
            onChapterSelect(newChapters[0].id);
          }
          setOverwriteConfirmOpen(false);
        },
        onError: (error) => {
          toast({
            title: "生成失败",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>章节</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>章节</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateChapters}
              disabled={generateChapters.isPending}
              title="AI生成章节结构"
            >
              {generateChapters.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              title="手动创建章节"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {generateChapters.isPending ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-lg border bg-zinc-800/30 h-16 animate-pulse"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent animate-shimmer" />
                </div>
              ))}
            </div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>暂无章节</p>
              <p className="mt-2">点击 AI 按钮自动生成章节结构</p>
            </div>
          ) : (
            <>
              {/* Workflow guide */}
              <ChapterWorkflowGuide chapters={chapters} />

              {/* Chapter list */}
              <div className="space-y-2 mt-4">
                {chapters.map((chapter) => (
                  <ChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    isSelected={currentChapterId === chapter.id}
                    isExpanded={expandedChapters.has(chapter.id)}
                    expandingContent={expandingContent}
                    analyzingStates={analyzingStates}
                    togglingKeyChapter={togglingKeyChapter}
                    onSelect={() => onChapterSelect(chapter.id)}
                    onToggleExpansion={() => toggleChapterExpansion(chapter.id)}
                    onExpandContent={() => handleExpandContent(chapter)}
                    onAnalyzeStates={() => handleAnalyzeCharacterStates(chapter)}
                    onToggleKeyChapter={() => handleToggleKeyChapter(chapter)}
                    onEdit={() => handleEdit(chapter)}
                    onDelete={() => handleDelete(chapter)}
                    onGenerateBackground={() => handleGenerateBackground(chapter)}
                    generatingBackground={generatingBackground === chapter.id}
                  />
            ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CreateChapterDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onConfirm={handleCreate}
        isPending={createChapter.isPending}
      />

      <EditChapterDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onConfirm={handleUpdate}
        isPending={updateChapter.isPending}
      />

      <KeyChapterDialog
        open={keyChapterDialogOpen}
        onOpenChange={setKeyChapterDialogOpen}
        reason={keyChapterReason}
        onReasonChange={setKeyChapterReason}
        onConfirm={() => {
          if (chapterToMarkAsKey) {
            confirmToggleKeyChapter(chapterToMarkAsKey, keyChapterReason);
            setKeyChapterDialogOpen(false);
          }
        }}
      />

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        chapter={chapterToDelete}
        onConfirm={confirmDelete}
      />

      <OverwriteConfirmDialog
        open={overwriteConfirmOpen}
        onOpenChange={setOverwriteConfirmOpen}
        onConfirm={confirmGenerateChapters}
      />
    </>
  );
}
