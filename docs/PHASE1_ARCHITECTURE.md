# 第一阶段技术架构设计

**项目**: Manga Maker AI - 第一阶段架构设计
**版本**: v1.0
**架构师**: System Architect
**日期**: 2025-12-12
**审核**: 基于 Linus Torvalds 的设计哲学

---

## 📋 目录

- [一、架构设计哲学](#一架构设计哲学)
- [二、数据库架构](#二数据库架构)
- [三、API 架构](#三api-架构)
- [四、前端架构](#四前端架构)
- [五、性能优化策略](#五性能优化策略)
- [六、安全与权限设计](#六安全与权限设计)
- [七、测试策略](#七测试策略)
- [八、部署与监控](#八部署与监控)
- [九、技术债务与优化](#九技术债务与优化)

---

## 一、架构设计哲学

### 1.1 Linus 哲学应用

**"Good Taste" - 数据结构优先**

```text
问题: 分镜模板需要存储复杂的布局信息
糟糕方案: 为每种模板类型创建单独的表和字段
好品味方案: 使用 JSON 字段存储灵活的模板数据,统一数据结构

问题: 版本控制需要存储完整项目快照
糟糕方案: 每次保存完整复制所有数据
好品味方案: 增量存储 + 引用机制,只存储变化的部分
```

**"Never break userspace" - 向后兼容**

```text
原则1: 所有新增表不影响现有表结构
原则2: 新增字段使用默认值或 nullable
原则3: API 版本化,保持旧接口兼容
原则4: 数据迁移可回滚
```

**实用主义 - 最简方案**

```text
问题: 需要全文搜索功能
过度设计: 引入 Elasticsearch
实用方案: PostgreSQL 全文索引 + GIN 索引

问题: 需要实时进度推送
过度设计: 引入 WebSocket + Redis Pub/Sub
实用方案: 轮询 + Server-Sent Events (SSE)
```

**简洁执念 - 减少复杂度**

```text
规则1: 单个函数不超过 50 行
规则2: 嵌套深度不超过 3 层
规则3: 消除所有特殊情况判断
规则4: 复用现有代码,不重复造轮子
```

---

## 二、数据库架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                     用户层                            │
├─────────────────────────────────────────────────────┤
│ User ──┬─→ Character ──┬─→ CharacterView             │
│        │               ├─→ CharacterExpression       │
│        │               └─→ CharacterOutfit           │
│        │                                             │
│        ├─→ Scene                                     │
│        │                                             │
│        ├─→ Story ──→ Project ──┬─→ Panel             │
│        │                       ├─→ ProjectVersion    │
│        │                       └─→ GenerationTask    │
│        │                                             │
│        ├─→ PanelTemplate ──→ TemplateLike            │
│        │                                             │
│        └─→ Tag ←──→ Tagging ←──→ [All Resources]     │
├─────────────────────────────────────────────────────┤
│                   系统层                              │
├─────────────────────────────────────────────────────┤
│ LlmProvider | ComicStyle | EmailVerification         │
│ GenerationLog | UsageStat | Workflow                 │
└─────────────────────────────────────────────────────┘
```

### 2.2 新增表设计 (Prisma Schema)

#### 2.2.1 分镜模板表

```prisma
model PanelTemplate {
  id              String   @id @default(cuid())
  userId          String?  @map("user_id")  // null = 官方模板
  name            String   @db.VarChar(100)
  description     String?  @db.Text
  panelCount      Int      @map("panel_count")

  // 模板数据 (JSON)
  // 格式: { panels: [{ panel_type, camera_angle, shot_size, importance, relative_position }] }
  templateData    Json     @map("template_data")

  tags            String[]
  isPublic        Boolean  @default(false) @map("is_public")
  isOfficial      Boolean  @default(false) @map("is_official")

  likesCount      Int      @default(0) @map("likes_count")
  usageCount      Int      @default(0) @map("usage_count")

  thumbnailUrl    String?  @map("thumbnail_url")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // 关系
  user            User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  likes           TemplateLike[]

  @@index([userId])
  @@index([isPublic, isOfficial])
  @@index([tags])
  @@map("panel_templates")
}

model TemplateLike {
  id              String   @id @default(cuid())
  templateId      String   @map("template_id")
  userId          String   @map("user_id")
  createdAt       DateTime @default(now()) @map("created_at")

  template        PanelTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([templateId, userId])
  @@index([userId])
  @@map("template_likes")
}
```

**设计说明**:
- `templateData` 使用 JSON 字段,灵活存储不同布局
- `userId` 允许 null,表示官方模板
- `likesCount` 冗余字段,避免每次查询聚合
- `tags` 使用数组字段,支持快速筛选

#### 2.2.2 生成任务表

```prisma
model GenerationTask {
  id                  String   @id @default(cuid())
  userId              String   @map("user_id")
  projectId           String   @map("project_id")

  // 批量生成的分镜 ID 列表
  panelIds            String[] @map("panel_ids")

  taskType            String   @map("task_type")  // "batch" | "variant"
  status              String   @default("pending")  // "pending" | "processing" | "completed" | "failed" | "cancelled"

  progress            Int      @default(0)  // 0-100
  currentPanelIndex   Int      @default(0) @map("current_panel_index")

  // 生成设置 (JSON)
  settings            Json

  // 错误日志 (JSON Array)
  errorLogs           Json?    @map("error_logs")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  completedAt         DateTime? @map("completed_at")

  // 关系
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project             Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([projectId])
  @@index([status])
  @@map("generation_tasks")
}

model PanelVariant {
  id              String   @id @default(cuid())
  panelId         String   @map("panel_id")
  imageUrl        String   @map("image_url")
  prompt          String   @db.Text

  variantType     String   @map("variant_type")  // "original" | "composition" | "lighting" | "angle"
  isSelected      Boolean  @default(false) @map("is_selected")

  createdAt       DateTime @default(now()) @map("created_at")

  panel           Panel    @relation(fields: [panelId], references: [id], onDelete: Cascade)

  @@index([panelId])
  @@index([isSelected])
  @@map("panel_variants")
}
```

**设计说明**:
- `panelIds` 数组存储批量生成的分镜列表
- `progress` 和 `currentPanelIndex` 支持实时进度显示
- `errorLogs` JSON 数组记录每个失败的分镜
- `PanelVariant` 独立表,不影响 Panel 主表

#### 2.2.3 版本控制表

```prisma
model ProjectVersion {
  id                String   @id @default(cuid())
  projectId         String   @map("project_id")
  versionNumber     Int      @map("version_number")

  label             String?  @db.VarChar(100)

  // 版本数据 (增量存储)
  // 格式: { project: {...}, panels: {...}, script: {...} }
  versionData       Json     @map("version_data")

  changeSummary     String?  @db.Text @map("change_summary")

  isAuto            Boolean  @default(true) @map("is_auto")
  isPinned          Boolean  @default(false) @map("is_pinned")

  createdByAction   String?  @map("created_by_action")  // "batch_generate" | "apply_template" | "manual"

  createdAt         DateTime @default(now()) @map("created_at")

  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, versionNumber])
  @@index([projectId, createdAt])
  @@map("project_versions")
}
```

**设计说明**:
- `versionNumber` 自增,确保版本顺序
- `versionData` 存储增量变化,不是完整快照
- `isPinned` 标记重要版本,防止被自动清理
- 复合索引 `[projectId, createdAt]` 优化时间线查询

#### 2.2.4 标签系统

```prisma
model Tag {
  id              String   @id @default(cuid())
  name            String   @unique @db.VarChar(50)
  type            String   @default("user")  // "system" | "user"
  category        String?  @db.VarChar(50)  // "style" | "scene_type" | "character_type"

  createdBy       String?  @map("created_by")  // null = 系统标签
  usageCount      Int      @default(0) @map("usage_count")

  createdAt       DateTime @default(now()) @map("created_at")

  user            User?    @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  taggings        Tagging[]

  @@index([type])
  @@index([category])
  @@map("tags")
}

model Tagging {
  id              String   @id @default(cuid())
  tagId           String   @map("tag_id")

  taggableType    String   @map("taggable_type")  // "Character" | "Scene" | "Project" | "Story" | "PanelTemplate"
  taggableId      String   @map("taggable_id")

  createdAt       DateTime @default(now()) @map("created_at")

  tag             Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([tagId, taggableType, taggableId])
  @@index([taggableType, taggableId])
  @@map("taggings")
}
```

**设计说明**:
- 多态关联通过 `taggableType` + `taggableId` 实现
- `usageCount` 冗余字段,避免聚合查询
- 复合唯一索引防止重复标签

### 2.3 修改现有表

```prisma
// Panel 表新增字段
model Panel {
  // ... 现有字段

  // 新增关系
  variants        PanelVariant[]

  // ... 其他现有关系
}

// Project 表新增字段
model Project {
  // ... 现有字段

  // 新增关系
  versions        ProjectVersion[]
  generationTasks GenerationTask[]

  // ... 其他现有关系
}

// User 表新增关系
model User {
  // ... 现有字段

  // 新增关系
  panelTemplates  PanelTemplate[]
  templateLikes   TemplateLike[]
  generationTasks GenerationTask[]
  tags            Tag[]

  // ... 其他现有关系
}
```

### 2.4 数据库索引策略

**原则**: 只为频繁查询的字段添加索引,避免过度索引

| 表 | 索引字段 | 类型 | 原因 |
|---|----------|------|------|
| `panel_templates` | `[userId]` | B-Tree | 查询用户模板 |
| `panel_templates` | `[isPublic, isOfficial]` | B-Tree | 筛选公开/官方模板 |
| `panel_templates` | `[tags]` | GIN | 标签数组查询 |
| `generation_tasks` | `[userId, status]` | B-Tree | 查询用户任务状态 |
| `project_versions` | `[projectId, createdAt]` | B-Tree | 版本历史时间线 |
| `tags` | `[name]` | B-Tree | 标签名称搜索 |
| `taggings` | `[taggableType, taggableId]` | B-Tree | 查询资产的标签 |

**全文搜索索引**:

```sql
-- 为 Character 表添加全文搜索
ALTER TABLE characters
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description,'')), 'B') ||
  setweight(to_tsvector('simple', coalesce(base_prompt,'')), 'C')
) STORED;

CREATE INDEX characters_search_idx ON characters USING GIN (search_vector);

-- 同理应用到 Scene, Project, Story 表
```

### 2.5 数据迁移策略

**迁移文件命名**: `YYYYMMDDHHMMSS_feature_name.sql`

**示例**: `20251212120000_add_panel_templates.sql`

```sql
-- 向前迁移
BEGIN;

-- 1. 创建新表
CREATE TABLE "panel_templates" (
  -- ... 字段定义
);

-- 2. 创建索引
CREATE INDEX "panel_templates_user_id_idx" ON "panel_templates"("user_id");

-- 3. 插入官方模板数据
INSERT INTO "panel_templates" (id, name, description, ...) VALUES
  ('tpl_dialogue_3', '对话标准-3格', '适合日常对话场景', ...),
  -- ... 其他11个官方模板
;

COMMIT;

-- 向后迁移 (回滚)
BEGIN;
DROP TABLE IF EXISTS "panel_templates" CASCADE;
COMMIT;
```

**迁移检查清单**:
- [ ] 迁移脚本可独立运行
- [ ] 有对应的回滚脚本
- [ ] 测试环境验证成功
- [ ] 数据备份已完成
- [ ] 迁移时间 < 5秒

---

## 三、API 架构

### 3.1 API 设计原则

**RESTful 规范**:
```
GET    /api/resource        - 列表查询
POST   /api/resource        - 创建资源
GET    /api/resource/{id}   - 获取单个
PATCH  /api/resource/{id}   - 部分更新
DELETE /api/resource/{id}   - 删除资源
PUT    /api/resource/{id}   - 完整替换 (谨慎使用)
```

**版本化策略**:
```
v1: /api/resource  (当前)
v2: /api/v2/resource  (未来)
```

**统一响应格式**:

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}
```

### 3.2 新增 API 端点

#### 3.2.1 分镜模板 API

```typescript
/**
 * 获取模板列表
 * GET /api/templates?page=1&limit=20&tags=对话,战斗&type=official
 */
interface GetTemplatesQuery {
  page?: number;
  limit?: number;
  tags?: string;           // 逗号分隔
  type?: "my" | "official" | "community";
  panelCount?: string;     // "1-3" | "4-6" | "7-12"
  search?: string;
}

interface GetTemplatesResponse {
  success: true;
  data: {
    templates: PanelTemplate[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

/**
 * 创建模板
 * POST /api/templates
 */
interface CreateTemplateBody {
  name: string;
  description?: string;
  panelIds: string[];      // 从项目中选择的分镜 ID
  tags?: string[];
  isPublic?: boolean;
}

interface CreateTemplateResponse {
  success: true;
  data: {
    template: PanelTemplate;
  };
  message: string;
}

/**
 * 应用模板
 * POST /api/templates/{id}/apply
 */
interface ApplyTemplateBody {
  projectId: string;
  insertAfterOrder?: number;  // 插入位置,不提供则追加到末尾
  mode: "insert" | "replace";
  targetPanelIds?: string[];  // mode=replace 时需要
}

interface ApplyTemplateResponse {
  success: true;
  data: {
    panels: Panel[];
  };
  message: string;
}

/**
 * 点赞/取消点赞
 * POST /api/templates/{id}/like
 */
interface LikeTemplateResponse {
  success: true;
  data: {
    liked: boolean;
    likesCount: number;
  };
}
```

#### 3.2.2 批量生成 API

```typescript
/**
 * 批量生成分镜图片
 * POST /api/panel/batch-generate
 */
interface BatchGenerateBody {
  projectId: string;
  panelIds: string[];
  settings: {
    style?: string;
    quality?: "standard" | "high";
    failureMode?: "skip" | "stop";  // 失败后跳过或停止
  };
}

interface BatchGenerateResponse {
  success: true;
  data: {
    taskId: string;
    panelCount: number;
    estimatedTime: number;  // 秒
  };
  usage: {
    count: number;
    limit: number;
  };
}

/**
 * 查询批量生成任务状态
 * GET /api/generation-tasks/{taskId}
 */
interface GetTaskStatusResponse {
  success: true;
  data: {
    task: GenerationTask;
    currentPanel?: {
      id: string;
      order: number;
      status: string;
    };
  };
}

/**
 * 取消批量生成任务
 * POST /api/generation-tasks/{taskId}/cancel
 */
interface CancelTaskResponse {
  success: true;
  message: string;
}

/**
 * 生成分镜变体
 * POST /api/panel/{id}/variants
 */
interface GenerateVariantsBody {
  count?: number;  // 2-4,默认3
  variantTypes?: string[];  // 指定变体类型
}

interface GenerateVariantsResponse {
  success: true;
  data: {
    variants: PanelVariant[];
  };
  usage: {
    count: number;
    limit: number;
  };
}

/**
 * 批量更新分镜属性
 * PUT /api/panel/batch-update
 */
interface BatchUpdatePanelsBody {
  panelIds: string[];
  updates: {
    style?: string;
    panel_type?: string;
    camera_angle?: string;
    shot_size?: string;
    importance?: string;
  };
  regenerate?: boolean;  // 是否重新生成
}

interface BatchUpdatePanelsResponse {
  success: true;
  data: {
    updatedCount: number;
    taskId?: string;  // regenerate=true 时返回
  };
}
```

#### 3.2.3 版本控制 API

```typescript
/**
 * 获取版本历史
 * GET /api/project/{id}/versions?limit=30
 */
interface GetVersionsResponse {
  success: true;
  data: {
    versions: Array<{
      id: string;
      versionNumber: number;
      label: string | null;
      changeSummary: string | null;
      isAuto: boolean;
      isPinned: boolean;
      createdByAction: string | null;
      createdAt: Date;
    }>;
    currentVersion: number;
  };
}

/**
 * 创建版本
 * POST /api/project/{id}/versions
 */
interface CreateVersionBody {
  label?: string;
  createdByAction?: string;
}

interface CreateVersionResponse {
  success: true;
  data: {
    version: ProjectVersion;
  };
  message: string;
}

/**
 * 获取版本详情
 * GET /api/project/{id}/versions/{versionId}
 */
interface GetVersionResponse {
  success: true;
  data: {
    version: ProjectVersion;
    project: Project;  // 该版本的项目快照
    panels: Panel[];   // 该版本的分镜快照
  };
}

/**
 * 恢复版本
 * POST /api/project/{id}/restore
 */
interface RestoreVersionBody {
  versionId: string;
  createBackup?: boolean;  // 是否先备份当前版本
}

interface RestoreVersionResponse {
  success: true;
  data: {
    project: Project;
    backupVersionId?: string;
  };
  message: string;
}

/**
 * 对比版本
 * GET /api/project/{id}/compare?from={v1}&to={v2}
 */
interface CompareVersionsResponse {
  success: true;
  data: {
    versionFrom: ProjectVersion;
    versionTo: ProjectVersion;
    diff: {
      project: {
        changed: string[];  // 变化的字段
        values: { from: unknown; to: unknown };
      };
      panels: {
        added: Panel[];
        removed: Panel[];
        modified: Array<{
          panelId: string;
          changes: string[];
        }>;
      };
    };
  };
}
```

#### 3.2.4 标签与搜索 API

```typescript
/**
 * 获取标签列表
 * GET /api/tags?type=user&category=style
 */
interface GetTagsQuery {
  type?: "system" | "user";
  category?: string;
  sortBy?: "usage" | "name";
}

interface GetTagsResponse {
  success: true;
  data: {
    tags: Tag[];
  };
}

/**
 * 创建标签
 * POST /api/tags
 */
interface CreateTagBody {
  name: string;
  category?: string;
}

interface CreateTagResponse {
  success: true;
  data: {
    tag: Tag;
  };
}

/**
 * 推荐标签
 * POST /api/tags/suggest
 */
interface SuggestTagsBody {
  resourceType: "Character" | "Scene" | "Project" | "Story";
  description: string;
}

interface SuggestTagsResponse {
  success: true;
  data: {
    suggestedTags: string[];
  };
}

/**
 * 全局搜索
 * GET /api/search?q=赛博朋克&type=character,scene&limit=20
 */
interface SearchQuery {
  q: string;
  type?: string;  // 逗号分隔: "character,scene,project,story"
  tags?: string;  // 逗号分隔
  limit?: number;
}

interface SearchResponse {
  success: true;
  data: {
    results: {
      characters: Character[];
      scenes: Scene[];
      projects: Project[];
      stories: Story[];
    };
    total: number;
  };
}

/**
 * 资产筛选
 * GET /api/{resource}/filter?tags=科幻,战斗&status=ready&sort=newest
 */
interface FilterResourceQuery {
  tags?: string;
  status?: string;
  createdFrom?: string;  // ISO date
  createdTo?: string;
  sortBy?: "newest" | "oldest" | "name" | "usage";
  page?: number;
  limit?: number;
}
```

### 3.3 API 中间件设计

**认证中间件** (复用现有):
```typescript
// src/lib/auth-helpers.ts
export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }
  return payload;
}
```

**配额检查中间件** (复用现有):
```typescript
// src/lib/usage.ts
export async function assertAndIncrementUsage(params: {
  userId: string;
  action: string;
  providerType: string;
}) {
  // ... 现有逻辑
}
```

**请求日志中间件** (新增):
```typescript
// src/lib/request-logger.ts
export function logRequest(req: Request, res: Response, duration: number) {
  console.log({
    method: req.method,
    url: req.url,
    status: res.status,
    duration_ms: duration,
    timestamp: new Date().toISOString()
  });
}
```

### 3.4 API 错误处理

**统一错误处理器**:
```typescript
// src/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.statusCode }
    );
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    {
      success: false,
      error: "服务器内部错误"
    },
    { status: 500 }
  );
}
```

**使用示例**:
```typescript
export async function POST(req: Request) {
  try {
    const payload = await requireAuth();
    if (payload instanceof NextResponse) return payload;

    // ... 业务逻辑

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 四、前端架构

### 4.1 组件层次结构

```
src/
├── app/
│   ├── templates/
│   │   └── page.tsx                    # 模板市场页面
│   ├── scripts/[id]/
│   │   └── page.tsx                    # 增强版项目编辑器
│   └── ...
├── components/
│   ├── Template/
│   │   ├── TemplateCard.tsx           # 模板卡片
│   │   ├── TemplateGrid.tsx           # 模板网格
│   │   ├── TemplatePreview.tsx        # 模板预览
│   │   ├── SaveAsTemplateDialog.tsx   # 保存模板对话框
│   │   └── ApplyTemplateDialog.tsx    # 应用模板对话框
│   ├── BatchGeneration/
│   │   ├── BatchGenerateDialog.tsx    # 批量生成对话框
│   │   ├── GenerationProgress.tsx     # 生成进度条
│   │   ├── VariantSelector.tsx        # 变体选择器
│   │   └── BatchEditDialog.tsx        # 批量编辑对话框
│   ├── Version/
│   │   ├── VersionHistory.tsx         # 版本历史时间线
│   │   ├── VersionPreview.tsx         # 版本预览
│   │   ├── VersionComparison.tsx      # 版本对比
│   │   └── RestoreConfirmDialog.tsx   # 恢复确认
│   ├── Search/
│   │   ├── GlobalSearch.tsx           # 全局搜索 (⌘K)
│   │   ├── SearchResults.tsx          # 搜索结果
│   │   ├── FilterPanel.tsx            # 筛选面板
│   │   └── QuickFilterBar.tsx         # 快速过滤栏
│   └── Tag/
│       ├── TagInput.tsx               # 标签输入
│       ├── TagCloud.tsx               # 标签云
│       └── TagManager.tsx             # 标签管理
└── hooks/
    ├── use-templates.ts               # 模板 CRUD
    ├── use-batch-generation.ts        # 批量生成
    ├── use-variants.ts                # 变体生成
    ├── use-versions.ts                # 版本控制
    ├── use-search.ts                  # 搜索
    └── use-tags.ts                    # 标签管理
```

### 4.2 状态管理策略

**使用 React Query** (现有方案,继续使用)

```typescript
// hooks/use-templates.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => fetchTemplates(filters),
    staleTime: 5 * 60 * 1000  // 5分钟
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      // 失效缓存,重新获取
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    }
  });
}
```

**缓存策略**:

| 数据类型 | 缓存时间 | 失效条件 |
|---------|---------|---------|
| 模板列表 | 5分钟 | 创建/删除模板 |
| 版本历史 | 1分钟 | 创建/恢复版本 |
| 标签列表 | 10分钟 | 创建标签 |
| 搜索结果 | 30秒 | 无自动失效 |
| 生成任务状态 | 实时 (轮询) | 任务完成 |

### 4.3 关键组件设计

#### 4.3.1 批量生成进度组件

```typescript
// components/BatchGeneration/GenerationProgress.tsx
interface GenerationProgressProps {
  taskId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function GenerationProgress({ taskId, onComplete, onCancel }: GenerationProgressProps) {
  const [task, setTask] = useState<GenerationTask | null>(null);

  // 轮询任务状态
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await fetch(`/api/generation-tasks/${taskId}`);
      const data = await result.json();
      setTask(data.data.task);

      if (data.data.task.status === 'completed') {
        clearInterval(interval);
        onComplete();
      }
    }, 2000);  // 每2秒轮询一次

    return () => clearInterval(interval);
  }, [taskId]);

  if (!task) return <div>加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>正在生成 ({task.currentPanelIndex + 1}/{task.panelIds.length})</h3>
        <Button variant="ghost" onClick={onCancel}>取消</Button>
      </div>

      <Progress value={task.progress} />

      <div className="max-h-60 overflow-y-auto space-y-2">
        {task.panelIds.map((panelId, index) => (
          <div key={panelId} className="flex items-center gap-2">
            {index < task.currentPanelIndex ? (
              <CheckCircle className="text-green-500" />
            ) : index === task.currentPanelIndex ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Circle className="text-gray-300" />
            )}
            <span>分镜 {index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4.3.2 版本对比组件

```typescript
// components/Version/VersionComparison.tsx
interface VersionComparisonProps {
  projectId: string;
  versionFrom: string;
  versionTo: string;
}

export function VersionComparison({ projectId, versionFrom, versionTo }: VersionComparisonProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['version-comparison', projectId, versionFrom, versionTo],
    queryFn: () => fetch(`/api/project/${projectId}/compare?from=${versionFrom}&to=${versionTo}`)
      .then(res => res.json())
  });

  if (isLoading) return <Skeleton />;

  const diff = data.data.diff;

  return (
    <div className="space-y-6">
      {/* 项目属性变化 */}
      <Section title="项目信息">
        {diff.project.changed.map(field => (
          <DiffRow key={field} field={field} from={diff.project.values.from[field]} to={diff.project.values.to[field]} />
        ))}
      </Section>

      {/* 分镜变化 */}
      <Section title="分镜变化">
        {diff.panels.added.length > 0 && (
          <div className="text-green-600">
            新增 {diff.panels.added.length} 个分镜
          </div>
        )}
        {diff.panels.removed.length > 0 && (
          <div className="text-red-600">
            删除 {diff.panels.removed.length} 个分镜
          </div>
        )}
        {diff.panels.modified.length > 0 && (
          <div className="text-blue-600">
            修改 {diff.panels.modified.length} 个分镜
          </div>
        )}
      </Section>
    </div>
  );
}
```

### 4.4 性能优化技巧

**虚拟滚动** (长列表):
```typescript
// 使用 react-window 优化长列表渲染
import { FixedSizeList } from 'react-window';

export function TemplateGrid({ templates }: { templates: Template[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={templates.length}
      itemSize={200}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <TemplateCard template={templates[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

**懒加载组件**:
```typescript
// 使用 React.lazy 延迟加载大组件
const VersionComparison = lazy(() => import('@/components/Version/VersionComparison'));

export function VersionHistory() {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div>
      {showComparison && (
        <Suspense fallback={<Skeleton />}>
          <VersionComparison />
        </Suspense>
      )}
    </div>
  );
}
```

**图片优化**:
```typescript
// 使用 Next.js Image 组件
import Image from 'next/image';

export function TemplateCard({ template }: { template: Template }) {
  return (
    <Image
      src={template.thumbnailUrl}
      alt={template.name}
      width={300}
      height={200}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,..."
    />
  );
}
```

---

## 五、性能优化策略

### 5.1 数据库查询优化

**使用 Prisma Select** (只查询需要的字段):
```typescript
// ❌ 不好: 查询所有字段
const templates = await prisma.panelTemplate.findMany();

// ✅ 好: 只查询需要的字段
const templates = await prisma.panelTemplate.findMany({
  select: {
    id: true,
    name: true,
    thumbnailUrl: true,
    likesCount: true,
    usageCount: true
  }
});
```

**批量查询优化**:
```typescript
// ❌ 不好: N+1 查询
for (const template of templates) {
  const likes = await prisma.templateLike.count({
    where: { templateId: template.id }
  });
}

// ✅ 好: 单次聚合查询
const likesCount = await prisma.templateLike.groupBy({
  by: ['templateId'],
  _count: true,
  where: {
    templateId: { in: templates.map(t => t.id) }
  }
});
```

**分页查询**:
```typescript
// 使用 cursor-based pagination 代替 offset
const templates = await prisma.panelTemplate.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastTemplateId },
  orderBy: { createdAt: 'desc' }
});
```

### 5.2 缓存策略

**Redis 缓存** (可选,第二阶段考虑):
```typescript
// src/lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300  // 5分钟
): Promise<T> {
  // 尝试从缓存读取
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // 缓存未命中,执行查询
  const data = await fetcher();

  // 写入缓存
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}

