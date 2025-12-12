# API 接口文档

> 本文档包含 Manga Maker AI 项目的所有 API 接口定义、参数说明和使用场景。
>
> **生成日期**: 2025-12-12
> **项目**: Manga Maker AI - 数字演员漫画生成系统

---

## 目录

- [认证机制说明](#认证机制说明)
- [配额管理说明](#配额管理说明)
- [错误处理规范](#错误处理规范)
- [1. 认证相关 (Auth)](#1-认证相关-auth)
- [2. 角色管理 (Character)](#2-角色管理-character)
- [3. 场景管理 (Scene)](#3-场景管理-scene)
- [4. 故事管理 (Story)](#4-故事管理-story)
- [5. 项目和分镜 (Project & Panel)](#5-项目和分镜-project--panel)
- [6. 图片生成 (Image)](#6-图片生成-image)
- [7. 工作流 (Workflow)](#7-工作流-workflow)
- [8. 管理后台 (Admin)](#8-管理后台-admin)
- [9. 其他接口 (Others)](#9-其他接口-others)

---

## 认证机制说明

### Cookie 认证
- **Cookie 名称**: `comicai_session`（定义为常量 `AUTH_COOKIE_NAME`）
- **Token 类型**: JWT (JSON Web Token)
- **存储方式**: HTTP-only Cookie（前端无法通过 JavaScript 访问）
- **Token 有效期**: 7天

### Token Payload 结构
```typescript
interface AuthTokenPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
}
```

### 认证状态
- ✅ **需要认证**: 大部分业务接口
- 🔓 **无需认证**: 注册、登录、发送验证码、公开的漫画风格列表、提示词优化
- 👑 **需要管理员**: 所有 `/api/admin/*` 接口

---

## 配额管理说明

### 配额检查机制
所有 AI 生成接口都集成了每日配额检查，使用 `assertAndIncrementUsage()` 函数。

### 配额超限响应
```typescript
{
  error: "今日配额已用完",
  code: "QUOTA_EXCEEDED",
  usage: {
    count: 100,
    limit: 100
  }
}
```
**HTTP 状态码**: `429 Too Many Requests`

### 配额消耗规则
| 操作 | Action Key | 消耗额度 |
|------|-----------|---------|
| 角色三视图生成 | `generate_character_view` | 3次 |
| 单个表情生成 | `generate_expression` | 1次 |
| 全表情矩阵生成 | `generate_expression` | 9次 |
| 相似角色生成 | `generate_similar_character` | count * 1次 |
| 故事大纲生成 | `story_generation` | 1次 |
| 分镜图片生成 | `image_generation` | 1次 |
| 服装图片生成 | `generate_outfit` | 1次 |

---

## 错误处理规范

### 统一错误响应格式
```typescript
{
  error: string;        // 错误描述（中文）
  code?: string;        // 错误代码（可选）
  details?: any;        // 详细信息（可选）
}
```

### 常见 HTTP 状态码
| 状态码 | 含义 | 场景 |
|--------|------|------|
| 200 | 成功 | 正常响应 |
| 400 | 请求参数错误 | 缺少必填字段、格式错误 |
| 401 | 未认证 | 未登录、Token 无效 |
| 403 | 无权限 | 非管理员访问管理接口 |
| 404 | 资源不存在 | ID 不存在或已删除 |
| 409 | 冲突 | 邮箱已存在、资源冲突 |
| 429 | 配额超限 | 超过每日生成次数 |
| 500 | 服务器错误 | 数据库错误、LLM 调用失败 |

### 特殊错误代码
- `QUOTA_EXCEEDED`: 配额已用完
- `MODEL_NOT_CONFIGURED`: LLM 提供商未配置
- `VALIDATION_ERROR`: 参数验证失败
- `DUPLICATE_EMAIL`: 邮箱已存在
- `INVALID_CODE`: 验证码错误

---

## 1. 认证相关 (Auth)

### 1.1 用户注册

**接口**: `POST /api/auth/register`

**功能**: 用户注册（需先发送验证码验证邮箱）

**认证**: 无需

**请求参数**:
```typescript
{
  email: string;        // 邮箱地址（必填）
  password: string;     // 密码，8-64位（必填）
  code: string;         // 6位验证码（必填）
  name?: string;        // 昵称，2-32字符（可选）
}
```

**响应数据**:
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      verified: boolean;
      role: "user" | "admin";
      status: "active" | "suspended";
    }
  },
  message: "注册成功"
}
```

**使用位置**:
- `src/app/auth/register/page.tsx` - 注册页面

**流程说明**:
1. 用户输入邮箱后调用发送验证码接口
2. 输入验证码后提交注册
3. 系统验证验证码（bcrypt 哈希比对）
4. 创建用户并自动登录（设置 Cookie）

---

### 1.2 用户登录

**接口**: `POST /api/auth/login`

**功能**: 用户登录

**认证**: 无需

**请求参数**:
```typescript
{
  email: string;        // 邮箱地址
  password: string;     // 密码
}
```

**响应数据**:
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      verified: boolean;
      role: "user" | "admin";
      status: "active" | "suspended";
    }
  },
  message: "登录成功"
}
```

**使用位置**:
- `src/app/auth/login/page.tsx` - 登录页面

**流程说明**:
1. 验证邮箱和密码
2. 检查用户状态（是否被封禁）
3. 签发 JWT Token 并存储到 Cookie

---

### 1.3 用户登出

**接口**: `POST /api/auth/logout`

**功能**: 用户登出

**认证**: 无需

**响应数据**:
```typescript
{
  success: true,
  message: "已退出登录"
}
```

**使用位置**:
- `src/components/Header.tsx` - 顶部导航栏

**流程说明**:
清除认证 Cookie（设置过期时间为过去）

---

### 1.4 发送邮箱验证码

**接口**: `POST /api/auth/send-code`

**功能**: 发送邮箱验证码（用于注册）

**认证**: 无需

**请求参数**:
```typescript
{
  email: string;        // 邮箱地址
}
```

**响应数据**:
```typescript
{
  success: true,
  message: "验证码已发送，请在 10 分钟内完成验证"
}
```

**使用位置**:
- `src/app/auth/register/page.tsx` - 注册页面

**流程说明**:
1. 检查邮箱是否已注册
2. 生成 6 位随机验证码
3. 使用 bcrypt 哈希存储（防止数据库泄露）
4. 通过 SMTP 发送邮件
5. 验证码有效期 10 分钟，单次使用

---

### 1.5 获取当前用户信息

**接口**: `GET /api/auth/me`

**功能**: 获取当前登录用户的详细信息

**认证**: 必需

**响应数据**:
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      verified: boolean;
      created_at: Date;
      role: "user" | "admin";
      status: "active" | "suspended";
    }
  }
}
```

**使用位置**:
- `src/hooks/use-current-user.ts` - 全局用户状态 Hook
- `src/components/Header.tsx` - 顶部导航栏显示用户信息

---

## 2. 角色管理 (Character)

### 2.1 获取角色列表

**接口**: `GET /api/character`

**功能**: 获取当前用户的所有角色

**认证**: 必需

**响应数据**:
```typescript
{
  characters: Array<{
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    base_prompt: string | null;
    tags: string[];
    base_image_url: string | null;
    training_status: "pending" | "training" | "ready" | "failed";
    created_at: Date;
    updated_at: Date;
    views: CharacterView[];           // 三视图
    expressions: CharacterExpression[]; // 表情矩阵
    outfits: CharacterOutfit[];        // 服装列表
  }>
}
```

**使用位置**:
- `src/components/AssetLibrary/CharacterLibrary.tsx` - 角色库列表
- `src/app/admin/characters/page.tsx` - 管理后台角色列表

---

### 2.2 创建角色

**接口**: `POST /api/character`

**功能**: 创建新角色（自动创建默认服装）

**认证**: 必需

**请求参数** (支持两种格式):

#### 方式1: JSON 格式
```typescript
{
  name: string;              // 角色名称（必填）
  description?: string;      // 角色描述
  base_prompt?: string;      // 基础提示词
  tags?: string[];           // 标签数组
  base_image_url?: string;   // 基础图片 URL
}
```

#### 方式2: FormData 格式（支持图片上传）
```typescript
{
  name: string;              // 角色名称（必填）
  description?: string;
  base_prompt?: string;
  tags?: string;             // JSON 字符串，如 '["tag1","tag2"]'
  images: File[];            // 图片文件数组
}
```

**响应数据**:
```typescript
{
  character: Character;
  uploadedImages?: Array<{   // 使用 FormData 时返回
    url: string;
    type: string;
  }>;
  message: string;
}
```

**使用位置**:
- `src/components/AssetLibrary/CreateCharacterDialog.tsx` - 创建角色对话框

**流程说明**:
1. 验证角色名称（必填）
2. 如果包含图片文件，上传到 MinIO
3. 创建角色记录
4. 自动创建"默认装"（outfit_type: "default"）

---

### 2.3 获取角色详情

**接口**: `GET /api/character/[id]`

**功能**: 获取指定角色的详细信息

**认证**: 必需

**响应数据**:
```typescript
{
  character: Character & {
    views: CharacterView[];
    expressions: CharacterExpression[];
    outfits: CharacterOutfit[];
  }
}
```

**使用位置**:
- `src/components/AssetLibrary/CharacterDetailView.tsx` - 角色详情页

---

### 2.4 更新角色

**接口**: `PATCH /api/character/[id]`

**功能**: 更新角色信息

**认证**: 必需

**请求参数**:
```typescript
{
  name?: string;
  description?: string;
  base_prompt?: string;
  tags?: string[];
  base_image_url?: string;
  training_status?: "pending" | "training" | "ready" | "failed";
}
```

**响应数据**:
```typescript
{
  character: Character;
}
```

**使用位置**:
- `src/components/AssetLibrary/CharacterDetailView.tsx` - 角色详情编辑

---

### 2.5 删除角色

**接口**: `DELETE /api/character/[id]`

**功能**: 删除角色（级联删除三视图、表情、服装）

**认证**: 必需

**响应数据**:
```typescript
{
  success: true;
}
```

**使用位置**:
- `src/components/AssetLibrary/CharacterLibrary.tsx` - 角色库删除操作

---

### 2.6 生成角色三视图

**接口**: `POST /api/character/generate-views`

**功能**: 使用 AI 生成角色的正面、侧面、背面三视图

**认证**: 必需

**请求参数**:
```typescript
{
  character_id: string;          // 角色 ID（必填）
  description?: string;          // 自定义描述（可选，覆盖角色描述）
  provider_type?: string;        // LLM 提供商类型，默认 "image_generation_turnaround"
}
```

**响应数据**:
```typescript
{
  success: true;
  views: {
    front: { image_url: string; prompt: string; };
    side: { image_url: string; prompt: string; };
    back: { image_url: string; prompt: string; };
  };
  prompts: {
    front: string;
    side: string;
    back: string;
  };
  usage: {
    count: number;
    limit: number;
  };
  message: string;
}
```

**配额消耗**: 3次（每个视角1次）

**使用位置**:
- `src/components/AssetLibrary/CharacterDetailView.tsx` - 角色详情页生成按钮

**流程说明**:
1. 获取角色基础信息
2. 使用 LLM 分别生成三个视角的优化提示词
3. 并行调用 AI 图片生成接口
4. 存储生成的图片 URL 到 `character_views` 表

---

### 2.7 生成角色表情

**接口**: `POST /api/character/generate-expressions`

**功能**: 生成角色表情矩阵（单个表情或全部 9 个表情）

**认证**: 必需

**请求参数**:
```typescript
{
  character_id: string;          // 角色 ID（必填）
  expression_type?: string;      // 单个表情类型（可选）
  generate_all?: boolean;        // 生成全部表情（可选）
  provider_type?: string;        // 默认 "image_generation_expression"
}
```

**表情类型**:
- `neutral` - 中性
- `happy` - 开心
- `sad` - 悲伤
- `angry` - 愤怒
- `surprised` - 惊讶
- `shy` - 害羞
- `confident` - 自信
- `worried` - 担忧
- `determined` - 坚定

**响应数据**:
```typescript
{
  success: true;
  expressions: Record<string, {
    image_url: string;
    prompt: string;
  }>;
  usage: {
    count: number;
    limit: number;
  };
}
```

**配额消耗**:
- 单个表情: 1次
- 全部表情: 9次

**使用位置**:
- `src/components/AssetLibrary/CharacterDetailView.tsx` - 表情矩阵生成

---

### 2.8 生成相似角色

**接口**: `POST /api/character/generate-similar`

**功能**: 基于现有角色生成 1-3 个变体角色

**认证**: 必需

**请求参数**:
```typescript
{
  character_id: string;          // 原角色 ID（必填）
  variation_prompt: string;      // 变化描述，如"把她变成赛博朋克风格"（必填）
  count?: number;                // 生成数量 1-3，默认 1
  provider_type?: string;        // 默认 "image_generation_character"
}
```

**响应数据**:
```typescript
{
  success: true;
  generated_images: Array<{
    image_url: string;
    optimized_prompt: string;
  }>;
  original_character: {
    name: string;
    description: string;
    tags: string[];
  };
  usage: {
    count: number;
    limit: number;
  };
}
```

**配额消耗**: count * 1次

**使用位置**:
- `src/components/AssetLibrary/GenerateSimilarDialog.tsx` - 生成相似角色对话框

**流程说明**:
1. 使用 LLM 分析原角色特征
2. 结合变化描述生成新的提示词
3. 并行生成 1-3 张图片
4. 返回预览图供用户选择保存

---

### 2.9 获取角色关系图谱

**接口**: `GET /api/character/relationship`

**功能**: 获取用户所有角色在关系图谱中的位置配置

**认证**: 必需

**响应数据**:
```typescript
{
  relationships: Array<{
    character_id: string;
    position_x: number;
    position_y: number;
    scale: number;
  }>;
}
```

**使用位置**:
- `src/components/AssetLibrary/RelationshipChart.tsx` - 角色关系图谱

---

### 2.10 保存角色关系图谱

**接口**: `POST /api/character/relationship`

**功能**: 批量保存/更新角色在关系图谱中的位置

**认证**: 必需

**请求参数**:
```typescript
{
  relationships: Array<{
    character_id: string;
    position_x: number;    // X 坐标
    position_y: number;    // Y 坐标
    scale: number;         // 缩放比例
  }>;
}
```

**响应数据**:
```typescript
{
  success: true;
  message: "保存成功";
}
```

**使用位置**:
- `src/components/AssetLibrary/RelationshipChart.tsx` - 拖拽保存位置

**流程说明**:
使用 upsert 批量更新，支持幂等操作

---

### 2.11 删除关系图谱配置

**接口**: `DELETE /api/character/relationship?character_id=xxx`

**功能**: 删除指定角色的关系图谱配置

**认证**: 必需

**Query 参数**:
- `character_id`: 角色 ID

**使用位置**:
- `src/components/AssetLibrary/RelationshipChart.tsx`

---

### 2.12 上传角色图片

**接口**: `POST /api/character/upload-image`

**功能**: 统一的图片上传接口（三视图/表情/服装）

**认证**: 必需

**请求参数** (FormData):
```typescript
{
  file: File;                    // 图片文件（必填）
  character_id: string;          // 角色 ID（必填）
  type: "view" | "expression" | "outfit";  // 图片类型（必填）
  sub_type: string;              // 子类型（必填）
                                 // - type=view: "front" | "side" | "back"
                                 // - type=expression: "happy" | "sad" | ...
                                 // - type=outfit: outfit_id
  outfit_id?: string;            // type=outfit 时必填
}
```

**响应数据**:
```typescript
{
  success: true;
  image_url: string;
  message: string;
}
```

**使用位置**:
- `src/components/AssetLibrary/CharacterDetailView.tsx` - 手动上传图片替换

---

### 2.13 创建角色服装

**接口**: `POST /api/character/outfits`

**功能**: 为角色创建新服装（支持 AI 生成）

**认证**: 必需

**请求参数**:
```typescript
{
  character_id: string;          // 角色 ID（必填）
  outfit_name: string;           // 服装名称（必填）
  outfit_type: string;           // 服装类型（必填）
  description?: string;          // 服装描述
  generate_image?: boolean;      // 是否生成图片，默认 false
  provider_type?: string;        // 默认 "image_generation_outfit"
  reference_image_url?: string;  // 参考图 URL（可选）
}
```

**服装类型** (outfit_type):
- `default` - 默认装
- `school` - 校服
- `battle` - 战斗服
- `casual` - 休闲装
- `formal` - 正装
- `sleepwear` - 睡衣
- `sports` - 运动装
- `custom` - 自定义

**响应数据**:
```typescript
{
  success: true;
  outfit: CharacterOutfit;
  usage?: {
    count: number;
    limit: number;
  };
  message: string;
}
```

**配额消耗**: generate_image=true 时消耗 1 次

**使用位置**:
- `src/components/AssetLibrary/CharacterDetailView.tsx` - 服装管理

**流程说明**:
1. 如果未提供参考图，自动从角色的 base_image_url/表情图/三视图中选择
2. 支持幂等更新：同一角色同一 outfit_type 会更新而非创建新记录
3. 如果 generate_image=true，使用 LLM 生成服装图片

---

### 2.14 生成服装图片

**接口**: `POST /api/character/outfits/[id]/generate`

**功能**: 为已存在的服装生成图片

**认证**: 必需

**请求参数**:
```typescript
{
  wait?: boolean;  // 是否等待生成完成，默认 false
}
```

**响应数据**:
```typescript
{
  success: true;
  task_id: string;
  image_url?: string;  // wait=true 时返回
  message: string;
}
```

**使用位置**:
- `src/components/AssetLibrary/CharacterDetailView.tsx` - 服装重新生成

---

## 3. 场景管理 (Scene)

### 3.1 获取场景列表

**接口**: `GET /api/scene`

**功能**: 获取当前用户的所有场景

**认证**: 必需

**Query 参数**:
- `scene_type?: string` - 可选，按场景类型过滤

**场景类型**:
- `indoor` - 室内
- `outdoor` - 室外
- `urban` - 城市
- `nature` - 自然
- `fantasy` - 奇幻
- `scifi` - 科幻
- `historical` - 历史
- `abstract` - 抽象

**响应数据**:
```typescript
Array<{
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  scene_type: string;
  image_url: string | null;
  tags: string[];
  prompt: string | null;
  created_at: Date;
  updated_at: Date;
}>
```

**使用位置**:
- `src/components/AssetLibrary/SceneLibrary.tsx` - 场景库列表

---

### 3.2 创建场景

**接口**: `POST /api/scene`

**功能**: 创建新场景

**认证**: 必需

**请求参数**:
```typescript
{
  name: string;          // 场景名称（必填）
  description?: string;  // 场景描述
  scene_type: string;    // 场景类型（必填）
  image_url?: string;    // 场景图片 URL
  tags?: string[];       // 标签
  prompt?: string;       // 生成提示词
}
```

**使用位置**:
- `src/components/AssetLibrary/SceneLibrary.tsx` - 创建场景对话框

---

### 3.3 获取场景详情

**接口**: `GET /api/scene/[id]`

**功能**: 获取指定场景的详细信息

**认证**: 必需

---

### 3.4 更新场景

**接口**: `PATCH /api/scene/[id]`

**功能**: 更新场景信息

**认证**: 必需

**请求参数**: 与创建场景相同，所有字段可选

---

### 3.5 删除场景

**接口**: `DELETE /api/scene/[id]`

**功能**: 删除场景

**认证**: 必需

---

## 4. 故事管理 (Story)

### 4.1 获取故事列表

**接口**: `GET /api/story`

**功能**: 获取当前用户的所有故事（分页）

**认证**: 必需

**Query 参数**:
```typescript
{
  page?: number;     // 页码，默认 1
  limit?: number;    // 每页数量，默认 20
  status?: string;   // 状态过滤，可选
}
```

**响应数据**:
```typescript
{
  success: true;
  stories: Array<Story>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

**使用位置**:
- `src/app/scripts/page.tsx` - 故事列表页

---

### 4.2 创建故事

**接口**: `POST /api/story`

**功能**: 手动创建/保存故事

**认证**: 必需

**请求参数**:
```typescript
{
  title: string;        // 故事标题（必填）
  premise: string;      // 故事前提（必填）
  genre?: string;       // 故事类型
  outline?: object;     // 故事大纲（JSON）
  characters?: array;   // 角色列表（JSON）
  status?: string;      // 状态，默认 "draft"
}
```

**使用位置**:
- `src/components/Story/EditableStoryForm.tsx` - 手动保存故事

---

### 4.3 获取故事详情

**接口**: `GET /api/story/[id]`

**功能**: 获取指定故事的详细信息

**认证**: 必需

**使用位置**:
- `src/app/scripts/[id]/hooks/useStoryData.ts` - 故事编辑器数据加载

---

### 4.4 更新故事

**接口**: `PATCH /api/story/[id]`

**功能**: 更新故事信息

**认证**: 必需

**请求参数**:
```typescript
{
  title?: string;
  premise?: string;
  status?: string;
}
```

**使用位置**:
- `src/components/Story/EditableStoryForm.tsx` - 故事编辑

---

### 4.5 删除故事

**接口**: `DELETE /api/story/[id]`

**功能**: 删除故事

**认证**: 必需

**使用位置**:
- `src/app/scripts/page.tsx` - 故事列表删除

---

### 4.6 AI 生成故事大纲

**接口**: `POST /api/story/generate`

**功能**: 使用 AI 根据创意前提生成故事大纲

**认证**: 必需

**请求参数**:
```typescript
{
  premise: string;               // 故事前提，如"一个黑客发现了政府的阴谋"（必填）
  genre?: string;                // 故事类型
  characterCount?: number;       // 角色数量
  length?: "short" | "medium" | "long";  // 故事长度
  templateId?: string;           // 故事模板 ID（可选）
  saveToDb?: boolean;            // 是否保存到数据库，默认 true
}
```

**故事类型** (genre):
- `suspense` - 悬疑
- `romance` - 爱情
- `adventure` - 冒险
- `scifi` - 科幻
- `daily` - 日常
- `fantasy` - 奇幻

**响应数据**:
```typescript
{
  success: true;
  story?: Story;        // saveToDb=true 时返回
  outline?: object;     // saveToDb=false 时返回
  message: string;
}
```

**配额消耗**: 1次 story_generation

**使用位置**:
- `src/components/Story/StoryGenerator.tsx` - 故事生成器
- `src/app/page.tsx` - 首页快速生成

**流程说明**:
1. 使用 LLM (provider_type: "story_generator") 生成故事大纲
2. 大纲包含：标题、类型、角色列表、分幕结构、情节点
3. 如果 saveToDb=true，保存到 `stories` 表

---

### 4.7 扩展故事细节

**接口**: `POST /api/story/expand`

**功能**: 扩展故事的某一幕为详细场景

**认证**: 必需

**请求参数**:
```typescript
{
  storyId: string;       // 故事 ID（必填）
  actIndex: number;      // 幕索引（必填）
  detailLevel?: "brief" | "detailed";  // 详细程度，默认 "detailed"
}
```

**响应数据**:
```typescript
{
  success: true;
  expandedScenes: Array<Scene>;
  message: string;
}
```

**使用位置**:
- `src/components/Story/EditableStoryForm.tsx` - 展开故事细节

---

### 4.8 角色设定生成

**接口**: `POST /api/story/character-setup`

**功能**: 根据描述生成角色设定

**认证**: 必需

**请求参数**:
```typescript
{
  characterDescription: string;  // 角色描述（必填）
  storyContext?: string;         // 故事背景（可选）
}
```

**响应数据**:
```typescript
{
  success: true;
  character: StoryCharacter;
  message: string;
}
```

**使用位置**:
- `src/components/Story/CharacterSetupDialog.tsx` - 角色设定对话框

---

### 4.9 获取故事模板列表

**接口**: `GET /api/story/templates`

**功能**: 获取故事模板列表

**认证**: 可选（无 Token 则只返回公开模板）

**Query 参数**:
```typescript
{
  category?: string;              // 分类过滤
  public_only?: "true" | "false"; // 只返回公开模板
}
```

**响应数据**:
```typescript
{
  success: true;
  templates: Array<StoryTemplate>;
  count: number;
}
```

**使用位置**:
- `src/components/Story/StoryTemplateSelector.tsx` - 模板选择器

---

### 4.10 创建故事模板

**接口**: `POST /api/story/templates`

**功能**: 创建自定义故事模板

**认证**: 必需

**请求参数**:
```typescript
{
  name: string;          // 模板名称（必填）
  category: string;      // 分类（必填）
  description?: string;  // 描述
  structure: object;     // 结构定义（JSON）
  prompts?: object;      // 提示词模板（JSON）
  isPublic?: boolean;    // 是否公开，默认 false
}
```

**使用位置**:
- `src/components/Story/StoryTemplateSelector.tsx` - 创建模板对话框

---

### 4.11 获取模板详情

**接口**: `GET /api/story/templates/[id]`

**功能**: 获取模板详情（自动增加使用次数）

**认证**: 无需

**流程说明**:
每次访问自动增加 `usage_count` 字段

---

### 4.12 更新故事模板

**接口**: `PATCH /api/story/templates/[id]`

**功能**: 更新模板（仅所有者）

**认证**: 必需

---

### 4.13 删除故事模板

**接口**: `DELETE /api/story/templates/[id]`

**功能**: 删除模板（仅所有者）

**认证**: 必需

---

### 4.14 获取故事分镜列表

**接口**: `GET /api/story/[id]/panels`

**功能**: 获取故事关联项目的所有分镜

**认证**: 必需

**响应数据**:
```typescript
{
  success: true;
  panels: Array<Panel>;
  projectId?: string;
}
```

**使用位置**:
- `src/app/scripts/[id]/components/PanelListView.tsx` - 分镜列表视图

---

## 5. 项目和分镜 (Project & Panel)

### 5.1 获取项目列表

**接口**: `GET /api/project`

**功能**: 获取当前用户的所有项目（含分镜）

**认证**: 必需

**响应数据**:
```typescript
{
  projects: Array<Project & {
    panels: Panel[];
  }>;
}
```

**使用位置**:
- `src/hooks/use-storyboard-data.ts` - 分镜板数据加载

---

### 5.2 删除项目

**接口**: `DELETE /api/project?id=xxx`

**功能**: 删除项目（级联删除所有分镜）

**认证**: 必需

**Query 参数**:
- `id`: 项目 ID

---

### 5.3 获取项目详情

**接口**: `GET /api/project/[id]`

**功能**: 获取项目详情（含分镜和脚本）

**认证**: 必需

**响应数据**:
```typescript
{
  project: Project & {
    panels: Panel[];
    script: StoryScript | null;
  };
}
```

**使用位置**:
- `src/app/scripts/[id]/hooks/useStoryData.ts` - 项目编辑器

---

### 5.4 更新项目

**接口**: `PATCH /api/project/[id]`

**功能**: 更新项目信息

**认证**: 必需

**请求参数**:
```typescript
{
  title?: string;
  description?: string;
  style?: string;
  status?: string;
  cover_image?: string;
}
```

---

### 5.5 创建分镜

**接口**: `POST /api/panel`

**功能**: 创建新分镜

**认证**: 必需

**请求参数**:
```typescript
{
  project_id: string;         // 项目 ID（必填）
  description?: string;       // 分镜描述
  panel_type?: string;        // 分镜类型
  importance?: "high" | "medium" | "low";  // 重要性
  camera_angle?: string;      // 机位角度
  shot_size?: string;         // 景别
  dialogue?: string;          // 对白
  character_name?: string;    // 角色名称
  emotion?: string;           // 情绪
  panel_order?: number;       // 排序位置（可选，不提供则追加到末尾）
}
```

**分镜类型** (panel_type):
- `wide` - 宽镜
- `medium` - 中景
- `closeup` - 特写
- `action` - 动作镜头
- `dialogue` - 对话镜头
- `transition` - 转场镜头

**机位角度** (camera_angle):
- `俯视` - 俯视
- `仰视` - 仰视
- `平视` - 平视
- `荷兰角` - 荷兰角

**景别** (shot_size):
- `特写` - 特写
- `近景` - 近景
- `中景` - 中景
- `全景` - 全景
- `远景` - 远景

**使用位置**:
- `src/app/scripts/[id]/components/PanelListView.tsx` - 分镜创建

---

### 5.6 更新分镜

**接口**: `PATCH /api/panel/[id]`

**功能**: 更新分镜信息

**认证**: 必需

**请求参数**: 与创建分镜相同，所有字段可选

**使用位置**:
- `src/app/scripts/[id]/components/PanelListView.tsx` - 分镜编辑

---

### 5.7 删除分镜

**接口**: `DELETE /api/panel/[id]`

**功能**: 删除分镜（自动重排序后续分镜）

**认证**: 必需

**使用位置**:
- `src/app/scripts/[id]/components/PanelListView.tsx` - 分镜删除

**流程说明**:
删除后自动将后续分镜的 `panel_order` 减 1

---

### 5.8 插入分镜

**接口**: `POST /api/panel/insert`

**功能**: 在指定位置插入新分镜（使用 LLM 生成内容）

**认证**: 必需

**请求参数**:
```typescript
{
  project_id: string;          // 项目 ID（必填）
  insert_after_order: number;  // 插入位置（必填）
  description: string;         // 分镜描述（必填）
  use_llm?: boolean;           // 是否使用 LLM 生成，默认 true
}
```

**响应数据**:
```typescript
{
  success: true;
  panel: Panel;
  message: string;
}
```

**使用位置**:
- `src/app/scripts/[id]/components/PanelEditor/InsertPanelDialog.tsx` - 插入分镜对话框

**流程说明**:
1. 将 insert_after_order 之后的所有分镜 `panel_order` 加 1
2. 如果 use_llm=true，使用 LLM 分析描述并生成分镜细节
3. 插入新分镜到指定位置

---

### 5.9 拆分分镜

**接口**: `POST /api/panel/split`

**功能**: 将一个分镜拆分为两个（使用 LLM）

**认证**: 必需

**请求参数**:
```typescript
{
  panel_id: string;     // 分镜 ID（必填）
  split_hint?: string;  // 拆分提示（可选）
}
```

**响应数据**:
```typescript
{
  success: true;
  panels: [Panel, Panel];  // 返回 2 个新分镜
  message: string;
}
```

**使用位置**:
- `src/app/scripts/[id]/components/PanelEditor/SplitPanelDialog.tsx` - 拆分分镜对话框

**流程说明**:
1. 使用 LLM 分析原分镜内容
2. 根据拆分提示生成两个新分镜
3. 删除原分镜，插入两个新分镜

---

### 5.10 合并分镜

**接口**: `POST /api/panel/merge`

**功能**: 合并两个相邻分镜（使用 LLM）

**认证**: 必需

**请求参数**:
```typescript
{
  panel_ids: string[];   // 分镜 ID 数组，必须是 2 个（必填）
  project_id: string;    // 项目 ID（必填）
}
```

**响应数据**:
```typescript
{
  success: true;
  panel: Panel;  // 合并后的新分镜
  message: string;
}
```

**使用位置**:
- `src/app/scripts/[id]/components/PanelListView.tsx` - 合并分镜操作

**流程说明**:
1. 使用 LLM 分析两个分镜内容
2. 生成合并后的新分镜描述
3. 删除原分镜，插入新分镜

---

### 5.11 重排序分镜

**接口**: `PUT /api/panel/reorder`

**功能**: 重新排序分镜

**认证**: 必需

**请求参数**:
```typescript
{
  panel_id: string;     // 分镜 ID（必填）
  new_order: number;    // 新的排序位置（必填）
  project_id: string;   // 项目 ID（必填）
}
```

**使用位置**:
- `src/app/scripts/[id]/hooks/usePanelDragDrop.ts` - 拖拽排序

**流程说明**:
自动调整其他分镜的 `panel_order` 以保持连续性

---

### 5.12 组装分镜提示词

**接口**: `POST /api/panel/build-prompt`

**功能**: 根据分镜/角色/风格组装"三明治"提示词

**认证**: 必需

**请求参数**:
```typescript
{
  panel_id: string;         // 分镜 ID（必填）
  character_id?: string;    // 角色 ID（可选）
  style_key?: string;       // 风格 key（可选）
  soften?: boolean;         // 柔和处理，默认 true
  aspect_ratio?: string;    // 宽高比（可选）
}
```

**响应数据**:
```typescript
{
  success: true;
  prompt: string;                // 组装后的正向提示词
  negative_prompt: string;       // 负向提示词
  replacements: object;          // 替换变量
  blocks: object;                // 提示词块结构
  panel: Panel;
  message: string;
}
```

**使用位置**:
- `src/app/scripts/[id]/hooks/usePanelGeneration.ts` - 生成前组装提示词

**流程说明**:
1. 获取分镜描述、角色特征、风格前缀
2. 替换模板变量（如 `{character_name}`, `{emotion}`）
3. 组装为"三明治"结构：风格前缀 + 角色特征 + 场景描述 + 风格后缀

---

### 5.13 生成分镜图片（单个）

**接口**: `POST /api/panel/generate-image`

**功能**: 为单个分镜生成图片

**认证**: 必需

**请求参数**:
```typescript
{
  panel_id: string;    // 分镜 ID（必填）
  prompt: string;      // 生成提示词（必填）
  style?: string;      // 风格（可选）
  wait?: boolean;      // 是否等待生成完成，默认 false
}
```

**响应数据**:
```typescript
{
  success: true;
  task_id: string;
  status: string;
  image_url?: string;  // wait=true 时返回
  usage: {
    count: number;
    limit: number;
  };
}
```

**配额消耗**: 1次 image_generation

**使用位置**:
- `src/app/scripts/[id]/hooks/usePanelGeneration.ts` - 单个分镜生成

**流程说明**:
1. 创建生成任务
2. 调用 AI 图片生成接口（异步）
3. 如果 wait=false，立即返回 task_id
4. 如果 wait=true，轮询直到生成完成

---

### 5.14 生成分镜图片（批量）

**接口**: `PUT /api/panel/generate-image`

**功能**: 批量生成项目的所有分镜图片

**认证**: 必需

**请求参数**:
```typescript
{
  project_id: string;  // 项目 ID（必填）
}
```

**响应数据**:
```typescript
{
  success: true;
  task_ids: string[];
  panel_count: number;
  usage: {
    count: number;
    limit: number;
  };
}
```

**配额消耗**: panel_count * 1次

**使用位置**:
- `src/app/scripts/[id]/hooks/useBatchGeneration.ts` - 批量生成分镜

**流程说明**:
1. 获取项目所有分镜
2. 为每个分镜创建生成任务
3. 并行调用 AI 生成接口
4. 返回所有 task_id 数组

---

## 6. 图片生成 (Image)

### 6.1 获取画面版本列表

**接口**: `GET /api/image/page`

**功能**: 获取画面版本列表（分页）

**认证**: 必需

**Query 参数**:
```typescript
{
  project_id?: string;      // 项目 ID 过滤
  task_id?: string;         // 任务 ID 过滤
  include_schema?: "true";  // 是否包含 canvas schema
  page?: number;            // 页码，默认 1
  page_size?: number;       // 每页数量，默认 20，最大 200
}
```

**使用位置**:
- `src/app/editor/hooks/useVersionManager.ts` - 版本管理器

---

### 6.2 创建画面版本

**接口**: `POST /api/image/page`

**功能**: 创建画面版本记录

**认证**: 必需

**请求参数**:
```typescript
{
  label: string;                            // 版本标签（必填）
  sourceType: "original" | "optimize" | "layout" | "upload";  // 来源类型（必填）
  imageUrl?: string;                        // 图片 URL
  status?: "pending" | "completed" | "failed";  // 状态
  projectId?: string;                       // 项目 ID
  taskId?: string;                          // 任务 ID
  metadata?: object;                        // 元数据（JSON）
  canvasSchema?: object;                    // Canvas 画布配置（JSON）
}
```

**使用位置**:
- `src/app/editor/hooks/useVersionManager.ts` - 保存版本

---

### 6.3 查询生成任务状态

**接口**: `GET /api/image/task/[id]`

**功能**: 查询异步图片生成任务的状态

**认证**: 必需

**响应数据**:
```typescript
{
  success: true;
  task: {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    image_url?: string;
    error?: string;
  };
}
```

**使用位置**:
- `src/app/scripts/[id]/hooks/usePanelGeneration.ts` - 轮询任务状态

---

### 6.4 批量查询任务状态

**接口**: `GET /api/image/task-status?task_ids=id1,id2,id3`

**功能**: 批量查询多个任务状态

**认证**: 必需

**Query 参数**:
- `task_ids`: 任务 ID 列表（逗号分隔）

**使用位置**:
- `src/app/scripts/[id]/hooks/useBatchGeneration.ts` - 批量任务监控

---

### 6.5 图片优化

**接口**: `POST /api/image/optimize`

**功能**: 对生成的图片进行后处理优化

**认证**: 必需

**请求参数**:
```typescript
{
  image_url: string;    // 原图 URL（必填）
  optimize_type: string;  // 优化类型（必填）
}
```

**优化类型**:
- `enhance` - 增强画质
- `upscale` - 放大
- `fix_face` - 修复人脸
- `remove_bg` - 去除背景

**使用位置**:
- `src/app/editor/hooks/useImageOptimizer.ts` - 图片优化器

---

## 7. 工作流 (Workflow)

### 7.1 获取工作流列表

**接口**: `GET /api/workflow`

**功能**: 获取当前用户的工作流列表

**认证**: 必需

**Query 参数**:
```typescript
{
  status?: string;   // 状态过滤
  limit?: number;    // 数量限制，默认 20
}
```

**响应数据**:
```typescript
{
  workflows: Array<Workflow>;
}
```

**使用位置**:
- `src/components/Workflow/WorkflowDashboard.tsx` - 工作流仪表板

---

### 7.2 一键生成完整漫画

**接口**: `POST /api/workflow/auto-generate`

**功能**: 从创意到图片的全自动生成流程

**认证**: 必需

**请求参数**:
```typescript
{
  premise: string;                       // 故事前提（必填）
  genre?: string;                        // 故事类型
  characterCount?: number;               // 角色数量
  storyLength?: "short" | "medium" | "long";  // 故事长度
  templateId?: string;                   // 故事模板 ID
  panelCount?: number;                   // 分镜数量
  style?: string;                        // 漫画风格
  generateImages?: boolean;              // 是否生成图片，默认 true
  exportFormat?: string;                 // 导出格式
}
```

**响应数据**:
```typescript
{
  success: true;
  workflow_id: string;
  result?: object;  // 生成结果（如果立即完成）
  message: string;
}
```

**配额消耗**:
- 1次 story_generation（故事生成）
- 1次 story_expansion（分镜生成）
- panelCount * 1次 image_generation（图片生成）

**使用位置**:
- `src/components/Workflow/AutoGenerateDialog.tsx` - 一键生成对话框
- `src/app/page.tsx` - 首页快速生成

**流程说明**:
1. 生成故事大纲
2. 创建项目
3. 生成分镜列表
4. （可选）批量生成图片
5. （可选）导出成品

---

### 7.3 查询工作流状态

**接口**: `GET /api/workflow/[id]/status`

**功能**: 查询工作流的实时状态和进度

**认证**: 必需

**响应数据**:
```typescript
{
  workflow: {
    id: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    progress: number;      // 0-100
    current_step: string;
    result?: object;
    error?: string;
  };
}
```

**使用位置**:
- `src/components/Workflow/WorkflowDashboard.tsx` - 工作流监控

---

### 7.4 恢复工作流

**接口**: `POST /api/workflow/[id]/resume`

**功能**: 恢复失败或取消的工作流

**认证**: 必需

**使用位置**:
- `src/components/Workflow/WorkflowDashboard.tsx` - 重试按钮

---

## 8. 管理后台 (Admin)

> 所有 `/api/admin/*` 接口需要管理员权限 (`role="admin"`)

### 8.1 获取用户列表

**接口**: `GET /api/admin/users`

**功能**: 获取所有用户列表

**认证**: 必需（管理员）

**响应数据**:
```typescript
{
  success: true;
  data: {
    users: Array<User>;
  };
}
```

**使用位置**:
- `src/app/admin/users/page.tsx` - 用户管理页

---

### 8.2 创建用户

**接口**: `POST /api/admin/users`

**功能**: 创建新用户

**认证**: 必需（管理员）

**请求参数**:
```typescript
{
  email: string;                         // 邮箱（必填）
  password: string;                      // 密码（必填）
  name?: string;                         // 昵称
  role?: "user" | "admin";               // 角色，默认 "user"
  status?: "active" | "banned";          // 状态，默认 "active"
  verified?: boolean;                    // 邮箱验证，默认 false
}
```

---

### 8.3 更新用户

**接口**: `PUT /api/admin/users/[id]`

**功能**: 更新用户信息

**认证**: 必需（管理员）

**请求参数**:
```typescript
{
  name?: string;
  role?: "user" | "admin";
  status?: "active" | "banned";
  verified?: boolean;
  password?: string;
}
```

**使用位置**:
- `src/app/admin/users/page.tsx` - 用户编辑/封禁

---

### 8.4 删除用户

**接口**: `DELETE /api/admin/users/[id]`

**功能**: 删除用户（级联删除所有关联数据）

**认证**: 必需（管理员）

---

### 8.5 获取所有角色

**接口**: `GET /api/admin/characters`

**功能**: 获取所有角色（支持搜索和过滤）

**认证**: 必需（管理员）

**Query 参数**:
```typescript
{
  keyword?: string;    // 关键词搜索（名称/描述）
  userId?: string;     // 按用户 ID 过滤
  status?: string;     // 按训练状态过滤
  page?: number;       // 页码，默认 1
  limit?: number;      // 每页数量，默认 20
}
```

**使用位置**:
- `src/app/admin/characters/page.tsx` - 角色管理页

---

### 8.6 创建角色（为指定用户）

**接口**: `POST /api/admin/characters`

**功能**: 为指定用户创建角色

**认证**: 必需（管理员）

**请求参数**:
```typescript
{
  user_id: string;          // 用户 ID（必填）
  name: string;             // 角色名称（必填）
  description?: string;
  base_prompt?: string;
  tags?: string[];
  base_image_url?: string;
  training_status?: string;
}
```

---

### 8.7 获取所有漫画风格

**接口**: `GET /api/admin/comic-styles`

**功能**: 获取所有漫画风格（含禁用的）

**认证**: 必需（管理员）

**使用位置**:
- `src/app/admin/comic-styles/page.tsx` - 风格管理页

---

### 8.8 创建漫画风格

**接口**: `POST /api/admin/comic-styles`

**功能**: 创建新的漫画风格

**认证**: 必需（管理员）

**请求参数**:
```typescript
{
  style_key: string;         // 唯一标识（必填）
  name_zh: string;           // 中文名称（必填）
  name_en: string;           // 英文名称（必填）
  image_url: string;         // 预览图 URL（必填）
  tag_color?: string;        // 标签颜色
  description?: string;      // 描述
  prompt_prefix?: string;    // 提示词前缀
  sort_order?: number;       // 排序
  enabled?: boolean;         // 是否启用，默认 true
}
```

**使用位置**:
- `src/app/admin/comic-styles/page.tsx` - 创建风格

---

### 8.9 更新漫画风格

**接口**: `PATCH /api/admin/comic-styles/[id]`

**功能**: 更新漫画风格

**认证**: 必需（管理员）

**请求参数**: 与创建风格相同，所有字段可选

---

### 8.10 删除漫画风格

**接口**: `DELETE /api/admin/comic-styles/[id]`

**功能**: 删除漫画风格

**认证**: 必需（管理员）

---

### 8.11 获取使用统计

**接口**: `GET /api/admin/usage`

**功能**: 获取所有用户的使用统计和生成日志

**认证**: 必需（管理员）

**Query 参数**:
```typescript
{
  userId?: string;    // 按用户 ID 过滤
  limit?: number;     // 数量限制，默认 50，最大 200
  days?: number;      // 天数范围，默认 7，最大 30
  from?: string;      // 开始日期（ISO 格式）
  to?: string;        // 结束日期（ISO 格式）
  action?: string;    // 按操作类型过滤
  status?: string;    // 按状态过滤（success/error）
}
```

**响应数据**:
```typescript
{
  success: true;
  data: {
    usageStats: Array<UsageStat>;
    generationLogs: Array<GenerationLog>;
    meta: {
      since: string;
      until: string;
      limit: number;
      userId?: string;
      action?: string;
      status?: string;
    };
  };
}
```

**使用位置**:
- `src/app/admin/usage/page.tsx` - 使用统计页

---

## 9. 其他接口 (Others)

### 9.1 上传图片

**接口**: `POST /api/upload`

**功能**: 上传图片到 MinIO 存储

**认证**: 必需

**请求参数** (FormData):
```typescript
{
  file: File;                              // 图片文件（必填）
  characterId: string;                     // 角色 ID（必填）
  type?: "base" | "reference" | "view" | "expression";  // 图片类型
}
```

**响应数据**:
```typescript
{
  success: true;
  url: string;       // MinIO 公开 URL
  message: string;
}
```

**使用位置**:
- `src/components/AssetLibrary/CreateCharacterDialog.tsx` - 上传角色图片
- `src/components/AssetLibrary/SceneLibrary.tsx` - 上传场景图片

---

### 9.2 提示词优化

**接口**: `POST /api/prompt/optimize`

**功能**: 使用 AI 优化用户提示词

**认证**: 无需

**请求参数**:
```typescript
{
  prompt: string;       // 原始提示词（必填）
  style?: string;       // 风格参考
  character?: string;   // 角色参考
}
```

**响应数据**:
```typescript
{
  analysis: string;        // 提示词分析
  optimized: string;       // 优化后的提示词
  suggestions: string[];   // 改进建议
  original: string;        // 原始提示词
}
```

**使用位置**:
- `src/components/PromptOptimizationDialog.tsx` - 提示词优化对话框

**流程说明**:
使用 LLM (provider_type: "prompt_optimizer") 分析并优化提示词

---

### 9.3 获取漫画风格列表（公开）

**接口**: `GET /api/comic-styles`

**功能**: 获取启用的漫画风格列表

**认证**: 无需

**Query 参数**:
- `enabled?: "true" | "false"` - 默认 "true"（只返回启用的）

**响应数据**:
```typescript
{
  styles: Array<ComicStyle>;
}
```

**使用位置**:
- `src/app/storyboard/hooks/useMetadata.ts` - 风格选择器

---

### 9.4 获取漫画风格详情（公开）

**接口**: `GET /api/comic-styles/[id]`

**功能**: 获取指定风格的详情

**认证**: 无需

---

### 9.5 获取 LLM 提供商列表

**接口**: `GET /api/llm-providers`

**功能**: 获取所有 LLM 提供商配置

**认证**: 必需（管理员）

**使用位置**:
- `src/app/admin/llm-providers/hooks/useProviders.ts` - LLM 提供商管理

---

### 9.6 创建 LLM 提供商

**接口**: `POST /api/llm-providers`

**功能**: 创建新的 LLM 提供商配置

**认证**: 必需（管理员）

**请求参数**:
```typescript
{
  provider_type: string;    // 提供商类型，如 "prompt_optimizer"（必填）
  provider_name: string;    // 提供商名称，如 "openai"（必填）
  model: string;            // 模型名称（必填）
  base_url: string;         // API Base URL（必填）
  api_key?: string;         // API Key
  priority?: number;        // 优先级，数字越小优先级越高，默认 1
  enabled?: boolean;        // 是否启用，默认 true
  desc?: string;            // 描述
}
```

**提供商类型** (provider_type):
- `prompt_optimizer` - 提示词优化
- `character_analyzer` - 角色分析
- `story_generator` - 故事生成
- `script_analyzer` - 脚本分析
- `style_generator` - 风格生成
- `image_generation` - 图片生成
- `image_generation_turnaround` - 三视图生成
- `image_generation_expression` - 表情生成
- `image_generation_character` - 角色生成
- `image_generation_outfit` - 服装生成

---

### 9.7 更新 LLM 提供商

**接口**: `PUT /api/llm-providers/[id]`

**功能**: 更新 LLM 提供商配置

**认证**: 必需（管理员）

**请求参数**: 与创建提供商相同，所有字段可选

---

### 9.8 删除 LLM 提供商

**接口**: `DELETE /api/llm-providers/[id]`

**功能**: 删除 LLM 提供商配置

**认证**: 必需（管理员）

---

### 9.9 获取当前用户配额

**接口**: `GET /api/usage`

**功能**: 获取当前用户的当日配额使用情况

**认证**: 必需

**响应数据**:
```typescript
{
  success: true;
  data: {
    daily_usage: {
      image_generation: { count: number; limit: number; };
      story_generation: { count: number; limit: number; };
      // ... 其他操作类型
    };
    total_usage: {
      all_time: number;
      this_month: number;
      this_week: number;
    };
  };
}
```

**使用位置**:
- `src/hooks/use-usage.ts` - 配额显示 Hook
- `src/app/storyboard/components/UsageBadge.tsx` - 配额徽章

---

## 附录

### A. 常用类型定义

#### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  verified: boolean;
  role: "user" | "admin";
  status: "active" | "suspended";
  created_at: Date;
  updated_at: Date;
}
```

#### Character
```typescript
interface Character {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  base_prompt: string | null;
  tags: string[];
  base_image_url: string | null;
  training_status: "pending" | "training" | "ready" | "failed";
  created_at: Date;
  updated_at: Date;
}
```

#### Story
```typescript
interface Story {
  id: string;
  user_id: string;
  title: string;
  premise: string;
  genre: string | null;
  outline: object | null;
  characters: object | null;
  status: "draft" | "completed" | "archived";
  created_at: Date;
  updated_at: Date;
}
```

#### Project
```typescript
interface Project {
  id: string;
  user_id: string;
  story_id: string | null;
  title: string;
  description: string | null;
  style: string | null;
  status: "draft" | "in_progress" | "completed";
  cover_image: string | null;
  created_at: Date;
  updated_at: Date;
}
```

#### Panel
```typescript
interface Panel {
  id: string;
  project_id: string;
  panel_order: number;
  description: string | null;
  panel_type: string | null;
  importance: "high" | "medium" | "low" | null;
  camera_angle: string | null;
  shot_size: string | null;
  dialogue: string | null;
  character_name: string | null;
  emotion: string | null;
  image_url: string | null;
  prompt: string | null;
  created_at: Date;
  updated_at: Date;
}
```

---

### B. LLM 提供商配置说明

系统使用 `provider_type` 作为查找 LLM 配置的关键字，支持多个提供商配置同一类型（通过 `priority` 排序）。

#### 配置示例
```sql
INSERT INTO llm_providers (provider_type, provider_name, model, base_url, api_key, priority, enabled)
VALUES ('prompt_optimizer', 'openai', 'gpt-4', 'https://api.openai.com', 'sk-...', 1, true);
```

#### 调用示例
```typescript
import { callChatCompletionByType } from "@/lib/llm-provider";

const result = await callChatCompletionByType({
  providerType: "prompt_optimizer",
  messages: [
    { role: "system", content: "You are a prompt optimization expert" },
    { role: "user", content: userInput }
  ],
  temperature: 0.6,
  maxTokens: 1500
});

const content = result.content; // LLM 响应文本
```

---

### C. MinIO 文件上传配置

#### 环境变量
```bash
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=manga-assets
```

#### 上传辅助函数
```typescript
import { uploadBase64Image } from "@/lib/upload-helpers";

const imageUrl = await uploadBase64Image(base64String, "character-123.png");
// 返回: http://localhost:9000/manga-assets/character-123.png
```

---

### D. 配额限制表

| 操作类型 | 每日限制 | 消耗规则 |
|---------|---------|---------|
| 角色三视图 | 100次 | 3次/调用 |
| 表情生成 | 100次 | 1次/表情 |
| 相似角色 | 100次 | count * 1次 |
| 故事生成 | 50次 | 1次/调用 |
| 分镜图片 | 500次 | 1次/分镜 |
| 服装生成 | 100次 | 1次/调用 |

---

**文档结束**

如有疑问或需要补充，请联系技术团队。
