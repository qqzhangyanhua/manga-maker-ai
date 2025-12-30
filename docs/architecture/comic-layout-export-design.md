# 技术架构设计：漫画排版与导出中心

> **版本**: v1.0
> **架构师**: AI Architect
> **创建日期**: 2025-01-30
> **关联 PRD**: `docs/prd/P0-comic-layout-export.md`

---

## 1. 架构概览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  LayoutEditor   │  │  PageManager    │  │  ExportDialog               │ │
│  │  /layout/[id]   │  │  (Component)    │  │  (Component)                │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────────────────┤ │
│  │ • MangaCanvas   │  │ • PageList      │  │ • FormatSelector            │ │
│  │ • Toolbar       │  │ • PageThumbnail │  │ • QualitySettings           │ │
│  │ • PropertyPanel │  │ • DragReorder   │  │ • ExportProgress            │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Shared Components                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ BubbleSelector | EffectLibrary | TemplateGallery | FontPicker       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Layer (Next.js)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /api/project/[id]/pages/*     页面 CRUD + 排序                            │
│  /api/templates/layout/*       页面模板管理                                 │
│  /api/assets/bubbles           气泡样式                                     │
│  /api/assets/effects           特效素材                                     │
│  /api/export/*                 导出任务管理                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PostgreSQL (Prisma)                    MinIO (Object Storage)             │
│  ┌─────────────────────────┐            ┌─────────────────────────┐        │
│  │ ComicPage               │            │ /layout-thumbnails/     │        │
│  │ LayoutTemplate          │            │ /exports/               │        │
│  │ BubbleStyle             │            │ /effect-assets/         │        │
│  │ EffectAsset             │            └─────────────────────────┘        │
│  │ ExportHistory           │                                                │
│  └─────────────────────────┘                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| Canvas 编辑 | Fabric.js 6.x | 现有基础，功能丰富 |
| 状态管理 | Zustand | 轻量级，适合 Canvas 状态 |
| 拖拽排序 | @dnd-kit/core | 现代化拖拽库 |
| PDF 导出 | jspdf + html2canvas | 现有依赖 |
| 图片压缩 | browser-image-compression | 客户端压缩 |
| ZIP 打包 | jszip | 现有依赖 |

---

## 2. 数据模型设计

### 2.1 新增模型

基于现有 schema 扩展，新增以下模型：

```prisma
// ============================================================
// Comic Layout & Export Models
// ============================================================

// 漫画页面 - 一个项目包含多个页面
model ComicPage {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  project_id    String   @db.Uuid
  page_order    Int      // 页面顺序

  // 页面规格
  width         Int      @default(1080)
  height        Int      @default(1920)
  dpi           Int      @default(72)
  preset_name   String?  // 规格名称：mobile_vertical, webtoon, manga_b5 等

  // Canvas 数据 (Fabric.js JSON)
  canvas_data   Json?    // Fabric.js 序列化数据
  thumbnail_url String?  // 缩略图 URL

  // 模板
  template_id   String?  @db.Uuid

  // 时间戳
  created_at    DateTime @default(now()) @db.Timestamptz(6)
  updated_at    DateTime @default(now()) @db.Timestamptz(6)

  // Relations
  project       Project        @relation(fields: [project_id], references: [id], onDelete: Cascade)
  template      LayoutTemplate? @relation(fields: [template_id], references: [id], onDelete: SetNull)

  @@index([project_id, page_order], map: "idx_comic_pages_project_order")
  @@map("comic_pages")
}

// 页面布局模板
model LayoutTemplate {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String   @db.VarChar(100)
  category      String   // japanese, american, webtoon, free
  description   String?  @db.Text

  // 模板规格
  width         Int      @default(1080)
  height        Int      @default(1920)

  // 插槽定义
  panel_slots   Json     // PanelSlot[] - 定义 Panel 位置

  // 元数据
  thumbnail_url String?
  is_system     Boolean  @default(false)  // 系统预设
  user_id       String?  @db.Uuid         // 用户创建
  use_count     Int      @default(0)
  recommended   Boolean  @default(false)

  created_at    DateTime @default(now()) @db.Timestamptz(6)
  updated_at    DateTime @default(now()) @db.Timestamptz(6)

  // Relations
  pages         ComicPage[]

  @@index([category, is_system], map: "idx_layout_templates_category")
  @@index([user_id], map: "idx_layout_templates_user")
  @@map("layout_templates")
}

// 气泡样式
model BubbleStyle {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String   @db.VarChar(50)
  type          String   // speech, thought, shout, whisper, narration, electronic

  // 样式配置 (JSON)
  style_config  Json     // BubbleStyleConfig

  // 元数据
  is_system     Boolean  @default(false)
  user_id       String?  @db.Uuid
  use_count     Int      @default(0)

  created_at    DateTime @default(now()) @db.Timestamptz(6)

  @@index([type, is_system], map: "idx_bubble_styles_type")
  @@map("bubble_styles")
}

// 特效素材库
model EffectAsset {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String   @db.VarChar(100)
  category      String   // speed_lines, screen_tone, emotion, environment, border

  // 素材内容
  asset_type    String   // svg, png, pattern
  asset_url     String
  thumbnail_url String?

  // 可调参数定义
  adjustable    Json?    // { opacity: true, color: true, scale: true }

  // 元数据
  is_system     Boolean  @default(false)
  user_id       String?  @db.Uuid
  tags          String[] @default([])
  use_count     Int      @default(0)

  created_at    DateTime @default(now()) @db.Timestamptz(6)

  @@index([category, is_system], map: "idx_effect_assets_category")
  @@map("effect_assets")
}

// 导出历史
model ExportHistory {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  project_id    String    @db.Uuid
  user_id       String    @db.Uuid

  // 导出配置
  format        String    // png, jpg, pdf, zip
  config        Json      // ExportConfig

  // 导出结果
  file_url      String?
  file_size     Int?      // bytes
  page_count    Int

  // 状态
  status        String    @default("pending") // pending, processing, completed, failed
  progress      Int       @default(0)         // 0-100
  error_message String?

  created_at    DateTime  @default(now()) @db.Timestamptz(6)
  completed_at  DateTime? @db.Timestamptz(6)

  // Relations
  project       Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@index([project_id], map: "idx_export_history_project")
  @@index([user_id, created_at], map: "idx_export_history_user_time")
  @@map("export_history")
}
```

### 2.2 现有模型修改

需要在 `Project` 模型中添加 relations：

```prisma
model Project {
  // ... existing fields ...

  // 新增 relations
  comicPages      ComicPage[]
  exportHistory   ExportHistory[]
}
```

### 2.3 类型定义

```typescript
// src/types/layout.ts

// 页面规格预设
export interface PagePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
  usage: string;
}

// Panel 插槽定义
export interface PanelSlot {
  id: string;
  x: number;      // 相对位置 0-100%
  y: number;
  width: number;  // 相对尺寸 0-100%
  height: number;
  rotation?: number;
  clipPath?: string;  // SVG clipPath
}

// 气泡样式配置
export interface BubbleStyleConfig {
  // 形状
  shape: 'rounded' | 'cloud' | 'explosion' | 'rectangle' | 'custom';
  customPath?: string;

  // 边框
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'double';

  // 填充
  backgroundColor: string;
  backgroundOpacity: number;

  // 尾巴
  tailEnabled: boolean;
  tailStyle: 'curved' | 'straight' | 'zigzag';
  tailPosition: 'bottom' | 'left' | 'right' | 'top';

  // 文字默认样式
  defaultTextStyle: TextStyle;
}

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

// 导出配置
export interface ExportConfig {
  format: 'png' | 'jpg' | 'pdf' | 'zip';
  quality: number;           // 0-100
  dpi: 72 | 150 | 300 | 350;
  pageRange: 'all' | 'current' | 'custom';
  customPages?: number[];
  pdfOptions?: {
    pagesPerSheet: 1 | 2;
    addBleed: boolean;
    bleedSize: number;
    cropMarks: boolean;
  };
  fileNamePattern: string;
}

// Canvas 数据结构
export interface MangaCanvasData {
  version: string;
  objects: fabric.Object[];
  background?: string;
  mangaMeta: {
    pageSize: { width: number; height: number; dpi: number };
    templateId?: string;
    panelMapping: Record<string, string>;  // slotId -> panelId
  };
}
```

---

## 3. API 设计

### 3.1 页面管理 API

#### GET /api/project/[id]/pages

```typescript
// 获取项目的所有页面
Response: {
  pages: Array<{
    id: string;
    pageOrder: number;
    width: number;
    height: number;
    dpi: number;
    presetName: string | null;
    thumbnailUrl: string | null;
    templateId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

#### POST /api/project/[id]/pages

```typescript
// 创建新页面
Request: {
  templateId?: string;
  pageSize?: { width: number; height: number; dpi: number };
  presetName?: string;
  insertAfterPageId?: string;
}

Response: {
  page: ComicPage;
}
```

#### PATCH /api/project/[id]/pages/[pageId]

```typescript
// 更新页面
Request: {
  canvasData?: MangaCanvasData;
  pageOrder?: number;
  thumbnailUrl?: string;
}

Response: {
  page: ComicPage;
}
```

#### DELETE /api/project/[id]/pages/[pageId]

```typescript
// 删除页面
Response: {
  success: true;
}
```

#### POST /api/project/[id]/pages/reorder

```typescript
// 批量重排序
Request: {
  pageIds: string[];  // 新顺序
}

Response: {
  pages: ComicPage[];
}
```

#### POST /api/project/[id]/pages/[pageId]/duplicate

```typescript
// 复制页面
Response: {
  page: ComicPage;
}
```

### 3.2 模板 API

#### GET /api/templates/layout

```typescript
// 获取布局模板列表
Query: {
  category?: string;
  includeUser?: boolean;
}

Response: {
  templates: LayoutTemplate[];
}
```

#### POST /api/project/[id]/pages/[pageId]/apply-template

```typescript
// 应用模板到页面
Request: {
  templateId: string;
  panelMapping: Record<string, string>;  // slotId -> panelId
}

Response: {
  page: ComicPage;
}
```

### 3.3 素材 API

#### GET /api/assets/bubbles

```typescript
Response: {
  bubbles: BubbleStyle[];
}
```

#### GET /api/assets/effects

```typescript
Query: {
  category?: string;
}

Response: {
  effects: EffectAsset[];
}
```

### 3.4 导出 API

#### POST /api/project/[id]/export

```typescript
// 创建导出任务
Request: ExportConfig

Response: {
  exportId: string;
  status: 'processing';
}
```

#### GET /api/export/[exportId]/status

```typescript
Response: {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileUrl?: string;
  error?: string;
}
```

---

## 4. 前端组件架构

### 4.1 目录结构

```
src/
├── app/
│   └── layout/
│       └── [projectId]/
│           ├── page.tsx           # 排版编辑器主页面
│           └── loading.tsx
│
├── components/
│   └── LayoutEditor/
│       ├── index.ts               # 导出入口
│       ├── LayoutEditor.tsx       # 主编辑器组件
│       │
│       ├── PageManager/
│       │   ├── PageManager.tsx    # 页面管理器
│       │   ├── PageThumbnail.tsx  # 页面缩略图
│       │   ├── PageList.tsx       # 页面列表（可拖拽）
│       │   └── AddPageButton.tsx
│       │
│       ├── Canvas/
│       │   ├── MangaCanvas.tsx    # 扩展的 Canvas 组件
│       │   ├── CanvasToolbar.tsx  # 工具栏
│       │   ├── PropertyPanel.tsx  # 属性面板
│       │   └── ZoomControls.tsx   # 缩放控制
│       │
│       ├── Bubble/
│       │   ├── BubbleSelector.tsx # 气泡选择器
│       │   ├── BubbleEditor.tsx   # 气泡编辑器
│       │   └── TailControl.tsx    # 尾巴控制
│       │
│       ├── Effects/
│       │   ├── EffectLibrary.tsx  # 特效库
│       │   └── EffectItem.tsx     # 特效项
│       │
│       ├── Templates/
│       │   ├── TemplateGallery.tsx # 模板画廊
│       │   └── TemplateCard.tsx    # 模板卡片
│       │
│       └── Export/
│           ├── ExportDialog.tsx    # 导出对话框
│           ├── ExportPresets.tsx   # 快速场景
│           └── ExportProgress.tsx  # 导出进度
│
├── lib/
│   └── layout/
│       ├── manga-canvas.ts        # MangaCanvas 类
│       ├── bubble-shapes.ts       # 气泡形状定义
│       ├── export-engine.ts       # 导出引擎
│       ├── page-presets.ts        # 页面规格预设
│       └── system-templates.ts    # 系统模板数据
│
├── hooks/
│   └── layout/
│       ├── useLayoutEditor.ts     # 编辑器状态
│       ├── usePageManager.ts      # 页面管理
│       ├── useCanvasHistory.ts    # 撤销/重做
│       └── useExportTask.ts       # 导出任务
│
└── types/
    └── layout.ts                  # 类型定义
```

### 4.2 核心组件设计

#### LayoutEditor (主组件)

```typescript
// src/components/LayoutEditor/LayoutEditor.tsx

interface LayoutEditorProps {
  projectId: string;
  initialPages?: ComicPage[];
  panels?: Panel[];  // 可用的 Panel 列表
}

export function LayoutEditor({ projectId, initialPages, panels }: LayoutEditorProps) {
  // 使用 Zustand store 管理状态
  const {
    pages,
    currentPageId,
    setCurrentPage,
    addPage,
    deletePage,
    reorderPages,
  } = useLayoutEditorStore();

  return (
    <div className="flex h-screen">
      {/* 左侧：页面管理器 */}
      <PageManager
        pages={pages}
        currentPageId={currentPageId}
        onSelectPage={setCurrentPage}
        onAddPage={addPage}
        onDeletePage={deletePage}
        onReorder={reorderPages}
      />

      {/* 中间：Canvas 编辑区 */}
      <div className="flex-1 flex flex-col">
        <CanvasToolbar />
        <MangaCanvas
          pageId={currentPageId}
          panels={panels}
        />
        <ZoomControls />
      </div>

      {/* 右侧：属性面板 */}
      <PropertyPanel />
    </div>
  );
}
```

#### MangaCanvas (Canvas 编辑器)

```typescript
// src/lib/layout/manga-canvas.ts

