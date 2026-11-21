/**
 * React Query Hooks for Story Data Management
 * 提供剧本和分镜的数据查询和变更操作
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Story, Panel } from '../types/script-editor.types';

interface StoryData {
    story: Story;
    panels: Panel[];
    projectId: string | null;
}

interface PanelsCache {
    panels: Panel[];
    projectId: string | null;
}

/**
 * 查询剧本和分镜数据
 */
export function useStoryData(storyId: string) {
    return useQuery<StoryData>({
        queryKey: ['story', storyId],
        queryFn: async () => {
            const [storyRes, panelsRes] = await Promise.all([
                fetch(`/api/story/${storyId}`),
                fetch(`/api/story/${storyId}/panels`),
            ]);

            if (!storyRes.ok) throw new Error('Failed to load story');

            const storyData = await storyRes.json();
            const panelsData = panelsRes.ok
                ? await panelsRes.json()
                : { panels: [], projectId: null };

            return {
                story: storyData.story,
                panels: panelsData.panels || [],
                projectId: panelsData.projectId,
            };
        },
    });
}

/**
 * 更新剧本信息
 */
export function useUpdateStory(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { title: string; premise: string }) => {
            const res = await fetch(`/api/story/${storyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onMutate: async (variables) => {
            // 取消正在进行的查询
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['story', storyId] }),
                queryClient.cancelQueries({ queryKey: ['story-basic', storyId] }),
            ]);

            // 保存之前的数据用于回滚
            const previousData = queryClient.getQueryData<StoryData>(['story', storyId]);
            const previousBasic = queryClient.getQueryData<{ story: Story; projectId: string | null }>(['story-basic', storyId]);

            // 乐观更新 + 添加同步标记
            queryClient.setQueryData<StoryData>(['story', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    story: {
                        ...old.story,
                        ...variables,
                        _syncing: true // 添加同步标记
                    },
                };
            });
            queryClient.setQueryData<{ story: Story; projectId: string | null }>(['story-basic', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    story: {
                        ...old.story,
                        ...variables,
                        _syncing: true,
                    },
                };
            });

            return { previousData, previousBasic };
        },
        onSuccess: (data) => {
            // 成功后移除同步标记
            queryClient.setQueryData<StoryData>(['story', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    story: { ...data.story, _syncing: false },
                };
            });
            queryClient.setQueryData<{ story: Story; projectId: string | null }>(['story-basic', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    story: { ...data.story, _syncing: false },
                };
            });
        },
        onError: (err, variables, context) => {
            // 回滚到之前的数据
            if (context?.previousData) {
                queryClient.setQueryData(['story', storyId], context.previousData);
            }
            if (context?.previousBasic) {
                queryClient.setQueryData(['story-basic', storyId], context.previousBasic);
            }
        },
        onSettled: () => {
            // 重新获取数据确保同步
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['story-basic', storyId] });
        },
    });
}

/**
 * 创建分镜
 */
export function useCreatePanel(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (panelData: Partial<Panel> & { project_id: string }) => {
            const res = await fetch('/api/panel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(panelData),
            });
            if (!res.ok) throw new Error('Failed to create');
            return res.json();
        },
        onSuccess: (data) => {
            // 乐观更新
            queryClient.setQueryData<StoryData>(['story', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    panels: [...old.panels, data.panel],
                };
            });
            queryClient.setQueryData<PanelsCache>(['story-panels', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    panels: [...old.panels, data.panel],
                };
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['story-panels', storyId] });
        },
    });
}

/**
 * 更新分镜
 */
export function useUpdatePanel(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<Panel> & { id: string }) => {
            const res = await fetch(`/api/panel/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['story', storyId] });
            await queryClient.cancelQueries({ queryKey: ['story-panels', storyId] });

            const previousData = queryClient.getQueryData<StoryData>(['story', storyId]);
            const previousPanels = queryClient.getQueryData<PanelsCache>(['story-panels', storyId]);

            // 乐观更新
            queryClient.setQueryData<StoryData>(['story', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    panels: old.panels.map((p) =>
                        p.id === variables.id ? { ...p, ...variables } : p
                    ),
                };
            });
            queryClient.setQueryData<PanelsCache>(['story-panels', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    panels: old.panels.map((p) =>
                        p.id === variables.id ? { ...p, ...variables } : p
                    ),
                };
            });

            return { previousData, previousPanels };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['story', storyId], context.previousData);
            }
            if (context?.previousPanels) {
                queryClient.setQueryData(['story-panels', storyId], context.previousPanels);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['story-panels', storyId] });
        },
    });
}

/**
 * 删除分镜
 */
export function useDeletePanel(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (panelId: string) => {
            const res = await fetch(`/api/panel/${panelId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            return panelId;
        },
        onMutate: async (panelId) => {
            await queryClient.cancelQueries({ queryKey: ['story', storyId] });
            await queryClient.cancelQueries({ queryKey: ['story-panels', storyId] });

            const previousData = queryClient.getQueryData<StoryData>(['story', storyId]);
            const previousPanels = queryClient.getQueryData<PanelsCache>(['story-panels', storyId]);

            // 乐观更新
            queryClient.setQueryData<StoryData>(['story', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    panels: old.panels.filter((p) => p.id !== panelId),
                };
            });
            queryClient.setQueryData<PanelsCache>(['story-panels', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    panels: old.panels.filter((p) => p.id !== panelId),
                };
            });

            return { previousData, previousPanels };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['story', storyId], context.previousData);
            }
            if (context?.previousPanels) {
                queryClient.setQueryData(['story-panels', storyId], context.previousPanels);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['story-panels', storyId] });
        },
    });
}

type ReorderAnchor =
    | { before: string }
    | { after: string }
    | { chapter_id: string; index?: number };

/**
 * 重排序分镜。anchor 为 before / after，或 chapter_id 加可选 index（从 0 起）。
 */
export function useReorderPanels(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            panelId,
            projectId,
            anchor,
        }: {
            panelId: string;
            projectId: string;
            anchor: ReorderAnchor;
        }) => {
            const res = await fetch('/api/panel/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    panel_id: panelId,
                    project_id: projectId,
                    ...anchor,
                }),
            });
            if (!res.ok) throw new Error('重排序失败');
            return res.json();
        },
        onSuccess: () => {
            // 重新获取数据
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['story-panels', storyId] });
        },
    });
}

/**
 * 插入分镜
 */
export function useInsertPanel(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            project_id: string;
            insert_after_order: number;
            description: string;
            use_llm?: boolean;
        }) => {
            const res = await fetch('/api/panel/insert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to insert');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['story-panels', storyId] });
        },
    });
}

/**
 * 拆分分镜
 */
export function useSplitPanel(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { panel_id: string; split_hint?: string }) => {
            const res = await fetch('/api/panel/split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to split');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['story-panels', storyId] });
        },
    });
}

/**
 * 合并分镜
 */
export function useMergePanels(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            panel_ids: [string, string];
            project_id: string;
        }) => {
            const res = await fetch('/api/panel/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to merge');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['story-panels', storyId] });
        },
    });
}
