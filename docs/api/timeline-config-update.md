# Timeline Config Update API

## 概述

更新时间线配置的 API 端点，支持部分更新，特别支持设置默认漫画风格。

## 端点

```
PATCH /api/canvas/timeline/{id}
```

## 认证

需要有效的 JWT token（通过 `comicai_session` cookie）

## 请求参数

### Path Parameters

- `id` (string, UUID) - 时间线 ID

### Request Body

所有字段都是可选的，支持部分更新。

```typescript
{
  title?: string;                    // 时间线标题 (1-200 字符)
  status?: "draft" | "generating" | "completed" | "error";
  config?: {
    auto_generate?: boolean;         // 是否自动生成
    use_character_library?: boolean; // 是否使用角色库
    use_scene_library?: boolean;     // 是否使用场景库
    default_comic_style_id?: string | null;  // 默认漫画风格 ID (UUID 或 null)
    ai_model?: "gpt-4" | "gpt-3.5-turbo";
    shot_density?: "sparse" | "medium" | "dense";
    visual_style?: "manga" | "realistic" | "anime";
    language?: "zh-CN" | "en-US";
  }
}
```

### 关键字段说明

**`config.default_comic_style_id`**:
- `null` - 未设置默认风格
- `"uuid-string"` - 指向 `comic_styles` 表中的风格 ID
- 必须是有效且启用的风格 ID，否则返回 400 错误

## 响应

### 成功响应 (200 OK)

```json
{
  "success": true,
  "timeline": {
    "id": "uuid",
    "novel_project_id": "uuid",
    "user_id": "uuid",
    "title": "时间线标题",
    "status": "draft",
    "config": {
      "auto_generate": true,
      "use_character_library": true,
      "use_scene_library": true,
      "default_comic_style_id": "uuid-or-null"
    },
    "total_chapters": 0,
    "completed_chapters": 0,
    "total_shots": 0,
    "total_images": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 错误响应

#### 401 Unauthorized
```json
{
  "error": "未登录"
}
```

```json
{
  "error": "无效的token"
}
```

#### 404 Not Found
```json
{
  "error": "时间线不存在"
}
```

#### 400 Bad Request

**验证失败**:
```json
{
  "error": "请求参数验证失败",
  "details": {
    "config": {
      "default_comic_style_id": ["Invalid uuid"]
    }
  }
}
```

**无效的风格 ID**:
```json
{
  "error": "指定的漫画风格不存在或已禁用"
}
```

#### 500 Internal Server Error
```json
{
  "error": "更新时间线失败"
}
```

## 使用示例

### 1. 设置默认漫画风格

```bash
curl -X PATCH http://localhost:3000/api/canvas/timeline/YOUR_TIMELINE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "config": {
      "default_comic_style_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }'
```

### 2. 取消设置默认风格

```bash
curl -X PATCH http://localhost:3000/api/canvas/timeline/YOUR_TIMELINE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "config": {
      "default_comic_style_id": null
    }
  }'
```

### 3. 同时更新多个配置

```bash
curl -X PATCH http://localhost:3000/api/canvas/timeline/YOUR_TIMELINE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "title": "第一季剧本（修订版）",
    "config": {
      "default_comic_style_id": "550e8400-e29b-41d4-a716-446655440000",
      "shot_density": "dense",
      "use_character_library": true
    }
  }'
```

### 4. 仅更新标题（不修改配置）

```bash
curl -X PATCH http://localhost:3000/api/canvas/timeline/YOUR_TIMELINE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "title": "新标题"
  }'
```

## 实现细节

### 安全性

1. **用户授权**: 验证时间线属于当前用户 (`timeline.user_id === payload.userId`)
2. **风格验证**: 检查指定的 `comic_style_id` 在数据库中存在且已启用
3. **Zod 验证**: 使用 `UpdateTimelineConfigRequestSchema` 验证所有输入

### 配置更新机制

- **部分更新**: 新配置与现有配置合并，未指定的字段保持不变
- **深度合并**: `config` 对象字段级别合并，不是整体替换

```typescript
// 示例：现有配置
{
  auto_generate: true,
  use_character_library: true,
  use_scene_library: false
}

// 更新请求
{
  config: {
    default_comic_style_id: "uuid",
    use_scene_library: true
  }
}

// 结果配置
{
  auto_generate: true,              // 保留
  use_character_library: true,      // 保留
  use_scene_library: true,          // 更新
  default_comic_style_id: "uuid"    // 新增
}
```

### 数据库操作

```sql
-- 验证用户权限
SELECT * FROM canvas_timelines WHERE id = $1 AND user_id = $2;

-- 验证风格存在（如果提供了 style_id）
SELECT * FROM comic_styles WHERE id = $1 AND enabled = true;

-- 更新时间线
UPDATE canvas_timelines
SET
  config = $1,
  updated_at = NOW()
WHERE id = $2;
```

## 相关端点

- `GET /api/canvas/timeline/{id}` - 获取时间线详情（包含配置）
- `GET /api/canvas/styles` - 获取可用的漫画风格列表
- `POST /api/canvas/timeline` - 创建新时间线

## Schema 定义

TypeScript 类型定义位于:
- `src/lib/api-schemas/canvas.schemas.ts` - `UpdateTimelineConfigRequestSchema`
- `src/app/(novel)/novel/components/InfiniteCanvas/types.ts` - `CanvasTimelineConfig`

## 测试建议

1. **正常流程**:
   - 创建时间线
   - 设置默认风格
   - 验证 GET 请求返回正确的 `config.default_comic_style_id`
   - 取消设置风格（设为 null）
   - 验证更新成功

2. **边界情况**:
   - 无效的 UUID 格式
   - 不存在的风格 ID
   - 已禁用的风格 ID
   - 未登录用户访问
   - 访问其他用户的时间线

3. **并发场景**:
   - 两个请求同时更新同一时间线配置
   - 预期：最后写入胜出（last-write-wins）

## 版本历史

- **v1.0** (2024-01-22): 初始实现
  - 添加 `default_comic_style_id` 支持
  - 实现 Zod 验证
  - 添加风格存在性检查
  - 支持部分配置更新
