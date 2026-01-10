# 修复：九宫格图片未出现在素材库

## 🐛 问题描述

**现象**：
- 九宫格生成成功，返回值正常
- 但在素材库接口中看不到刚生成的九宫格图片

**返回值示例**：
```json
{
  "success": true,
  "image_url": "http://111.228.37.74:9000/input-image/nine-grid-309de62a-c57c-4914-98f1-221491d78c30-1768057658394.png",
  "nine_grid_id": "20a01af6-8d06-4085-9ba2-21c758579472",
  "message": "成功生成九宫格图片"
}
```

**素材库接口**：
```
GET /api/story/{storyId}/generated-images?page=2&limit=12&projectId={projectId}
```

## 🔍 问题根源

在 `src/app/api/story/[id]/generated-images/route.ts` 中，查询 `generated_images` 表时使用了错误的过滤条件：

### 原始代码（有问题）

```typescript
const generatedImages = await prisma.generatedImage.findMany({
  where: {
    user_id: payload.userId,
    source_type: "panel",  // ❌ 只查询 source_type 为 "panel" 的
    source_id: { in: projectIds },  // ❌ 用 projectIds 过滤
  },
  orderBy: { created_at: "desc" },
});
```

### 问题分析

1. **source_type 过滤错误**
   - 只查询 `source_type: "panel"`
   - 九宫格的 `source_type` 是 `"nine_grid"`
   - 导致九宫格图片被排除在外

2. **source_id 过滤错误**
   - 使用 `source_id: { in: projectIds }` 过滤
   - 九宫格的 `source_id` 是九宫格记录的 ID（`nine_grid_id`）
   - 不是项目 ID（`project_id`）
   - 导致即使修复 source_type，也查不到九宫格

3. **缺少 chapter_id 过滤**
   - 九宫格保存时设置了 `chapter_id`
   - 但查询时没有利用这个字段
   - 应该通过 `chapter_id` 关联到故事

## ✅ 解决方案

### 修复后的代码

```typescript
// 1. 先获取故事的所有章节 ID
const allChapters = await prisma.chapter.findMany({
  where: { story_id: storyId },
  select: { id: true },
});
const chapterIds = allChapters.map(ch => ch.id);

// 2. 查询 generated_images，使用 OR 条件
const generatedImages = await prisma.generatedImage.findMany({
  where: {
    user_id: payload.userId,
    OR: [
      // 条件1：通过 chapter_id 关联（适用于九宫格等）
      {
        chapter_id: { in: chapterIds },
      },
      // 条件2：Legacy 兼容（适用于旧的分镜图片）
      {
        source_type: "panel",
        source_id: { in: projectIds },
      },
    ],
  },
  orderBy: { created_at: "desc" },
});
```

### 修复逻辑

1. **获取章节 ID 列表**
   - 查询故事的所有章节
   - 提取章节 ID 列表

2. **使用 OR 条件查询**
   - **条件 1**：`chapter_id` 在章节 ID 列表中
     - 适用于九宫格（有 `chapter_id`）
     - 适用于其他关联到章节的图片
   - **条件 2**：Legacy 兼容
     - `source_type: "panel"` 且 `source_id` 在项目 ID 列表中
     - 保持对旧数据的兼容性

3. **支持所有 source_type**
   - `panel`：分镜图片
   - `nine_grid`：九宫格图片 ✅ 新增支持
   - `character`：角色图片
   - `scene`：场景图片
   - 其他类型...

## 📊 数据结构对比

### 分镜图片（Panel）

```typescript
{
  user_id: "uuid",
  image_url: "https://...",
  prompt: "分镜提示词",
  style: "漫画风格",
  source_type: "panel",
  source_id: "panel_id",  // 分镜 ID
  chapter_id: null,        // 通常为空
  panel_ids: [],
}
```

### 九宫格图片（Nine Grid）

```typescript
{
  user_id: "uuid",
  image_url: "https://...",
  prompt: "镜头01：...\n镜头02：...",
  style: "九宫格",
  source_type: "nine_grid",
  source_id: "nine_grid_id",  // 九宫格记录 ID（不是项目 ID）
  chapter_id: "chapter_id",   // ✅ 关联到章节
  panel_ids: [],               // 空数组或分镜 ID 列表
  generation_params: {
    mode: "from_plot",
    plot_summary: "...",
    ...
  }
}
```

## 🎯 修复效果

### Before（修复前）

```
素材库查询条件：
- user_id = 当前用户
- source_type = "panel"  ❌ 只查分镜
- source_id IN (projectIds)  ❌ 九宫格的 source_id 不是项目 ID

结果：九宫格图片被排除 ❌
```

### After（修复后）

```
素材库查询条件：
- user_id = 当前用户
- OR:
  1. chapter_id IN (chapterIds)  ✅ 九宫格通过这个条件匹配
  2. source_type = "panel" AND source_id IN (projectIds)  ✅ 旧分镜兼容

结果：九宫格图片正常显示 ✅
```

## 🧪 测试验证

### 1. 生成九宫格

```bash
# 从剧情生成
POST /api/chapter/{chapterId}/generate-nine-grid-from-plot
{
  "project_id": "...",
  "plot_summary": "剧情概述..."
}

# 返回
{
  "success": true,
  "image_url": "https://...",
  "nine_grid_id": "20a01af6-8d06-4085-9ba2-21c758579472"
}
```

### 2. 查询素材库

```bash
# 查询故事的素材库
GET /api/story/{storyId}/generated-images?page=1&limit=12

# 应该包含刚生成的九宫格
{
  "success": true,
  "data": {
    "images": [
      {
        "id": "...",
        "image_url": "https://...",
        "source_type": "nine_grid",  ✅
        "style": "九宫格",
        "chapter_info": {
          "id": "...",
          "title": "第一章",
          "chapter_order": 1
        },
        ...
      }
    ]
  }
}
```

### 3. 验证数据库

```sql
-- 查询 generated_images 表
SELECT 
  id, 
  source_type, 
  source_id, 
  chapter_id, 
  created_at
FROM generated_images
WHERE user_id = '...'
ORDER BY created_at DESC
LIMIT 10;

-- 应该看到 source_type = 'nine_grid' 的记录
```

## 📝 相关文件

### 修改的文件

1. **`src/app/api/story/[id]/generated-images/route.ts`**
   - 修复查询条件
   - 添加 chapter_id 过滤
   - 支持所有 source_type

### 相关文件（无需修改）

2. **`src/app/api/chapter/[id]/generate-nine-grid-from-plot/route.ts`**
   - 保存逻辑正确
   - 已设置 `chapter_id`

3. **`src/app/api/chapter/[id]/generate-nine-grid-image/route.ts`**
   - 保存逻辑正确
   - 已设置 `chapter_id`

## 🎉 总结

### 问题原因
- 素材库查询条件过于严格
- 只查询 `source_type: "panel"`
- 没有利用 `chapter_id` 关联

### 解决方案
- 使用 OR 条件查询
- 通过 `chapter_id` 关联到故事
- 支持所有 `source_type`

### 修复效果
- ✅ 九宫格图片正常显示在素材库
- ✅ 保持对旧数据的兼容性
- ✅ 支持未来其他类型的图片

---

**现在刷新素材库页面，应该能看到刚生成的九宫格图片了！** 🎉
