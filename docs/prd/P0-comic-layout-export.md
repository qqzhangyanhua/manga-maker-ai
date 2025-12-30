# PRD: 漫画排版与导出中心

> **版本**: v1.0
> **优先级**: P0
> **状态**: 待评审
> **产品经理**: AI Assistant
> **创建日期**: 2025-01-30

---

## 1. 背景与问题

### 1.1 当前痛点

用户完成分镜图像生成后，缺乏将零散 Panel 组合成完整漫画页面的能力：

| 痛点 | 描述 | 用户反馈 |
|------|------|----------|
| **排版困难** | 需要使用外部工具（PS/Canva）进行排版 | "生成完图片还要导出去排版，太麻烦了" |
| **气泡缺失** | 无法添加对话气泡、拟声词、特效文字 | "漫画没有对话框就不完整" |
| **导出单一** | 只能导出单张图片或简单合并 | "想要可以直接发布的成品" |
| **效率低下** | 每页都要手动调整 | "10页漫画排版要花2小时" |

### 1.2 竞品分析

| 产品 | 排版能力 | 气泡系统 | 模板库 | 导出格式 |
|------|----------|----------|--------|----------|
| **Canva** | 自由拖拽 + 模板 | 10+ 气泡类型 | 丰富 | PNG/PDF/印刷级 |
| **Clip Studio** | 专业排版 | 完整气泡工具 | 素材库 | PSD/PDF |
| **MediBang** | 基础排版 | 漫画气泡 | 有限 | PNG/PSD |
| **本产品(现状)** | 简单垂直排列 | 单一文本框 | 无 | PNG/PDF(单Panel) |

### 1.3 目标

打造"**一站式漫画排版与导出中心**"，让用户在平台内完成从分镜到成品的最后一步。

**核心目标指标**:
- 排版时间降低 **80%**（从平均 2 小时/10页 → 20 分钟）
- 导出后直接发布率提升至 **90%**（无需二次加工）
- 新增功能使用率 > **60%**（首月）

---

## 2. 功能设计

### 2.1 功能架构

```
┌─────────────────────────────────────────────────────────────┐
│                    漫画排版与导出中心                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  页面管理器  │  │  Canvas编辑 │  │     导出中心        │ │
│  │             │  │             │  │                     │ │
│  │ • 页面列表   │  │ • Panel排布 │  │ • 格式选择          │ │
│  │ • 页面模板   │  │ • 气泡系统  │  │ • 质量设置          │ │
│  │ • 批量操作   │  │ • 特效文字  │  │ • 批量导出          │ │
│  │ • 页面排序   │  │ • 漫画特效  │  │ • 发布预览          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                     素材库                              │ │
│  │  气泡模板 | 拟声词 | 网点纸 | 特效 | 装饰 | 边框        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心功能模块

#### 2.2.1 页面管理器 (Page Manager)

**功能描述**: 管理漫画的多个页面，支持页面级别的操作。

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 页面列表 | 左侧缩略图列表，显示所有页面 | P0 |
| 新增页面 | 支持空白页/从模板创建 | P0 |
| 页面排序 | 拖拽调整页面顺序 | P0 |
| 页面复制 | 复制现有页面作为新页面 | P1 |
| 页面删除 | 删除页面（带确认） | P0 |
| 批量选择 | 多选页面进行批量操作 | P1 |

**页面规格预设**:

```typescript
interface PagePreset {
  name: string;
  width: number;
  height: number;
  dpi: number;
  usage: string;
}