// 使用示例
const templates = await cachedQuery(
  `templates:${userId}:${filters}`,
  () => prisma.panelTemplate.findMany({ where: { userId } }),
  300
);
```

**浏览器缓存**:
```typescript
// Next.js 响应头设置
export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  });
}
```

### 5.3 批量操作优化

**并行生成 (限流)**:
```typescript
// src/lib/batch-generator.ts
import pLimit from 'p-limit';

const limit = pLimit(3);  // 最多3个并发

export async function batchGeneratePanels(panelIds: string[]) {
  const tasks = panelIds.map(panelId =>
    limit(() => generatePanelImage(panelId))
  );

  return Promise.all(tasks);
}
```

**进度通知 (Server-Sent Events)**:
```typescript
// src/app/api/generation-tasks/[id]/stream/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 轮询任务状态
      const interval = setInterval(async () => {
        const task = await prisma.generationTask.findUnique({
          where: { id: params.id }
        });

        const data = `data: ${JSON.stringify(task)}\n\n`;
        controller.enqueue(encoder.encode(data));

        if (task.status === 'completed') {
          clearInterval(interval);
          controller.close();
        }
      }, 2000);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### 5.4 前端性能优化

**代码分割**:
```typescript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*']
  }
};
```

**图片优化**:
```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  }
};
```