import { fabric } from 'fabric';

export class MangaCanvas {
  private canvas: fabric.Canvas;
  private history: fabric.Object[][] = [];
  private historyIndex = -1;

  constructor(canvasElement: HTMLCanvasElement, options: MangaCanvasOptions) {
    this.canvas = new fabric.Canvas(canvasElement, {
      width: options.width,
      height: options.height,
      backgroundColor: '#ffffff',
    });

    this.setupEventListeners();
  }

  // Panel 操作
  addPanel(panel: Panel, slot: PanelSlot): fabric.Image {
    return new Promise((resolve) => {
      fabric.Image.fromURL(panel.generated_image || '', (img) => {
        img.set({
          left: slot.x * this.canvas.width! / 100,
          top: slot.y * this.canvas.height! / 100,
          scaleX: (slot.width * this.canvas.width! / 100) / img.width!,
          scaleY: (slot.height * this.canvas.height! / 100) / img.height!,
          // 自定义属性
          mangaType: 'panel',
          mangaData: { panelId: panel.id, slotId: slot.id },
        } as any);

        this.canvas.add(img);
        resolve(img);
      });
    });
  }

  // 气泡操作
  addBubble(style: BubbleStyleConfig, position: { x: number; y: number }): fabric.Group {
    const bubble = this.createBubbleShape(style);
    const text = new fabric.Textbox('输入文字...', {
      ...style.defaultTextStyle,
      width: 150,
      textAlign: 'center',
    });
    const tail = style.tailEnabled ? this.createBubbleTail(style) : null;

    const objects = tail ? [bubble, text, tail] : [bubble, text];
    const group = new fabric.Group(objects, {
      left: position.x,
      top: position.y,
      mangaType: 'bubble',
      mangaData: { bubbleStyleId: style.id },
    } as any);

    this.canvas.add(group);
    return group;
  }

