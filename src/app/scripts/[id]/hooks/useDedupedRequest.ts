/**
 * 请求去重 Hook
 * 避免相同的请求重复发送
 */

import { useRef, useCallback } from 'react';

interface RequestCache<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * 创建去重的请求函数
 * @param maxAge 缓存最大有效期(毫秒),默认 5000ms
 */
export function useDedupedRequest<T>(maxAge = 5000) {
  const cacheRef = useRef<Map<string, RequestCache<T>>>(new Map());

  const request = useCallback(
    async (key: string, requestFn: () => Promise<T>): Promise<T> => {
      const now = Date.now();
      const cached = cacheRef.current.get(key);

      // 如果缓存存在且未过期,直接返回
      if (cached && now - cached.timestamp < maxAge) {
        return cached.promise;
      }

      // 创建新请求
      const promise = requestFn();
      cacheRef.current.set(key, { promise, timestamp: now });

      try {
        const result = await promise;
        return result;
      } catch (error) {
        // 请求失败,移除缓存
        cacheRef.current.delete(key);
        throw error;
      } finally {
        // 请求完成后,延迟清除缓存
        setTimeout(() => {
          cacheRef.current.delete(key);
        }, maxAge);
      }
    },
    [maxAge]
  );

  const clearCache = useCallback((key?: string) => {
    if (key) {
      cacheRef.current.delete(key);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  return { request, clearCache };
}

/**
 * 为特定场景优化的去重 Hook
 */
export function usePanelGenerationDedup() {
  const { request, clearCache } = useDedupedRequest<any>(10000); // 图片生成去重时间更长

  const generateImage = useCallback(
    async (panelId: string, prompt: string) => {
      // 将 panelId + prompt 作为唯一键,避免不同提示词命中旧缓存
      const key = `generate-${panelId}-${prompt}`;
      return request(key, async () => {
        const response = await fetch('/api/panel/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ panel_id: panelId, prompt }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '生成失败');
        }

        return response.json();
      });
    },
    [request]
  );

  return { generateImage, clearCache };
}
