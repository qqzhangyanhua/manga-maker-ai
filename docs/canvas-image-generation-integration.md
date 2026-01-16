# 无限画布图像生成集成实施报告

## 📋 实施概述

本文档记录了无限画布(Infinite Canvas)功能的图像生成集成实施,将后端 AI 服务与前端统一图像生成系统完全整合。

**实施时间**: 2026-01-16  
**状态**: ✅ 已完成  
**涉及模块**: novel-backend (Python), Next.js API Routes, unified-image-generation, comic-panel-composer

---

## 🎯 核心设计决策

### 职责分离原则

```
┌─────────────────────────────────────────────────────────────┐
│                      架构分层设计                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  后端 (novel-backend/Python)                                 │
│  ├─ 剧本分析 (LLM)                                           │
│  ├─ 镜头规划 (LLM)                                           │
│  ├─ 提示词优化 (LLM)                                         │
│  └─ 对话框布局分析 (LLM)                                      │
│                                                             │
│  前端 (Next.js/TypeScript)                                   │
│  ├─ 图像生成调度 (unified-image-generation)                   │
│  ├─ 多提供商支持 (SD/ComfyUI/OpenAI)                          │
│  ├─ 任务队列管理                                              │
│  ├─ MinIO 上传存储                                           │
│  └─ 对话框绘制 (node-canvas)                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**优势**:
1. ✅ **复用现有系统**: 充分利用 `unified-image-generation` 成熟的队列管理和并发控制
2. ✅ **多提供商灵活性**: 自动根据配置切换 Stable Diffusion/ComfyUI/OpenAI
3. ✅ **统一积分消耗**: 无需在 Python 后端重复实现积分逻辑
4. ✅ **简化后端维护**: Python 后端专注 LLM 推理,不涉及图像生成 API 集成

---

## 🛠️ 代码修改详情

### Phase 1: 后端简化改造

#### 1.1 场景图生成服务 (`scene_composer.py`)

**修改前**:
```python
# 返回占位图片 URL
image_url = f"https://placehold.co/800x600/png?text=Scene_{shot.shot_id[:8]}"

return SceneImageOutput(
    shot_id=shot.shot_id,
    image_url=image_url,
    generation_prompt=enhanced_prompt,
    status="completed",
)
```

**修改后**:
```python
# 返回优化的提示词,图像生成由前端完成
enhanced_prompt = await self._enhance_prompt(shot, style)

return SceneImageOutput(
    shot_id=shot.shot_id,
    image_url="",  # 空URL,前端生成后填充
    generation_prompt=enhanced_prompt,
    status="pending",  # 待前端生成
)
```

**关键变化**:
- ❌ 删除占位图逻辑
- ✅ 保留 LLM 提示词优化
- ✅ 状态返回 `pending` (前端负责生成)

#### 1.2 漫画图生成服务 (`comic_generator.py`)

**扩展数据模型**:
```python
class ComicPanelOutput(BaseModel):
    scene_id: str
    shot_id: str
    image_url: str = ""  # 改为可选,默认空
    generation_prompt: str
    dialogue_layout: Optional[dict] = None  # 新增:对话框布局
    has_dialogue: bool = False
    status: str = "pending"  # 改为 pending
```

**关键功能**:
```python
# 1. 分析对话框位置和样式
dialogue_layout = await self._analyze_dialogue_layout(scene)

# 2. 返回布局信息给前端
return ComicPanelOutput(
    scene_id=scene.scene_id,
    shot_id=scene.shot_id,
    image_url="",  # 前端填充
    generation_prompt=generation_prompt,
    dialogue_layout=dialogue_layout,  # 传递给前端
    has_dialogue=bool(scene.dialogue),
    status="pending",
)
```

**对话框布局结构**:
```json
{
  "bubbles": [
    {
      "text": "你好!",
      "position": "top-right",
      "style": "speech"
    },
    {
      "text": "想什么呢...",
      "position": "bottom-left",
      "style": "thought"
    }
  ]
}
```

---

### Phase 2: 前端场景图生成集成

#### 2.1 修改 `generate-scenes` API

**文件**: `/src/app/api/canvas/chapter/[id]/generate-scenes/route.ts`

**核心流程**:

```typescript
// 1. 获取章节和镜头信息
const allShots = timelineChapter.script_segments.flatMap(s => s.shot_designs);

