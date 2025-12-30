/**
 * 页面数据转换工具
 */

import type { ComicPageData } from "@/types/layout";

interface PrismaComicPage {
  id: string;
  project_id: string;
  page_order: number;
  width: number;
  height: number;
  dpi: number;
  preset_name: string | null;
  canvas_data: unknown;
  thumbnail_url: string | null;
  template_id: string | null;
  created_at: Date;
  updated_at: Date;
  template?: {
    id: string;
    name: string;
    category: string;
  } | null;
}

/**
 * 将 Prisma ComicPage 对象转换为前端 ComicPageData 类型
 */
export function transformComicPage(page: PrismaComicPage): ComicPageData {
  return {
    id: page.id,
    projectId: page.project_id,
    pageOrder: page.page_order,
    width: page.width,
    height: page.height,
    dpi: page.dpi,
    presetName: page.preset_name ?? undefined,
    canvasData: page.canvas_data as ComicPageData["canvasData"],
    thumbnailUrl: page.thumbnail_url ?? undefined,
    templateId: page.template_id ?? undefined,
    createdAt: page.created_at.toISOString(),
    updatedAt: page.updated_at.toISOString(),
  };
}

/**
 * 批量转换页面数据
 */
export function transformComicPages(pages: PrismaComicPage[]): ComicPageData[] {
  return pages.map(transformComicPage);
}

// ============================================================
// LayoutTemplate 转换
// ============================================================

interface PrismaLayoutTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  width: number;
  height: number;
  panel_slots: unknown;
  thumbnail_url: string | null;
  is_system: boolean;
  user_id: string | null;
  use_count: number;
  recommended: boolean;
}

export interface LayoutTemplateResponse {
  id: string;
  name: string;
  category: string;
  description?: string;
  width: number;
  height: number;
  panelCount: number;
  thumbnailUrl?: string;
  isSystem: boolean;
  useCount: number;
  recommended: boolean;
}

/**
 * 将 Prisma LayoutTemplate 对象转换为前端类型
 */
export function transformLayoutTemplate(template: PrismaLayoutTemplate): LayoutTemplateResponse {
  const panelSlots = template.panel_slots as Array<unknown> | undefined;
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    description: template.description ?? undefined,
    width: template.width,
    height: template.height,
    panelCount: Array.isArray(panelSlots) ? panelSlots.length : 0,
    thumbnailUrl: template.thumbnail_url ?? undefined,
    isSystem: template.is_system,
    useCount: template.use_count,
    recommended: template.recommended,
  };
}

/**
 * 批量转换布局模板
 */
export function transformLayoutTemplates(templates: PrismaLayoutTemplate[]): LayoutTemplateResponse[] {
  return templates.map(transformLayoutTemplate);
}
