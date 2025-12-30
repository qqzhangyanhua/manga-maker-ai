/**
 * 漫画排版与导出中心 - 类型定义
 */

// ============================================================
// 页面规格
// ============================================================

/** 页面规格预设 */
export interface PagePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
  usage: string;
}

/** 预设页面规格列表 */
export const PAGE_PRESETS: PagePreset[] = [
  { id: 'mobile_vertical', name: '手机竖屏', width: 1080, height: 1920, dpi: 72, usage: '微信/抖音' },
  { id: 'mobile_long', name: '手机长图', width: 1080, height: 2400, dpi: 72, usage: '微博/小红书' },
  { id: 'webtoon', name: 'Webtoon', width: 800, height: 1280, dpi: 72, usage: '条漫平台' },
  { id: 'manga_b5', name: '日漫单页', width: 1654, height: 2339, dpi: 300, usage: 'B5印刷' },
  { id: 'comic_us', name: '美漫单页', width: 2063, height: 3131, dpi: 300, usage: '美漫印刷' },
  { id: 'doujin_a5', name: '同人本', width: 1748, height: 2480, dpi: 350, usage: 'A5印刷' },
  { id: 'custom', name: '自定义', width: 0, height: 0, dpi: 72, usage: '用户输入' },
];

// ============================================================
// 模板系统
// ============================================================

/** 模板分类 */
export type TemplateCategory = 'japanese' | 'american' | 'webtoon' | 'free';

/** Panel 插槽定义 */
export interface PanelSlot {
  id: string;
  x: number;      // 相对位置 0-100%
  y: number;
  width: number;  // 相对尺寸 0-100%
  height: number;
  rotation?: number;
  clipPath?: string;  // SVG clipPath
  label?: string;     // 插槽标签，用于 UI 显示
}

/** 布局模板数据 */
export interface LayoutTemplateData {
  id: string;
  name: string;
  category: TemplateCategory;
  description?: string;
  width: number;
  height: number;
  panelSlots: PanelSlot[];
  thumbnailUrl?: string;
  isSystem: boolean;
  userId?: string;
  useCount: number;
  recommended: boolean;
}

// ============================================================
// 气泡系统
// ============================================================

/** 气泡类型 */
export type BubbleType = 'speech' | 'thought' | 'shout' | 'whisper' | 'narration' | 'electronic';

/** 气泡形状 */
export type BubbleShape = 'rounded' | 'cloud' | 'explosion' | 'rectangle' | 'custom';

/** 边框样式 */
export type BorderStyle = 'solid' | 'dashed' | 'double';

/** 尾巴样式 */
export type TailStyle = 'curved' | 'straight' | 'zigzag';

/** 尾巴位置 */
export type TailPosition = 'bottom' | 'left' | 'right' | 'top';

/** 文字样式 */
export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  writingMode: 'horizontal' | 'vertical';
}

/** 气泡样式配置 */
export interface BubbleStyleConfig {
  // 形状
  shape: BubbleShape;
  customPath?: string;

  // 边框
  borderWidth: number;
  borderColor: string;
  borderStyle: BorderStyle;

  // 填充
  backgroundColor: string;
  backgroundOpacity: number;

  // 尾巴
  tailEnabled: boolean;
  tailStyle: TailStyle;
  tailPosition: TailPosition;

  // 文字默认样式
  defaultTextStyle: TextStyle;
}

/** 气泡样式数据 */
export interface BubbleStyleData {
  id: string;
  name: string;
  type: BubbleType;
  styleConfig: BubbleStyleConfig;
  isSystem: boolean;
  userId?: string;
  useCount: number;
}