// 2. 调用 novel-backend 获取优化的提示词
const sceneResult = await client.generateScenes({
  shots: allShots.map(shot => ({
    shot_id: shot.id,
    camera_angle: shot.camera_angle,
    shot_size: shot.shot_size,
    shot_description: shot.shot_description,
    prompt: shot.prompt,
    character_ids: shot.character_ids,
  })),
  style: "manga",
});

// 3. 使用 unified-image-generation 批量生成图像
const imageGenerationTasks = [];
for (const scene of sceneResult.scenes) {
  const { taskId } = await generateImage(
    "scene",  // 图像类型
    scene.generation_prompt,  // 优化后的提示词
    payload.userId,
    {
      width: 800,
      height: 600,
      negativePrompt: "blurry, low quality, distorted, deformed, ugly",
      metadata: {
        shot_id: scene.shot_id,
        chapter_id: chapterId,
        type: "canvas_scene",
      },
    }
  );
  imageGenerationTasks.push({ shot_id: scene.shot_id, taskId, prompt: scene.generation_prompt });
}

// 4. 等待所有图像生成完成
for (const task of imageGenerationTasks) {
  const taskStatus = await waitForTaskCompletion(task.taskId, 60000);
  
  if (taskStatus.status === "completed" && taskStatus.imageUrl) {
    // 保存到数据库
    const sceneImage = await prisma.sceneImage.create({
      data: {
        shot_design_id: task.shot_id,
        image_url: taskStatus.imageUrl,  // MinIO URL
        generation_prompt: task.prompt,
        status: "completed",
      },
    });
    createdScenes.push(sceneImage);
  }
}
```

**技术亮点**:
- ✅ 批量提交任务,充分利用队列并发能力
- ✅ 实时追踪每个任务状态
- ✅ 自动上传 MinIO 并获取公网 URL
- ✅ 错误隔离:单个任务失败不影响其他任务

---

### Phase 3: 对话框添加工具

#### 3.1 创建 `comic-panel-composer.ts`

**文件**: `/src/lib/comic-panel-composer.ts`

**核心功能**:

```typescript
/**
 * 为场景图添加对话框
 */
export async function addSpeechBubbles(
  baseImageUrl: string,
  dialogueLayout: DialogueLayout
): Promise<Buffer> {
  // 1. 加载基础图片
  const baseImage = await loadImage(baseImageUrl);
  
  // 2. 创建 Canvas
  const canvas = createCanvas(baseImage.width, baseImage.height);
  const ctx = canvas.getContext('2d');
  
  // 3. 绘制基础图片
  ctx.drawImage(baseImage, 0, 0);
  
  // 4. 添加对话框
  for (const bubble of dialogueLayout.bubbles) {
    await drawSpeechBubble(ctx, bubble, baseImage.width, baseImage.height);
  }
  
  // 5. 返回 Buffer
  return canvas.toBuffer('image/png');
}
```

**对话框样式支持**:

| 样式 | 背景色 | 边框 | 说明 |
|------|--------|------|------|
| `speech` | 白色 | 黑色实线(3px) + 尾巴 | 正常对话 |
| `thought` | 白色 | 灰色虚线(2px) | 内心独白 |
| `shout` | 黄色 | 红色粗线(4px) | 大喊 |
| `whisper` | 浅灰 | 灰色细线(1px) | 低语 |

**位置支持**:
- `top-left`, `top-right`
- `bottom-left`, `bottom-right`
- `center`

**自动功能**:
- ✅ 自动换行(按宽度)
- ✅ 边界检测(防止超出画布)
- ✅ 圆角矩形绘制
- ✅ 对话框尾巴自动生成

---

### Phase 4: 前端漫画图生成集成

#### 4.1 修改 `generate-finals` API

**文件**: `/src/app/api/canvas/chapter/[id]/generate-finals/route.ts`

**核心流程**:

```typescript
// 1. 获取所有场景图
const allScenes = timelineChapter.script_segments.flatMap((s) =>
  s.shot_designs.flatMap((d) => d.scene_images)
);

