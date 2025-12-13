export interface Panel {
  id: string;
  image_url: string | null;
  generated_image: string | null;
  description: string;
  dialogue: string | null;
  panel_order: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FilterOptions {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  blur: number;
}

export type BubbleStyle = "rounded" | "oval" | "cloud" | "pointer";

export interface ImageSize {
  width: number;
  height: number;
}

export interface ImageBox {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

export interface BubbleOptions {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  padding: number;
  color: string;
  background: string;
  opacity: number;
  show: boolean;
  style: BubbleStyle;
}

export const BUBBLE_STYLES: { label: string; value: BubbleStyle }[] = [
  { label: "圆角矩形", value: "rounded" },
  { label: "椭圆气泡", value: "oval" },
  { label: "漫画云", value: "cloud" },
  { label: "指向云朵", value: "pointer" },
];

export const DEFAULT_CROP: CropArea = {
  x: 5,
  y: 5,
  width: 90,
  height: 90,
};

export const DEFAULT_FILTERS: FilterOptions = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  blur: 0,
};

export const FONT_OPTIONS = [
  { label: "无衬线（Inter）", value: "Inter, system-ui, sans-serif" },
  {
    label: "雅黑/黑体",
    value: "'SimHei', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif",
  },
  { label: "衬线（Times New Roman）", value: "'Times New Roman', Times, serif" },
  { label: "圆体（Comic Sans）", value: "'Comic Sans MS', 'Comic Sans', cursive" },
  { label: "等宽（Courier New）", value: "'Courier New', Courier, monospace" },
  { label: "楷体/草书", value: "'DFKai-SB', 'KaiTi', 'STKaiti', 'FangSong', cursive" },
  { label: "宋体/明朝", value: "'Songti SC', 'SimSun', 'STSong', serif" },
  { label: "圆角（幼圆）", value: "'YouYuan', 'Arial Rounded MT', 'PingFang SC', sans-serif" },
  { label: "重衬线（Georgia）", value: "'Georgia', 'Times New Roman', serif" },
  { label: "现代无衬线", value: "'Futura', 'Avenir', 'Helvetica', 'Arial', sans-serif" },
  { label: "手写体（Brush）", value: "'Brush Script MT', 'Bradley Hand', 'Comic Sans MS', cursive" },
];

export const DEFAULT_BUBBLE: BubbleOptions = {
  text: "",
  x: 50,
  y: 80,
  width: 60,
  height: 28,
  fontSize: 18,
  fontFamily: "Inter, system-ui, sans-serif",
  padding: 12,
  color: "#111827",
  background: "#ffffff",
  opacity: 80,
  show: true,
  style: "rounded",
};