/** 预设气泡样式 */
export const DEFAULT_BUBBLE_STYLES: Omit<BubbleStyleData, 'id' | 'userId' | 'useCount'>[] = [
  {
    name: '普通对话',
    type: 'speech',
    isSystem: true,
    styleConfig: {
      shape: 'rounded',
      borderWidth: 2,
      borderColor: '#000000',
      borderStyle: 'solid',
      backgroundColor: '#ffffff',
      backgroundOpacity: 1,
      tailEnabled: true,
      tailStyle: 'curved',
      tailPosition: 'bottom',
      defaultTextStyle: {
        fontFamily: 'Noto Sans SC',
        fontSize: 16,
        fontWeight: 'normal',
        color: '#000000',
        lineHeight: 1.4,
        textAlign: 'center',
        verticalAlign: 'middle',
        writingMode: 'horizontal',
      },
    },
  },
  {
    name: '内心独白',
    type: 'thought',
    isSystem: true,
    styleConfig: {
      shape: 'cloud',
      borderWidth: 2,
      borderColor: '#666666',
      borderStyle: 'solid',
      backgroundColor: '#f0f0f0',
      backgroundOpacity: 0.9,
      tailEnabled: true,
      tailStyle: 'curved',
      tailPosition: 'bottom',
      defaultTextStyle: {
        fontFamily: 'Noto Sans SC',
        fontSize: 14,
        fontWeight: 'normal',
        color: '#333333',
        lineHeight: 1.4,
        textAlign: 'center',
        verticalAlign: 'middle',
        writingMode: 'horizontal',
      },
    },
  },
  {
    name: '呐喊',
    type: 'shout',
    isSystem: true,
    styleConfig: {
      shape: 'explosion',
      borderWidth: 3,
      borderColor: '#000000',
      borderStyle: 'solid',
      backgroundColor: '#ffffff',
      backgroundOpacity: 1,
      tailEnabled: true,
      tailStyle: 'zigzag',
      tailPosition: 'bottom',
      defaultTextStyle: {
        fontFamily: 'Noto Sans SC',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000000',
        lineHeight: 1.2,
        textAlign: 'center',
        verticalAlign: 'middle',
        writingMode: 'horizontal',
      },
    },
  },
  {
    name: '悄悄话',
    type: 'whisper',
    isSystem: true,
    styleConfig: {
      shape: 'rounded',
      borderWidth: 1,
      borderColor: '#999999',
      borderStyle: 'dashed',
      backgroundColor: '#ffffff',
      backgroundOpacity: 0.8,
      tailEnabled: true,
      tailStyle: 'curved',
      tailPosition: 'bottom',
      defaultTextStyle: {
        fontFamily: 'Noto Sans SC',
        fontSize: 12,
        fontWeight: 'normal',
        color: '#666666',
        lineHeight: 1.4,
        textAlign: 'center',
        verticalAlign: 'middle',
        writingMode: 'horizontal',
      },
    },
  },
  {
    name: '旁白框',
    type: 'narration',
    isSystem: true,
    styleConfig: {
      shape: 'rectangle',
      borderWidth: 1,
      borderColor: '#000000',
      borderStyle: 'solid',
      backgroundColor: '#fffef0',
      backgroundOpacity: 1,
      tailEnabled: false,
      tailStyle: 'straight',
      tailPosition: 'bottom',
      defaultTextStyle: {
        fontFamily: 'Noto Serif SC',
        fontSize: 14,
        fontWeight: 'normal',
        color: '#333333',
        lineHeight: 1.6,
        textAlign: 'left',
        verticalAlign: 'top',
        writingMode: 'horizontal',
      },
    },
  },
];

// ============================================================
// 特效素材
// ============================================================

/** 特效分类 */
export type EffectCategory = 'speed_lines' | 'screen_tone' | 'emotion' | 'environment' | 'border';

/** 素材类型 */
export type AssetType = 'svg' | 'png' | 'pattern';

/** 可调参数 */
export interface AdjustableParams {
  opacity?: boolean;
  color?: boolean;
  scale?: boolean;
  rotation?: boolean;
}

/** 特效素材数据 */
export interface EffectAssetData {
  id: string;
  name: string;
  category: EffectCategory;
  assetType: AssetType;
  assetUrl: string;
  thumbnailUrl?: string;
  adjustable?: AdjustableParams;
  isSystem: boolean;
  userId?: string;
  tags: string[];
  useCount: number;
}

// ============================================================
// 导出系统
// ============================================================

/** 导出格式 */
export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'zip';

/** DPI 选项 */
export type DpiOption = 72 | 150 | 300 | 350;

