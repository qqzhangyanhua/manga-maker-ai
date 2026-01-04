/**
 * 小说项目数据管理 Hook
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { NovelProject, ChapterOutline } from "./types";
import { normalizeOutline, denormalizeOutline, createNewChapter } from "./types";

interface UseNovelProjectResult {
  project: NovelProject | null;
  outlines: ChapterOutline[];
  selectedChapter: ChapterOutline | null;
  loading: boolean;
  setProject: (project: NovelProject | null) => void;
  setOutlines: (outlines: ChapterOutline[]) => void;
  setSelectedChapter: (chapter: ChapterOutline | null) => void;
  handleCreateChapter: () => Promise<void>;
  handleChapterUpdate: (updatedChapter: ChapterOutline) => Promise<void>;
  handleSaveOutlines: (newOutlines: ChapterOutline[]) => Promise<void>;
}

export function useNovelProject(projectId: string): UseNovelProjectResult {
  const [project, setProject] = useState<NovelProject | null>(null);
  const [outlines, setOutlines] = useState<ChapterOutline[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterOutline | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取项目数据
  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/novel/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        if (data.outlines && Array.isArray(data.outlines)) {
          const normalizedOutlines = data.outlines.map(normalizeOutline);
          setOutlines(normalizedOutlines);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "获取项目失败");
      }
    } catch (error) {
      console.error("[fetchProject] 异常:", error);
      toast.error("获取项目失败");
      throw error;
    }
  }, [projectId]);

  // 获取大纲数据
  const fetchOutlines = useCallback(async () => {
    try {
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`);
      if (response.ok) {
        const data = await response.json();
        if (data.outlines && Array.isArray(data.outlines)) {
          const normalizedOutlines = data.outlines.map(normalizeOutline);
          setOutlines(normalizedOutlines);
        } else {
          setOutlines([]);
        }
      }
    } catch (error) {
      console.error("[fetchOutlines] 异常:", error);
    }
  }, [projectId]);

  // 初始化加载
  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true);
        await Promise.all([fetchProject(), fetchOutlines()]);
      } catch (error) {
        console.error("[loadAllData] 加载数据失败:", error);
        toast.error("加载数据失败");
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadAllData();
    }
  }, [projectId, fetchProject, fetchOutlines]);

  // 创建新章节
  const handleCreateChapter = useCallback(async () => {
    const newChapterNumber = outlines.length + 1;
    const newOutline = createNewChapter(newChapterNumber);

    try {
      const updatedOutlines = [...outlines, newOutline];
      setOutlines(updatedOutlines);
      setSelectedChapter(newOutline);

      const backendOutlines = updatedOutlines.map(denormalizeOutline);
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlines: backendOutlines }),
      });

      if (response.ok) {
        toast.success("章节创建成功");
      } else {
        throw new Error("创建失败");
      }
    } catch (error) {
      console.error("创建章节失败:", error);
      toast.error("创建章节失败");
    }
  }, [outlines, projectId]);

  // 更新章节
  const handleChapterUpdate = useCallback(async (updatedChapter: ChapterOutline) => {
    try {
      const updatedOutlines = outlines.map((outline) =>
        outline.chapterNumber === updatedChapter.chapterNumber ? updatedChapter : outline
      );
      setOutlines(updatedOutlines);
      setSelectedChapter(updatedChapter);

      const backendOutlines = updatedOutlines.map(denormalizeOutline);
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlines: backendOutlines }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("更新章节失败:", error);
      toast.error("保存失败");
    }
  }, [outlines, projectId]);

  // 保存大纲
  const handleSaveOutlines = useCallback(async (newOutlines: ChapterOutline[]) => {
    try {
      const backendOutlines = newOutlines.map(denormalizeOutline);
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlines: backendOutlines }),
      });

      if (response.ok) {
        setOutlines(newOutlines);
        toast.success("大纲保存成功");
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      console.error("保存大纲失败:", error);
      toast.error("保存失败");
    }
  }, [projectId]);

  return {
    project,
    outlines,
    selectedChapter,
    loading,
    setProject,
    setOutlines,
    setSelectedChapter,
    handleCreateChapter,
    handleChapterUpdate,
    handleSaveOutlines,
  };
}
