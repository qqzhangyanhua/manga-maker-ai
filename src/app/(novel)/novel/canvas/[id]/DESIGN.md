# Canvas Page 架构设计文档

> 文件路径: `src/app/(novel)/novel/canvas/[id]/page.tsx`
> 生成日期: 2026-01-24

---

## 1. 页面概述

无限画布（Infinite Canvas）是将小说转换为漫画的核心工作区，采用 ReactFlow 实现可缩放、可拖拽的画布交互。

### 1.1 核心功能

- 时间线管理：按章节组织漫画生成流程
- 四阶段生成：剧本分析 → 镜头规划 → 场景图 → 最终漫画
- 风格配置：全局默认漫画风格设置
- 图片管理：查看项目所有生成的图片

---

## 2. 接口清单

### 2.1 页面直接调用的接口

| 接口 | 方法 | 用途 | Hook |
|------|------|------|------|
| `/api/canvas/timeline/[id]` | GET | 获取时间线详情（支持分页窗口） | `useTimelineWindow` |
| `/api/canvas/timeline/[id]` | PATCH | 更新时间线配置（如默认风格） | `useUpdateTimelineStyle` |
| `/api/novel/[projectId]/images` | GET | 获取项目图片列表 | `useProjectImages` |
| `/api/canvas/styles` | GET | 获取漫画风格列表 | `useComicStyles` |

### 2.2 子组件调用的接口

#### InfiniteCanvasView 内部

| 接口 | 方法 | 用途 | 触发组件 |
|------|------|------|----------|
| `/api/canvas/chapter/[id]/generate-script` | POST | 生成剧本片段 | ChapterNode |
| `/api/canvas/chapter/[id]/generate-shots` | POST | 规划镜头设计 | ChapterNode |
| `/api/canvas/chapter/[id]/generate-scenes` | POST | 生成场景图 | GenerateSceneDialog |
| `/api/canvas/chapter/[id]/generate-finals` | POST | 生成最终漫画 | GenerateFinalDialog |
| `/api/canvas/shot-design/[id]/generate-image` | POST | 单镜头图像生成 | ShotNode |

---

## 3. 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         CanvasPage                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ useTimelineWindow(timelineId, center, range)                │ │
│  │   → GET /api/canvas/timeline/[id]?center=X&range=Y          │ │
│  │   ← timeline, windowState, chapterSummaries                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              InfiniteCanvasView                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │  │ ChapterNode │  │ ChapterNode │  │ ChapterNode │          │ │
│  │  │  (ch 1-5)   │  │  (ch 2-5)   │  │  (ch 3-5)   │          │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │
│  │         ↓                ↓                ↓                  │ │
│  │  [generate-script] [generate-shots] [generate-scenes]       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              StyleSelector / ImageGalleryDialog              │ │
│  │   → GET /api/canvas/styles                                   │ │
│  │   → GET /api/novel/[projectId]/images                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 核心类型定义

### 4.1 时间线配置 (`CanvasTimelineConfig`)

```typescript
interface CanvasTimelineConfig {
  auto_generate: boolean;           // 自动生成开关
  use_character_library: boolean;   // 使用角色库
  use_scene_library: boolean;       // 使用场景库
  default_comic_style_id?: string;  // 默认漫画风格 ID
  ai_model?: "gpt-4" | "gpt-3.5-turbo";  // AI 模型选择
  shot_density?: "sparse" | "medium" | "dense";  // 镜头密度
  visual_style?: "manga" | "realistic" | "anime";  // 视觉风格
  language?: "zh-CN" | "en-US";     // 语言设置
}
```

### 4.2 窗口状态 (`WindowState`)

```typescript
interface WindowState {
  center: number;   // 当前中心章节
  range: number;    // 窗口范围（前后各 N 章）
  start: number;    // 窗口起始章节号
  end: number;      // 窗口结束章节号
  total: number;    // 总章节数
  hasMore: {
    prev: boolean;  // 是否有更早的章节
    next: boolean;  // 是否有更晚的章节
  };
}
```

### 4.3 章节摘要 (`ChapterSummary`)

```typescript
interface ChapterSummary {
  id: string;
  chapter_number: number;
  script_status: GenerationStatus;  // pending | generating | completed | error
  shot_status: GenerationStatus;
  scene_status: GenerationStatus;
  final_status: GenerationStatus;
}
```

---

## 5. 生成流程与提示词

### 5.1 四阶段生成流程

```
小说章节文本
    ↓
[Stage 1: 剧本分析] POST /api/canvas/chapter/[id]/generate-script
    → novel-backend: POST /canvas/analyze-script
    → LLM: 将章节拆分为 3-8 个剧本片段
    ← ScriptSegment[]
    ↓
[Stage 2: 镜头规划] POST /api/canvas/chapter/[id]/generate-shots
    → novel-backend: POST /canvas/plan-shots
    → LLM: 为每个片段设计 2-5 个镜头
    ← ShotDesign[]
    ↓
[Stage 3: 场景图] POST /api/canvas/chapter/[id]/generate-scenes
    → novel-backend: POST /canvas/generate-scenes (提示词优化)
    → unified-image-generation (SD/ComfyUI/DALL-E)
    ← SceneImage[]
    ↓
[Stage 4: 最终漫画] POST /api/canvas/chapter/[id]/generate-finals
    → novel-backend: POST /canvas/generate-finals (对话框布局)
    → comic-panel-composer (添加对话框)
    ← ComicPanel[]
```

