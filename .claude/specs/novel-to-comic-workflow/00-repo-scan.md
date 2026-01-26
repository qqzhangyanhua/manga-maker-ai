# 代码库扫描报告 - 小说到漫画转换工作流

## 项目概览

**项目名称**: Manga Maker AI  
**项目类型**: 端到端 AI 漫画与小说创作平台  
**架构模式**: 混合架构 (Next.js 14 + Python FastAPI 微服务)

## 技术栈分析

### 前端 & 漫画后端
- **框架**: Next.js 14 (App Router) + React 18 + TypeScript
- **数据库**: PostgreSQL 14+ + Prisma ORM
- **UI 组件**: TailwindCSS + shadcn/ui (Radix UI) + lucide-react 图标
- **3D 渲染**: Three.js via @react-three/fiber (姿态实验室)
- **对象存储**: MinIO/S3 兼容存储
- **认证**: JWT + bcrypt + Nodemailer SMTP
- **AI/LLM**: OpenAI 兼容 API (通过 `llm_providers` 表配置)
- **测试**: Vitest + React Testing Library

### 小说后端微服务 (Python)
- **框架**: FastAPI 0.115.0 + Uvicorn
- **数据库**: 共享 PostgreSQL (通过 asyncpg)
- **AI**: OpenAI API (GPT-4 Turbo 用于文本生成)
- **RAG**: ChromaDB + OpenAI Embeddings (text-embedding-3-small)
- **文档生成**: python-docx, reportlab
- **通信**: REST + SSE (Server-Sent Events) 用于流式传输

## 现有工作流分析

### 当前小说到漫画转换流程

根据 `@src/app/(novel)/novel/canvas/[id]/page.tsx` 和数据库 Schema 分析,现有系统已实现:

#### 1. **无限画布系统 (Infinite Canvas)**
- **核心模型**: `CanvasTimeline`, `TimelineChapter`, `ScriptSegment`, `ShotDesign`, `ComicPanelResult`
- **功能**: 
  - 时间线项目管理 (支持多章节)
  - 章节节点可视化
  - 剧本片段生成
  - 镜头设计 (camera_angle, shot_size, panel_type)
  - 最终漫画图生成

#### 2. **小说项目管理**
- **核心模型**: `NovelProject`, `NovelChapter`, `NovelChapterVersion`
- **功能**:
  - 小说项目创建与管理
  - 章节内容编辑 (2000-5000字)
  - 多版本对比 (版本控制)
  - 质量评分系统 (`QualityScore`)
  - RAG 向量检索 (ChromaDB)

#### 3. **角色管理系统**
- **核心模型**: `Character`, `CharacterView`, `CharacterExpression`, `CharacterOutfit`
- **功能**:
  - 数字演员库 (Digital Actor)
  - 三视图参考 (front, side, back)
  - 表情矩阵 (9种情绪)
  - 服装系统 (多套服装)
  - LoRA 模型训练追踪

#### 4. **场景库系统**
- **核心模型**: `Scene`, `SuggestedScene`
- **功能**:
  - 背景/环境资产管理
  - AI 生成场景
  - 光照预设 (golden_hour, moonlight 等)
  - 场景去重 (location_key)

## 用户需求工作流映射

用户提出的工作流:
```
小说 / 故事大纲
↓
剧本结构化(章节 / 场次)
↓
角色设定表(全局唯一)
↓
分镜脚本(镜头级)
↓
角色 Prompt(角色身份证)
↓
分镜 Prompt(角色 Prompt + 分镜)
↓
AI 生成图片
↓
人工筛选 / 微调
```

### 现有系统覆盖情况

| 工作流步骤 | 现有系统支持 | 数据库模型 | 缺失功能 |
|-----------|------------|-----------|---------|
| 小说/故事大纲 | ✅ 完整支持 | `NovelProject`, `NovelChapter` | - |
| 剧本结构化 | ✅ 部分支持 | `ScriptSegment` | 需增强场次标记 |
| 角色设定表 | ✅ 完整支持 | `Character`, `CharacterView`, `CharacterExpression` | 需与小说角色打通 |
| 分镜脚本 | ✅ 完整支持 | `ShotDesign` | - |
| 角色 Prompt | ⚠️ 需增强 | `Character.base_prompt`, `Character.style_prompt` | 需标准化"角色身份证"格式 |
| 分镜 Prompt | ⚠️ 需增强 | `ShotDesign.prompt` | 需实现 Prompt 组合逻辑 |
| AI 生成图片 | ✅ 完整支持 | `ComicPanelResult`, `GeneratedImage` | - |
| 人工筛选/微调 | ⚠️ 需增强 | `PanelVariant` | 需增强 UI 交互 |

## 关键 API 端点分析

