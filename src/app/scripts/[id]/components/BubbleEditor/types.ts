/**
 * 气泡编辑器类型定义
 */

export type BubbleType = "dialog" | "thought" | "narration" | "sfx" | "shout";

export interface SpeechBubble {
  id: string;
  panelId: string; // 所属分镜ID
  type: BubbleType; // 气泡类型
  text: string; // 文字内容
  position: {
    x: number; // X坐标（百分比 0-100）
    y: number; // Y坐标（百分比 0-100）
  };
  size: {
    width: number; // 宽度（像素）
    height: number; // 高度（像素）
  };
  style: BubbleStyle;
  pointer?: BubblePointer; // 指向箭头（可选）
  zIndex?: number; // 层级（越大越在上层，默认0）
}

export interface BubbleStyle {
  fontFamily: string; // 字体
  fontSize: number; // 字号
  fontWeight: "normal" | "bold"; // 粗细
  fontStyle?: "normal" | "italic"; // 斜体
  color: string; // 文字颜色
  backgroundColor?: string; // 气泡背景色
  borderColor?: string; // 边框颜色
  borderWidth?: number; // 边框宽度
  borderStyle?: "solid" | "dashed" | "dotted"; // 边框样式
  padding?: number; // 内边距
  textAlign?: "left" | "center" | "right"; // 文字对齐
}

export interface BubblePointer {
  angle: number; // 角度 (0-360)
  length: number; // 长度（像素）
  position: "top" | "bottom" | "left" | "right"; // 位置
}

export interface BubblePreset {
  label: string; // 显示名称
  icon: string; // 图标（emoji）
  shape: "rounded-rect" | "cloud" | "rect" | "none" | "star"; // 形状
  style: Partial<BubbleStyle>; // 默认样式
}

export const BUBBLE_PRESETS: Record<BubbleType, BubblePreset> = {
  dialog: {
    label: "对话框",
    icon: "💬",
    shape: "rounded-rect",
    style: {
      fontFamily: "Microsoft YaHei",
      fontSize: 14,
      fontWeight: "normal",
      color: "#000000",
      backgroundColor: "#FFFFFF",
      borderColor: "#000000",
      borderWidth: 2,
      borderStyle: "solid",
      padding: 8,
      textAlign: "center",
    },
  },
  thought: {
    label: "思考气泡",
    icon: "💭",
    shape: "cloud",
    style: {
      fontFamily: "Microsoft YaHei",
      fontSize: 13,
      fontWeight: "normal",
      fontStyle: "italic",
      color: "#333333",
      backgroundColor: "#FFFFFF",
      borderColor: "#666666",
      borderWidth: 2,
      borderStyle: "dashed",
      padding: 10,
      textAlign: "center",
    },
  },
  narration: {
    label: "旁白框",
    icon: "📝",
    shape: "rect",
    style: {
      fontFamily: "KaiTi",
      fontSize: 12,
      fontWeight: "normal",
      color: "#000000",
      backgroundColor: "#F5F5F5",
      borderColor: "#666666",
      borderWidth: 1,
      borderStyle: "solid",
      padding: 6,
      textAlign: "left",
    },
  },
  sfx: {
    label: "音效文字",
    icon: "⚡",
    shape: "none",
    style: {
      fontFamily: "Arial Black",
      fontSize: 24,
      fontWeight: "bold",
      color: "#FF4500",
      textAlign: "center",
    },
  },
  shout: {
    label: "爆炸气泡",
    icon: "💥",
    shape: "star",
    style: {
      fontFamily: "SimHei",
      fontSize: 18,
      fontWeight: "bold",
      color: "#000000",
      backgroundColor: "#FFE600",
      borderColor: "#000000",
      borderWidth: 3,
      borderStyle: "solid",
      padding: 10,
      textAlign: "center",
    },
  },
};

// 默认气泡样式
export const DEFAULT_BUBBLE_STYLE: BubbleStyle = {
  fontFamily: "Microsoft YaHei",
  fontSize: 14,
  fontWeight: "normal",
  color: "#000000",
  backgroundColor: "#FFFFFF",
  borderColor: "#000000",
  borderWidth: 2,
  borderStyle: "solid",
  padding: 8,
  textAlign: "center",
};

// 默认气泡大小
export const DEFAULT_BUBBLE_SIZE = {
  width: 150,
  height: 80,
};

// 生成唯一ID
export function generateBubbleId(): string {
  return `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