### 5.2 各阶段 LLM 提示词

#### Stage 1: 剧本分析 (script_analyzer.py)

**System Prompt:**
```
你是专业的漫画剧本编剧，擅长将小说文本转化为适合漫画表现的剧本片段。

任务：将给定的小说章节文本拆分为3-8个剧本片段，每个片段应该：
1. 包含一个完整的场景或动作序列
2. 适合用2-5个漫画分镜来表现
3. 有清晰的视觉描述

输出格式（JSON数组）：
[
  {
    "segment_order": 1,
    "content": "剧本文本概述",
    "scene_description": "场景描述（地点、时间、氛围）",
    "character_actions": "角色动作描述",
    "dialogue": "对白内容（如有）",
    "estimated_duration": 30,
    "emotion_tone": "紧张/温馨/激烈/悲伤/幽默"
  }
]

要求：
- 保持故事的连贯性
- 每个片段独立但相互关联
- 对白要精简，适合漫画气泡
- 动作描述要具体，便于绘制
```

**使用的字段：**
- 输入: `chapter_content`, `chapter_number`
- 输出: `segment_order`, `content`, `scene_description`, `character_actions`, `dialogue`, `estimated_duration`, `emotion_tone`

#### Stage 2: 镜头规划 (shot_planner.py)

**System Prompt:**
```
你是专业的漫画分镜师。

任务：为给定的剧本片段设计2-5个漫画镜头。

镜头参数说明：
- camera_angle: 俯视/仰视/平视/荷兰角
- shot_size: 特写/近景/中景/全景/远景
- panel_type: wide/medium/closeup/action/dialogue/transition
- location_key: 场景位置标识符，用于场景去重
  - 使用简洁的英文标识，格式：location_type
  - 例如：classroom, hallway, rooftop, street, cafe, bedroom
  - 同一场景的不同角度使用相同的 location_key
  - 不同地点必须使用不同的 location_key

输出格式（JSON数组）：
[
  {
    "shot_order": 1,
    "camera_angle": "平视",
    "shot_size": "中景",
    "panel_type": "dialogue",
    "shot_description": "镜头内容描述",
    "composition_hint": "构图建议",
    "location_key": "classroom",
    "prompt": "图像生成提示词（英文）",
    "negative_prompt": "负面提示词"
  }
]

要求：
- 镜头之间要有节奏变化
- 重要情节用特写强调
- 动作场景多用动态角度
- 提示词要具体、详细、英文
- location_key 必须填写，同一地点的镜头使用相同的 key
```

**使用的字段：**
- 输入: `script_content`, `scene_description`, `character_actions`, `available_characters[]`
- 输出: `shot_order`, `camera_angle`, `shot_size`, `panel_type`, `shot_description`, `composition_hint`, `location_key`, `prompt`, `negative_prompt`

#### Stage 3: 场景图提示词优化 (scene_composer.py)

**System Prompt:**
```
你是专业的图像生成提示词工程师。
根据镜头描述生成适合 AI 绘画的详细提示词。

要求：
1. 包含场景环境、光线、氛围、构图等元素
2. 使用英文逗号分隔的关键词格式
3. 突出镜头的视觉重点
4. 适合 Stable Diffusion / DALL-E 使用

重要：这是纯场景/背景图，必须不包含任何人物、角色或人形生物。
只描述环境、建筑、自然景观、室内装饰等场景元素。
人物将在后续步骤中单独合成。
```

**使用的字段：**
- 输入: `shot_id`, `camera_angle`, `shot_size`, `shot_description`, `prompt`, `character_ids[]`, `style`
- 输出: `shot_id`, `image_url`, `generation_prompt`, `status`

#### Stage 4: 对话框布局 (comic_generator.py)

**System Prompt:**
```
你是漫画排版专家，负责分析对话框的最佳位置。

根据角色和对话内容，建议对话框的位置和样式。

输出 JSON 格式：
{
  "bubbles": [
    {
      "text": "对话内容",
      "position": "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
      "style": "speech" | "thought" | "shout" | "whisper"
    }
  ]
}
```

**使用的字段：**
- 输入: `scene_id`, `shot_id`, `image_url`, `dialogue`, `character_names[]`, `character_reference_images[]`
- 输出: `scene_id`, `shot_id`, `image_url`, `generation_prompt`, `dialogue_layout`, `has_dialogue`, `status`

---

## 6. 图像生成参数

### 6.1 场景图生成

