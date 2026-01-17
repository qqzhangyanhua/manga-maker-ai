/**
 * Comic Layout Constants
 * 漫画布局和渲染常量配置
 */

/**
 * 对话框布局配置
 */
export const BUBBLE_LAYOUT = {
  /** 对话框宽度占画布比例 */
  WIDTH_RATIO: 0.4,
  /** 对话框最大宽度 (像素) */
  MAX_WIDTH: 300,
  /** 对话框最小宽度 (像素) */
  MIN_WIDTH: 100,
  /** 边距 (像素) */
  MARGIN: 20,
  /** 内边距 (像素) */
  PADDING: 20,
  /** 圆角半径 (像素) */
  BORDER_RADIUS: 15,
  /** 尾巴长度 (像素) */
  TAIL_LENGTH: 20,
} as const;

/**
 * 文本渲染配置
 */
export const TEXT_STYLE = {
  /** 字体大小 (像素) */
  FONT_SIZE: 20,
  /** 字体族 */
  FONT_FAMILY: 'Arial, "Microsoft YaHei", "PingFang SC", sans-serif',
  /** 行高 (像素) */
  LINE_HEIGHT: 30,
  /** 字符宽度估算 (像素) */
  CHAR_WIDTH: 20,
  /** 最大行数 */
  MAX_LINES: 10,
} as const;

/**
 * 对话框样式颜色配置
 */
export const BUBBLE_STYLES: Record<string, {
  fillColor: string;
  strokeColor: string;
  lineWidth: number;
  lineDash: number[];
}> = {
  speech: {
    fillColor: 'white',
    strokeColor: 'black',
    lineWidth: 3,
    lineDash: [],
  },
  thought: {
    fillColor: 'white',
    strokeColor: 'gray',
    lineWidth: 2,
    lineDash: [5, 5],
  },
  shout: {
    fillColor: 'yellow',
    strokeColor: 'red',
    lineWidth: 4,
    lineDash: [],
  },
  whisper: {
    fillColor: '#f0f0f0',
    strokeColor: 'gray',
    lineWidth: 1,
    lineDash: [],
  },
};

/**
 * Canvas 限制
 */
export const CANVAS_LIMITS = {
  /** 最大图片宽度 (像素) */
  MAX_WIDTH: 4096,
  /** 最大图片高度 (像素) */
  MAX_HEIGHT: 4096,
  /** 最大文件大小 (字节) - 10MB */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** 下载超时 (毫秒) */
  DOWNLOAD_TIMEOUT: 30000,
} as const;

/**
 * 位置映射
 */
export const BUBBLE_POSITIONS = {
  'top-left': { x: (w: number) => BUBBLE_LAYOUT.MARGIN, y: (h: number) => BUBBLE_LAYOUT.MARGIN },
  'top-right': { x: (w: number) => w * 0.6, y: (h: number) => BUBBLE_LAYOUT.MARGIN },
  'bottom-left': { x: (w: number) => BUBBLE_LAYOUT.MARGIN, y: (h: number) => h * 0.7 },
  'bottom-right': { x: (w: number) => w * 0.6, y: (h: number) => h * 0.7 },
  'center': { x: (w: number) => w * 0.3, y: (h: number) => h * 0.4 },
} as const;

/**
 * 性能配置
 */
export const PERFORMANCE = {
  /** 并发处理数 */
  CONCURRENCY: 5,
  /** 批处理大小 */
  BATCH_SIZE: 10,
} as const;
