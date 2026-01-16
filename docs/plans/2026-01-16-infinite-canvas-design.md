# 无限画布设计文档

> 日期: 2026-01-16
> 状态: 已确认，待实施

## 1. 概述

### 1.1 功能定位

无限画布是一个**自动化生产线**，将小说章节转化为漫画图片。它是现有系统的"上游"，负责快速生成，而现有的 Storyboard Editor 负责"下游"的精细编辑。

### 1.2 核心流程

```
小说章节（Novel Chapter）
    ↓ [AI 剧本分析]
剧本片段（Script Segments）
    ↓ [AI 镜头拆分]
镜头设计（Shot Designs）
    ↓ [调用 Character + Scene 资产]
场景图生成（Scene Images）
    ↓ [垫图生成最终图]
漫画图片（Comic Panels）
    ↓ [可选：导出到 Panel 系统]
分镜编辑器（Storyboard Editor）
```

### 1.3 设计决策

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 画布形式 | 时间线式画布 | 横向滚动，类似视频剪辑软件 |
| 数据粒度 | 以章节为单位 | 每行代表一个章节 |
| 生成流程 | 混合模式 | 自动生成但每个节点可编辑 |
| 系统集成 | 生产线+资产库 | 复用现有 Character/Scene 系统 |

---

## 2. 数据模型

### 2.1 canvas_timeline（时间线项目）

```typescript
{
  id: UUID;
  novel_project_id: UUID;  // 关联现有的 novel_projects
  user_id: UUID;
  title: string;           // 时间线项目名称
  status: "draft" | "generating" | "completed" | "error";

  // 配置
  config: {
    auto_generate: boolean;        // 是否自动生成到底
    use_character_library: boolean; // 是否使用角色库
    use_scene_library: boolean;     // 是否使用场景库
    default_comic_style_id?: UUID;  // 默认漫画风格
  };

  // 统计
  total_chapters: number;
  completed_chapters: number;
  total_shots: number;
  total_images: number;

  created_at: DateTime;
  updated_at: DateTime;
}
```

### 2.2 timeline_chapter（章节节点）

```typescript
{
  id: UUID;
  timeline_id: UUID;
  chapter_id: UUID;        // 关联 novel_chapters
  chapter_number: number;

  // 生成状态（每个阶段独立追踪）
  script_status: "pending" | "generating" | "completed" | "error";
  shot_status: "pending" | "generating" | "completed" | "error";
  scene_status: "pending" | "generating" | "completed" | "error";
  final_status: "pending" | "generating" | "completed" | "error";

  // 统计
  script_segment_count: number;
  shot_count: number;
  scene_image_count: number;
  final_image_count: number;

  created_at: DateTime;
  updated_at: DateTime;
}
```

### 2.3 script_segment（剧本片段）

```typescript
{
  id: UUID;
  timeline_chapter_id: UUID;
  segment_order: number;    // 在章节中的顺序（1, 2, 3...）

  // 剧本内容
  content: string;          // AI 分析的剧本文本
  scene_description: string; // 场景描述
  character_actions: string; // 角色动作
  dialogue?: string;         // 对白（可选）

  // 元数据
  estimated_duration: number; // 预估时长（秒）
  emotion_tone: string;       // 情感基调

  // 原始小说文本关联
  source_text_start: number;  // 在章节文本中的起始位置
  source_text_end: number;    // 结束位置

  created_at: DateTime;
}
```

### 2.4 shot_design（镜头设计）

```typescript
{
  id: UUID;
  script_segment_id: UUID;
  shot_order: number;

  // 镜头参数
  camera_angle: string;      // "俯视" | "仰视" | "平视" | "荷兰角"
  shot_size: string;         // "特写" | "近景" | "中景" | "全景" | "远景"
  panel_type: string;        // "wide" | "medium" | "closeup" | "action" | "dialogue"

  // 内容描述
  shot_description: string;
  composition_hint: string;

  // 资产绑定
  character_ids: UUID[];
  scene_id?: UUID;
  expression_types: string[];
  outfit_ids: UUID[];

  // 生成提示词
  prompt: string;
  negative_prompt?: string;

  created_at: DateTime;
}
```

