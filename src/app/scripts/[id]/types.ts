/**
 * ScriptDetailsPage 统一类型定义
 * 解决类型转换和类型安全问题
 */

import type { Panel, Chapter } from "./types/script-editor.types";

/**
 * 进度计算输入类型
 * 解决 useProgressCalculation 类型转换问题
 */
export interface ProgressCalculationInput {
  chapters: Chapter[];
  panels: Panel[];
}

/**
 * 故事角色详情类型
 * 解决小说角色同步类型问题
 */
export interface StoryCharacterForSync {
  character: {
    name: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * 章节背景生成参数类型
 */
export interface BackgroundGenerationParams {
  scene_type: string;
  style: string;
  prompt?: string;
  negative_prompt?: string;
}

/**
 * 资源选择参数类型
 */
export interface AssetSelectItem {
  id: string;
  name: string;
}

/**
 * 页面核心数据类型
 */
export interface ScriptPageData {
  story: {
    id: string;
    title: string;
    premise: string | null;
    comic_style_id: string | null;
    style_reference_image: string | null;
    source_novel_id: string | null;
    suggested_characters: unknown[];
    style?: string;
  } | null;
  chapters: Chapter[];
  panels: Panel[];
  sourceNovel: {
    id: string;
    title: string;
    [key: string]: unknown;
  } | null;
  projectId: string | null;
}

/**
 * 数据刷新函数类型
 */
export interface RefreshFunctions {
  refetchStory: () => Promise<unknown>;
  refetchPanels: () => Promise<unknown>;
}

/**
 * 九宫格对话框成功回调参数
 */
export interface NineGridSuccessParams {
  message?: string;
  generatedCount?: number;
}