const PAGE_PRESETS: PagePreset[] = [
  { name: "手机竖屏", width: 1080, height: 1920, dpi: 72, usage: "微信/抖音" },
  { name: "手机长图", width: 1080, height: 2400, dpi: 72, usage: "微博/小红书" },
  { name: "Webtoon", width: 800, height: 1280, dpi: 72, usage: "条漫平台" },
  { name: "日漫单页", width: 1654, height: 2339, dpi: 300, usage: "B5印刷" },
  { name: "美漫单页", width: 2063, height: 3131, dpi: 300, usage: "美漫印刷" },
  { name: "同人本", width: 1748, height: 2480, dpi: 350, usage: "A5印刷" },
  { name: "自定义", width: 0, height: 0, dpi: 72, usage: "用户输入" }
];
```

#### 2.2.2 页面模板系统 (Page Templates)

**功能描述**: 预设的页面布局模板，一键套用。

**模板分类**:

```
模板库
├── 日漫风格
│   ├── 经典四格
│   ├── 斜切动感
│   ├── 大图+小图
│   └── 对话密集
├── 美漫风格
│   ├── 超宽全景
│   ├── 动作连续
│   └── 分格叙事
├── 条漫风格
│   ├── 单列滚动
│   ├── 双列对话
│   └── 图文混排
└── 自由布局
    └── 空白画布
```

**模板数据结构**:

```typescript
interface PageTemplate {
  id: string;
  name: string;
  category: "japanese" | "american" | "webtoon" | "free";
  thumbnail: string;
  panelSlots: PanelSlot[];  // Panel 插槽定义
  recommended: boolean;     // 是否推荐
}

interface PanelSlot {
  id: string;
  x: number;      // 相对位置 (0-100%)
  y: number;
  width: number;  // 相对尺寸 (0-100%)
  height: number;
  rotation?: number;
  clipPath?: string;  // 自定义形状裁切
}
```

**交互流程**:

```
用户选择模板 → 模板预览 → 确认应用 → Panel自动填充到插槽 → 可微调位置
```

#### 2.2.3 气泡系统 (Bubble System)

**功能描述**: 完整的漫画对话气泡工具。

**气泡类型库**:

| 类型 | 样式 | 使用场景 | 示意 |
|------|------|----------|------|
| 普通对话 | 圆角矩形 + 尾巴 | 日常对话 | 💬 |
| 内心独白 | 云朵形状 | 角色心理活动 | 💭 |
| 呐喊/惊讶 | 爆炸形状 | 激动情绪 | 💥 |
| 悄悄话 | 虚线边框 | 小声说话 | 🔇 |
| 电子/机械 | 锯齿边框 | 机器人/电话 | 🤖 |
| 旁白框 | 方形边框 | 场景描述 | 📜 |
| 回忆/梦境 | 渐变边缘 | 回忆场景 | 🌫️ |

**气泡数据结构**:

```typescript
interface BubbleStyle {
  id: string;
  name: string;
  type: "speech" | "thought" | "shout" | "whisper" | "narration" | "electronic";

  // 外观
  shape: "rounded" | "cloud" | "explosion" | "rectangle" | "custom";
  customPath?: string;           // SVG path for custom shapes

  // 边框
  borderWidth: number;
  borderColor: string;
  borderStyle: "solid" | "dashed" | "double";

  // 填充
  backgroundColor: string;
  backgroundOpacity: number;

  // 尾巴
  tailEnabled: boolean;
  tailStyle: "curved" | "straight" | "zigzag";
  tailPosition: "bottom" | "left" | "right" | "top";

  // 文字默认样式
  defaultTextStyle: TextStyle;
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  color: string;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  writingMode: "horizontal" | "vertical";  // 支持竖排文字
}
```

**气泡交互**:

1. **添加**: 点击工具栏气泡图标 → 选择类型 → 点击画布放置
2. **编辑**: 双击进入文字编辑 / 单击选中调整位置大小
3. **尾巴调整**: 拖拽尾巴控制点调整指向
4. **样式切换**: 右键菜单快速切换气泡类型
5. **批量应用**: 选中多个气泡统一调整样式

#### 2.2.4 拟声词/特效文字 (Sound Effects & Effect Text)

**功能描述**: 漫画中的拟声词和特效文字。

**预设拟声词库**:

```typescript
interface SoundEffect {
  id: string;
  text: string;
  category: "action" | "emotion" | "environment" | "custom";
  style: EffectTextStyle;
}

