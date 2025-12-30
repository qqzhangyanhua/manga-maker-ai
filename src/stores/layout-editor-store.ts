/**
 * 排版编辑器状态管理 (Zustand)
 */

import { create } from "zustand";
import type { ComicPageData, MangaCanvasData } from "@/types/layout";

/** 选中对象类型 */
export type SelectedObjectType = "panel" | "bubble" | "text" | "effect" | null;

/** 当前工具 */
export type ActiveTool = "select" | "bubble" | "text" | "effect";

/** 编辑器状态 */
interface LayoutEditorState {
  // 项目信息
  projectId: string | null;

  // 页面状态
  pages: ComicPageData[];
  currentPageId: string | null;
  currentPageIndex: number;

  // 选中状态
  selectedObjectId: string | null;
  selectedObjectType: SelectedObjectType;

  // UI 状态
  zoom: number;
  showGrid: boolean;
  activeTool: ActiveTool;

  // 加载状态
  isLoading: boolean;
  isSaving: boolean;

  // Actions - 初始化
  initialize: (projectId: string, pages: ComicPageData[]) => void;
  reset: () => void;

  // Actions - 页面
  setPages: (pages: ComicPageData[]) => void;
  setCurrentPage: (pageId: string) => void;
  setCurrentPageByIndex: (index: number) => void;
  addPage: (page: ComicPageData) => void;
  updatePage: (pageId: string, data: Partial<ComicPageData>) => void;
  updateCurrentPageCanvas: (canvasData: MangaCanvasData) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;

  // Actions - 选中
  setSelectedObject: (id: string | null, type: SelectedObjectType) => void;
  clearSelection: () => void;

  // Actions - UI
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setShowGrid: (show: boolean) => void;
  toggleGrid: () => void;
  setActiveTool: (tool: ActiveTool) => void;

  // Actions - 加载
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
}

const initialState = {
  projectId: null as string | null,
  pages: [] as ComicPageData[],
  currentPageId: null as string | null,
  currentPageIndex: 0,
  selectedObjectId: null as string | null,
  selectedObjectType: null as SelectedObjectType,
  zoom: 100,
  showGrid: false,
  activeTool: "select" as ActiveTool,
  isLoading: false,
  isSaving: false,
};

export const useLayoutEditorStore = create<LayoutEditorState>((set, get) => ({
  ...initialState,

  // 初始化
  initialize: (projectId: string, pages: ComicPageData[]) =>
    set({
      projectId,
      pages,
      currentPageId: pages[0]?.id || null,
      currentPageIndex: 0,
      isLoading: false,
    }),

  reset: () => set(initialState),

  // 页面操作
  setPages: (pages: ComicPageData[]) =>
    set((state) => {
      if (pages.length > 0 && !state.currentPageId) {
        return {
          pages,
          currentPageId: pages[0].id,
          currentPageIndex: 0,
        };
      }
      return { pages };
    }),

  setCurrentPage: (pageId: string) =>
    set((state) => {
      const index = state.pages.findIndex((p) => p.id === pageId);
      if (index !== -1) {
        return {
          currentPageId: pageId,
          currentPageIndex: index,
          selectedObjectId: null,
          selectedObjectType: null,
        };
      }
      return {};
    }),

  setCurrentPageByIndex: (index: number) =>
    set((state) => {
      if (index >= 0 && index < state.pages.length) {
        return {
          currentPageIndex: index,
          currentPageId: state.pages[index].id,
          selectedObjectId: null,
          selectedObjectType: null,
        };
      }
      return {};
    }),

  addPage: (page: ComicPageData) =>
    set((state) => ({
      pages: [...state.pages, page],
    })),

  updatePage: (pageId: string, data: Partial<ComicPageData>) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId ? { ...p, ...data } : p
      ),
    })),

  updateCurrentPageCanvas: (canvasData: MangaCanvasData) =>
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === state.currentPageId ? { ...p, canvasData } : p
      ),
    })),

  deletePage: (pageId: string) =>
    set((state) => {
      const index = state.pages.findIndex((p) => p.id === pageId);
      if (index === -1) return {};

      const newPages = state.pages.filter((p) => p.id !== pageId);
      let newCurrentPageId = state.currentPageId;
      let newCurrentPageIndex = state.currentPageIndex;

      if (state.currentPageId === pageId) {
        const newIndex = Math.min(index, newPages.length - 1);
        newCurrentPageId = newPages[newIndex]?.id || null;
        newCurrentPageIndex = newIndex >= 0 ? newIndex : 0;
      }

      return {
        pages: newPages,
        currentPageId: newCurrentPageId,
        currentPageIndex: newCurrentPageIndex,
      };
    }),

  reorderPages: (pageIds: string[]) =>
    set((state) => {
      const pageMap = new Map(state.pages.map((p) => [p.id, p]));
      const newPages = pageIds
        .map((id, index) => {
          const page = pageMap.get(id);
          if (page) {
            return { ...page, pageOrder: index };
          }
          return null;
        })
        .filter((p): p is ComicPageData => p !== null);
      return { pages: newPages };
    }),

  // 选中操作
  setSelectedObject: (id: string | null, type: SelectedObjectType) =>
    set({
      selectedObjectId: id,
      selectedObjectType: type,
    }),

  clearSelection: () =>
    set({
      selectedObjectId: null,
      selectedObjectType: null,
    }),

  // UI 操作
  setZoom: (zoom: number) =>
    set({ zoom: Math.max(10, Math.min(400, zoom)) }),

  zoomIn: () =>
    set((state) => ({
      zoom: Math.min(400, state.zoom + 25),
    })),

  zoomOut: () =>
    set((state) => ({
      zoom: Math.max(10, state.zoom - 25),
    })),

  resetZoom: () => set({ zoom: 100 }),

  setShowGrid: (show: boolean) => set({ showGrid: show }),

  toggleGrid: () =>
    set((state) => ({
      showGrid: !state.showGrid,
    })),

  setActiveTool: (tool: ActiveTool) => set({ activeTool: tool }),

  // 加载状态
  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setSaving: (saving: boolean) => set({ isSaving: saving }),
}));

/**
 * 获取当前页面
 */
export function useCurrentPage(): ComicPageData | null {
  return useLayoutEditorStore((state) => {
    const { pages, currentPageId } = state;
    return pages.find((p) => p.id === currentPageId) || null;
  });
}

/**
 * 获取页面数量
 */
export function usePageCount(): number {
  return useLayoutEditorStore((state) => state.pages.length);
}