```typescript
generateImage("scene", generation_prompt, userId, {
  width: 800,
  height: 600,
  negativePrompt: "person, people, human, man, woman, boy, girl, character, figure, face, body, hands, legs, portrait, selfie, blurry, low quality, distorted, deformed, ugly",
  metadata: {
    location_key: string,
    shot_ids: string[],
    chapter_id: string,
    type: "canvas_scene",
    pure_scene: true,
  },
});
```

### 6.2 镜头图生成

```typescript
generateImage("panel", finalPrompt, userId, {
  width: 1024,
  height: 768,
  metadata: {
    shot_design_id: string,
    script_segment_id: string,
    chapter_id: string,
    type: "canvas_shot",
  },
  referenceImages: character_reference_urls[],  // 角色参考图
});
```

---

## 7. 风格系统

### 7.1 ComicStyle 结构

```typescript
interface ComicStyle {
  id: string;
  name_zh: string;         // 中文名称
  name_en: string;         // 英文名称
  prompt_prefix: string;   // 提示词前缀（如 "manga style, black and white"）
  tag_color: string;       // 标签颜色
  image_url?: string;      // 预览图
  is_active: boolean;
}
```

### 7.2 风格应用流程

1. 用户在 Header 选择默认风格 → `useUpdateTimelineStyle` → PATCH timeline config
2. 生成场景图时读取 `timeline.config.default_comic_style_id`
3. 从风格表获取 `prompt_prefix`
4. 将 `prompt_prefix` 拼接到镜头的 `prompt` 前面

---

## 8. 角色参考图集成

### 8.1 角色选择层级

1. **项目级别**: 从 Novel Project 绑定的角色库选择
2. **章节级别**: TimelineChapter 存储 `character_ids[]`
3. **镜头级别**: ShotDesign 存储 `character_ids[]`

### 8.2 参考图获取流程

```typescript
// generate-finals 中的参考图逻辑
const shotCharacterImages = shotDesign.character_ids
  .map(id => characterMap.get(id)?.reference_image_url)
  .filter(Boolean);

const chapterCharacterImages = timelineChapter.character_ids
  .map(id => characterMap.get(id)?.reference_image_url)
  .filter(Boolean);

// 合并去重
const allReferenceImages = Array.from(
  new Set([...shotCharacterImages, ...chapterCharacterImages])
);
```

---

## 9. 关键 Hooks 说明

### 9.1 useTimelineWindow

- **作用**: 管理时间线的分页窗口加载
- **API**: `GET /api/canvas/timeline/[id]?center=X&range=Y`
- **返回**: `{ timeline, windowState, chapterSummaries, navigateTo, refresh, ... }`
- **缓存策略**: staleTime 30秒

### 9.2 useTimelineConfig / useUpdateTimelineStyle

- **作用**: 获取和更新时间线配置
- **API**: `GET/PATCH /api/canvas/timeline/[id]`
- **缓存策略**: staleTime 1分钟
- **乐观更新**: 是

### 9.3 useComicStyles

- **作用**: 获取漫画风格列表
- **API**: `GET /api/canvas/styles`
- **缓存策略**: staleTime 5分钟

### 9.4 useProjectImages

- **作用**: 获取项目所有图片（无限滚动）
- **API**: `GET /api/novel/[projectId]/images?page=X&type=Y`
- **缓存策略**: staleTime 2分钟

---

## 10. 状态管理

### 10.1 Zustand Store (canvasStore)

```typescript
interface CanvasStore {
  // 场景生成弹窗状态
  sceneDialog: {
    open: boolean;
    chapterId: string | null;
    chapterTitle: string;
    chapterNumber: number;
  };
  openSceneDialog: (chapter: ChapterInfo) => void;
  closeSceneDialog: () => void;

  // 最终漫画生成弹窗状态
  finalDialog: {
    open: boolean;
    chapterId: string | null;
    chapterTitle: string;
    chapterNumber: number;
  };
  openFinalDialog: (chapter: ChapterInfo) => void;
  closeFinalDialog: () => void;
}
```

---

## 11. 错误处理

### 11.1 API 错误码

| 状态码 | 含义 | 处理方式 |
|--------|------|----------|
| 401 | 未登录/Token 无效 | 跳转登录 |
| 403 | 无权操作 | 显示权限提示 |
| 404 | 资源不存在 | 显示 ErrorState |
| 429 | 速率限制 | 显示重试提示 |
| 502 | novel-backend 服务错误 | 显示服务不可用 |

### 11.2 重试机制

- NovelBackendClient 实现 3 次重试
- 指数退避: 1s → 2s → 4s
- 可重试错误: 网络超时、5xx 错误

---

## 12. 性能优化

### 12.1 已实现

- 窗口分页加载（每次加载 5 章）
- React Query 缓存
- 场景图按 location_key 去重
- 镜头生成并行化

### 12.2 待优化

- ReactFlow 节点虚拟化
- 图片懒加载
- WebSocket 实时状态推送
