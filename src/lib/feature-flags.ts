/**
 * Feature Flags 配置
 * 用于控制新功能的启用/禁用
 */

export const FEATURE_FLAGS = {
  /**
   * 新版素材库侧边栏布局
   * true: 使用侧边栏布局（素材库作为右侧抽屉）
   * false: 使用传统 Tab 布局（素材库作为独立 Tab）
   */
  NEW_ASSET_SIDEBAR: process.env.NEXT_PUBLIC_FEATURE_NEW_ASSET_SIDEBAR === 'true',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
