/**
 * 页面管理 API Hooks
 */

import { useState, useCallback } from "react";
import type {
  ComicPageData,
  CreatePageRequest,
  UpdatePageRequest,
  ReorderPagesRequest,
  ApplyTemplateRequest,
  PanelSlot,
} from "@/types/layout";

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * 页面管理 Hook
 */
export function usePageManager(projectId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取所有页面
  const fetchPages = useCallback(async (): Promise<ComicPageData[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/project/${projectId}/pages`);
      const data: ApiResponse<{ pages: ComicPageData[] }> = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "获取页面失败");
      }
      return (data.pages as ComicPageData[]) || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取页面失败";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 创建页面
  const createPage = useCallback(
    async (request: CreatePageRequest): Promise<ComicPageData> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/project/${projectId}/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        const data: ApiResponse<{ page: ComicPageData }> = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "创建页面失败");
        }
        return data.page as ComicPageData;
      } catch (err) {
        const message = err instanceof Error ? err.message : "创建页面失败";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  // 更新页面
  const updatePage = useCallback(
    async (pageId: string, request: UpdatePageRequest): Promise<ComicPageData> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/project/${projectId}/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        const data: ApiResponse<{ page: ComicPageData }> = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "更新页面失败");
        }
        return data.page as ComicPageData;
      } catch (err) {
        const message = err instanceof Error ? err.message : "更新页面失败";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  // 删除页面
  const deletePage = useCallback(
    async (pageId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/project/${projectId}/pages/${pageId}`, {
          method: "DELETE",
        });
        const data: ApiResponse<{ success: boolean }> = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "删除页面失败");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "删除页面失败";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  // 复制页面
  const duplicatePage = useCallback(
    async (pageId: string): Promise<ComicPageData> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/project/${projectId}/pages/${pageId}/duplicate`, {
          method: "POST",
        });
        const data: ApiResponse<{ page: ComicPageData }> = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "复制页面失败");
        }
        return data.page as ComicPageData;
      } catch (err) {
        const message = err instanceof Error ? err.message : "复制页面失败";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  // 重排序页面
  const reorderPages = useCallback(
    async (request: ReorderPagesRequest): Promise<ComicPageData[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/project/${projectId}/pages/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        const data: ApiResponse<{ pages: ComicPageData[] }> = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "重排序失败");
        }
        return (data.pages as ComicPageData[]) || [];
      } catch (err) {
        const message = err instanceof Error ? err.message : "重排序失败";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  // 应用模板
  const applyTemplate = useCallback(
    async (
      pageId: string,
      request: ApplyTemplateRequest
    ): Promise<{ page: ComicPageData; panelSlots: PanelSlot[] }> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/project/${projectId}/pages/${pageId}/apply-template`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          }
        );
        const data: ApiResponse<{ page: ComicPageData; panelSlots: PanelSlot[] }> =
          await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "应用模板失败");
        }
        return {
          page: data.page as ComicPageData,
          panelSlots: (data.panelSlots as PanelSlot[]) || [],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "应用模板失败";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  return {
    isLoading,
    error,
    fetchPages,
    createPage,
    updatePage,
    deletePage,
    duplicatePage,
    reorderPages,
    applyTemplate,
  };
}
