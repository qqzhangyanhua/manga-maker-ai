"use client";

import { useState, useCallback, useEffect } from "react";
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
  refetch: () => Promise<void>;
  /** 额外数据（如 userMap） */
  extra: Record<string, unknown>;
}

/**
 * 管理后台通用列表查询 Hook
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

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [filter, setFilterState] = useState<F>(initialFilter);
  const [extra, setExtra] = useState<Record<string, unknown>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", pageSize.toString());

      // 添加过滤条件
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "" && value !== "all") {
          params.set(key, String(value));
        }
      });

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "获取数据失败");
      }

      if (result.success && result.data) {
        const data = result.data as PaginatedData<T> & Record<string, unknown>;
        setItems((data[itemsKey] as T[]) || data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / pageSize));

        // 提取额外数据（如 userMap）
        const extraData: Record<string, unknown> = {};
        Object.keys(data).forEach((key) => {
          if (!["items", itemsKey, "total", "page", "pageSize", "totalPages"].includes(key)) {
            extraData[key] = data[key];
          }
        });
        setExtra(extraData);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取数据失败";
      toast({
        title: "错误",
        description: message,
        variant: "destructive",
      });
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, filter, itemsKey, toast]);

  // 设置过滤条件时重置到第一页
  const setFilter = useCallback((newFilter: F | ((prev: F) => F)) => {
    setFilterState(newFilter);
    setPage(1);
  }, []);

  // 设置每页数量时重置到第一页
  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPage(1);
  }, []);

  // 自动加载
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    items,
    loading,
    total,
    page,
    pageSize,
    totalPages,
    filter,
    setFilter,
    setPage,
    setPageSize,
    refetch: fetchData,
    extra,
  };
}
