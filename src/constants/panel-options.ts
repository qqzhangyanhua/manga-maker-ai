/**
 * 分镜相关常量定义
 *
 * 统一管理镜头角度、景别、分镜类型等选项
 */

/** 镜头角度选项 */
export const CAMERA_ANGLES = [
  { value: "平视", label: "平视", description: "标准视角，平等对视" },
  { value: "俯视", label: "俯视", description: "从上往下看，表现渺小或压迫" },
  { value: "仰视", label: "仰视", description: "从下往上看，表现崇高或威严" },
  { value: "荷兰角", label: "荷兰角", description: "倾斜视角，表现不安或戏剧性" },
] as const;

/** 景别大小选项 */
export const SHOT_SIZES = [
  { value: "特写", label: "特写", description: "面部或物体细节，强调情绪" },
  { value: "近景", label: "近景", description: "头部到胸部，适合对话场景" },
  { value: "中景", label: "中景", description: "头部到腰部，展示动作和交互" },
  { value: "全景", label: "全景", description: "完整人物，展示姿态和环境" },
  { value: "远景", label: "远景", description: "人物很小，强调环境和氛围" },
] as const;

/** 分镜类型选项 */
export const PANEL_TYPES = [
  { value: "wide", label: "宽幅", description: "横向构图，适合展示场景" },
  { value: "medium", label: "标准", description: "常规比例，通用性强" },
  { value: "closeup", label: "特写", description: "聚焦细节，强调情绪" },
  { value: "action", label: "动作", description: "动态构图，表现运动" },
  { value: "dialogue", label: "对话", description: "对话场景，人物交流" },
  { value: "transition", label: "过渡", description: "场景转换，时间推移" },
] as const;

/** 重要性级别选项 */
export const IMPORTANCE_LEVELS = [
  { value: "high", label: "高", description: "关键情节，需要精细绘制" },
  { value: "medium", label: "中", description: "普通情节，标准质量" },
  { value: "low", label: "低", description: "过渡情节，可简化处理" },
] as const;

/** 类型提取 */
export type CameraAngle = (typeof CAMERA_ANGLES)[number]["value"];
export type ShotSize = (typeof SHOT_SIZES)[number]["value"];
export type PanelType = (typeof PANEL_TYPES)[number]["value"];
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number]["value"];

/** 不修改选项的标识值 */
export const NO_CHANGE_VALUE = "__no_change__";
