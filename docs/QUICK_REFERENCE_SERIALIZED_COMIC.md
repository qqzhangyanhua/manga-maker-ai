# 连载漫画功能快速参考

## 🚀 快速开始

### 1. 应用数据库迁移
```bash
cd /Users/zhangyanhua/AI/manga-maker-ai
npx prisma migrate dev
# 或
npx prisma migrate deploy
```

### 2. 生成 Prisma 客户端
```bash
npx prisma generate
```

### 3. 重启开发服务器
```bash
pnpm dev
```

## 📋 功能清单

### ✅ 已完成
- [x] 数据库模型扩展（`chapter_id`, `panel_ids`）
- [x] 多镜生成对话框使用动态风格列表
- [x] 多镜生成 API 保存章节和分镜关联
- [x] 图库 API 返回章节和分镜详细信息
- [x] 图库 UI 显示章节和分镜徽章

## 🎨 UI 变化

### 多镜生成对话框
**位置**: 剧本详情页 → 分镜列表 → "多镜生成"按钮

**变化**:
- 风格选择器现在从 `/api/comic-styles` 动态加载
- 显示中文风格名称（如 "日式漫画"、"美式漫画"）
- 加载状态提示

### 生成图库
**位置**: 剧本详情页 → "生成图库"标签页

**新增元素**:
1. **章节徽章**（蓝色）
   - 图标: 📖 (BookOpen)
   - 文本: "第X章"
   - 位置: 图片左上角

2. **分镜徽章**（紫色）
   - 图标: 🎬 (Film)
   - 文本: 
     - 单镜: "第X镜"
     - 多镜: "N镜"
   - 位置: 章节徽章下方

3. **详情对话框增强**
   - 章节标题显示
   - 多镜时展开显示所有分镜列表
   - 每个分镜显示序号和描述

## 🔧 API 变化

### POST /api/panel/generate-multi
**请求体**:
```json
{
  "panel_ids": ["uuid1", "uuid2", ...],
  "reference_image_urls": ["url1", "url2", ...],
  "style": "风格提示词（来自 comic_style.prompt_prefix）"
}
```

**响应体**（无变化）:
```json
{
  "success": true,
  "image_url": "生成的图片URL",
  "layout": "N格（AI自动布局）",
  "panel_count": N
}
```

**内部变化**:
- 保存时自动记录 `chapter_id` 和 `panel_ids`

### GET /api/story/[id]/generated-images
**响应体**（扩展）:
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": "uuid",
        "image_url": "url",
        "prompt": "提示词",
        "style": "风格",
        "source_type": "panel",
        "source_id": "uuid",
        "created_at": "2025-12-21T...",
        "chapter_info": {
          "id": "uuid",
          "title": "第一章：开始",
          "chapter_order": 1
        },
        "panel_info": [
          {
            "id": "uuid",
            "panel_order": 1,
            "description": "分镜描述"
          }
        ]
      }
    ],
    "pagination": { ... }
  }
}
```

## 📊 数据库字段

### GeneratedImage 表新增字段

| 字段名 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `chapter_id` | UUID (可选) | 关联的章节 ID | `null` |
| `panel_ids` | UUID[] | 包含的分镜 ID 数组 | `[]` |

### 索引
- `idx_generated_images_chapter` on `chapter_id`

## 🎯 使用示例

### 示例 1: 创建连载漫画
```typescript
// 1. 创建故事和章节
const story = await createStory({ title: "我的漫画" });
const chapter1 = await createChapter({ 
  story_id: story.id, 
  title: "第一章",
  chapter_order: 1 
});

// 2. 生成分镜
const panels = await generatePanels({ chapter_id: chapter1.id });

// 3. 多镜生成
const result = await fetch("/api/panel/generate-multi", {
  method: "POST",
  body: JSON.stringify({
    panel_ids: panels.map(p => p.id),
    style: "Japanese Manga style, black and white"
  })
});

// 4. 查看图库（自动显示章节信息）
// 访问: /scripts/[story_id] → "生成图库"标签页
```

### 示例 2: 按章节浏览图库
```typescript
// 图库 API 自动返回章节信息
const response = await fetch(`/api/story/${storyId}/generated-images`);
const { images } = response.data;

// 筛选特定章节的图片
const chapter1Images = images.filter(
  img => img.chapter_info?.chapter_order === 1
);
```

## 🐛 故障排查

### 问题 1: 图库不显示章节信息
**原因**: 旧数据没有 `chapter_id`
**解决**: 只有新生成的图片才会显示章节信息

### 问题 2: 风格选择器为空
**原因**: `/api/comic-styles` API 返回空列表
**解决**: 
```bash
# 运行风格种子脚本
npx tsx scripts/seed-comic-styles.ts
```

### 问题 3: 数据库迁移失败
**原因**: 数据库连接问题
**解决**: 
1. 检查 `.env.local` 中的 `DATABASE_URL`
2. 确保数据库服务正在运行
3. 手动执行迁移 SQL

### 问题 4: Prisma 客户端类型错误
**原因**: 客户端未重新生成
**解决**: 
```bash
npx prisma generate
# 重启 TypeScript 服务器（VS Code: Cmd+Shift+P → "Restart TS Server"）
```

## 📝 代码片段

### 获取漫画风格列表
```typescript
import { useComicStyles } from "@/app/scripts/[id]/hooks/useComicStyles";

function MyComponent() {
  const { data: styles, isLoading } = useComicStyles();
  
  return (
    <select>
      {styles?.map(style => (
        <option key={style.id} value={style.id}>
          {style.name_zh}
        </option>
      ))}
    </select>
  );
}
```

### 显示章节徽章
```tsx
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

function ChapterBadge({ chapterInfo }) {
  if (!chapterInfo) return null;
  
  return (
    <Badge className="bg-blue-500/90 text-white">
      <BookOpen className="w-3 h-3 mr-1" />
      第{chapterInfo.chapter_order}章
    </Badge>
  );
}
```

### 查询带章节信息的图片
```typescript
const images = await prisma.generatedImage.findMany({
  where: { user_id: userId },
  include: {
    // 注意: chapter_id 是直接字段，不是关系
    // 需要手动查询 chapter
  }
});

// 获取章节信息
const chapterIds = images.map(img => img.chapter_id).filter(Boolean);
const chapters = await prisma.chapter.findMany({
  where: { id: { in: chapterIds } }
});
```

## 🔗 相关链接

- [完整功能文档](./SERIALIZED_COMIC_FEATURE_SUMMARY.md)
- [Prisma 文档](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui](https://ui.shadcn.com)

## ✅ 检查清单

部署前确认：
- [ ] 数据库迁移已应用
- [ ] Prisma 客户端已重新生成
- [ ] 漫画风格数据已导入
- [ ] 开发服务器重启成功
- [ ] 多镜生成功能测试通过
- [ ] 图库显示章节信息正常
- [ ] 旧数据兼容性验证通过

## 💡 提示

1. **性能优化**: 如果图库图片很多，考虑添加章节筛选器
2. **用户体验**: 可以在图库顶部添加章节导航
3. **数据完整性**: 建议在生成分镜时确保 `chapter_id` 已设置
4. **风格管理**: 定期在管理后台更新和维护漫画风格列表