// 分类示例
const SOUND_EFFECTS = {
  action: [
    { text: "ドン", style: "impact" },      // 撞击
    { text: "バキッ", style: "crack" },     // 碎裂
    { text: "ズドーン", style: "explosion" }, // 爆炸
    { text: "シュッ", style: "swift" },     // 快速移动
  ],
  emotion: [
    { text: "ドキドキ", style: "heartbeat" }, // 心跳
    { text: "ガーン", style: "shock" },      // 震惊
    { text: "キラキラ", style: "sparkle" },  // 闪亮
  ],
  environment: [
    { text: "ザーザー", style: "rain" },     // 雨声
    { text: "ゴゴゴ", style: "rumble" },     // 隆隆声
  ]
};
```

**特效文字样式**:

| 效果名 | 描述 | CSS/Canvas 实现要点 |
|--------|------|---------------------|
| 冲击感 | 粗体+阴影+轻微旋转 | text-shadow + transform |
| 速度线 | 文字带动态模糊 | motion-blur filter |
| 震动 | 文字抖动效果 | 导出时生成多帧 |
| 渐变 | 彩虹/火焰渐变填充 | gradient fill |
| 描边 | 多层描边 | -webkit-text-stroke |
| 3D立体 | 透视变形 | perspective transform |

#### 2.2.5 漫画特效素材 (Manga Effects Library)

**功能描述**: 可叠加的视觉特效素材。

**素材分类**:

```
漫画特效库
├── 集中线
│   ├── 放射状集中线
│   ├── 速度线（水平/垂直）
│   └── 漩涡线
├── 网点纸
│   ├── 圆点渐变
│   ├── 斜线阴影
│   └── 交叉网纹
├── 情绪特效
│   ├── 愤怒青筋
│   ├── 尴尬汗滴
│   ├── 心形飘浮
│   └── 震惊裂纹
├── 环境特效
│   ├── 光晕/光芒
│   ├── 烟雾/灰尘
│   └── 火焰/闪电
└── 边框装饰
    ├── 花边
    ├── 撕裂效果
    └── 模糊边缘
```

**素材应用方式**:
- 拖拽到画布
- 调整大小/位置/透明度
- 设置图层顺序（在 Panel 上方/下方）
- 颜色调整（对于纯色素材）

#### 2.2.6 导出中心 (Export Center)

**功能描述**: 多格式、多场景的导出功能。

**导出格式与参数**:

```typescript
interface ExportConfig {
  // 格式
  format: "png" | "jpg" | "pdf" | "psd" | "zip";

  // 质量
  quality: number;           // 0-100 (for jpg)
  dpi: 72 | 150 | 300 | 350; // 分辨率

  // 范围
  pageRange: "all" | "current" | "custom";
  customPages?: number[];    // 自定义页码

  // PDF 特有
  pdfOptions?: {
    pagesPerSheet: 1 | 2;    // 单页/双页
    addBleed: boolean;       // 出血线
    bleedSize: number;       // 出血尺寸 (mm)
    cropMarks: boolean;      // 裁切标记
  };