  // 特效操作
  async addEffect(effect: EffectAsset, position: { x: number; y: number }): Promise<fabric.Object> {
    if (effect.asset_type === 'svg') {
      return new Promise((resolve) => {
        fabric.loadSVGFromURL(effect.asset_url, (objects, options) => {
          const group = fabric.util.groupSVGElements(objects, options);
          group.set({
            left: position.x,
            top: position.y,
            mangaType: 'effect',
            mangaData: { effectId: effect.id },
          } as any);
          this.canvas.add(group);
          resolve(group);
        });
      });
    }
    // PNG 处理...
  }

  // 模板应用
  async applyTemplate(template: LayoutTemplate, panels: Panel[]): Promise<void> {
    this.canvas.clear();
    this.canvas.setBackgroundColor('#ffffff', () => {});

    const slots = template.panel_slots as PanelSlot[];

    for (let i = 0; i < slots.length && i < panels.length; i++) {
      await this.addPanel(panels[i], slots[i]);
    }

    this.canvas.renderAll();
    this.saveToHistory();
  }

  // 历史记录
  saveToHistory(): void {
    const state = this.canvas.toJSON(['mangaType', 'mangaData']);
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex++;

    // 限制历史记录数量
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.canvas.loadFromJSON(this.history[this.historyIndex], () => {
        this.canvas.renderAll();
      });
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.canvas.loadFromJSON(this.history[this.historyIndex], () => {
        this.canvas.renderAll();
      });
    }
  }

  // 导出
  toDataURL(format: 'png' | 'jpeg', quality: number = 1): string {
    return this.canvas.toDataURL({
      format,
      quality,
      multiplier: 1,
    });
  }

  toJSON(): MangaCanvasData {
    return {
      version: '1.0',
      objects: this.canvas.toJSON(['mangaType', 'mangaData']).objects,
      background: this.canvas.backgroundColor as string,
      mangaMeta: {
        pageSize: {
          width: this.canvas.width!,
          height: this.canvas.height!,
          dpi: 72,
        },
        templateId: undefined,
        panelMapping: this.extractPanelMapping(),
      },
    };
  }

  private extractPanelMapping(): Record<string, string> {
    const mapping: Record<string, string> = {};
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.mangaType === 'panel' && obj.mangaData) {
        mapping[obj.mangaData.slotId] = obj.mangaData.panelId;
      }
    });
    return mapping;
  }

  // 气泡形状创建
  private createBubbleShape(style: BubbleStyleConfig): fabric.Object {
    switch (style.shape) {
      case 'rounded':
        return new fabric.Rect({
          width: 180,
          height: 60,
          rx: 15,
          ry: 15,
          fill: style.backgroundColor,
          stroke: style.borderColor,
          strokeWidth: style.borderWidth,
          opacity: style.backgroundOpacity,
        });

      case 'cloud':
        // 使用 SVG path 创建云朵形状
        return new fabric.Path(CLOUD_PATH, {
          fill: style.backgroundColor,
          stroke: style.borderColor,
          strokeWidth: style.borderWidth,
        });

      case 'explosion':
        return new fabric.Path(EXPLOSION_PATH, {
          fill: style.backgroundColor,
          stroke: style.borderColor,
          strokeWidth: style.borderWidth,
        });

      default:
        return new fabric.Rect({
          width: 180,
          height: 60,
          fill: style.backgroundColor,
          stroke: style.borderColor,
          strokeWidth: style.borderWidth,
        });
    }
  }

  private createBubbleTail(style: BubbleStyleConfig): fabric.Triangle {
    return new fabric.Triangle({
      width: 20,
      height: 30,
      fill: style.backgroundColor,
      stroke: style.borderColor,
      strokeWidth: style.borderWidth,
      angle: 180,
      originX: 'center',
      originY: 'top',
    });
  }
}

