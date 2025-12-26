# 章节关联与连载漫画模式分析

## 🔍 当前系统的章节管理机制

### 1. 章节生成方式：**一次性批量生成**

```typescript
// src/lib/chapter-generator.ts
export async function generateChapters(params: ChapterGenerationParams) {
  // 输入：完整的故事大纲
  const { storyTitle, premise, genre, outline, chapterCount } = params;

  // 输出：一次性生成所有章节
  return chapters; // 例如：5-15章全部生成
}
```

**特点：**
- ✅ 一次性规划整个故事结构
- ✅ 章节之间有全局的因果关系（Prompt 要求："章节之间要有清晰的因果关系和递进感"）
- ❌ **无法追加新章节**（没有 "append" 或 "add chapter" 功能）
- ❌ **无法像网文一样边写边发布**

**Prompt 设计（第 48-62 行）：**
```
规则：
3. 章节之间要有清晰的因果关系和递进感
6. 确保故事节奏：前1/4建立，中间1/2对抗升级，最后1/4高潮解决
```

**结论：** 这是**"传统电影/小说"式的创作**，需要提前规划整个故事。

---

### 2. 分镜生成时的上下文加载：**有连贯性机制**

```typescript
// src/lib/chapter-context-loader.ts
export async function loadChapterContext(chapterId: string) {
  return {
    currentChapter,      // 当前章节
    story,               // 故事背景
    firstChapter,        // 第一章（世界观建立）
    recentChapters,      // 最近10章（详细）
    keyChapters,         // 关键章节（转折点）
    characterStates,     // 角色当前状态
  };
}
```

**特点：**
- ✅ **智能上下文加载** - 分镜生成时会参考前面章节
- ✅ **角色状态延续** - ChapterCharacterState 追踪角色变化
- ✅ **关键章节标记** - is_key_chapter 识别重要情节
- ✅ **滑动窗口机制** - 最近10章 + 第一章 + 关键章节

**上下文格式（src/lib/panel-generator.ts:292-297）：**
```
【故事背景】
标题：镜中嫌疑人
类型：悬疑
大纲：...

【开篇章节】
第一章：...

【关键章节回顾】
第3章：重要线索发现 (剧情转折)

【最近章节回顾】
第4章：追捕失败
第5章：...

【角色当前状态】
主角李明：
  位置：废弃工厂地下室
  身体状况：右臂骨折，失血约500ml
  心理状态：恐惧但坚定

【当前章节】
第6章：绝地反击
```

**结论：** 分镜生成时**有很强的连贯性**，但前提是章节已经全部创建好。

---

## ❌ 当前系统缺少的"连载模式"功能

### 对比：网文连载 vs 当前系统

| 功能 | 网文连载（如起点） | 当前系统 | 状态 |
|------|-------------------|---------|------|
| 逐章创作 | ✅ 每次写一章 | ❌ 一次性生成所有章节 | 缺失 |
| 发布状态 | ✅ 草稿/已发布 | ❌ 无状态管理 | 缺失 |
| 追加章节 | ✅ 持续追加 | ❌ 无追加API | 缺失 |
| 上下文延续 | ✅ 参考前文 | ✅ 智能上下文加载 | **已有** |
| 编辑历史章节 | ✅ 可修改 | ✅ 可修改 | 已有 |
| 读者互动 | ✅ 评论/投票 | ❌ 无互动 | 缺失 |

---

## ✅ 连载漫画模式需要的改进

### 方案：增加"连载模式"支持

#### 1. 数据模型扩展

```prisma
model Chapter {
  id            String   @id
  story_id      String
  title         String
  summary       String?
  chapter_order Int
  content       String?

  // ✅ 新增：连载相关字段
  status        String   @default("draft") // draft, published, archived
  published_at  DateTime? // 发布时间
  is_serialized Boolean  @default(false) // 是否为连载章节

  // 已有字段
  is_key_chapter     Boolean  @default(false)
  key_chapter_reason String?
  created_at    DateTime @default(now())
  updated_at    DateTime @default(now())

  story             Story @relation(...)
  panels            Panel[]
  character_states  ChapterCharacterState[]
}

model Story {
  id       String   @id
  title    String
  premise  String
  outline  Json

  // ✅ 新增：连载模式标识
  is_serialized Boolean  @default(false) // 是否为连载作品
  serial_status String?  @default("ongoing") // ongoing, completed, hiatus

  chapters Chapter[]
}
```

#### 2. API 扩展

**创建单章节 API：**
```typescript
// POST /api/chapter/create
export async function POST(request: Request) {
  const { story_id, title, summary, content } = await request.json();

  // 获取当前最大章节号
  const lastChapter = await prisma.chapter.findFirst({
    where: { story_id },
    orderBy: { chapter_order: "desc" },
  });

  const nextOrder = (lastChapter?.chapter_order || 0) + 1;

  // 创建新章节
  const chapter = await prisma.chapter.create({
    data: {
      story_id,
      title,
      summary,
      content,
      chapter_order: nextOrder,
      status: "draft", // 默认草稿
    },
  });

  return NextResponse.json({ chapter });
}
```