/** 页面范围 */
export type PageRange = 'all' | 'current' | 'custom';

/** PDF 选项 */
export interface PdfOptions {
  pagesPerSheet: 1 | 2;
  addBleed: boolean;
  bleedSize: number;  // mm
  cropMarks: boolean;
}

/** 导出配置 */
export interface ExportConfig {
  format: ExportFormat;
  quality: number;           // 0-100
  dpi: DpiOption;
  pageRange: PageRange;
  customPages?: number[];
  pdfOptions?: PdfOptions;
  fileNamePattern: string;
}

/** 导出预设场景 */
export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  config: Partial<ExportConfig>;
}

/** 预设导出场景 */
export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'social',
    name: '社交分享',
    description: 'PNG 72dpi，适合微信/微博',
    icon: 'Share2',
    config: {
      format: 'png',
      quality: 90,
      dpi: 72,
      pageRange: 'all',
      fileNamePattern: '{project}_page_{page}',
    },
  },
  {
    id: 'webtoon',
    name: '条漫平台',
    description: 'JPG 长图，适合条漫发布',
    icon: 'Smartphone',
    config: {
      format: 'jpg',
      quality: 85,
      dpi: 72,
      pageRange: 'all',
      fileNamePattern: '{project}_{page}',
    },
  },
  {
    id: 'print',
    name: '印刷输出',
    description: 'PDF 300dpi，含出血和裁切线',
    icon: 'Printer',
    config: {
      format: 'pdf',
      quality: 100,
      dpi: 300,
      pageRange: 'all',
      fileNamePattern: '{project}_print',
      pdfOptions: {
        pagesPerSheet: 1,
        addBleed: true,
        bleedSize: 3,
        cropMarks: true,
      },
    },
  },
  {
    id: 'archive',
    name: '源文件备份',
    description: 'ZIP 打包所有页面',
    icon: 'Archive',
    config: {
      format: 'zip',
      quality: 100,
      dpi: 150,
      pageRange: 'all',
      fileNamePattern: '{project}_backup_{page}',
    },
  },
];

/** 导出状态 */
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 导出历史记录 */
export interface ExportHistoryData {
  id: string;
  projectId: string;
  userId: string;
  format: ExportFormat;
  config: ExportConfig;
  fileUrl?: string;
  fileSize?: number;
  pageCount: number;
  status: ExportStatus;
  progress: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================
// Canvas 数据
// ============================================================

/** 漫画对象类型 */
export type MangaObjectType = 'panel' | 'bubble' | 'text' | 'effect' | 'decoration';

/** 漫画对象元数据 */
export interface MangaObjectData {
  panelId?: string;
  slotId?: string;
  bubbleStyleId?: string;
  effectId?: string;
  textContent?: string;
}

/** Canvas 序列化数据 */
export interface MangaCanvasData {
  version: string;
  objects: unknown[];  // Fabric.js 对象序列化
  background?: string;
  mangaMeta: {
    pageSize: {
      width: number;
      height: number;
      dpi: number;
    };
    templateId?: string;
    panelMapping: Record<string, string>;  // slotId -> panelId
  };
}

// ============================================================
// 漫画页面
// ============================================================

/** 漫画页面数据 */
export interface ComicPageData {
  id: string;
  projectId: string;
  pageOrder: number;
  width: number;
  height: number;
  dpi: number;
  presetName?: string;
  canvasData?: MangaCanvasData | object;  // 支持 raw fabric JSON
  thumbnailUrl?: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 创建页面请求 */
export interface CreatePageRequest {
  templateId?: string;
  pageSize?: {
    width: number;
    height: number;
    dpi: number;
  };
  presetName?: string;
  insertAfterPageId?: string;
}

/** 更新页面请求 */
export interface UpdatePageRequest {
  canvasData?: MangaCanvasData | object;  // 支持 raw fabric JSON
  pageOrder?: number;
  thumbnailUrl?: string;
}

/** 重排序页面请求 */
export interface ReorderPagesRequest {
  pageIds: string[];
}

/** 应用模板请求 */
export interface ApplyTemplateRequest {
  templateId: string;
  panelMapping: Record<string, string>;  // slotId -> panelId
}
