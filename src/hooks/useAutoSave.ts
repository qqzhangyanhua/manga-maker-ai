/**
 * Auto-save hook with debouncing
 * 自动保存 Hook，带防抖功能
 */

import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

interface UseAutoSaveOptions<T> {
    data: T;
    onSave: (data: T) => Promise<void>;
    delay?: number; // 防抖延迟，默认3000ms
    enabled?: boolean; // 是否启用自动保存
}

export function useAutoSave<T>({
    data,
    onSave,
    delay = 3000,
    enabled = true,
}: UseAutoSaveOptions<T>) {
    const timeoutRef = useRef<NodeJS.Timeout>();
    const previousDataRef = useRef<T>(data);
    const isFirstRender = useRef(true);

    const { mutate, status, error } = useMutation({
        mutationFn: onSave,
    });

    useEffect(() => {
        // Skip on first render
        if (isFirstRender.current) {
            isFirstRender.current = false;
            previousDataRef.current = data;
            return;
        }

        if (!enabled) return;

        // 检查数据是否变化
        if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
            return;
        }

        // 清除之前的定时器
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // 设置新的定时器
        timeoutRef.current = setTimeout(() => {
            mutate(data);
            previousDataRef.current = data;
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, delay, enabled, mutate]);

    return {
        isSaving: status === 'pending',
        isSuccess: status === 'success',
        isError: status === 'error',
        error,
    };
}