---

## 六、安全与权限设计

### 6.1 权限控制

**资源所有权检查**:
```typescript
// src/lib/permission.ts
export async function checkResourceOwnership(
  userId: string,
  resourceType: 'template' | 'project' | 'character',
  resourceId: string
): Promise<boolean> {
  switch (resourceType) {
    case 'template':
      const template = await prisma.panelTemplate.findUnique({
        where: { id: resourceId },
        select: { userId: true }
      });
      return template?.userId === userId;

    // ... 其他资源类型
  }
}

// 使用示例
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const payload = await requireAuth();
  if (payload instanceof NextResponse) return payload;

  // 检查所有权
  const isOwner = await checkResourceOwnership(payload.userId, 'template', params.id);
  if (!isOwner) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  // ... 删除逻辑
}
```

**公开资源访问控制**:
```typescript
// 模板市场只能访问公开的或自己的模板
const templates = await prisma.panelTemplate.findMany({
  where: {
    OR: [
      { isPublic: true },
      { userId: currentUserId }
    ]
  }
});
```

### 6.2 输入验证

**使用 Zod 验证**:
```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const CreateTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  panelIds: z.array(z.string().cuid()).min(2).max(12),
  tags: z.array(z.string()).max(10).optional(),
  isPublic: z.boolean().optional()
});

// 使用示例
export async function POST(req: Request) {
  const body = await req.json();

  // 验证输入
  const parsed = CreateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数错误", details: parsed.error.errors },
      { status: 400 }
    );
  }

  // ... 业务逻辑
}
```

