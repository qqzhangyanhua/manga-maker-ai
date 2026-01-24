/**
 * 小说项目数据管理 Hook (Phase 3 重构版)
 *
 * 按需加载策略：
 * - 初始化只加载项目元数据 + 大纲（第一个 Tab）
 * - 其他 Tab 数据在首次访问时加载
 * - 已加载的数据会被缓存，不会重复请求
 */
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import type {
  NovelProject,
  ChapterOutline,
  Character,
  WorldSetting,
  ProjectUpdatePayload,
} from "./types";
import {
  normalizeOutline,
  denormalizeOutline,
  createNewChapter,
  normalizeCharacters,
  normalizeWorldSetting,
} from "./types";
import type { SaveStatus } from "../components/SaveIndicator";

// ============================================================================
// 类型定义
// ============================================================================

interface LoadingState {
  project: boolean;
  outlines: boolean;
  characters: boolean;
  worldSetting: boolean;
}

interface FetchedState {
  outlines: boolean;
  characters: boolean;
  worldSetting: boolean;
}

interface UseNovelProjectResult {
  // 数据状态
  project: NovelProject | null;
  outlines: ChapterOutline[];
  characters: Character[];
  worldSetting: WorldSetting | null;
  selectedChapter: ChapterOutline | null;

  // 加载和错误状态
  loading: boolean;
  loadingState: LoadingState;
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

