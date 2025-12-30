/**
 * 系统预设布局模板
 */

import type { PanelSlot, TemplateCategory } from "@/types/layout";

export interface SystemTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  width: number;
  height: number;
  panelSlots: PanelSlot[];
  recommended: boolean;
}

/**
 * 系统预设模板列表
 */
export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  // ============================================================
  // 日漫风格 (japanese)
  // ============================================================
  {
    id: "jp_classic_4",
    name: "经典四格",
    category: "japanese",
    description: "传统四格漫画布局，适合日常/搞笑题材",
    width: 1080,
    height: 1920,
    recommended: true,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 90, height: 23, label: "第1格" },
      { id: "slot_2", x: 5, y: 26, width: 90, height: 23, label: "第2格" },
      { id: "slot_3", x: 5, y: 50, width: 90, height: 23, label: "第3格" },
      { id: "slot_4", x: 5, y: 74, width: 90, height: 23, label: "第4格" },
    ],
  },
  {
    id: "jp_big_small",
    name: "大图+小图",
    category: "japanese",
    description: "一个大图配多个小图，适合重点场景展示",
    width: 1080,
    height: 1920,
    recommended: true,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 90, height: 50, label: "主图" },
      { id: "slot_2", x: 5, y: 54, width: 44, height: 21, label: "小图1" },
      { id: "slot_3", x: 51, y: 54, width: 44, height: 21, label: "小图2" },
      { id: "slot_4", x: 5, y: 77, width: 44, height: 21, label: "小图3" },
      { id: "slot_5", x: 51, y: 77, width: 44, height: 21, label: "小图4" },
    ],
  },
  {
    id: "jp_diagonal",
    name: "斜切动感",
    category: "japanese",
    description: "斜线分割，营造动感和紧张氛围",
    width: 1080,
    height: 1920,
    recommended: false,
    panelSlots: [
      {
        id: "slot_1",
        x: 5,
        y: 2,
        width: 60,
        height: 35,
        rotation: -3,
        label: "上左",
      },
      {
        id: "slot_2",
        x: 35,
        y: 15,
        width: 60,
        height: 30,
        rotation: 2,
        label: "上右",
      },
      {
        id: "slot_3",
        x: 5,
        y: 38,
        width: 55,
        height: 28,
        rotation: 1,
        label: "中左",
      },
      {
        id: "slot_4",
        x: 40,
        y: 45,
        width: 55,
        height: 28,
        rotation: -2,
        label: "中右",
      },
      {
        id: "slot_5",
        x: 5,
        y: 68,
        width: 90,
        height: 30,
        label: "下",
      },
    ],
  },
  {
    id: "jp_dialogue",
    name: "对话密集",
    category: "japanese",
    description: "适合对话场景，留有足够气泡空间",
    width: 1080,
    height: 1920,
    recommended: false,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 44, height: 30, label: "角色A" },
      { id: "slot_2", x: 51, y: 2, width: 44, height: 30, label: "角色B" },
      { id: "slot_3", x: 5, y: 34, width: 90, height: 20, label: "对话场景" },
      { id: "slot_4", x: 5, y: 56, width: 44, height: 22, label: "反应1" },
      { id: "slot_5", x: 51, y: 56, width: 44, height: 22, label: "反应2" },
      { id: "slot_6", x: 5, y: 80, width: 90, height: 18, label: "结尾" },
    ],
  },

  // ============================================================
  // 美漫风格 (american)
  // ============================================================
  {
    id: "us_widescreen",
    name: "超宽全景",
    category: "american",
    description: "电影般的宽屏视觉效果",
    width: 1080,
    height: 1920,
    recommended: true,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 90, height: 25, label: "全景1" },
      { id: "slot_2", x: 5, y: 29, width: 90, height: 25, label: "全景2" },
      { id: "slot_3", x: 5, y: 56, width: 44, height: 42, label: "特写左" },
      { id: "slot_4", x: 51, y: 56, width: 44, height: 42, label: "特写右" },
    ],
  },
  {
    id: "us_action",
    name: "动作连续",
    category: "american",
    description: "展示动作序列的连续性",
    width: 1080,
    height: 1920,
    recommended: false,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 44, height: 30, label: "起始" },
      { id: "slot_2", x: 51, y: 2, width: 44, height: 30, label: "准备" },
      { id: "slot_3", x: 5, y: 34, width: 90, height: 30, label: "动作高潮" },
      { id: "slot_4", x: 5, y: 66, width: 29, height: 32, label: "后续1" },
      { id: "slot_5", x: 36, y: 66, width: 29, height: 32, label: "后续2" },
      { id: "slot_6", x: 67, y: 66, width: 28, height: 32, label: "后续3" },
    ],
  },
  {
    id: "us_grid",
    name: "分格叙事",
    category: "american",
    description: "规整的网格布局，适合叙事",
    width: 1080,
    height: 1920,
    recommended: false,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 29, height: 31, label: "1" },
      { id: "slot_2", x: 36, y: 2, width: 29, height: 31, label: "2" },
      { id: "slot_3", x: 67, y: 2, width: 28, height: 31, label: "3" },
      { id: "slot_4", x: 5, y: 35, width: 29, height: 31, label: "4" },
      { id: "slot_5", x: 36, y: 35, width: 29, height: 31, label: "5" },
      { id: "slot_6", x: 67, y: 35, width: 28, height: 31, label: "6" },
      { id: "slot_7", x: 5, y: 68, width: 29, height: 30, label: "7" },
      { id: "slot_8", x: 36, y: 68, width: 29, height: 30, label: "8" },
      { id: "slot_9", x: 67, y: 68, width: 28, height: 30, label: "9" },
    ],
  },

  // ============================================================
  // 条漫风格 (webtoon)
  // ============================================================
  {
    id: "wt_single",
    name: "单列滚动",
    category: "webtoon",
    description: "标准条漫布局，垂直滚动阅读",
    width: 800,
    height: 1280,
    recommended: true,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 90, height: 30, label: "第1格" },
      { id: "slot_2", x: 5, y: 34, width: 90, height: 30, label: "第2格" },
      { id: "slot_3", x: 5, y: 66, width: 90, height: 32, label: "第3格" },
    ],
  },
  {
    id: "wt_double",
    name: "双列对话",
    category: "webtoon",
    description: "适合对话场景的双列布局",
    width: 800,
    height: 1280,
    recommended: false,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 90, height: 25, label: "场景" },
      { id: "slot_2", x: 5, y: 29, width: 44, height: 34, label: "角色A" },
      { id: "slot_3", x: 51, y: 29, width: 44, height: 34, label: "角色B" },
      { id: "slot_4", x: 5, y: 65, width: 90, height: 33, label: "结果" },
    ],
  },
  {
    id: "wt_mixed",
    name: "图文混排",
    category: "webtoon",
    description: "图片与文字区域交替",
    width: 800,
    height: 1280,
    recommended: false,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 90, height: 35, label: "图片1" },
      { id: "slot_2", x: 5, y: 39, width: 90, height: 20, label: "文字区" },
      { id: "slot_3", x: 5, y: 61, width: 90, height: 37, label: "图片2" },
    ],
  },

  // ============================================================
  // 自由布局 (free)
  // ============================================================
  {
    id: "free_blank",
    name: "空白画布",
    category: "free",
    description: "完全自由的空白画布",
    width: 1080,
    height: 1920,
    recommended: true,
    panelSlots: [],
  },
  {
    id: "free_2col",
    name: "两栏布局",
    category: "free",
    description: "简单的两栏布局",
    width: 1080,
    height: 1920,
    recommended: false,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 44, height: 96, label: "左栏" },
      { id: "slot_2", x: 51, y: 2, width: 44, height: 96, label: "右栏" },
    ],
  },
  {
    id: "free_3row",
    name: "三行布局",
    category: "free",
    description: "简单的三行布局",
    width: 1080,
    height: 1920,
    recommended: false,
    panelSlots: [
      { id: "slot_1", x: 5, y: 2, width: 90, height: 31, label: "上" },
      { id: "slot_2", x: 5, y: 35, width: 90, height: 31, label: "中" },
      { id: "slot_3", x: 5, y: 68, width: 90, height: 30, label: "下" },
    ],
  },
];

/**
 * 根据 ID 获取模板
 */
export function getSystemTemplateById(id: string): SystemTemplate | undefined {
  return SYSTEM_TEMPLATES.find((t) => t.id === id);
}

/**
 * 根据分类获取模板
 */
export function getSystemTemplatesByCategory(
  category: TemplateCategory
): SystemTemplate[] {
  return SYSTEM_TEMPLATES.filter((t) => t.category === category);
}
