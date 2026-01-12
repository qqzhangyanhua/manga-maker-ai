/**
 * React Query Client 配置
 *
 * 统一管理所有 React Query 实例的默认配置
 */
import { QueryClient } from '@tanstack/react-query';

/**
 * 创建 QueryClient 实例
 *
 * 配置说明:
 * - staleTime: 5分钟 - 数据被认为是"新鲜"的时间
 * - gcTime: 30分钟 - 缓存数据在内存中保留的时间
 * - retry: 1 - 失败后重试1次
 * - retryDelay: 指数退避策略
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 数据保持新鲜的时间 (5分钟)
        staleTime: 1000 * 60 * 5,

        // 缓存垃圾回收时间 (30分钟)
        gcTime: 1000 * 60 * 30,

        // 失败重试配置
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // 窗口重新获得焦点时重新获取数据
        refetchOnWindowFocus: false,

        // 组件挂载时如果数据过期则重新获取
        refetchOnMount: false,

        // 错误边界处理
        throwOnError: false,
      },
      mutations: {
        // 变更失败不重试 (需要用户手动重试)
        retry: false,

        // 变更错误抛出 (便于错误处理)
        throwOnError: false,
      },
    },
  });
}

/**
 * QueryClient 单例
 */
let queryClientInstance: QueryClient | null = null;

/**
 * 获取全局 QueryClient 实例
 *
 * @returns QueryClient 实例
 */
export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
}

/**
 * 重置 QueryClient (用于测试或登出)
 */
export function resetQueryClient(): void {
  if (queryClientInstance) {
    queryClientInstance.clear();
    queryClientInstance = null;
  }
}
