# AI 世界观提取功能调试指南

## 问题描述
点击"AI 提取"按钮后，弹框中没有显示章节列表，也没有调用接口获取章节数据。

## 数据流分析

### 预期数据流
```
1. 页面加载 (page.tsx)
   ↓ 调用 useNovelProject(projectId)
   ↓ GET /api/novel/projects/{projectId}
   ↓ 后端返回包含 chapters 字段的项目数据

2. 渲染 WorldEntriesTab
   ↓ 接收 project.chapters 作为 prop

3. 点击"AI 提取"按钮
   ↓ 打开 ExtractWorldEntriesDialog
   ↓ 传递 chapters 数据
   ↓ 显示可选章节列表
```

## 调试步骤

### 1. 检查浏览器控制台日志

启动开发服务器后，打开浏览器控制台 (F12)，查看以下日志：

```
[useNovelProject] Fetched project data: {
  projectId: "...",
  title: "...",
  hasChapters: true/false,
  chaptersCount: X,
  chapters: [...]
}
```

**关键检查点**：
- `hasChapters` 应该是 `true`
- `chaptersCount` 应该 > 0
- `chapters` 应该是一个数组，包含章节对象

### 2. 检查 WorldEntriesTab 日志

当切换到"世界观记忆库" Tab 时，应该看到：

```
[WorldEntriesTab] Received chapters: {
  count: X,
  hasContent: Y,
  preview: [...]
}
```

**关键检查点**：
- `count` 应该 > 0
- `hasContent` 显示有多少章节有正文内容
- `preview` 显示前两个章节的摘要

### 3. 检查 ExtractWorldEntriesDialog 日志

点击"AI 提取"按钮时，应该看到：

```
[ExtractWorldEntriesDialog] Dialog opened with chapters: {
  count: X,
  hasContent: Y,
  chaptersPreview: [...]
}
```

## 可能的问题和解决方案

### 问题 1: 后端没有返回 chapters 字段

**检查方法**：
```bash
# 在终端中测试后端 API（需要有效的 JWT token）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/projects/PROJECT_ID"
```

**预期响应**：
```json
{
  "id": "...",
  "title": "...",
  ...
  "chapters": [
    {
      "id": "...",
      "chapter_number": 1,
      "title": "...",
      "content": "...",  // ← 应该有这个字段
      "outline": "...",
      "word_count": 1234,
      "status": "completed"
    }
  ]
}
```

**如果 chapters 是 null 或空数组**：
- 检查数据库中是否有章节数据
- 检查 `novel_chapters` 表中 `project_id` 是否匹配
- 检查后端 `get_project` 函数是否正确执行

**解决方法**：
```sql
-- 检查章节数据
SELECT id, chapter_number, title,
       LENGTH(content) as content_length,
       LENGTH(outline) as outline_length
FROM novel_chapters
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY chapter_number;
```

### 问题 2: 前端没有正确接收 chapters

**检查 useNovelProject.ts 第 114-127 行**：
```typescript
const data = await response.json();
console.log('[useNovelProject] Fetched project data:', {
  ...
  chapters: data.chapters,  // ← 应该打印这个
});
setProject(data);
```

**如果日志显示 chapters 是 undefined**：
- 检查 API 代理是否正确转发请求
- 检查后端是否正确返回数据

### 问题 3: 数据传递链断裂

**检查 page.tsx 第 300-303 行**：
```tsx
<WorldEntriesTab
  projectId={projectId}
  chapters={project.chapters}  // ← 确保这里传递了数据
/>
```

**如果 project.chapters 是 undefined**：
- 可能是在项目数据加载完成前就渲染了组件
- 检查是否有条件渲染保护

### 问题 4: 章节数据存在但没有 content

**检查章节对象结构**：
```typescript
{
  id: "...",
  chapter_number: 1,
  title: "第一章",
  content: "...",      // ← 可能是 null 或空字符串
  outline: "...",
  word_count: 0,
  status: "draft"      // ← 可能是 "draft" 而不是 "completed"
}
```

**如果所有章节的 content 都是 null**：
- 章节可能还没有生成正文，只有大纲
- 提取功能会降级使用 outline，但效果有限

## 临时解决方案

如果调试后发现是数据问题，可以先用测试数据验证功能：

```typescript
// 在 page.tsx 中临时添加测试数据
const testChapters: NovelChapter[] = [
  {
    id: "test-1",
    chapter_number: 1,
    title: "第一章 测试",
    content: "这是测试正文内容...",
    outline: "测试大纲",
    word_count: 1000,
    status: "completed",
    is_key_chapter: false,
  },
];

<WorldEntriesTab
  projectId={projectId}
  chapters={project.chapters || testChapters}  // ← 使用测试数据
/>
```

## 快速验证命令

```bash
# 1. 检查后端服务状态
curl http://localhost:8000/health

# 2. 检查前端开发服务器
curl http://localhost:3000

# 3. 检查数据库连接
psql -U manga -d manga -c "SELECT COUNT(*) FROM novel_chapters;"

# 4. 重启服务
# 后端
cd services/novel-backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 前端
npm run dev
```

## 下一步

1. 打开浏览器到项目详情页
2. 打开开发者工具 (F12)
3. 切换到"世界观记忆库" Tab
4. 点击"AI 提取"按钮
5. 查看控制台日志
6. 根据日志信息定位问题

如果看到日志输出且 `count > 0`，说明数据传递正常，可能是 UI 渲染问题。
如果没有看到日志或 `count = 0`，按照上述步骤排查数据流。