**SQL 注入防护**:
- 使用 Prisma ORM (自动参数化查询)
- 避免原始 SQL 查询
- 如必须使用,使用参数化查询

```typescript
// ❌ 危险: 字符串拼接
await prisma.$queryRaw`SELECT * FROM templates WHERE name = '${userInput}'`;

// ✅ 安全: 参数化查询
await prisma.$queryRaw`SELECT * FROM templates WHERE name = ${userInput}`;
```

### 6.3 速率限制

**使用 Upstash Rate Limit** (推荐):
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),  // 10次/10秒
});

export async function rateLimit(identifier: string) {
  const { success, limit, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    throw new ApiError("请求过于频繁", 429, "RATE_LIMIT_EXCEEDED");
  }

  return { limit, remaining };
}

// 使用示例
export async function POST(req: Request) {
  const payload = await requireAuth();
  if (payload instanceof NextResponse) return payload;

  // 速率限制
  await rateLimit(`user:${payload.userId}:create-template`);

  // ... 业务逻辑
}
```

---

## 七、测试策略

### 7.1 单元测试

**API 路由测试**:
```typescript
// src/app/api/templates/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from './route';

describe('/api/templates', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.panelTemplate.deleteMany();
  });

  it('应该返回模板列表', async () => {
    // 插入测试数据
    await prisma.panelTemplate.create({
      data: {
        name: '测试模板',
        panelCount: 3,
        templateData: {},
        isPublic: true
      }
    });

    const req = new Request('http://localhost/api/templates');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.templates).toHaveLength(1);
  });

  it('应该创建模板', async () => {
    const req = new Request('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: '新模板',
        panelIds: ['panel1', 'panel2', 'panel3']
      })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.template.name).toBe('新模板');
  });
});
```

**组件测试**:
```typescript
// components/Template/TemplateCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateCard } from './TemplateCard';

