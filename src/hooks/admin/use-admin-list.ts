"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { PaginatedData } from "@/types/admin";

/**
 * 列表 Hook 配置选项
 */
export interface UseAdminListOptions<F extends Record<string, unknown>> {
  /** API 端点路径 (例如: "/api/admin/generation-logs") */
  endpoint: string;
  /** 初始过滤条件 */
  initialFilter?: F;
  /** 初始页码 */
  initialPage?: number;
  /** 初始每页数量 */
  initialPageSize?: number;
  /** 是否自动加载 */
  autoFetch?: boolean;
  /** 数据字段名（响应中的 items 字段名，默认 "items"） */
  itemsKey?: string;
}

/**
 * 列表 Hook 返回值
 */
export interface UseAdminListReturn<T, F extends Record<string, unknown>> {
  /** 列表数据 */
  items: T[];
  /** 加载状态 */
  loading: boolean;
  /** 总条数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 当前过滤条件 */
  filter: F;
  /** 设置过滤条件（会重置到第一页） */
  setFilter: (filter: F | ((prev: F) => F)) => void;
  /** 设置页码 */
  setPage: (page: number) => void;
  /** 设置每页数量（会重置到第一页） */
  setPageSize: (pageSize: number) => void;
  /** 重新加载数据 */
  refetch: () => void;
  /** 额外数据（如 userMap） */
  extra: Record<string, unknown>;
  /** 错误信息 */
  error: Error | null;
}

/**
 * 管理后台通用列表查询 Hook（基于 React Query）
 *
 * 提供分页、过滤、加载状态管理的完整解决方案
 *
 * 使用示例：
 * ```tsx
 * interface LogFilter {
 *   userId?: string;
 *   action?: string;
 *   status?: string;
 * }
 *
 * const {
 *   items,
 *   loading,
 *   total,
 *   page,
 *   pageSize,
 *   totalPages,
 *   filter,
 *   setFilter,
 *   setPage,
 *   setPageSize,
 *   refetch,
 * } = useAdminList<GenerationLog, LogFilter>({
 *   endpoint: "/api/admin/generation-logs",
 *   initialFilter: { status: "all" },
 * });
 * ```
 */
export function useAdminList<T, F extends Record<string, unknown> = Record<string, unknown>>({
  endpoint,
  initialFilter = {} as F,
  initialPage = 1,
  initialPageSize = 20,
  autoFetch = true,
  itemsKey = "items",
}: UseAdminListOptions<F>): UseAdminListReturn<T, F> {
  const { toast } = useToast();

  // Local state for pagination and filtering
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filter, setFilterState] = useState<F>(initialFilter);

  // Use React Query for data fetching
  const query = useQuery({
    queryKey: ["admin-list", endpoint, filter, page, pageSize],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", pageSize.toString());

      // Add filter conditions
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "" && value !== "all") {
          params.set(key, String(value));
        }
      });

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ message: "获取数据失败" }));
        throw new Error(result.message || "获取数据失败");
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("响应格式错误");
      }

      return result.data as PaginatedData<T> & Record<string, unknown>;
    },
    enabled: autoFetch,
    staleTime: 30 * 1000, // 30 seconds cache
    retry: 1,
  });

  // Show error toast when query fails
  if (query.error) {
    toast({
      title: "错误",
      description: query.error.message,
      variant: "destructive",
    });
  }

  // Extract items from response
  const items = query.data ? ((query.data[itemsKey] as T[]) || query.data.items || []) : [];
  const total = query.data?.total || 0;
  const totalPages = query.data?.totalPages || Math.ceil(total / pageSize);

  // Extract extra data (e.g., userMap)
  const extra: Record<string, unknown> = {};
  if (query.data) {
    Object.keys(query.data).forEach((key) => {
      if (!["items", itemsKey, "total", "page", "pageSize", "totalPages"].includes(key)) {
        extra[key] = query.data[key];
      }
    });
  }

  // Set filter and reset to page 1
  const setFilter = (newFilter: F | ((prev: F) => F)) => {
    setFilterState(newFilter);
    setPageState(1);
  };

  // Set page size and reset to page 1
  const setPageSize = (newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1);
  };

  return {
    items,
    loading: query.isLoading,
    total,
    page,
    pageSize,
    totalPages,
    filter,
    setFilter,
    setPage: setPageState,
    setPageSize,
    refetch: query.refetch,
    extra,
    error: query.error,
  };
}