### 2.5 scene_image（场景基础图）

```typescript
{
  id: UUID;
  shot_design_id: UUID;

  // 图像信息
  image_url: string;
  width: number;
  height: number;

  // 生成参数
  generation_prompt: string;
  scene_id?: UUID;

  // AI 生成元数据
  model_used: string;
  seed?: number;
  generation_params: JSON;

  status: "generating" | "completed" | "failed";
  error_message?: string;

  created_at: DateTime;
}
```

### 2.6 comic_panel_result（最终漫画图）

```typescript
{
  id: UUID;
  shot_design_id: UUID;
  scene_image_id: UUID;

  // 最终图像
  image_url: string;
  width: number;
  height: number;

  // 生成参数
  generation_prompt: string;
  character_reference_images: string[];

  // 垫图参数
  controlnet_type: string;
  controlnet_weight: number;

  // AI 生成元数据
  model_used: string;
  lora_models?: string[];
  generation_params: JSON;

  status: "generating" | "completed" | "failed";
  error_message?: string;
  exported_to_panel_id?: UUID;

  created_at: DateTime;
}
```

---

## 3. API 设计

### 3.1 时间线管理

```typescript
POST /api/canvas/timeline              // 创建时间线
GET /api/canvas/timeline/[id]          // 获取时间线详情
PATCH /api/canvas/timeline/[id]        // 更新配置
DELETE /api/canvas/timeline/[id]       // 删除时间线
GET /api/canvas/timeline/[id]/chapters // 获取所有章节节点
```

### 3.2 生成流程

```typescript
// 全自动生成
POST /api/canvas/timeline/[id]/generate-all

// 分阶段生成
POST /api/canvas/chapter/[id]/generate-script
POST /api/canvas/chapter/[id]/generate-shots
POST /api/canvas/chapter/[id]/generate-scenes
POST /api/canvas/chapter/[id]/generate-finals

// 从某个节点重新生成
POST /api/canvas/chapter/[id]/regenerate-from
```

### 3.3 编辑操作

```typescript
// 剧本编辑
PATCH /api/canvas/script-segment/[id]
DELETE /api/canvas/script-segment/[id]

// 镜头编辑
PATCH /api/canvas/shot-design/[id]
POST /api/canvas/shot-design/[id]/bind-character
POST /api/canvas/shot-design/[id]/bind-scene

// 图像操作
POST /api/canvas/scene-image/[id]/regenerate
POST /api/canvas/comic-panel/[id]/regenerate
POST /api/canvas/comic-panel/[id]/export-to-panel
```

---

## 4. 前端组件架构

### 4.1 页面路由

```
/novel/canvas/[timelineId]
```

### 4.2 组件结构

```
<InfiniteCanvasPage>
  <CanvasHeader />
  <TimelineContainer>
    <ChapterRow>
      <ChapterNode />
      <ScriptNode />
      <ShotNode />
      <SceneImageNode />
      <FinalImageNode />
    </ChapterRow>
  </TimelineContainer>
  <EditPanel />
</InfiniteCanvasPage>
```

---

## 5. AI 生成服务

### 5.1 服务文件结构

```
services/novel-backend/app/services/
├── script_analyzer.py
├── shot_planner.py
├── scene_composer.py
└── comic_generator.py
```

### 5.2 服务职责

| 服务 | 职责 |
|------|------|
| script_analyzer | 章节文本 → 剧本片段 |
| shot_planner | 剧本片段 → 镜头设计 |
| scene_composer | 镜头设计 → 场景图 |
| comic_generator | 场景图+角色 → 最终图 |

---

## 6. 实施计划

### Phase 1: 数据库
- 创建 6 个新表的 Prisma Schema
- 运行迁移

### Phase 2: 后端 API
- 创建 Next.js API 路由
- 实现 CRUD 操作

### Phase 3: 生成服务
- 实现 4 个 Python 服务
- 集成到 novel-backend

### Phase 4: 前端
- 创建时间线画布组件
- 实现节点交互

### Phase 5: 集成测试
- 端到端测试
- 性能优化
