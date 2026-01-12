/**
 * Novel Project React Query Hook
 *
 * 替代原有的 useNovelProject，提供智能缓存和自动更新
 */
"use client";

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ChapterOutline, Character, WorldSetting, NovelProject } from './[id]/types';

/**
 * 查询键生成器
 */
export const novelQueryKeys = {
  // 项目详情
  project: (projectId: string) => ['novel-project', projectId] as const,

  // 项目大纲
  outlines: (projectId: string) => ['novel-project', projectId, 'outlines'] as const,

  // 项目角色
  characters: (projectId: string) => ['novel-project', projectId, 'characters'] as const,

  // 世界观
  worldSetting: (projectId: string) => ['novel-project', projectId, 'world-setting'] as const,

  // 所有项目列表
  allProjects: () => ['novel-projects'] as const,
} as const;

/**
 * 获取项目详情
 */
async function fetchProject(projectId: string): Promise<NovelProject> {
  const response = await fetch(`/api/novel/projects/${projectId}`);
  if (!response.ok) {
    throw new Error('获取项目失败');
  }
  return response.json();
}

/**
 * 更新项目
 */
async function updateProject(
  projectId: string,
  updates: Partial<NovelProject>
): Promise<NovelProject> {
  const response = await fetch(`/api/novel/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('更新项目失败');
  }

  return response.json();
}

/**
 * Novel Project Query Hook
 *
 * 功能:
 * - 自动缓存项目数据
 * - 后台自动刷新
 * - 乐观更新支持
 * - 并行请求多个相关数据
 */
export function useNovelProjectQuery(projectId: string) {
  const queryClient = useQueryClient();

  // ========== 查询: 项目详情 ==========
  const {
    data: project,
    isLoading: isLoadingProject,
    error: projectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: novelQueryKeys.project(projectId),
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
  });

  // ========== 查询: 大纲列表 ==========
  const outlines = project?.outlines || [];

  // ========== 查询: 角色列表 ==========
  const characters = project?.characters || [];

  // ========== 查询: 世界观 ==========
  const worldSetting = project?.world_setting || null;

  // ========== 变更: 更新项目 ==========
  const updateProjectMutation = useMutation({
    mutationFn: (updates: Partial<NovelProject>) =>
      updateProject(projectId, updates),

    // 乐观更新: 立即更新缓存
    onMutate: async (updates) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: novelQueryKeys.project(projectId) });

      // 保存当前数据 (用于回滚)
      const previousProject = queryClient.getQueryData(novelQueryKeys.project(projectId));

      // 乐观更新缓存
      queryClient.setQueryData<NovelProject>(
        novelQueryKeys.project(projectId),
        (old) => ({
          ...old!,
          ...updates,
          updated_at: new Date().toISOString(),
        })
      );

      return { previousProject };
    },

    // 失败时回滚
    onError: (error, variables, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          novelQueryKeys.project(projectId),
          context.previousProject
        );
      }
      toast.error('保存失败，请重试');
    },

    // 成功后刷新数据 (确保与服务器一致)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: novelQueryKeys.project(projectId) });
    },
  });

  // ========== 变更: 更新大纲 ==========
  const updateOutlinesMutation = useMutation({
    mutationFn: async (newOutlines: ChapterOutline[]) => {
      // 转换为后端格式
      const backendOutlines = newOutlines.map((outline) => ({
        chapter_number: outline.chapterNumber,
        title: outline.title,
        outline: outline.outline,
        key_events: outline.keyEvents,
        characters: outline.characters,
        plot_lines: outline.plotLines,
        is_key_chapter: outline.isKeyChapter,
        content: outline.content || '',
        word_count: outline.wordCount || 0,
        status: outline.status || 'draft',
      }));

      const response = await fetch(`/api/novel/projects/${projectId}/outlines`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlines: backendOutlines }),
      });

      if (!response.ok) {
        throw new Error('保存大纲失败');
      }

      return response.json();
    },

    // 乐观更新
    onMutate: async (newOutlines) => {
      await queryClient.cancelQueries({ queryKey: novelQueryKeys.project(projectId) });

      const previousProject = queryClient.getQueryData(novelQueryKeys.project(projectId));

      queryClient.setQueryData<NovelProject>(
        novelQueryKeys.project(projectId),
        (old) => ({
          ...old!,
          outlines: newOutlines,
          updated_at: new Date().toISOString(),
        })
      );

      return { previousProject };
    },

    onError: (error, variables, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          novelQueryKeys.project(projectId),
          context.previousProject
        );
      }
      toast.error('保存大纲失败');
    },

    onSuccess: () => {
      toast.success('大纲已保存');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: novelQueryKeys.project(projectId) });
    },
  });

  // ========== 变更: 更新角色 ==========
  const updateCharactersMutation = useMutation({
    mutationFn: async (newCharacters: Character[]) => {
      const response = await fetch(`/api/novel/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characters: newCharacters }),
      });

      if (!response.ok) {
        throw new Error('保存角色失败');
      }

      return response.json();
    },

    onMutate: async (newCharacters) => {
      await queryClient.cancelQueries({ queryKey: novelQueryKeys.project(projectId) });
      const previousProject = queryClient.getQueryData(novelQueryKeys.project(projectId));

      queryClient.setQueryData<NovelProject>(
        novelQueryKeys.project(projectId),
        (old) => ({
          ...old!,
          characters: newCharacters,
          updated_at: new Date().toISOString(),
        })
      );

      return { previousProject };
    },

    onError: (error, variables, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          novelQueryKeys.project(projectId),
          context.previousProject
        );
      }
      toast.error('保存角色失败');
    },

    onSuccess: () => {
      toast.success('角色已保存');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: novelQueryKeys.project(projectId) });
    },
  });

  // ========== 变更: 更新世界观 ==========
  const updateWorldSettingMutation = useMutation({
    mutationFn: async (newWorldSetting: WorldSetting) => {
      const response = await fetch(`/api/novel/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_setting: newWorldSetting }),
      });

      if (!response.ok) {
        throw new Error('保存世界观失败');
      }

      return response.json();
    },

    onMutate: async (newWorldSetting) => {
      await queryClient.cancelQueries({ queryKey: novelQueryKeys.project(projectId) });
      const previousProject = queryClient.getQueryData(novelQueryKeys.project(projectId));

      queryClient.setQueryData<NovelProject>(
        novelQueryKeys.project(projectId),
        (old) => ({
          ...old!,
          world_setting: newWorldSetting,
          updated_at: new Date().toISOString(),
        })
      );

      return { previousProject };
    },

    onError: (error, variables, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          novelQueryKeys.project(projectId),
          context.previousProject
        );
      }
      toast.error('保存世界观失败');
    },

    onSuccess: () => {
      toast.success('世界观已保存');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: novelQueryKeys.project(projectId) });
    },
  });

  // ========== 派生状态 ==========
  const loading = isLoadingProject;
  const error = projectError;

  // 保存状态
  const saveStatus =
    updateProjectMutation.isPending ||
    updateOutlinesMutation.isPending ||
    updateCharactersMutation.isPending ||
    updateWorldSettingMutation.isPending
      ? 'saving'
      : 'saved';

  return {
    // 数据
    project: project || null,
    outlines,
    characters,
    worldSetting,

    // 状态
    loading,
    error,
    saveStatus,

    // 操作
    refetch: refetchProject,
    handleUpdateProject: (updates: Partial<NovelProject>) =>
      updateProjectMutation.mutate(updates),
    handleSaveOutlines: (newOutlines: ChapterOutline[]) =>
      updateOutlinesMutation.mutate(newOutlines),
    handleSaveCharacters: (newCharacters: Character[]) =>
      updateCharactersMutation.mutate(newCharacters),
    handleSaveWorldSetting: (newWorldSetting: WorldSetting) =>
      updateWorldSettingMutation.mutate(newWorldSetting),
  };
}

/**
 * Novel Projects List Hook
 *
 * 用于项目列表页面
 */
export function useNovelProjectsList() {
  return useQuery({
    queryKey: novelQueryKeys.allProjects(),
    queryFn: async () => {
      const response = await fetch('/api/novel/projects');
      if (!response.ok) {
        throw new Error('获取项目列表失败');
      }
      return response.json();
    },
  });
}