describe('TemplateCard', () => {
  const mockTemplate = {
    id: '1',
    name: '测试模板',
    thumbnailUrl: 'https://example.com/image.jpg',
    likesCount: 10,
    usageCount: 5
  };

  it('应该渲染模板信息', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('测试模板')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();  // likesCount
  });

  it('应该触发点击事件', () => {
    const onApply = vi.fn();
    render(<TemplateCard template={mockTemplate} onApply={onApply} />);

    fireEvent.click(screen.getByText('应用'));
    expect(onApply).toHaveBeenCalledWith(mockTemplate);
  });
});
```

### 7.2 集成测试

**端到端流程测试**:
```typescript
// tests/e2e/template-workflow.test.ts
import { test, expect } from '@playwright/test';

test('模板创建和应用流程', async ({ page }) => {
  // 1. 登录
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // 2. 进入项目编辑器
  await page.goto('/scripts/test-project-id');

  // 3. 选择分镜
  await page.click('[data-panel-id="1"]');
  await page.keyboard.down('Shift');
  await page.click('[data-panel-id="3"]');
  await page.keyboard.up('Shift');

  // 4. 保存为模板
  await page.click('text=保存为模板');
  await page.fill('input[name="name"]', '我的测试模板');
  await page.click('button:has-text("保存")');

  // 5. 验证模板已创建
  await page.goto('/templates');
  await expect(page.locator('text=我的测试模板')).toBeVisible();

  // 6. 应用模板到新项目
  await page.click('text=我的测试模板');
  await page.click('text=应用到项目');
  await expect(page.locator('text=模板已应用')).toBeVisible();
});
```

### 7.3 测试覆盖率目标

| 层级 | 目标覆盖率 | 优先级 |
|-----|-----------|--------|
| 核心业务逻辑 | 90% | P0 |
| API 路由 | 80% | P0 |
| 工具函数 | 85% | P1 |
| UI 组件 | 70% | P1 |
| 集成测试 | 关键流程 | P0 |

---

## 八、部署与监控

### 8.1 部署策略

**环境配置**:
```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# 功能开关
FEATURE_TEMPLATES_ENABLED=true
FEATURE_BATCH_GENERATION_ENABLED=true
FEATURE_VERSION_CONTROL_ENABLED=true
FEATURE_SEARCH_ENABLED=true
```

**数据库迁移**:
```bash
# 生产环境迁移流程
1. 备份数据库
   pg_dump manga_maker > backup_20251212.sql