**AI 辅助生成下一章：**
```typescript
// POST /api/chapter/generate-next
export async function POST(request: Request) {
  const { story_id, prompt_hint } = await request.json();

  // 1. 加载已发布的所有章节
  const publishedChapters = await prisma.chapter.findMany({
    where: {
      story_id,
      status: "published",
    },
    orderBy: { chapter_order: "asc" },
  });

  // 2. 加载角色当前状态（最新章节的状态）
  const latestChapter = publishedChapters[publishedChapters.length - 1];
  const characterStates = await prisma.chapterCharacterState.findMany({
    where: { chapter_id: latestChapter.id },
    include: { character: true },
  });

  // 3. 调用 LLM 生成下一章
  const nextChapter = await callLLM({
    systemPrompt: `你是一位连载漫画作家，擅长根据前文情节创作下一章。

任务：根据已发布的章节，创作下一章的大纲。

要求：
1. 延续之前的剧情和角色状态
2. 保持故事节奏和吸引力
3. 设置悬念/伏笔为下一章铺垫
4. 尊重角色当前的状态（不能突然改变）

输出格式：
{
  "title": "第N章：标题",
  "summary": "详细梗概（200-300字）",
  "key_events": ["事件1", "事件2"],
  "cliffhanger": "本章结尾的悬念"
}`,
    userPrompt: `
已发布章节：
${publishedChapters.map((ch) => `${ch.title}\n${ch.summary}`).join("\n\n")}

角色当前状态：
${characterStates.map((s) => `${s.character.name}：${s.location}，${s.physical_condition}，${s.mental_state}`).join("\n")}

作者提示：${prompt_hint || "自然发展剧情"}

请创作下一章。`,
  });

  return NextResponse.json({ nextChapter });
}
```

**发布章节 API：**
```typescript
// POST /api/chapter/[id]/publish
export async function POST(request: Request, { params }) {
  const { id } = params;

  // 1. 检查章节顺序（不能跳章发布）
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: { story: true },
  });

  const publishedCount = await prisma.chapter.count({
    where: {
      story_id: chapter.story_id,
      status: "published",
    },
  });

  if (chapter.chapter_order !== publishedCount + 1) {
    return NextResponse.json(
      { error: "不能跳章发布，请按顺序发布" },
      { status: 400 }
    );
  }

  // 2. 发布章节
  const updatedChapter = await prisma.chapter.update({
    where: { id },
    data: {
      status: "published",
      published_at: new Date(),
    },
  });

  // 3. 自动提取角色状态（为下一章准备）
  await extractCharacterStates(id);

  return NextResponse.json({ chapter: updatedChapter });
}
```

#### 3. 前端 UI 改进

**创作流程：**
```
连载模式 UI：
┌─────────────────────────────────────┐
│ 我的连载作品：《镜中嫌疑人》        │
├─────────────────────────────────────┤
│ 第1章：镜中的通缉犯 [已发布] 📗    │
│ 第2章：隧道里的警徽 [已发布] 📗    │
│ 第3章：码头录音 [已发布] 📗        │
│ 第4章：前妻的针筒 [草稿] 📝        │
│ ┌──────────────────────────────┐    │
│ │ [+ 创作下一章]               │    │
│ │ [AI 辅助续写]                │    │
│ └──────────────────────────────┘    │
└─────────────────────────────────────┘

创作下一章对话框：
┌─────────────────────────────────────┐
│ 创作第5章                           │
├─────────────────────────────────────┤
│ 📝 章节标题：                       │
│ [第五章：黑帮账簿]                  │
│                                     │
│ 📖 剧情提示（可选）：               │
│ [主角发现关键线索...]              │
│                                     │
│ 🤖 AI 建议：                        │
│ "根据前3章的伏笔，建议在本章：      │
│  - 揭示主角前妻与黑帮的关系         │
│  - 主角潜入黑帮据点寻找证据         │
│  - 设置悬念：发现更大的阴谋"        │
│                                     │
│ [使用 AI 建议] [自己创作]          │
└─────────────────────────────────────┘
```

**对比传统模式：**
```
传统模式（一次性创作）：
1. 输入故事大纲 → 2. 生成所有章节 → 3. 生成分镜

连载模式（逐章创作）：
1. 创建连载作品 → 2. 写第1章 → 3. 发布 → 4. 写第2章 → 5. 发布 → ...
```

---

## 🎯 两种模式对比

### 传统模式（当前系统）

**适用场景：**
- ✅ 短篇故事（5-15章）
- ✅ 提前规划好完整剧情
- ✅ 一次性创作完成
- ✅ 类似电影/动画的制作流程

**优势：**
- ✅ 全局把控剧情节奏
- ✅ 结构完整，不会烂尾
- ✅ 章节之间衔接紧密

