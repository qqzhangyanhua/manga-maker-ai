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
            await queryClient.cancelQueries({ queryKey: ['story', storyId] });

            // 保存之前的数据用于回滚
            const previousData = queryClient.getQueryData<StoryData>(['story', storyId]);

            // 乐观更新
            queryClient.setQueryData<StoryData>(['story', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    story: { ...old.story, ...variables },
                };
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            // 回滚到之前的数据
            if (context?.previousData) {
                queryClient.setQueryData(['story', storyId], context.previousData);
            }
        },
        onSettled: () => {
            // 重新获取数据确保同步
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
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

            const previousData = queryClient.getQueryData<StoryData>(['story', storyId]);

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

            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['story', storyId], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
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

            const previousData = queryClient.getQueryData<StoryData>(['story', storyId]);

            // 乐观更新
            queryClient.setQueryData<StoryData>(['story', storyId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    panels: old.panels.filter((p) => p.id !== panelId),
                };
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['story', storyId], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
        },
    });
}

/**
 * 重排序分镜
 */
export function useReorderPanels(storyId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            panelId,
            newOrder,
            projectId,
        }: {
            panelId: string;
            newOrder: number;
            projectId: string;
        }) => {
            const res = await fetch('/api/panel/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    panel_id: panelId,
                    new_order: newOrder,
                    project_id: projectId,
                }),
            });
            if (!res.ok) throw new Error('Failed to reorder');
            return res.json();
        },
        onSuccess: () => {
            // 重新获取数据
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
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
        },
    });
}