  // 命名
  fileNamePattern: string;   // 如 "{project}_{page}"
}
```

**导出场景预设**:

| 场景 | 格式 | DPI | 特殊处理 |
|------|------|-----|----------|
| 社交媒体分享 | PNG | 72 | 压缩优化 |
| 条漫平台发布 | JPG 85% | 72 | 长图拼接 |
| 网页阅读 | WebP | 72 | 渐进式加载 |
| 本地收藏 | PNG | 150 | 无损 |
| 印刷输出 | PDF | 300-350 | 出血+裁切线 |
| 源文件备份 | ZIP | - | 含分层 PSD |

**批量导出流程**:

```
选择页面范围 → 选择导出场景/自定义参数 → 预览效果 → 开始导出 → 进度显示 → 下载/保存
```

---

## 3. 用户流程设计

### 3.1 主流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户操作流程                                    │
└─────────────────────────────────────────────────────────────────────────┘

[分镜编辑器] ──"开始排版"──> [排版中心入口]
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              [快速排版]       [模板排版]       [自由排版]
                    │               │               │
                    │    选择模板+自动填充    手动拖拽布局
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
                            [添加气泡/对话]
                                    │
                                    ▼
                            [添加特效/拟声词]
                                    │
                                    ▼
                              [预览检查]
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              [继续编辑]      [保存草稿]        [导出发布]
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                               [社交分享]      [平台发布]       [印刷导出]
```

### 3.2 快速排版流程 (新手友好)

针对希望快速完成的用户：

```
Step 1: 入口
┌────────────────────────────────────────┐
│  检测到 12 个已生成的分镜图            │
│                                        │
│  [快速排版] [选择模板] [自由排版]       │
│                                        │
│  ⚡ 快速排版：AI 自动选择最佳布局       │
└────────────────────────────────────────┘

Step 2: AI 自动布局
┌────────────────────────────────────────┐
│  正在分析分镜内容...                   │
│  ████████████░░░░░░ 60%               │
│                                        │
│  • 识别重要镜头 ✓                      │
│  • 分析对话密度 ✓                      │
│  • 生成布局方案...                     │
└────────────────────────────────────────┘

Step 3: 确认布局
┌────────────────────────────────────────┐
│  已生成 4 页漫画                       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐         │
│  │ P1 │ │ P2 │ │ P3 │ │ P4 │         │
│  └────┘ └────┘ └────┘ └────┘         │
│                                        │
│  [调整布局] [添加对话] [直接导出]       │
└────────────────────────────────────────┘
```

### 3.3 气泡添加流程

```
Step 1: 选择气泡类型
┌─────────────────────────────────────────────┐
│  气泡类型                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ 对话 │ │ 心声 │ │ 呐喊 │ │ 悄悄 │ │ 旁白 │  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
└─────────────────────────────────────────────┘

Step 2: 放置并编辑
┌─────────────────────────────────────────────┐
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │     ┌──────────────┐                 │  │
│  │     │ 在这里输入... │◀               │  │
│  │     └──────────────┘                 │  │
│  │         [角色A]                      │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [字体] [大小: 16] [颜色: ■] [竖排]         │
└─────────────────────────────────────────────┘

Step 3: 调整尾巴指向
┌─────────────────────────────────────────────┐
│  拖拽尾巴指向说话角色                        │
│                      ●←拖拽点               │
│     ┌──────────────┐/                       │
│     │ 你好！       │                        │
│     └──────────────┘                        │
└─────────────────────────────────────────────┘
```

---

## 4. 界面设计

