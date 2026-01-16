"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface NovelProject {
  id: string;
  title: string;
}

interface NovelChapterOutline {
  id: string;
  chapterNumber: number;
  title: string;
}

interface AddChapterDialogProps {
  open: boolean;
  onClose: () => void;
  timelineId: string;
  onAdded: () => void;
}

export function AddChapterDialog({ open, onClose, timelineId, onAdded }: AddChapterDialogProps) {
  const [projects, setProjects] = useState<NovelProject[]>([]);
  const [chapters, setChapters] = useState<NovelChapterOutline[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // 加载小说项目列表
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  // 当选择项目后,加载章节列表
  useEffect(() => {
    if (selectedProjectId) {
      loadChapters(selectedProjectId);
    } else {
      setChapters([]);
      setSelectedChapterId("");
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/novel/projects");
      if (!response.ok) {
        throw new Error("获取项目列表失败");
      }
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("加载项目失败:", error);
      toast({
        title: "加载失败",
        description: "无法获取小说项目列表",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadChapters = async (projectId: string) => {
    setLoadingChapters(true);
    try {
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`);
      if (!response.ok) {
        throw new Error("获取章节列表失败");
      }
      const data = await response.json();
      setChapters(data.outlines || []);
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
  };

  const handleAdd = async () => {
    if (!selectedChapterId) {
      toast({
        title: "请选择章节",
        description: "请先选择要添加的章节",
        variant: "destructive",
      });
      return;
    }

    const selectedChapter = chapters.find((c) => c.id === selectedChapterId);
    if (!selectedChapter) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/canvas/timeline/${timelineId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: selectedChapterId,
          chapter_number: selectedChapter.chapterNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "添加章节失败");
      }

      toast({
        title: "添加成功",
        description: `章节 ${selectedChapter.chapterNumber}: ${selectedChapter.title} 已添加到时间线`,
      });

      onAdded();
      onClose();
      
      // 重置选择
      setSelectedProjectId("");
      setSelectedChapterId("");
    } catch (error) {
      console.error("添加章节失败:", error);
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>添加章节到时间线</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 小说项目选择 */}
          <div className="space-y-2">
            <Label htmlFor="project">选择小说项目</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={loadingProjects}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder={loadingProjects ? "加载中..." : "选择项目"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 章节选择 */}
          <div className="space-y-2">
            <Label htmlFor="chapter">选择章节</Label>
            <Select
              value={selectedChapterId}
              onValueChange={setSelectedChapterId}
              disabled={!selectedProjectId || loadingChapters}
            >
              <SelectTrigger id="chapter">
                <SelectValue
                  placeholder={
                    !selectedProjectId
                      ? "请先选择项目"
                      : loadingChapters
                      ? "加载中..."
                      : "选择章节"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    第{chapter.chapterNumber}章: {chapter.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chapters.length === 0 && selectedProjectId && !loadingChapters && (
              <p className="text-sm text-gray-400">该项目暂无章节大纲</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleAdd} disabled={loading || !selectedChapterId}>
            {loading ? "添加中..." : "添加"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