2. 执行迁移
   npx prisma migrate deploy

3. 验证迁移
   npx prisma db pull

4. 如有问题,回滚
   psql manga_maker < backup_20251212.sql
```

**蓝绿部署**:
```
1. 部署新版本到 staging 环境
2. 运行集成测试
3. 逐步切换流量 (10% → 50% → 100%)
4. 监控错误率和性能指标
5. 如有问题,立即回滚
```

### 8.2 性能监控

**关键指标**:

| 指标 | 目标 | 告警阈值 |
|------|------|---------|
| API 响应时间 (P95) | < 500ms | > 1s |
| 数据库查询时间 (P95) | < 200ms | > 500ms |
| 错误率 | < 0.1% | > 1% |
| CPU 使用率 | < 70% | > 90% |
| 内存使用率 | < 80% | > 95% |

**监控工具**:
- **Sentry**: 错误追踪
- **Vercel Analytics**: 性能监控
- **Prisma Studio**: 数据库监控
- **Upstash Console**: Redis 监控

### 8.3 日志记录

**结构化日志**:
```typescript
// src/lib/logger.ts
export function logInfo(message: string, metadata?: object) {
  console.log(JSON.stringify({
    level: 'info',
    message,
    metadata,
    timestamp: new Date().toISOString()
  }));
}