### 小说相关 API
- `GET /api/novel/projects` - 小说项目列表
- `POST /api/novel/projects` - 创建小说项目
- `GET /api/novel/projects/[id]` - 获取项目详情
- `POST /api/novel/projects/[id]/chapters` - 创建章节
- `POST /api/novel/projects/[id]/generate-outline` - 生成大纲
- `POST /api/novel/projects/[id]/analyze-chapters-characters` - 分析角色
- `POST /api/novel/projects/[id]/convert-to-comic` - **转换为漫画**

### 画布相关 API
- `GET /api/canvas/timeline/[id]` - 获取时间线
- `POST /api/canvas/timeline/[id]/chapters` - 添加章节
- `POST /api/canvas/chapter/[id]/generate-shots` - 生成镜头
- `POST /api/canvas/nine-grid/generate` - 九宫格批量生成

### 角色相关 API
- `GET /api/novel/[id]/characters` - 获取小说角色
- `POST /api/novel/character/generate-image` - 生成角色图
- `POST /api/novel/character/enhance-prompt` - 增强 Prompt

## 代码组织模式

### 目录结构
```
src/
├── app/
│   ├── (novel)/novel/          # 小说模块页面
│   │   ├── page.tsx            # 项目列表
│   │   ├── [id]/page.tsx       # 小说编辑器
│   │   ├── canvas/[id]/page.tsx # 无限画布
│   │   └── components/         # 小说组件
│   │       ├── InfiniteCanvas/ # 画布组件
│   │       │   ├── TimelineContainer.tsx
│   │       │   ├── ChapterRow.tsx
│   │       │   ├── nodes/      # 节点组件
│   │       │   └── NineGrid/   # 九宫格生成
│   │       └── ImageGallery/   # 图片库
│   └── api/
│       ├── novel/              # 小说 API
│       └── canvas/             # 画布 API
├── lib/
│   ├── canvas/                 # 画布工具
│   │   └── character-resolver.ts
│   └── novel/                  # 小说工具
│       └── content-serializer.ts
└── hooks/
    ├── useTimelineWindow.ts    # 画布窗口管理
    └── useTimelineConfig.ts    # 画布配置
```

### 组件拆分原则
- **单个组件不超过 400 行**
- **复杂组件拆分为子组件**
- **使用 TypeScript 严格类型**
- **禁止使用 `any` 类型**

## 现有集成点分析

### 1. 小说 → 漫画转换入口
**API**: `POST /api/novel/projects/[id]/convert-to-comic`

**预期流程**:
1. 检查小说项目是否存在
2. 创建 `Story` 记录 (漫画故事)
3. 创建 `CanvasTimeline` 记录
4. 为每个 `NovelChapter` 创建 `TimelineChapter`
5. 返回时间线 ID

### 2. 角色打通机制
**字段**: `Character.source_type`, `Character.source_reference`

**支持的来源类型**:
- `"manual"` - 手动创建
- `"novel"` - 从小说提取
- `"story_ai"` - AI 生成
- `"imported"` - 导入

**关联字段** (JSON):
```json
{
  "novelProjectId": "uuid",
  "chapterId": "uuid",
  "tempId": "string"
}
```

### 3. 场景去重机制
**字段**: `ShotDesign.location_key`

**示例值**: `"classroom"`, `"hallway"`, `"rooftop"`

**用途**: 避免重复生成相同场景背景图

## 技术约束与注意事项

### 1. 数据库约束
- **PostgreSQL 14+** 必需
- **UUID 主键** 使用 `gen_random_uuid()`
- **时区**: 统一使用 `@db.Timestamptz(6)`
- **JSON 字段**: 使用 `Json` 或 `@db.JsonB`

### 2. 认证机制
- **JWT Token** 存储在 HTTP-only Cookie (`comicai_session`)
- **Next.js API**: 使用 `verifyAuthToken(token)`
- **Python Backend**: 通过 `Authorization: Bearer <token>` 转发

### 3. 图片存储
- **MinIO** 对象存储
- **Bucket**: `input-image`
- **URL 格式**: `https://minio-endpoint/bucket/object-key`

### 4. LLM 调用
- **配置表**: `llm_providers`
- **提供商类型**: `storyboard`, `story_generator`, `image_generation`, `prompt_optimizer`
- **优先级**: `priority` 字段 (数字越小越优先)
- **算力消耗**: `credits_cost` 字段

### 5. 算力系统
- **用户余额**: `User.credits`
- **交易记录**: `CreditTransaction`
- **消耗追踪**: `LlmProvider.credits_cost`

## 现有工具函数与 Hooks

### Hooks
- `useTimelineWindow` - 画布窗口管理 (分页加载章节)
- `useTimelineConfig` - 画布配置管理
- `useUpdateTimelineStyle` - 更新默认风格
- `useProjectCharacters` - 获取项目角色
- `useChapterCharacters` - 获取章节角色
- `useProjectReferenceImages` - 获取参考图

