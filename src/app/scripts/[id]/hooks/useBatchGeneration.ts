/**
 * Batch Generation Hook
 * 批量生成图片的自定义 Hook
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Panel } from '../types/script-editor.types';

interface GenerationTask {
    panelId: string;
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    imageUrl?: string;
    error?: string;
}

export function useBatchGeneration(storyId: string, projectId: string) {
    const queryClient = useQueryClient();
    const [tasks, setTasks] = useState<Map<string, GenerationTask>>(new Map());
    const [isGenerating, setIsGenerating] = useState(false);

    const startBatchGeneration = useCallback(
        async (panels: Panel[]) => {
            setIsGenerating(true);

            try {
                // 调用批量生成 API
                const res = await fetch('/api/panel/generate-image', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_id: projectId }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || '批量生成失败');
                }

                const data = await res.json();
                const { task_ids } = data;

                // 初始化任务状态
                const newTasks = new Map<string, GenerationTask>();
                panels.forEach((panel, index) => {
                    newTasks.set(panel.id, {
                        panelId: panel.id,
                        taskId: task_ids[index],
                        status: 'pending',
                        progress: 0,
                    });
                });
                setTasks(newTasks);

                // 开始轮询任务状态
                pollTaskStatus(newTasks);
            } catch (error) {
                console.error('Batch generation error:', error);
                setIsGenerating(false);
                throw error;
            }
        },
        [projectId]
    );

    const pollTaskStatus = useCallback(
        async (taskMap: Map<string, GenerationTask>) => {
            const pollInterval = setInterval(async () => {
                let allCompleted = true;
                const updatedTasks = new Map(taskMap);

                for (const [panelId, task] of updatedTasks) {
                    if (task.status === 'completed' || task.status === 'failed') {
                        continue;
                    }

                    allCompleted = false;

                    try {
                        const res = await fetch(`/api/image/task-status?task_id=${task.taskId}`);
                        const data = await res.json();

                        updatedTasks.set(panelId, {
                            ...task,
                            status: data.status,
                            progress: data.progress || 0,
                            imageUrl: data.imageUrl,
                            error: data.error,
                        });

                        // 如果完成，更新缓存
                        if (data.status === 'completed' && data.imageUrl) {
                            queryClient.setQueryData(['story', storyId], (old: any) => {
                                if (!old) return old;
                                return {
                                    ...old,
                                    panels: old.panels.map((p: Panel) =>
                                        p.id === panelId
                                            ? { ...p, generated_image: data.imageUrl, image_url: data.imageUrl }
                                            : p
                                    ),
                                };
                            });
                        }
                    } catch (error) {
                        console.error(`Poll task ${task.taskId} error:`, error);
                    }
                }

                setTasks(new Map(updatedTasks));

                if (allCompleted) {
                    clearInterval(pollInterval);
                    setIsGenerating(false);
                }
            }, 2000); // 每2秒轮询一次
        },
        [queryClient, storyId]
    );

    const cancelGeneration = useCallback(() => {
        setIsGenerating(false);
        setTasks(new Map());
    }, []);

    return {
        tasks,
        isGenerating,
        startBatchGeneration,
        cancelGeneration,
    };
}