const CLOUD_PATH = 'M 50 80 Q 20 80 20 60 Q 0 60 0 40 Q 0 20 20 20 Q 20 0 50 0 Q 80 0 80 20 Q 100 20 100 40 Q 100 60 80 60 Q 80 80 50 80 Z';
const EXPLOSION_PATH = 'M 50 0 L 60 40 L 100 30 L 70 50 L 100 70 L 60 60 L 50 100 L 40 60 L 0 70 L 30 50 L 0 30 L 40 40 Z';
```

### 4.3 状态管理

```typescript
// src/stores/layout-editor-store.ts

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface LayoutEditorState {
  // 页面状态
  pages: ComicPage[];
  currentPageId: string | null;

  // 选中状态
  selectedObjectId: string | null;
  selectedObjectType: 'panel' | 'bubble' | 'effect' | 'text' | null;

  // UI 状态
  zoom: number;
  showGrid: boolean;
  activeTool: 'select' | 'bubble' | 'text' | 'effect';

  // Actions
  setPages: (pages: ComicPage[]) => void;
  setCurrentPage: (pageId: string) => void;
  addPage: (page: ComicPage) => void;
  updatePage: (pageId: string, data: Partial<ComicPage>) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;

  setSelectedObject: (id: string | null, type: LayoutEditorState['selectedObjectType']) => void;
  setZoom: (zoom: number) => void;
  setActiveTool: (tool: LayoutEditorState['activeTool']) => void;
}

