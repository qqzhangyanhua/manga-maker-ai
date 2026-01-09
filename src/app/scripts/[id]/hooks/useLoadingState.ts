/**
 * Loading 状态管理 Hook
 * 防止重复请求，提供统一的加载状态管理
 */

import { useState, useCallback, useRef } from "react";

interface LoadingStateOptions {
  /**
   * 请求去重：相同 key 的请求只执行一次
   */
  deduplicate?: boolean;
  /**
   * 超时时间（毫秒）
   */
  timeout?: number;
}

/**
 * Loading 状态管理 Hook
 */
export function useLoadingState(options: LoadingStateOptions = {}) {
  const { deduplicate = true, timeout } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const pendingRequests = useRef<Map<string, Promise<unknown>>>(new Map());

  /**
   * 检查是否正在加载
   */
  const isLoadingKey = useCallback(
    (key: string) => {
      return loadingKeys.has(key);
    },
    [loadingKeys]
  );

  /**
   * 包装异步函数，自动管理加载状态
   */
  const withLoading = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      key?: string
    ): Promise<T | undefined> => {
      // 如果启用去重且已有相同请求，返回现有 Promise
      if (deduplicate && key && pendingRequests.current.has(key)) {
        return pendingRequests.current.get(key) as Promise<T>;
      }

      // 设置加载状态
      setIsLoading(true);
      if (key) {
        setLoadingKeys((prev) => new Set(prev).add(key));
      }

      // 创建 Promise
      const promise = (async () => {
        try {
          // 设置超时
          if (timeout) {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("请求超时")), timeout)
            );
            return await Promise.race([fn(), timeoutPromise]);
          }

          return await fn();
        } finally {
          // 清理状态
          setIsLoading(false);
          if (key) {
            setLoadingKeys((prev) => {
              const newSet = new Set(prev);
              newSet.delete(key);
              return newSet;
            });
            pendingRequests.current.delete(key);
          }
        }
      })();

      // 存储 Promise（用于去重）
      if (deduplicate && key) {
        pendingRequests.current.set(key, promise);
      }

      return promise;
    },
    [deduplicate, timeout]
  );

  /**
   * 手动设置加载状态
   */
  const setLoading = useCallback((loading: boolean, key?: string) => {
    setIsLoading(loading);
    if (key) {
      setLoadingKeys((prev) => {
        const newSet = new Set(prev);
        if (loading) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
        return newSet;
      });
    }
  }, []);

  /**
   * 清除所有加载状态
   */
  const clearAll = useCallback(() => {
    setIsLoading(false);
    setLoadingKeys(new Set());
    pendingRequests.current.clear();
  }, []);

  return {
    isLoading,
    loadingKeys,
    isLoadingKey,
    withLoading,
    setLoading,
    clearAll,
  };
}

/**
 * 全局 Loading 状态管理（用于多个组件共享）
 */
export function useGlobalLoadingState() {
  const [loadingMap, setLoadingMap] = useState<Map<string, boolean>>(new Map());

  const setGlobalLoading = useCallback((key: string, loading: boolean) => {
    setLoadingMap((prev) => {
      const newMap = new Map(prev);
      if (loading) {
        newMap.set(key, true);
      } else {
        newMap.delete(key);
      }
      return newMap;
    });
  }, []);

  const isGlobalLoading = useCallback(
    (key?: string) => {
      if (key) {
        return loadingMap.get(key) || false;
      }
      return loadingMap.size > 0;
    },
    [loadingMap]
  );

  return {
    setGlobalLoading,
    isGlobalLoading,
    loadingCount: loadingMap.size,
  };
}