### 4.1 排版编辑器布局

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← 返回项目    漫画排版    第 2/4 页    [保存] [预览] [导出]            │
├────────┬────────────────────────────────────────────────────────────────┤
│        │  工具栏                                                        │
│  页面  │  [选择] [移动] [缩放] | [气泡▼] [文字] [特效▼] | [撤销] [重做] │
│  列表  ├────────────────────────────────────────────────────────────────┤
│        │                                                                │
│ ┌────┐ │                    ┌──────────────────────┐                   │
│ │ 1  │ │                    │                      │                   │
│ └────┘ │                    │    Canvas 编辑区     │                   │
│ ┌────┐ │                    │                      │                   │
│ │ 2 ★│ │                    │   [Panel] [Panel]    │                   │
│ └────┘ │                    │                      │                   │
│ ┌────┐ │                    │      "对话..."       │                   │
│ │ 3  │ │                    │                      │                   │
│ └────┘ │                    │   [Panel] [Panel]    │                   │
│ ┌────┐ │                    │                      │                   │
│ │ 4  │ │                    └──────────────────────┘                   │
│ └────┘ │                                                                │
│        │                    [−] 50% [+]  [适应窗口]                     │
│ [+页面]├────────────────────────────────────────────────────────────────┤
│        │  属性面板                                                      │
│        │  ┌─────────────────────────────────────────────────────────┐  │
│        │  │ 选中: 气泡                                              │  │
│        │  │ 位置: X 120  Y 80   尺寸: W 200  H 60                   │  │
│        │  │ 样式: [对话▼]  字体: [思源黑体▼]  大小: [16]            │  │
│        │  └─────────────────────────────────────────────────────────┘  │
└────────┴────────────────────────────────────────────────────────────────┘
```

### 4.2 导出面板设计

```
┌─────────────────────────────────────────────────────────────────┐
│  导出设置                                               [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  导出范围                                                       │
│  ○ 全部页面 (4页)   ○ 当前页面   ○ 自定义: [1,2,4]             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  快速场景                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 📱       │ │ 📷       │ │ 🖨️       │ │ 📦       │          │
│  │ 社交分享 │ │ 条漫平台 │ │ 印刷输出 │ │ 源文件   │          │
│  │ PNG 72dpi│ │ JPG长图  │ │ PDF 300  │ │ ZIP+PSD  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  自定义设置 (可选)                                      [展开▼] │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 格式: [PNG▼]  质量: [██████████] 100%                   │   │
│  │ DPI:  [72▼]   出血: [×] 3mm                             │   │
│  │ 命名: [{项目名}_{页码}]                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  预览                                                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  4 个文件 | 预计大小: 12.4 MB | 格式: PNG                 │ │
│  │  comic_page_1.png (3.2MB)                                 │ │
│  │  comic_page_2.png (3.1MB)                                 │ │
│  │  comic_page_3.png (3.0MB)                                 │ │
│  │  comic_page_4.png (3.1MB)                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                               [取消]  [开始导出]                │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 气泡选择器设计

```
┌─────────────────────────────────────────────────────────────────┐
│  选择气泡样式                                           [×]    │
├─────────────────────────────────────────────────────────────────┤
│  常用                                                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ ╭─────╮ │ │ ☁️☁️☁️  │ │ 💥💥💥 │ │ ┌─────┐ │              │
│  │ │     │ │ │         │ │         │ │ │     │ │              │
│  │ ╰──◁──╯ │ │    ◁    │ │    ◁    │ │ └─────┘ │              │
│  │ 普通对话 │ │ 内心独白 │ │ 呐喊   │ │ 旁白框 │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                 │
│  更多样式                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ ╭┈┈┈┈┈╮ │ │ ⚡⚡⚡⚡ │ │ ≋≋≋≋≋ │ │ ░░░░░ │              │
│  │ ┊     ┊ │ │         │ │         │ │         │              │
│  │ ╰┈┈◁┈┈╯ │ │    ◁    │ │    ◁    │ │    ◁    │              │
│  │ 悄悄话 │ │ 电子音  │ │ 颤抖   │ │ 回忆   │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                 │
│  ────────────────────────────────────────────────              │
│  自定义样式: [管理我的气泡样式]                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 数据模型设计

### 5.1 新增数据表

```prisma
// 漫画页面
model ComicPage {
  id            String   @id @default(uuid())
  project_id    String
  page_order    Int      // 页面顺序

  // 页面规格
  width         Int
  height        Int
  dpi           Int      @default(72)

  // Canvas 数据
  canvas_data   Json     // Fabric.js 序列化数据
  thumbnail     String?  // 缩略图 URL

  // 模板
  template_id   String?
  template      PageTemplate? @relation(fields: [template_id], references: [id])

  // 时间
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  project       Project  @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@index([project_id, page_order])
}

// 页面模板
model PageTemplate {
  id            String   @id @default(uuid())
  name          String
  category      String   // japanese, american, webtoon, free

  // 模板定义
  width         Int
  height        Int
  panel_slots   Json     // PanelSlot[] 定义

  // 元数据
  thumbnail     String
  is_system     Boolean  @default(false)  // 系统预设 vs 用户创建
  user_id       String?  // 用户创建的模板
  use_count     Int      @default(0)      // 使用次数统计

  created_at    DateTime @default(now())

  pages         ComicPage[]
  user          User?    @relation(fields: [user_id], references: [id])

  @@index([category])
}

// 气泡样式
model BubbleStyle {
  id            String   @id @default(uuid())
  name          String
  type          String   // speech, thought, shout, whisper, narration

  // 样式定义 (JSON)
  style_config  Json     // BubbleStyleConfig

  // 元数据
  is_system     Boolean  @default(false)
  user_id       String?

  created_at    DateTime @default(now())

  user          User?    @relation(fields: [user_id], references: [id])
}

// 素材库
model EffectAsset {
  id            String   @id @default(uuid())
  name          String
  category      String   // speed_lines, screen_tone, emotion, environment, border

  // 素材内容
  asset_type    String   // svg, png, pattern
  asset_url     String
  thumbnail     String

  // 可调参数
  adjustable    Json?    // 可调整的参数定义

  // 元数据
  is_system     Boolean  @default(false)
  user_id       String?
  tags          String[]

  created_at    DateTime @default(now())

  user          User?    @relation(fields: [user_id], references: [id])

  @@index([category])
}

// 导出历史
model ExportHistory {
  id            String   @id @default(uuid())
  project_id    String
  user_id       String

  // 导出配置
  format        String   // png, jpg, pdf, zip
  config        Json     // ExportConfig

  // 导出结果
  file_url      String?
  file_size     Int?
  page_count    Int

  // 状态
  status        String   @default("pending") // pending, processing, completed, failed
  error_message String?

  created_at    DateTime @default(now())
  completed_at  DateTime?

  project       Project  @relation(fields: [project_id], references: [id])
  user          User     @relation(fields: [user_id], references: [id])

  @@index([project_id])
  @@index([user_id])
}
```

### 5.2 Canvas 数据结构

```typescript
// Fabric.js 对象扩展
interface MangaCanvasObject extends fabric.Object {
  mangaType?: "panel" | "bubble" | "text" | "effect" | "decoration";
  mangaData?: {
    panelId?: string;      // 关联的 Panel ID
    bubbleStyle?: string;  // 气泡样式 ID
    effectId?: string;     // 特效素材 ID
  };
}

// Canvas 序列化数据
interface CanvasData {
  version: string;
  objects: MangaCanvasObject[];
  background?: string;

  // 扩展元数据
  mangaMeta: {
    pageSize: { width: number; height: number; dpi: number };
    templateId?: string;
    panelMapping: Record<string, string>;  // slotId -> panelId
  };
}
```

---

## 6. API 设计

### 6.1 页面管理 API

```typescript
// 获取项目的所有页面
GET /api/project/[id]/pages
Response: { pages: ComicPage[] }

// 创建页面
POST /api/project/[id]/pages
Body: {
  templateId?: string;
  pageSize?: { width: number; height: number; dpi: number };
  insertAfter?: string; // 页面ID，插入到该页面之后
}
Response: { page: ComicPage }

// 更新页面
PATCH /api/project/[id]/pages/[pageId]
Body: {
  canvasData?: CanvasData;
  pageOrder?: number;
}
Response: { page: ComicPage }

// 删除页面
DELETE /api/project/[id]/pages/[pageId]
Response: { success: true }

// 重排序页面
POST /api/project/[id]/pages/reorder
Body: { pageIds: string[] }  // 新顺序
Response: { pages: ComicPage[] }

// 复制页面
POST /api/project/[id]/pages/[pageId]/duplicate
Response: { page: ComicPage }
```

### 6.2 模板 API

```typescript
// 获取模板列表
GET /api/templates/page
Query: { category?: string; }
Response: { templates: PageTemplate[] }

// 应用模板到页面
POST /api/project/[id]/pages/[pageId]/apply-template
Body: {
  templateId: string;
  panelMapping: Record<string, string>;  // slotId -> panelId
}
Response: { page: ComicPage }

// 从当前页面创建模板
POST /api/templates/page
Body: {
  name: string;
  category: string;
  fromPageId: string;
}
Response: { template: PageTemplate }
```

### 6.3 素材 API

```typescript
// 获取气泡样式
GET /api/assets/bubbles
Query: { type?: string }
Response: { bubbles: BubbleStyle[] }

// 获取特效素材
GET /api/assets/effects
Query: { category?: string }
Response: { effects: EffectAsset[] }

// 上传自定义素材
POST /api/assets/upload
Body: FormData { file, category, name }
Response: { asset: EffectAsset }
```

### 6.4 导出 API

```typescript
// 创建导出任务
POST /api/project/[id]/export
Body: ExportConfig
Response: {
  exportId: string;
  status: "processing";
}

// 查询导出状态
GET /api/export/[exportId]/status
Response: {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;  // 0-100
  fileUrl?: string;
  error?: string;
}

// 获取导出历史
GET /api/project/[id]/exports
Response: { exports: ExportHistory[] }
```

---

## 7. 技术实现要点

### 7.1 Canvas 编辑器增强

```typescript
// 基于现有 CanvasWorkspace 扩展
class MangaCanvasWorkspace extends CanvasWorkspace {

  // 气泡系统
  addBubble(style: BubbleStyle, position: Point): fabric.Group {
    const bubble = this.createBubbleShape(style);
    const text = new fabric.Textbox("", style.defaultTextStyle);
    const tail = this.createBubbleTail(style);

    const group = new fabric.Group([bubble, text, tail], {
      left: position.x,
      top: position.y,
      mangaType: "bubble",
      mangaData: { bubbleStyle: style.id }
    });

    this.canvas.add(group);
    return group;
  }

  // 尾巴交互控制
  enableTailDrag(bubbleGroup: fabric.Group) {
    const tail = bubbleGroup.item(2);
    tail.on("moving", (e) => {
      this.updateTailPath(bubbleGroup, e.pointer);
    });
  }

  // 特效叠加
  addEffect(effect: EffectAsset, position: Point, size: Size) {
    // SVG / Pattern 渲染
  }

  // 模板应用
  applyTemplate(template: PageTemplate, panels: Panel[]) {
    this.clear();

    template.panelSlots.forEach((slot, index) => {
      if (panels[index]) {
        this.addPanelToSlot(panels[index], slot);
      }
    });
  }
}
```

### 7.2 导出引擎

```typescript
class ExportEngine {

  async exportPage(
    canvas: fabric.Canvas,
    config: ExportConfig
  ): Promise<Blob> {

    // 根据 DPI 计算实际尺寸
    const scale = config.dpi / 72;

    // 添加出血区域（印刷）
    if (config.pdfOptions?.addBleed) {
      this.addBleedArea(canvas, config.pdfOptions.bleedSize);
    }

    // 导出
    switch (config.format) {
      case "png":
        return this.exportPNG(canvas, scale, config.quality);
      case "jpg":
        return this.exportJPG(canvas, scale, config.quality);
      case "pdf":
        return this.exportPDF(canvas, config.pdfOptions);
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  async exportProject(
    pages: ComicPage[],
    config: ExportConfig
  ): Promise<Blob> {
    // 批量导出 + 进度回调
    const blobs: Blob[] = [];

    for (let i = 0; i < pages.length; i++) {
      const canvas = await this.loadCanvas(pages[i].canvas_data);
      const blob = await this.exportPage(canvas, config);
      blobs.push(blob);

      this.onProgress?.((i + 1) / pages.length * 100);
    }

    // 打包
    if (config.format === "zip" || pages.length > 1) {
      return this.packageAsZip(blobs, config.fileNamePattern);
    }

    return blobs[0];
  }
}
```

### 7.3 AI 智能排版

```typescript
interface AutoLayoutService {

  // 分析 Panel 内容，推荐布局
  async analyzeAndLayout(panels: Panel[]): Promise<LayoutSuggestion[]> {

    // 1. 分析每个 Panel 的重要性
    const importance = panels.map(p => ({
      panelId: p.id,
      importance: p.importance, // 数据库字段
      hasDialogue: p.dialogue_count > 0,
      shotSize: p.shot_size,
    }));

    // 2. 按重要性分组到页面
    const pages = this.groupIntoPages(importance);

    // 3. 为每页选择最佳模板
    const suggestions = pages.map(page => ({
      panels: page,
      recommendedTemplate: this.selectTemplate(page),
      alternativeTemplates: this.getAlternatives(page),
    }));

    return suggestions;
  }

  // 根据 Panel 特征选择模板
  selectTemplate(panels: PanelInfo[]): PageTemplate {
    // 规则：
    // - 有大图(importance=5) → 选择"大图+小图"模板
    // - 对话密集 → 选择留白多的模板
    // - 动作连续 → 选择速度感模板
  }
}
```

---

## 8. 上线计划

### Phase 1: 基础排版能力 (4周)

| 周次 | 交付物 |
|------|--------|
| W1 | 页面管理器 + 数据模型 + API |
| W2 | 基础 Canvas 编辑器 (Panel 排布) |
| W3 | 3 个基础页面模板 + 模板应用 |
| W4 | PNG/JPG 导出 + 集成测试 |

**里程碑**: 用户可以将 Panel 排布到页面并导出

### Phase 2: 气泡与文字 (3周)

| 周次 | 交付物 |
|------|--------|
| W5 | 气泡系统 (5种基础气泡) |
| W6 | 文字编辑 + 竖排支持 |
| W7 | 尾巴交互 + 样式调整 |

**里程碑**: 用户可以添加完整的对话气泡

### Phase 3: 特效与高级导出 (3周)

| 周次 | 交付物 |
|------|--------|
| W8 | 拟声词库 + 特效素材 (10+) |
| W9 | PDF 导出 + 印刷设置 |
| W10 | 批量导出 + 导出历史 |

**里程碑**: 完整的排版导出能力

### Phase 4: 智能与优化 (2周)

| 周次 | 交付物 |
|------|--------|
| W11 | AI 自动排版建议 |
| W12 | 性能优化 + 用户反馈迭代 |

---

## 9. 成功指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| 排版时间 | 降低 80% | 用户调研 |
| 功能使用率 | > 60% | 埋点统计 |
| 导出成功率 | > 95% | 后端日志 |
| 用户满意度 | > 4.2/5 | 功能评分 |
| 直接发布率 | > 90% | 用户调研 |

---

## 10. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| Canvas 性能问题 | 大图编辑卡顿 | 分层渲染 + 虚拟化 |
| 字体版权 | 法律风险 | 仅使用开源字体 |
| 导出文件过大 | 下载慢 | 渐进式压缩 + CDN |
| 模板不够用 | 用户选择少 | 持续扩充 + 支持用户创建 |

---

## 附录

### A. 竞品功能对比详表

(略，可单独整理)

### B. 用户调研原始数据

(待补充)

### C. 技术选型评估

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| Fabric.js | 现有基础，功能丰富 | 大图性能一般 | ✅ 采用 |
| Konva.js | 性能好 | 需重写 | ❌ 不采用 |
| PixiJS | 渲染快 | 过于底层 | ❌ 不采用 |