export const useLayoutEditorStore = create<LayoutEditorState>()(
  immer((set) => ({
    pages: [],
    currentPageId: null,
    selectedObjectId: null,
    selectedObjectType: null,
    zoom: 100,
    showGrid: false,
    activeTool: 'select',

    setPages: (pages) => set((state) => {
      state.pages = pages;
      if (pages.length > 0 && !state.currentPageId) {
        state.currentPageId = pages[0].id;
      }
    }),

    setCurrentPage: (pageId) => set((state) => {
      state.currentPageId = pageId;
      state.selectedObjectId = null;
      state.selectedObjectType = null;
    }),

    addPage: (page) => set((state) => {
      state.pages.push(page);
    }),

    updatePage: (pageId, data) => set((state) => {
      const index = state.pages.findIndex(p => p.id === pageId);
      if (index !== -1) {
        Object.assign(state.pages[index], data);
      }
    }),

    deletePage: (pageId) => set((state) => {
      state.pages = state.pages.filter(p => p.id !== pageId);
      if (state.currentPageId === pageId) {
        state.currentPageId = state.pages[0]?.id || null;
      }
    }),

    reorderPages: (pageIds) => set((state) => {
      const pageMap = new Map(state.pages.map(p => [p.id, p]));
      state.pages = pageIds.map((id, index) => {
        const page = pageMap.get(id)!;
        page.page_order = index;
        return page;
      });
    }),

    setSelectedObject: (id, type) => set((state) => {
      state.selectedObjectId = id;
      state.selectedObjectType = type;
    }),

    setZoom: (zoom) => set((state) => {
      state.zoom = Math.max(10, Math.min(400, zoom));
    }),

    setActiveTool: (tool) => set((state) => {
      state.activeTool = tool;
    }),
  }))
);
```

---

## 5. 导出引擎设计

```typescript
// src/lib/layout/export-engine.ts

