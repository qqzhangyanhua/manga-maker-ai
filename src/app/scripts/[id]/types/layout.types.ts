/**
 * 分镜布局相关类型定义
 */

import type { Panel } from "./script-editor.types";

/**
 * 布局类型
 */
export type LayoutType = "single" | "2" | "4" | "6";

/**
 * 布局提示值
 */
export type LayoutHint =
  | "group_start_2"
  | "group_start_4"
  | "group_start_6"
  | "group_member"
  | null;

/**
 * 分镜布局组
 */
export interface PanelGroup {
  type: LayoutType;
  panels: Panel[];
  groupStartId: string; // 组起始Panel的ID，用于选择整个组
}

/**
 * 布局编辑模式状态
 */
export interface LayoutModeState {
  isLayoutMode: boolean;
  selectedPanelIds: string[];
}

/**
 * 布局操作API请求参数
 */
export interface BatchLayoutRequest {
  panelIds: string[];
  layoutType: "2" | "4" | "6";
}

/**
 * 拆分布局API请求参数
 */
export interface BreakLayoutRequest {
  panelId: string;
}

/**
 * 布局API响应
 */
export interface LayoutApiResponse {
  success: boolean;
  data: {
    panelCount: number;
    panels: Panel[];
    layoutType?: string;
  };
  message: string;
}

/**
 * 从 layout_hint 提取布局类型
 */
export function getLayoutTypeFromHint(hint: string | null | undefined): LayoutType {
  if (!hint) return "single";
  if (hint === "group_start_2") return "2";
  if (hint === "group_start_4") return "4";
  if (hint === "group_start_6") return "6";
  return "single";
}

/**
 * 检查 Panel 是否是布局组的起始
 */
export function isGroupStart(panel: Panel): boolean {
  return !!panel.layout_hint?.startsWith("group_start_");
}

/**
 * 检查 Panel 是否是布局组的成员（非起始）
 */
export function isGroupMember(panel: Panel): boolean {
  return panel.layout_hint === "group_member";
}

/**
 * 检查 Panel 是否属于任何布局组
 */
export function isInLayoutGroup(panel: Panel): boolean {
  return isGroupStart(panel) || isGroupMember(panel);
}

/**
 * 将 Panel 列表按布局分组
 */
export function groupPanelsByLayout(panels: Panel[]): PanelGroup[] {
  const groups: PanelGroup[] = [];
  let currentGroup: Panel[] = [];
  let currentLayoutType: LayoutType = "single";
  let currentGroupStartId = "";

  // 确保按 panel_order 排序
  const sortedPanels = [...panels].sort((a, b) => a.panel_order - b.panel_order);

  sortedPanels.forEach((panel) => {
    if (isGroupStart(panel)) {
      // 保存上一组
      if (currentGroup.length > 0) {
        groups.push({
          type: currentLayoutType,
          panels: currentGroup,
          groupStartId: currentGroupStartId || currentGroup[0].id,
        });
      }
      // 开始新组
      currentLayoutType = getLayoutTypeFromHint(panel.layout_hint);
      currentGroup = [panel];
      currentGroupStartId = panel.id;
    } else if (isGroupMember(panel)) {
      // 添加到当前组
      currentGroup.push(panel);
    } else {
      // 独立 Panel
      if (currentGroup.length > 0) {
        groups.push({
          type: currentLayoutType,
          panels: currentGroup,
          groupStartId: currentGroupStartId || currentGroup[0].id,
        });
        currentGroup = [];
        currentLayoutType = "single";
        currentGroupStartId = "";
      }
      // 添加独立Panel作为单独的组
      groups.push({
        type: "single",
        panels: [panel],
        groupStartId: panel.id,
      });
    }
  });

  // 保存最后一组
  if (currentGroup.length > 0) {
    groups.push({
      type: currentLayoutType,
      panels: currentGroup,
      groupStartId: currentGroupStartId || currentGroup[0].id,
    });
  }

  return groups;
}

/**
 * 检查选择的 Panel ID 是否连续
 */
export function isSelectionContinuous(
  selectedIds: string[],
  allPanels: Panel[]
): boolean {
  if (selectedIds.length <= 1) return true;

  const orders = selectedIds
    .map((id) => allPanels.find((p) => p.id === id)?.panel_order)
    .filter((o): o is number => o !== undefined)
    .sort((a, b) => a - b);

  if (orders.length !== selectedIds.length) return false;

  for (let i = 1; i < orders.length; i++) {
    if (orders[i] !== orders[i - 1] + 1) return false;
  }
  return true;
}

/**
 * 获取布局类型的显示名称
 */
export function getLayoutTypeName(type: LayoutType): string {
  switch (type) {
    case "single":
      return "1镜";
    case "2":
      return "2镜";
    case "4":
      return "4镜";
    case "6":
      return "6镜";
    default:
      return "未知";
  }
}

/**
 * 获取布局网格的CSS类
 */
export function getLayoutGridClass(type: LayoutType): string {
  switch (type) {
    case "2":
      return "grid-cols-2"; // 2列
    case "4":
      return "grid-cols-2 grid-rows-2"; // 2x2网格
    case "6":
      return "grid-cols-3 grid-rows-2"; // 3x2网格
    default:
      return "grid-cols-1"; // 单列
  }
}
