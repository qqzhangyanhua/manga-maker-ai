"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface UseAdminMutationsOptions {
  /** API 端点路径 (例如: "/api/admin/users") */
  endpoint: string;
  /** 查询 key 前缀，用于刷新列表缓存 */
  queryKey: string[];
  /** 资源名称，用于提示信息 (例如: "用户") */
  resourceName: string;
}

export interface UseAdminMutationsReturn<T, F> {
  /** 创建资源 */
  create: ReturnType<typeof useMutation<T, Error, F, unknown>>;
  /** 更新资源 */
  update: ReturnType<typeof useMutation<T, Error, { id: number; data: Partial<F> }, unknown>>;
  /** 删除资源 */
  remove: ReturnType<typeof useMutation<void, Error, number, unknown>>;
}

/**
 * 管理后台通用 CRUD 操作 Hook（基于 React Query Mutation）
 *
 * 提供创建、更新、删除的统一封装，自动处理：
 * - 乐观更新
 * - 错误处理
 * - 成功提示
 * - 缓存刷新
 *
 * 使用示例：
 * ```tsx
 * const { create, update, remove } = useAdminMutations<User, UserForm>({
 *   endpoint: "/api/admin/users",
 *   queryKey: ["admin-list", "/api/admin/users"],
 *   resourceName: "用户",
 * });
 *
 * // 创建
 * create.mutate({ email: "...", password: "..." });
 *
 * // 更新
 * update.mutate({ id: 1, data: { name: "新名字" } });
 *
 * // 删除
 * remove.mutate(1);
 * ```
 */
export function useAdminMutations<T, F>({
  endpoint,
  queryKey,
  resourceName,
}: UseAdminMutationsOptions): UseAdminMutationsReturn<T, F> {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: F): Promise<T> => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({ message: "创建失败" }));

      if (!response.ok) {
        throw new Error(result.message || result.error || `创建失败 (${response.status})`);
      }

      return result.data as T;
    },
    onSuccess: () => {
      toast({
        title: "创建成功",
        description: `${resourceName}已创建`,
      });
      // Invalidate and refetch list
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({
        title: "创建失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<F> }): Promise<T> => {
      const response = await fetch(`${endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({ message: "更新失败" }));

      if (!response.ok) {
        throw new Error(result.message || result.error || `更新失败 (${response.status})`);
      }

      return result.data as T;
    },
    onSuccess: () => {
      toast({
        title: "更新成功",
        description: `${resourceName}已更新`,
      });
      // Invalidate and refetch list
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({
        title: "更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({ message: "删除失败" }));

      if (!response.ok) {
        throw new Error(result.message || result.error || `删除失败 (${response.status})`);
      }
    },
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: `${resourceName}已删除`,
      });
      // Invalidate and refetch list
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
  };
}
