/**
 * Chapter List Component - Left sidebar showing story chapters
 */

"use client";

import { useState } from "react";
import { Plus, Loader2, Sparkles, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useChapters,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useGenerateChapters,
} from "../hooks/useChapterData";
import type { Chapter } from "../types/script-editor.types";

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

  const { data: chapters = [], isLoading } = useChapters(storyId);
  const createChapter = useCreateChapter(storyId);
  const updateChapter = useUpdateChapter(editingChapter?.id || "");
  const deleteChapter = useDeleteChapter();
  const generateChapters = useGenerateChapters(storyId);

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
    if (!confirm(`确定要删除章节"${chapter.title}"吗？此操作将同时删除该章节下的所有分镜。`)) {
      return;
    }

    deleteChapter.mutate(
      { chapterId: chapter.id, storyId },
      {
        onSuccess: () => {
          toast({ title: "章节已删除" });
          if (currentChapterId === chapter.id) {
            const remainingChapters = chapters.filter((c) => c.id !== chapter.id);
            if (remainingChapters.length > 0) {
              onChapterSelect(remainingChapters[0].id);
            }
          }
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
      if (!confirm("当前已有章节，是否覆盖？")) {
        return;
      }
    }

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
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {generateChapters.isPending ? (
            // Skeleton loading state with shimmer animation
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-lg border bg-zinc-800/30 h-16 animate-pulse"
                >
                  {/* Shimmer effect */}
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
            chapters.map((chapter) => (
              <div
                key={chapter.id}
                className={`
                  group flex items-center gap-2 p-3 rounded-lg border cursor-pointer
                  transition-colors hover:bg-accent
                  ${currentChapterId === chapter.id ? "bg-accent border-primary" : ""}
                `}
                onClick={() => onChapterSelect(chapter.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{chapter.title}</div>
                  {chapter.summary && (
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {chapter.summary.slice(0, 60)}...
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(chapter)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(chapter)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create Chapter Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建章节</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">章节标题</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：第一章：相遇"
              />
            </div>
            <div>
              <Label htmlFor="summary">章节梗概（可选）</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="简要描述本章内容..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createChapter.isPending}>
              {createChapter.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Chapter Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑章节</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">章节标题</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-summary">章节梗概</Label>
              <Textarea
                id="edit-summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateChapter.isPending}>
              {updateChapter.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