**劣势：**
- ❌ 无法边创作边获取反馈
- ❌ 创作压力大（需要一次性构思整个故事）
- ❌ 不适合长篇（50+章）

---

### 连载模式（建议增加）

**适用场景：**
- ✅ 长篇故事（20+章）
- ✅ 边创作边发布
- ✅ 根据读者反馈调整剧情
- ✅ 类似网文/周刊漫画的创作流程

**优势：**
- ✅ 降低创作门槛（每次只需创作一章）
- ✅ 持续输出，保持活跃度
- ✅ AI 可以根据前文智能续写
- ✅ 适合长篇创作

**劣势：**
- ⚠️ 可能出现剧情不连贯（如果不追踪角色状态）
- ⚠️ 容易烂尾（缺少全局规划）

---

## 💡 推荐实施方案

### 阶段 1：最小化实现（1-2天）

**核心功能：**
1. ✅ 添加章节状态字段（status, published_at）
2. ✅ 创建单章节 API（POST /api/chapter/create）
3. ✅ 发布/取消发布 API
4. ✅ 前端增加"创作下一章"按钮

**不改动现有功能：**
- 保留一次性批量生成章节的功能
- 两种模式共存

**实现代码：**
```sql
-- 数据库迁移
ALTER TABLE chapters ADD COLUMN status VARCHAR(20) DEFAULT 'published';
ALTER TABLE chapters ADD COLUMN published_at TIMESTAMPTZ;
ALTER TABLE stories ADD COLUMN is_serialized BOOLEAN DEFAULT false;
```

```typescript
// API: POST /api/chapter/create
export async function POST(request: Request) {
  const { story_id, title, summary } = await request.json();

  const lastChapter = await prisma.chapter.findFirst({
    where: { story_id },
    orderBy: { chapter_order: "desc" },
  });

  const chapter = await prisma.chapter.create({
    data: {
      story_id,
      title,
      summary: summary || "",
      chapter_order: (lastChapter?.chapter_order || 0) + 1,
      status: "draft",
    },
  });

  return NextResponse.json({ chapter });
}
```

---

### 阶段 2：AI 辅助续写（3-5天）

**核心功能：**
1. ✅ AI 生成下一章大纲（基于前面所有已发布章节）
2. ✅ 智能分析角色状态和剧情走向
3. ✅ 提供多个续写建议供选择

**实现：**
- 复用 chapter-context-loader.ts 的上下文加载机制
- 新增 "generate-next-chapter" API
- 前端增加"AI 续写建议"对话框

---

### 阶段 3：完整连载体验（1-2周）

**核心功能：**
1. ✅ 发布日历和定时发布
2. ✅ 读者评论/互动（如果需要）
3. ✅ 数据统计（阅读量、收藏等）
4. ✅ 章节版本管理（修改历史）

---

## 📊 数据示例

**传统模式：**
```json
{
  "story": {
    "id": "story-1",
    "title": "镜中嫌疑人",
    "is_serialized": false,
    "chapters": [
      { "chapter_order": 1, "status": "published" },
      { "chapter_order": 2, "status": "published" },
      // ... 一次性生成所有章节
      { "chapter_order": 9, "status": "published" }
    ]
  }
}
```

**连载模式：**
```json
{
  "story": {
    "id": "story-2",
    "title": "无限流生存游戏",
    "is_serialized": true,
    "serial_status": "ongoing",
    "chapters": [
      {
        "chapter_order": 1,
        "status": "published",
        "published_at": "2025-01-01"
      },
      {
        "chapter_order": 2,
        "status": "published",
        "published_at": "2025-01-08"
      },
      {
        "chapter_order": 3,
        "status": "draft", // 正在创作
        "published_at": null
      }
      // 未来章节尚未创建
    ]
  }
}
```

---

## ✅ 总结

### 当前系统的章节关联性

| 维度 | 当前状态 | 评分 |
|------|---------|------|
| **章节生成** | 一次性批量生成 | ⭐⭐⭐ |
| **上下文加载** | 智能加载前面章节 | ⭐⭐⭐⭐⭐ |
| **角色状态追踪** | ChapterCharacterState 系统 | ⭐⭐⭐⭐⭐ |
| **分镜连贯性** | 基于上下文生成，连贯性强 | ⭐⭐⭐⭐ |
| **连载模式** | 不支持 | ⭐ |
| **追加章节** | 不支持 | ⭐ |

### 结论

**✅ 当前系统在"已生成章节之间的连贯性"方面做得很好：**
- 分镜生成时会加载前面章节的上下文
- 有完善的角色状态追踪机制
- 智能识别关键章节

**❌ 但不支持"连载模式"：**
- 无法逐章创作
- 无法边写边发布
- 不适合长篇创作（20+章）

**💡 建议：**
增加"连载模式"作为**可选功能**，与现有的"传统模式"并存，满足不同创作需求。
