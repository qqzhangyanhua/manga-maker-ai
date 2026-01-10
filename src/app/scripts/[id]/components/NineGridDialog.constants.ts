/**
 * 九宫格对话框常量定义
 */

/** 九宫格所需的分镜数量 */
export const REQUIRED_PANELS_COUNT = 9;

/** 九宫格布局（3x3） */
export const GRID_LAYOUT = {
  ROWS: 3,
  COLS: 3,
} as const;

/** 表单默认值 */
export const FORM_DEFAULT_VALUES = {
  chapterId: "",
  panelIds: [],
  comicStyleId: "none",
  referenceImageId: "none",
} as const;

/** 选择器占位符 */
export const PLACEHOLDERS = {
  CHAPTER: "选择包含分镜的章节",
  STYLE_LOADING: "加载中...",
  STYLE: "选择漫画风格",
  ASSET_LOADING: "加载中...",
  ASSET: "从素材库选择参考图",
} as const;

/** 错误消息 */
export const ERROR_MESSAGES = {
  NO_PROJECT_ID: "项目 ID 不存在",
  INVALID_PANEL_COUNT: "请选择恰好 9 个分镜",
  LOAD_PANELS_FAILED: "无法加载章节分镜",
  GENERATION_FAILED: "生成失败",
  UNKNOWN_ERROR: "未知错误",
} as const;

/** 成功消息 */
export const SUCCESS_MESSAGES = {
  GENERATION_SUCCESS: "九宫格图片已生成并保存到素材库",
} as const;
