"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

  // 调试：监控按钮禁用状态
  useEffect(() => {
    console.log("[AddChapterDialog] 按钮状态", {
      loading,
      selectedChapterId,
      selectedChapterIdEmpty: !selectedChapterId,
      buttonDisabled: loading || !selectedChapterId,
    });
  }, [loading, selectedChapterId]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/novel/projects");
      if (!response.ok) {
        throw new Error("获取项目列表失败");
      }
      const data = await response.json();
      // API 直接返回数组，不是 { projects: [...] }
      setProjects(Array.isArray(data) ? data : []);
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
      const chapters = data.outlines || [];
      console.log("[AddChapterDialog] 加载章节成功", {
        projectId,
        chaptersCount: chapters.length,
        chapters: chapters.map((c: NovelChapterOutline) => ({
          id: c.id,
          idType: typeof c.id,
          chapterNumber: c.chapterNumber,
          title: c.title,
        })),
      });
      setChapters(chapters);
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
    console.log("[AddChapterDialog] handleAdd 开始执行", {
      selectedChapterId,
      selectedChapterIdType: typeof selectedChapterId,
      selectedProjectId,
      timelineId,
      chaptersCount: chapters.length,
      chapters: chapters.map(c => ({ id: c.id, idType: typeof c.id, title: c.title })),
    });

    if (!selectedChapterId) {
      console.log("[AddChapterDialog] 未选择章节");
      toast({
        title: "请选择章节",
        description: "请先选择要添加的章节",
        variant: "destructive",
      });
      return;
    }

    // ID 统一为字符串类型，直接比较
    const selectedChapter = chapters.find((c) => c.id === selectedChapterId);
    console.log("[AddChapterDialog] 查找选中章节结果", {
      selectedChapterId,
      selectedChapter,
      found: !!selectedChapter,
    });

    if (!selectedChapter) {
      console.error("[AddChapterDialog] 未找到选中章节！", {
        selectedChapterId,
        availableIds: chapters.map(c => c.id),
      });
      toast({
        title: "错误",
        description: "未找到选中的章节",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log("[AddChapterDialog] 开始请求 API", {
      url: `/api/canvas/timeline/${timelineId}/chapters`,
      payload: {
        chapter_id: selectedChapterId,
        chapter_number: selectedChapter.chapterNumber,
      },
    });

    try {
      const response = await fetch(`/api/canvas/timeline/${timelineId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: selectedChapterId,
          chapter_number: selectedChapter.chapterNumber,
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
        throw new Error(errorData.error || "添加章节失败");
      }

      const result = await response.json();
      console.log("[AddChapterDialog] API 成功", result);

      toast({
        title: "添加成功",
        description: `章节 ${selectedChapter.chapterNumber}: ${selectedChapter.title} 已添加到时间线`,
      });

      console.log("[AddChapterDialog] 调用回调");
      onAdded();
      onClose();

      // 重置选择
      setSelectedProjectId("");
      setSelectedChapterId("");
    } catch (error) {
      console.error("[AddChapterDialog] 添加章节失败:", error);
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("[AddChapterDialog] handleAdd 完成");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f13] border-zinc-800 text-white max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle>添加章节到时间线</DialogTitle>
          <DialogDescription className="sr-only">
            选择小说项目和章节添加到当前时间线
          </DialogDescription>
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
              <SelectTrigger id="project" className="bg-zinc-900/50 border-zinc-800 focus:ring-purple-500/50">
                <SelectValue placeholder={loadingProjects ? "加载中..." : "选择项目"} />
              </SelectTrigger>
              <SelectContent
                className="z-[110] bg-zinc-900 border-zinc-800 text-white max-h-[300px]"
                position="popper"
                sideOffset={4}
              >
                {projects.length > 0 ? (
                  projects.map((project, index) => (
                    <SelectItem
                      key={project.id || `project-${index}`}
                      value={project.id}
                      className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-purple-400"
                    >
                      {project.title}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-400 text-center">
                    {loadingProjects ? "加载中..." : "暂无项目"}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 章节选择 */}
          <div className="space-y-2">
            <Label htmlFor="chapter">选择章节</Label>
            <Select
              value={selectedChapterId}
              onValueChange={(value) => {
                console.log("[AddChapterDialog] 章节选择变化", {
                  newValue: value,
                  valueType: typeof value,
                  previousValue: selectedChapterId,
                });
                setSelectedChapterId(value);
              }}
              disabled={!selectedProjectId || loadingChapters}
            >
              <SelectTrigger
                id="chapter"
                className="bg-zinc-900/50 border-zinc-800 focus:ring-purple-500/50"
              >
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
              <SelectContent
                className="z-[110] bg-zinc-900 border-zinc-800 text-white max-h-[300px]"
                position="popper"
                sideOffset={4}
              >
                {chapters.length > 0 ? (
                  chapters.map((chapter, index) => (
                    <SelectItem
                      key={chapter.id || `chapter-${index}`}
                      value={chapter.id}
                      className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-purple-400"
                    >
                      第{chapter.chapterNumber}章: {chapter.title}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-400 text-center">
                    {!selectedProjectId
                      ? "请先选择项目"
                      : loadingChapters
                      ? "加载中..."
                      : "该项目暂无章节大纲"}
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
            disabled={loading || !selectedChapterId}
            className="bg-purple-600 hover:bg-purple-700 text-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {loading ? "添加中..." : "添加"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