// 2. 调用 novel-backend 获取对话框布局分析
const finalsResult = await client.generateFinals({
  scenes: sceneInputs,
  comic_style: "manga",
  add_speech_bubbles: true,
});

// 3. 为每个场景图添加对话框并上传
await ensureBucketExists();

for (const panel of finalsResult.panels) {
  const sceneImage = allScenes.find(s => s.id === panel.scene_id);
  
  let finalImageUrl: string;
  
  // 如果有对话框,添加对话框
  if (panel.dialogue_layout?.bubbles?.length > 0) {
    // 添加对话框
    const imageBuffer = await addSpeechBubbles(
      sceneImage.image_url,
      panel.dialogue_layout
    );
    
    // 上传到 MinIO
    const objectName = `users/${userId}/canvas/finals/${chapterId}/${panel.scene_id}_${timestamp}.png`;
    await minioClient.putObject(MINIO_BUCKET, objectName, imageBuffer, imageBuffer.length);
    
    finalImageUrl = getPublicUrl(objectName);
  } else {
    // 没有对话框,直接使用场景图
    finalImageUrl = sceneImage.image_url;
  }
  
  // 保存到数据库
  await prisma.comicPanelResult.create({
    data: {
      shot_design_id: panel.shot_id,
      scene_image_id: panel.scene_id,
      image_url: finalImageUrl,
      generation_prompt: panel.generation_prompt,
      status: "completed",
    },
  });
}
```

**流程图**:

```
场景图 (SceneImage)
    ↓
有对话框? ──No──→ 直接使用场景图
    ↓ Yes
下载场景图
    ↓
node-canvas 添加对话框
    ↓
上传到 MinIO
    ↓
保存最终漫画图 URL
```

---

## 🔄 完整数据流

```
用户点击 "生成漫画"
    ↓
[前端] TimelineContainer
    ↓
[API] POST /api/canvas/chapter/{id}/generate-scripts
    ↓
[novel-backend] POST /canvas/analyze-script (LLM分析)
    ↓ 返回 script_segments
[前端] 保存 ScriptSegment 到数据库
    ↓
[API] POST /api/canvas/chapter/{id}/generate-shots
    ↓
[novel-backend] POST /canvas/plan-shots (LLM规划)
    ↓ 返回 shot_designs
[前端] 保存 ShotDesign 到数据库
    ↓
[API] POST /api/canvas/chapter/{id}/generate-scenes ⭐ 新流程
    ↓
[novel-backend] POST /canvas/generate-scenes (LLM优化提示词)
    ↓ 返回优化的 prompts (status=pending)
[前端] unified-image-generation 批量生成图像
    ├─ 提交任务到队列
    ├─ 调用 callImageGenerationByType (SD/ComfyUI/OpenAI)
    ├─ 上传到 MinIO
    └─ 返回公网 URL
[前端] 保存 SceneImage 到数据库
    ↓
[API] POST /api/canvas/chapter/{id}/generate-finals ⭐ 新流程
    ↓
[novel-backend] POST /canvas/generate-finals (LLM对话框布局)
    ↓ 返回 dialogue_layout (status=pending)
[前端] comic-panel-composer 添加对话框
    ├─ 下载场景图
    ├─ node-canvas 绘制对话框
    ├─ 上传到 MinIO
    └─ 返回最终 URL
[前端] 保存 ComicPanelResult 到数据库
    ↓