  // Phase 3: 按需加载方法（Tab 切换时调用）
  fetchOutlines: () => Promise<void>;
  fetchCharacters: () => Promise<void>;
  fetchWorldSetting: () => Promise<void>;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useNovelProject(projectId: string): UseNovelProjectResult {
  // 数据状态
  const [project, setProject] = useState<NovelProject | null>(null);
  const [rawOutlines, setRawOutlines] = useState<unknown[] | null>(null);
  const [rawCharacters, setRawCharacters] = useState<unknown[] | null>(null);
  const [rawWorldSetting, setRawWorldSetting] = useState<unknown | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterOutline | null>(null);

  // 加载状态
  const [loadingState, setLoadingState] = useState<LoadingState>({
    project: true,
    outlines: true,
    characters: false,
    worldSetting: false,
  });

  // ✅ 已加载标记：防止重复请求
  const fetchedRef = useRef<FetchedState>({
    outlines: false,
    characters: false,
    worldSetting: false,
  });

  const [error, setError] = useState<Error | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 总体加载状态
  const loading = loadingState.project;

  // ============================================================================
  // 派生状态：标准化数据
  // ============================================================================

  const outlines = useMemo(() => {
    if (!rawOutlines) return [];
    return (rawOutlines as Array<Record<string, unknown>>).map(normalizeOutline);
  }, [rawOutlines]);

  const characters = useMemo(() => {
    return normalizeCharacters(rawCharacters);
  }, [rawCharacters]);

  const worldSetting = useMemo(() => {
    return normalizeWorldSetting(rawWorldSetting);
  }, [rawWorldSetting]);

  // ============================================================================
  // API 请求方法
  // ============================================================================

  /**
   * 获取项目元数据
   */
  const fetchProject = useCallback(async () => {
    setLoadingState((prev) => ({ ...prev, project: true }));
    setError(null);

    try {
      const response = await fetch(`/api/novel/projects/${projectId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "获取项目失败" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (process.env.NODE_ENV === "development") {
        console.log("[useNovelProject] Project metadata loaded");
      }

      setProject(data);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("获取项目失败");
      console.error("[fetchProject] Error:", errorObj);
      setError(errorObj);
      toast.error(errorObj.message);
    } finally {
      setLoadingState((prev) => ({ ...prev, project: false }));
    }
  }, [projectId]);

  /**
   * 获取故事大纲（首次访问时调用）
   */
  const fetchOutlines = useCallback(async () => {
    // ✅ 已加载过则跳过
    if (fetchedRef.current.outlines) {
      return;
    }

    setLoadingState((prev) => ({ ...prev, outlines: true }));

    try {
      const response = await fetch(`/api/novel/projects/${projectId}/outlines`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "获取大纲失败" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (process.env.NODE_ENV === "development") {
        console.log("[useNovelProject] Outlines loaded:", data.outlines?.length || 0);
      }

      setRawOutlines(data.outlines || []);
      fetchedRef.current.outlines = true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("获取大纲失败");
      console.error("[fetchOutlines] Error:", errorObj);
      toast.error(errorObj.message);
    } finally {
      setLoadingState((prev) => ({ ...prev, outlines: false }));
    }
  }, [projectId]);

  /**
   * 获取角色列表（Tab 切换时按需调用）
   */
  const fetchCharacters = useCallback(async () => {
    // ✅ 已加载过则跳过
    if (fetchedRef.current.characters) {
      return;
    }

    setLoadingState((prev) => ({ ...prev, characters: true }));

    try {
      const response = await fetch(`/api/novel/projects/${projectId}/characters`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "获取角色失败" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (process.env.NODE_ENV === "development") {
        console.log("[useNovelProject] Characters loaded:", data.characters?.length || 0);
      }

      setRawCharacters(data.characters || []);
      fetchedRef.current.characters = true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("获取角色失败");
      console.error("[fetchCharacters] Error:", errorObj);
      toast.error(errorObj.message);
    } finally {
      setLoadingState((prev) => ({ ...prev, characters: false }));
    }
  }, [projectId]);

  /**
   * 获取世界观设定（Tab 切换时按需调用）
   */
  const fetchWorldSetting = useCallback(async () => {
    // ✅ 已加载过则跳过
    if (fetchedRef.current.worldSetting) {
      return;
    }

    setLoadingState((prev) => ({ ...prev, worldSetting: true }));

    try {
      const response = await fetch(`/api/novel/projects/${projectId}/world-setting`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "获取世界观失败" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (process.env.NODE_ENV === "development") {
        console.log("[useNovelProject] World setting loaded");
      }

      setRawWorldSetting(data.world_setting || null);
      fetchedRef.current.worldSetting = true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("获取世界观失败");
      console.error("[fetchWorldSetting] Error:", errorObj);
      toast.error(errorObj.message);
    } finally {
      setLoadingState((prev) => ({ ...prev, worldSetting: false }));
    }
  }, [projectId]);

  // ============================================================================
  // 初始化加载：只加载项目元数据 + 大纲（第一个 Tab）
  // ============================================================================

  useEffect(() => {
    if (!projectId) return;

    // ✅ 重置已加载状态
    fetchedRef.current = {
      outlines: false,
      characters: false,
      worldSetting: false,
    };

    // ✅ 只加载项目元数据和大纲（章节管理 Tab 需要）
    fetchProject();
    fetchOutlines();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ============================================================================
  // 保存方法
  // ============================================================================

  /**
   * 通用保存状态管理
   */
  const withSaveStatus = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      setSaveStatus("saving");

      try {
        const result = await operation();
        setSaveStatus("saved");
        setLastSaved(new Date());

        setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);

        return result;
      } catch (err) {
        setSaveStatus("error");
        throw err;
      }
    },
    []
  );

  /**
   * 保存大纲
   */
  const handleSaveOutlines = useCallback(
    async (newOutlines: ChapterOutline[]) => {
      await withSaveStatus(async () => {
        const backendOutlines = newOutlines.map(denormalizeOutline);

        const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outlines: backendOutlines }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "保存大纲失败" }));
          throw new Error(errorData.error || "保存大纲失败");
        }

        const data = await response.json();
        setRawOutlines(data.outlines || []);
        toast.success("大纲保存成功");
      });
    },
    [projectId, withSaveStatus]
  );

  /**
   * 保存角色
   */
  const handleSaveCharacters = useCallback(
    async (newCharacters: Character[]) => {
      await withSaveStatus(async () => {
        const response = await fetch(`/api/novel/projects/${projectId}/characters`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characters: newCharacters }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "保存角色失败" }));
          throw new Error(errorData.error || "保存角色失败");
        }

        const data = await response.json();
        setRawCharacters(data.characters || []);
        toast.success("角色保存成功");
      });
    },
    [projectId, withSaveStatus]
  );

  /**
   * 保存世界观
   */
  const handleSaveWorldSetting = useCallback(
    async (newWorldSetting: WorldSetting) => {
      await withSaveStatus(async () => {
        const response = await fetch(`/api/novel/projects/${projectId}/world-setting`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ world_setting: newWorldSetting }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "保存世界观失败" }));
          throw new Error(errorData.error || "保存世界观失败");
        }

        const data = await response.json();
        setRawWorldSetting(data.world_setting || null);
        toast.success("世界观保存成功");
      });
    },
    [projectId, withSaveStatus]
  );

  /**
   * 更新项目元数据
   */
  const handleUpdateProject = useCallback(
    async (updates: ProjectUpdatePayload) => {
      await withSaveStatus(async () => {
        const response = await fetch(`/api/novel/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "更新项目失败" }));
          throw new Error(errorData.error || "更新项目失败");
        }

        const updatedProject = await response.json();
        setProject(updatedProject);
        toast.success("项目更新成功");
      });
    },
    [projectId, withSaveStatus]
  );

  /**
   * 创建新章节
   */
  const handleCreateChapter = useCallback(async () => {
    const newChapterNumber = outlines.length + 1;
    const newOutline = createNewChapter(newChapterNumber);

    try {
      const updatedOutlines = [...outlines, newOutline];
      await handleSaveOutlines(updatedOutlines);
      setSelectedChapter(newOutline);
      toast.success("章节创建成功");
    } catch (err) {
      console.error("创建章节失败:", err);
    }
  }, [outlines, handleSaveOutlines]);

  /**
   * 更新章节
   */
  const handleChapterUpdate = useCallback(
    async (updatedChapter: ChapterOutline) => {
      try {
        const updatedOutlines = outlines.map((outline) =>
          outline.chapterNumber === updatedChapter.chapterNumber ? updatedChapter : outline
        );

        await handleSaveOutlines(updatedOutlines);
        setSelectedChapter(updatedChapter);
      } catch (err) {
        console.error("更新章节失败:", err);
      }
    },
    [outlines, handleSaveOutlines]
  );

  /**
   * 强制重新获取所有数据
   */
  const refetch = useCallback(async () => {
    // 重置已加载状态，强制重新请求
    fetchedRef.current = {
      outlines: false,
      characters: false,
      worldSetting: false,
    };

    await Promise.all([
      fetchProject(),
      fetchOutlines(),
      fetchCharacters(),
      fetchWorldSetting(),
    ]);
  }, [fetchProject, fetchOutlines, fetchCharacters, fetchWorldSetting]);

  // ============================================================================
  // 返回结果
  // ============================================================================

  return {
    // 数据状态
    project,
    outlines,
    characters,
    worldSetting,
    selectedChapter,

    // 加载和错误状态
    loading,
    loadingState,
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

    // Phase 3: 按需加载方法
    fetchOutlines,
    fetchCharacters,
    fetchWorldSetting,
  };
}
