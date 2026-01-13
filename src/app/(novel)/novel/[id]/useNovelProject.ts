/**
 * 小说项目数据管理 Hook
 * 修复版本：解决数据同步问题，添加错误处理和保存状态
 */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { NovelProject, ChapterOutline, Character, WorldSetting, ProjectUpdatePayload } from "./types";
import { normalizeOutline, denormalizeOutline, createNewChapter, normalizeCharacters, normalizeWorldSetting } from "./types";
import type { SaveStatus } from "@/components/SaveIndicator";

interface UseNovelProjectResult {
  // 数据状态
  project: NovelProject | null;
  outlines: ChapterOutline[];
  characters: Character[];
  worldSetting: WorldSetting | null;
  selectedChapter: ChapterOutline | null;
  
  // 加载和错误状态
  loading: boolean;
  error: Error | null;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  
  // 操作方法
  setSelectedChapter: (chapter: ChapterOutline | null) => void;
  handleCreateChapter: () => Promise<void>;
  handleChapterUpdate: (updatedChapter: ChapterOutline) => Promise<void>;
  handleSaveOutlines: (newOutlines: ChapterOutline[]) => Promise<void>;
  handleSaveCharacters: (newCharacters: Character[]) => Promise<void>;
  handleSaveWorldSetting: (newWorldSetting: WorldSetting) => Promise<void>;
  handleUpdateProject: (updates: ProjectUpdatePayload) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNovelProject(projectId: string): UseNovelProjectResult {
  // ✅ 单一数据源：project
  const [project, setProject] = useState<NovelProject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterOutline | null>(null);
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ✅ 派生状态：从 project 派生，保证数据一致性
  const outlines = useMemo(() => {
    if (!project?.outlines) return [];
    return project.outlines.map(normalizeOutline);
  }, [project?.outlines]);

  const characters = useMemo(() => {
    const normalized = normalizeCharacters(project?.characters);

    // ✅ Sprint 1 Task 1.4：仅在开发环境输出调试日志
    if (process.env.NODE_ENV === 'development') {
      console.log("[useNovelProject] Characters data:", {
        raw: project?.characters,
        normalized,
        count: normalized.length
      });
    }

    return normalized;
  }, [project?.characters]);

  const worldSetting = useMemo(() => {
    return normalizeWorldSetting(project?.world_setting);
  }, [project?.world_setting]);

  // 获取项目数据
  const fetchProject = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/novel/projects/${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "获取项目失败" }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setProject(data);
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("获取项目失败");
      console.error("[fetchProject] 异常:", errorObj);
      setError(errorObj);
      toast.error(errorObj.message);
      throw errorObj;
    }
  }, [projectId]);

  // ✅ Sprint 2 Task 2.2: 修复 useEffect 依赖循环
  // 移除 fetchProject 依赖，仅在 projectId 变化时重新加载
  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/novel/projects/${projectId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "获取项目失败" }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setProject(data);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error("获取项目失败");
        console.error("[loadData] 异常:", errorObj);
        setError(errorObj);
        toast.error(errorObj.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // ✅ 仅依赖 projectId，避免依赖循环

  // ✅ 通用保存方法：更新 project 状态保持一致性
  const updateProjectData = useCallback(async (
    endpoint: string,
    method: string,
    body: unknown
  ): Promise<NovelProject> => {
    setSaveStatus("saving");
    
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "保存失败" }));
        throw new Error(errorData.error || "保存失败");
      }

      const updatedProject = await response.json();
      setProject(updatedProject);
      setSaveStatus("saved");
      setLastSaved(new Date());
      
      // 3秒后重置保存状态
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);

      return updatedProject;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("保存失败");
      console.error("[updateProjectData] 保存失败:", errorObj);
      setSaveStatus("error");
      toast.error(errorObj.message);
      throw errorObj;
    }
  }, []);

  // 创建新章节
  const handleCreateChapter = useCallback(async () => {
    const newChapterNumber = outlines.length + 1;
    const newOutline = createNewChapter(newChapterNumber);

    try {
      const updatedOutlines = [...outlines, newOutline];
      const backendOutlines = updatedOutlines.map(denormalizeOutline);
      
      await updateProjectData(
        `/api/novel/projects/${projectId}`,
        "PATCH",
        { outlines: backendOutlines }
      );
      
      setSelectedChapter(newOutline);
      toast.success("章节创建成功");
    } catch (err) {
      console.error("创建章节失败:", err);
    }
  }, [outlines, projectId, updateProjectData]);

  // 更新章节
  const handleChapterUpdate = useCallback(async (updatedChapter: ChapterOutline) => {
    try {
      const updatedOutlines = outlines.map((outline) =>
        outline.chapterNumber === updatedChapter.chapterNumber ? updatedChapter : outline
      );
      
      const backendOutlines = updatedOutlines.map(denormalizeOutline);
      await updateProjectData(
        `/api/novel/projects/${projectId}`,
        "PATCH",
        { outlines: backendOutlines }
      );
      
      setSelectedChapter(updatedChapter);
    } catch (err) {
      console.error("更新章节失败:", err);
    }
  }, [outlines, projectId, updateProjectData]);

  // 保存大纲
  const handleSaveOutlines = useCallback(async (newOutlines: ChapterOutline[]) => {
    try {
      const backendOutlines = newOutlines.map(denormalizeOutline);
      await updateProjectData(
        `/api/novel/projects/${projectId}`,
        "PATCH",
        { outlines: backendOutlines }
      );
      toast.success("大纲保存成功");
    } catch (err) {
      console.error("保存大纲失败:", err);
    }
  }, [projectId, updateProjectData]);

  // 保存角色
  const handleSaveCharacters = useCallback(async (newCharacters: Character[]) => {
    try {
      await updateProjectData(
        `/api/novel/projects/${projectId}`,
        "PATCH",
        { characters: newCharacters }
      );
      toast.success("角色保存成功");
    } catch (err) {
      console.error("保存角色失败:", err);
      throw err;
    }
  }, [projectId, updateProjectData]);

  // 保存世界观
  const handleSaveWorldSetting = useCallback(async (newWorldSetting: WorldSetting) => {
    try {
      await updateProjectData(
        `/api/novel/projects/${projectId}`,
        "PATCH",
        { world_setting: newWorldSetting }
      );
      toast.success("世界观保存成功");
    } catch (err) {
      console.error("保存世界观失败:", err);
      throw err;
    }
  }, [projectId, updateProjectData]);

  // ✅ Sprint 1 Task 1.3：使用明确的类型定义，避免强制转换
  const handleUpdateProject = useCallback(async (updates: ProjectUpdatePayload) => {
    try {
      await updateProjectData(
        `/api/novel/projects/${projectId}`,
        "PATCH",
        updates
      );
      toast.success("项目更新成功");
    } catch (err) {
      console.error("更新项目失败:", err);
      throw err;
    }
  }, [projectId, updateProjectData]);

  // 重新获取数据
  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      await fetchProject();
    } finally {
      setLoading(false);
    }
  }, [fetchProject]);

  return {
    // 数据状态
    project,
    outlines,
    characters,
    worldSetting,
    selectedChapter,
    
    // 加载和错误状态
    loading,
    error,
    saveStatus,
    lastSaved,
    
    // 操作方法
    setSelectedChapter,
    handleCreateChapter,
    handleChapterUpdate,
    handleSaveOutlines,
    handleSaveCharacters,
    handleSaveWorldSetting,
    handleUpdateProject,
    refetch,
  };
}