import jsPDF from 'jspdf';
import JSZip from 'jszip';

export class ExportEngine {
  private onProgress?: (progress: number) => void;

  setProgressCallback(callback: (progress: number) => void): void {
    this.onProgress = callback;
  }

  // 单页导出
  async exportPage(
    canvas: MangaCanvas,
    config: ExportConfig
  ): Promise<Blob> {
    const scale = config.dpi / 72;
    const format = config.format === 'jpg' ? 'jpeg' : 'png';

    const dataUrl = canvas.toDataURL(format, config.quality / 100);
    const blob = await this.dataURLToBlob(dataUrl);

    return blob;
  }

  // 多页导出
  async exportPages(
    pages: Array<{ canvas: MangaCanvas; pageNumber: number }>,
    config: ExportConfig
  ): Promise<Blob> {
    switch (config.format) {
      case 'pdf':
        return this.exportAsPDF(pages, config);
      case 'zip':
        return this.exportAsZip(pages, config);
      default:
        // 单张或多张图片
        if (pages.length === 1) {
          return this.exportPage(pages[0].canvas, config);
        }
        return this.exportAsZip(pages, config);
    }
  }

  private async exportAsPDF(
    pages: Array<{ canvas: MangaCanvas; pageNumber: number }>,
    config: ExportConfig
  ): Promise<Blob> {
    const firstPage = pages[0].canvas;
    const pageSize = firstPage.getPageSize();

    // 计算 PDF 尺寸 (mm)
    const widthMM = (pageSize.width / config.dpi) * 25.4;
    const heightMM = (pageSize.height / config.dpi) * 25.4;

    const pdf = new jsPDF({
      orientation: widthMM > heightMM ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [widthMM, heightMM],
    });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage([widthMM, heightMM]);
      }