export function logError(error: Error, metadata?: object) {
  console.error(JSON.stringify({
    level: 'error',
    message: error.message,
    stack: error.stack,
    metadata,
    timestamp: new Date().toISOString()
  }));
}
```

**日志级别**:
- DEBUG: 调试信息 (仅开发环境)
- INFO: 正常操作日志
- WARN: 警告信息 (如配额即将用完)
- ERROR: 错误信息 (需要处理)
- FATAL: 严重错误 (需要立即处理)

---

## 九、技术债务与优化

### 9.1 当前技术债务

| 债务项 | 优先级 | 预计工作量 | 影响 |
|-------|-------|-----------|------|
| TypeScript strict mode 关闭 | P0 | 3天 | 类型安全 |
| 缺少全局错误边界 | P1 | 1天 | 用户体验 |
| API 未版本化 | P1 | 2天 | 向后兼容 |
| 缺少自动化测试 | P0 | 5天 | 代码质量 |

### 9.2 第一阶段优化计划

**Week 1-2**:
- 开启 TypeScript strict mode
- 修复所有类型错误
- 添加 ESLint 规则

**Week 3-4**:
- 编写核心 API 单元测试
- 添加关键流程集成测试
- 设置 CI/CD

**Week 5-6**:
- 优化数据库查询
- 添加缓存层
- 性能测试

**Week 7-8**:
- 全局错误边界
- 日志系统完善
- 监控告警配置

### 9.3 未来优化方向

**第二阶段考虑引入**:
- Redis 缓存 (提升性能)
- WebSocket (实时协作)
- CDN (图片加速)
- 微服务化 (图片生成服务独立)

---

## 十、总结

### 10.1 架构亮点

**Good Taste**:
- 使用 JSON 字段灵活存储模板和版本数据
- 多态关联 (Tagging) 统一处理标签
- 增量存储版本,避免数据冗余

**Never break userspace**:
- 所有新表独立,不影响现有表
- API 保持向后兼容
- 数据迁移可回滚

**实用主义**:
- 使用 PostgreSQL 全文索引,不引入 Elasticsearch
- 轮询 + SSE 实现实时进度,不引入 WebSocket
- 冗余字段优化查询性能

**简洁执念**:
- 单一职责原则 (每个组件只做一件事)
- DRY 原则 (复用现有代码)
- 消除特殊情况 (统一的错误处理和响应格式)

### 10.2 关键指标

| 指标 | 目标 |
|------|------|
| 代码覆盖率 | > 80% |
| API 响应时间 (P95) | < 500ms |
| 数据库查询时间 (P95) | < 200ms |
| 错误率 | < 0.1% |
| 部署频率 | 每周 1 次 |
| 回滚率 | < 5% |

### 10.3 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 数据库迁移失败 | 低 | 高 | 完善的备份和回滚方案 |
| 性能问题 | 中 | 中 | 性能测试和监控告警 |
| 用户体验问题 | 中 | 中 | A/B 测试和用户反馈 |
| 安全漏洞 | 低 | 高 | 代码审查和安全测试 |

---

**文档结束**

下一步: 开发团队制定实施计划
