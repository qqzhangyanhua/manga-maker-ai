/**
 * 布局模板管理 Hook
 * 使用 localStorage 存储用户自定义的布局模板
 */

import { useState, useEffect, useCallback } from "react";
import type { LayoutSize, LayoutDirection, LayoutRatio } from "../types/layout.types";

const STORAGE_KEY = "manga-layout-templates";

/**
 * 布局模板
 */
export interface LayoutTemplate {
  id: string;
  name: string;
  layoutType: LayoutSize;
  direction?: LayoutDirection;
  ratio?: LayoutRatio;
  createdAt: number;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 从 localStorage 加载模板
 */
function loadTemplatesFromStorage(): LayoutTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    console.error("[useLayoutTemplates] Failed to parse templates from localStorage");
    return [];
  }
}

/**
 * 保存模板到 localStorage
 */
function saveTemplatesToStorage(templates: LayoutTemplate[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("[useLayoutTemplates] Failed to save templates:", error);
  }
}

interface UseLayoutTemplatesReturn {
  templates: LayoutTemplate[];
  isLoading: boolean;
  saveTemplate: (
    name: string,
    layoutType: LayoutSize,
    direction?: LayoutDirection,
    ratio?: LayoutRatio
  ) => LayoutTemplate;
  deleteTemplate: (id: string) => void;
  renameTemplate: (id: string, newName: string) => void;
  getTemplateById: (id: string) => LayoutTemplate | undefined;
}

export function useLayoutTemplates(): UseLayoutTemplatesReturn {
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化加载模板
  useEffect(() => {
    const loaded = loadTemplatesFromStorage();
    setTemplates(loaded);
    setIsLoading(false);
  }, []);

  // 保存新模板
  const saveTemplate = useCallback(
    (
      name: string,
      layoutType: LayoutSize,
      direction?: LayoutDirection,
      ratio?: LayoutRatio
    ): LayoutTemplate => {
      const newTemplate: LayoutTemplate = {
        id: generateId(),
        name: name.trim() || `模板 ${templates.length + 1}`,
        layoutType,
        direction,
        ratio,
        createdAt: Date.now(),
      };

      const updated = [...templates, newTemplate];
      setTemplates(updated);
      saveTemplatesToStorage(updated);

      return newTemplate;
    },
    [templates]
  );

  // 删除模板
  const deleteTemplate = useCallback(
    (id: string) => {
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      saveTemplatesToStorage(updated);
    },
    [templates]
  );

  // 重命名模板
  const renameTemplate = useCallback(
    (id: string, newName: string) => {
      const updated = templates.map((t) =>
        t.id === id ? { ...t, name: newName.trim() } : t
      );
      setTemplates(updated);
      saveTemplatesToStorage(updated);
    },
    [templates]
  );

  // 根据ID获取模板
  const getTemplateById = useCallback(
    (id: string): LayoutTemplate | undefined => {
      return templates.find((t) => t.id === id);
    },
    [templates]
  );

  return {
    templates,
    isLoading,
    saveTemplate,
    deleteTemplate,
    renameTemplate,
    getTemplateById,
  };
}