      const { canvas } = pages[i];
      const imgData = canvas.toDataURL('jpeg', config.quality / 100);

      // 添加出血区域
      if (config.pdfOptions?.addBleed) {
        const bleed = config.pdfOptions.bleedSize;
        pdf.addImage(imgData, 'JPEG', -bleed, -bleed, widthMM + bleed * 2, heightMM + bleed * 2);

        // 添加裁切标记
        if (config.pdfOptions.cropMarks) {
          this.addCropMarks(pdf, widthMM, heightMM, bleed);
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM);
      }

      this.onProgress?.(((i + 1) / pages.length) * 100);
    }

    return pdf.output('blob');
  }

  private async exportAsZip(
    pages: Array<{ canvas: MangaCanvas; pageNumber: number }>,
    config: ExportConfig
  ): Promise<Blob> {
    const zip = new JSZip();
    const format = config.format === 'jpg' ? 'jpeg' : 'png';
    const ext = config.format === 'jpg' ? 'jpg' : 'png';

    for (let i = 0; i < pages.length; i++) {
      const { canvas, pageNumber } = pages[i];
      const dataUrl = canvas.toDataURL(format, config.quality / 100);
      const base64 = dataUrl.split(',')[1];

      const fileName = config.fileNamePattern
        .replace('{page}', String(pageNumber).padStart(3, '0'))
        .replace('{project}', 'comic');

      zip.file(`${fileName}.${ext}`, base64, { base64: true });

      this.onProgress?.(((i + 1) / pages.length) * 100);
    }

    return zip.generateAsync({ type: 'blob' });
  }

  private addCropMarks(pdf: jsPDF, width: number, height: number, bleed: number): void {
    const markLength = 5;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.1);

    // 四个角的裁切标记
    // 左上
    pdf.line(0, -markLength - bleed, 0, -bleed);
    pdf.line(-markLength - bleed, 0, -bleed, 0);
    // 右上
    pdf.line(width, -markLength - bleed, width, -bleed);
    pdf.line(width + bleed, 0, width + markLength + bleed, 0);
    // 左下
    pdf.line(0, height + bleed, 0, height + markLength + bleed);
    pdf.line(-markLength - bleed, height, -bleed, height);
    // 右下
    pdf.line(width, height + bleed, width, height + markLength + bleed);
    pdf.line(width + bleed, height, width + markLength + bleed, height);
  }

  private async dataURLToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }
}
```

---

## 6. 任务拆分

### Phase 1: 基础架构 (Week 1)

#### Task 1.1: 数据库模型 (Day 1-2)
- [ ] 添加 Prisma schema 新模型
- [ ] 修改 Project 模型添加 relations
- [ ] 生成并执行数据库迁移
- [ ] 创建类型定义文件 `src/types/layout.ts`

#### Task 1.2: 页面管理 API (Day 2-3)
- [ ] `GET /api/project/[id]/pages` - 获取页面列表
- [ ] `POST /api/project/[id]/pages` - 创建页面
- [ ] `PATCH /api/project/[id]/pages/[pageId]` - 更新页面
- [ ] `DELETE /api/project/[id]/pages/[pageId]` - 删除页面
- [ ] `POST /api/project/[id]/pages/reorder` - 重排序
- [ ] `POST /api/project/[id]/pages/[pageId]/duplicate` - 复制页面
- [ ] 编写 API 测试用例

#### Task 1.3: 页面管理器组件 (Day 3-4)
- [ ] `PageManager` 主组件
- [ ] `PageThumbnail` 缩略图组件
- [ ] `PageList` 可拖拽列表 (使用 @dnd-kit)
- [ ] `AddPageButton` 新增页面按钮
- [ ] 集成 Zustand store

#### Task 1.4: Canvas 编辑器核心 (Day 4-5)
- [ ] `MangaCanvas` 类实现
- [ ] Panel 添加/删除/调整
- [ ] 历史记录 (撤销/重做)
- [ ] Canvas 序列化/反序列化
- [ ] `MangaCanvas` React 组件封装

### Phase 1.5: 模板系统 (Week 2 前半)

#### Task 1.5.1: 模板数据 (Day 6)
- [ ] 创建系统模板数据文件
- [ ] 3 个日漫模板
- [ ] 2 个条漫模板
- [ ] 1 个自由模板

#### Task 1.5.2: 模板 API (Day 6-7)
- [ ] `GET /api/templates/layout` - 获取模板列表
- [ ] `POST /api/project/[id]/pages/[pageId]/apply-template` - 应用模板

#### Task 1.5.3: 模板组件 (Day 7)
- [ ] `TemplateGallery` 模板画廊
- [ ] `TemplateCard` 模板卡片
- [ ] 模板应用交互

### Phase 1.6: 基础导出 (Week 2 后半)

#### Task 1.6.1: 导出引擎 (Day 8-9)
- [ ] `ExportEngine` 类实现
- [ ] PNG/JPG 导出
- [ ] 进度回调

#### Task 1.6.2: 导出 UI (Day 9-10)
- [ ] `ExportDialog` 导出对话框
- [ ] `ExportPresets` 快速场景
- [ ] `ExportProgress` 进度显示

### Phase 1.7: 页面集成 (Week 2 末)

#### Task 1.7.1: 排版编辑器页面 (Day 10)
- [ ] 创建 `/layout/[projectId]` 页面
- [ ] 集成所有组件
- [ ] 添加入口链接

---

## 7. 开发规范

### 7.1 文件命名

- 组件: `PascalCase.tsx`
- 工具函数: `kebab-case.ts`
- 类型定义: `types.ts` (放在模块目录下)
- 测试文件: `*.test.ts` / `*.test.tsx`

### 7.2 代码风格

```typescript
// 组件示例
export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // hooks
  const [state, setState] = useState();

  // handlers
  const handleClick = useCallback(() => {
    // ...
  }, []);

  // render
  return (
    <div className="...">
      {/* ... */}
    </div>
  );
}
```

### 7.3 API 规范

```typescript
// 使用 withAuth HOC
import { withAuth } from '@/lib/auth-helpers';

export const GET = withAuth(async (req, { params, userId }) => {
  // 业务逻辑
  return NextResponse.json({ data });
});
```

---

## 8. 测试策略

### 8.1 单元测试

- `MangaCanvas` 类方法测试
- `ExportEngine` 导出测试
- 工具函数测试

### 8.2 集成测试

- API 路由测试
- Canvas 组件渲染测试

### 8.3 E2E 测试 (可选)

- 完整排版流程测试
- 导出流程测试

---

## 9. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| Fabric.js 大图性能 | 中 | 高 | 虚拟化 + 分层渲染 |
| Canvas 序列化体积大 | 中 | 中 | 压缩 + 增量保存 |
| PDF 导出内存溢出 | 低 | 高 | 分页处理 + Worker |
| 气泡形状渲染不一致 | 低 | 低 | 预渲染 SVG + 缓存 |