[前端] 显示最终漫画图 ✅
```

---

## 📊 技术栈总结

| 层级 | 技术 | 职责 |
|------|------|------|
| **LLM 推理** | OpenAI GPT-4/3.5 | 剧本分析、镜头规划、提示词优化、对话框布局 |
| **图像生成** | Stable Diffusion / ComfyUI / OpenAI DALL-E | 场景图生成 (多提供商) |
| **图像处理** | node-canvas | 对话框绘制、文字渲染 |
| **任务队列** | unified-image-generation | 并发控制、状态追踪 |
| **对象存储** | MinIO | 图像上传、公网访问 |
| **数据库** | PostgreSQL (Prisma ORM) | 时间线、剧本、镜头、场景、漫画图 |
| **后端框架** | FastAPI (Python) + Next.js API Routes | AI 服务 + 业务逻辑 |

---

## ✅ 实施验证清单

### 后端验证

- [x] `scene_composer.py` 返回 `status="pending"`
- [x] `comic_generator.py` 返回 `dialogue_layout`
- [x] 删除所有占位图逻辑
- [x] LLM 提示词优化功能保留

### 前端验证

- [x] `generate-scenes` 集成 `unified-image-generation`
- [x] 批量任务提交和等待
- [x] MinIO 上传成功
- [x] 数据库保存 `SceneImage`

### 对话框工具验证

- [x] `comic-panel-composer.ts` 创建完成
- [x] `addSpeechBubbles` 函数实现
- [x] 4种对话框样式支持
- [x] 5种位置布局支持
- [x] 自动换行和边界检测

### 漫画图验证

- [x] `generate-finals` 集成 `comic-panel-composer`
- [x] 对话框添加成功
- [x] MinIO 上传最终图
- [x] 数据库保存 `ComicPanelResult`

---

## 🚀 下一步优化建议

### 短期 (1-2周)

1. **并发优化**
   - 场景图生成:改为真正的批量并发(当前是串行等待)
   - 使用 `Promise.allSettled()` 代替 `for...of`

2. **错误恢复**
   - 实现任务重试机制
   - 失败任务自动重新排队

3. **进度反馈**
   - 实现 Server-Sent Events (SSE)
   - 实时推送生成进度到前端

### 中期 (1个月)

4. **积分系统集成**
   - 在 `generateImage` 调用前检查积分余额
   - 生成完成后扣除积分

5. **缓存优化**
   - 相似提示词的场景图复用
   - 角色一致性缓存(ControlNet参考图)

6. **配置可定制**
   - 从 `CanvasTimelineConfig` 读取用户设置
   - 支持自定义镜头密度、视觉风格、AI 模型

### 长期 (2-3个月)

7. **高级对话框功能**
   - 支持多语言字体(中文/英文/日文)
   - 漫画音效字("轰!","哗啦!")
   - 速度线、爆炸效果等特效

8. **分布式任务队列**
   - 迁移到 Redis + Bull
   - 支持水平扩展

9. **AI 模型微调**
   - 训练漫画风格 LoRA
   - 优化对话框位置预测模型

---

## 📝 已知限制

1. **对话框字体**: 当前使用系统默认字体,中文支持依赖服务器环境
2. **对话框尺寸**: 固定宽度(40%画布宽度),未根据文字长度动态调整
3. **场景图生成**: 串行等待任务完成,未实现真正的批量并发
4. **积分消耗**: 当前未集成积分检查和扣除逻辑
5. **任务取消**: 不支持用户手动取消正在生成的任务

---

## 📚 相关文档

- [无限画布设计文档](./plans/2026-01-16-infinite-canvas-design.md)
- [novel-backend 集成计划](./plans/2026-01-16-novel-backend-integration.md)
- [统一图像生成文档](../src/lib/unified-image-generation.ts)
- [MinIO 配置指南](../src/lib/minio.ts)

---

## 👥 维护信息

**最后更新**: 2026-01-16  
**维护团队**: AI Code Assistant  
**技术栈版本**:
- Next.js: 14.x
- FastAPI: 0.x
- node-canvas: 2.x
- Prisma: 5.x

如有问题,请参考相关文档或联系技术支持。