### 工具函数
- `transformData` - 数据转换 (小说 → 画布)
- `character-resolver` - 角色解析器
- `content-serializer` - 内容序列化
- `shot-grouping` - 镜头分组逻辑

## 测试策略

### 现有测试
- `src/app/api/novel/projects/__tests__/restful-refactor.test.ts`
- `src/app/(novel)/novel/components/InfiniteCanvas/utils/shot-grouping.test.ts`
- `src/lib/novel/content-serializer.test.ts`

### 测试框架
- **Vitest** + **React Testing Library**
- **配置文件**: `vitest.config.ts`
- **运行命令**: `npm test`

## 潜在风险与挑战

### 1. 数据一致性
- **小说角色 ↔ 漫画角色** 同步问题
- **章节删除** 级联影响
- **版本控制** 冲突处理

### 2. 性能瓶颈
- **大量章节** 加载性能
- **九宫格批量生成** 并发控制
- **RAG 向量检索** 响应时间

### 3. 用户体验
- **长流程中断** 状态保存
- **生成失败** 重试机制
- **Prompt 质量** 稳定性

### 4. 成本控制
- **LLM API 调用** 频率限制
- **图片生成** 算力消耗
- **存储空间** 配额管理

## 集成建议

### 1. 复用现有组件
- ✅ `InfiniteCanvasView` - 画布主视图
- ✅ `ChapterRow` - 章节行组件
- ✅ `ShotNode`, `ScriptNode`, `SceneNode`, `FinalNode` - 节点组件
- ✅ `GenerateNineGridDialog` - 九宫格生成对话框

### 2. 扩展现有 API
- ✅ `/api/novel/projects/[id]/convert-to-comic` - 已存在
- ⚠️ 需增强角色映射逻辑
- ⚠️ 需增强场景提取逻辑

### 3. 新增必要功能
- ❌ 角色 Prompt 标准化模板
- ❌ 分镜 Prompt 组合引擎
- ❌ 人工筛选 UI 增强
- ❌ 批量操作进度追踪

## 代码风格规范

### TypeScript 规范
```typescript
// ✅ 正确: 明确类型定义
interface CharacterPrompt {
  characterId: string;
  name: string;
  basePrompt: string;
  stylePrompt: string;
  referenceImage: string;
}

// ❌ 错误: 使用 any
function processCharacter(data: any) { ... }

// ✅ 正确: 使用 unknown + 类型守卫
function processCharacter(data: unknown) {
  if (isCharacterData(data)) { ... }
}
```

### 组件规范
```typescript
// ✅ 正确: 组件拆分 (< 400 行)
export function CharacterPromptBuilder({ characterId }: Props) {
  return (
    <>
      <CharacterBasicInfo characterId={characterId} />
      <CharacterStyleConfig characterId={characterId} />
      <CharacterReferenceImages characterId={characterId} />
    </>
  );
}

// ✅ 正确: 使用 Tailwind CSS
<div className="flex items-center gap-4 p-4 border-b border-zinc-800">
  <Button variant="ghost" size="sm">返回</Button>
</div>

// ❌ 错误: 自定义 CSS
<div style={{ display: 'flex', padding: '16px' }}>
```

### API 路由规范
```typescript
// ✅ 正确: 统一错误处理
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    
    const payload = verifyAuthToken(token);
    // 业务逻辑...
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
```

## 环境变量

### Next.js (.env.local)
```bash
DATABASE_URL=postgresql://manga:manga123@localhost:5432/manga
AUTH_SECRET=<jwt_secret>
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=input-image
NOVEL_SERVICE_URL=http://localhost:8000
```

### Python Backend (services/novel-backend/.env)
```bash
DATABASE_URL=postgresql://manga:manga123@localhost:5432/manga
JWT_SECRET=<same_as_nextjs_auth_secret>
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
CHROMA_PERSIST_DIR=./chroma_db
```

## 总结

### 项目成熟度
- ✅ **数据库 Schema** 完善 (支持完整工作流)
- ✅ **基础组件** 齐全 (无限画布、角色管理、场景库)
- ✅ **API 端点** 覆盖核心功能
- ⚠️ **工作流编排** 需增强 (用户体验优化)
- ⚠️ **Prompt 工程** 需标准化 (质量稳定性)

### 技术债务
- **类型安全**: `tsconfig.json` 中 `strict: false` (需按 `strict: true` 编写)
- **文件长度**: 部分组件超过 500 行 (需拆分)
- **测试覆盖**: 测试用例较少 (需补充)

### 优先级建议
1. **高优先级**: 角色 Prompt 标准化、分镜 Prompt 组合
2. **中优先级**: 人工筛选 UI、批量操作进度
3. **低优先级**: 性能优化、测试补充

---

**扫描完成时间**: 2026-01-26  
**扫描范围**: 183 个文件 (TypeScript/TSX)  
**数据库模型**: 50+ 表  
**API 端点**: 100+ 路由
