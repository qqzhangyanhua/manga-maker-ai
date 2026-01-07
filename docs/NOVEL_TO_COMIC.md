# 小说转漫画功能 - 使用文档

## 功能概述

将小说项目转换为漫画剧本项目，自动生成故事、章节和角色关联。

## 使用流程

### 1. 前置准备

确保你的小说项目包含以下数据：
- ✅ 章节大纲（包含 keyEvents 关键事件列表）
- ✅ 角色设定（可选）

### 2. 转换步骤

1. 访问小说详情页：`http://localhost:3000/novel/[项目ID]`
2. 点击右上角「转换为漫画」按钮
3. **第一步：选择场景**
   - 展开章节，查看所有关键事件
   - 勾选想要可视化的场景
   - 可点击「全选」或「清除」快速操作
   - 系统会显示预计生成的分镜数量
4. **第二步：选择角色**
   - 勾选要迁移到漫画项目的角色
   - 系统会自动创建角色并关联到故事
5. 点击「开始转换」
6. 转换成功后自动跳转到新创建的故事页面

### 3. 转换结果

转换后会自动创建：
- ✅ 1 个 Story（故事）
  - 标题：原标题 + "（漫画改编）"
  - 标记来源：`source_type: "novel_adaptation"`
  - 记录来源ID：`source_novel_id`
- ✅ N 个 Chapter（章节）
  - 基于选中的场景生成
  - 包含场景摘要（用于后续分镜生成）
  - 记录来源章节：`source_novel_chapter_id`
- ✅ M 个 Character（角色）
  - 自动创建默认服装
  - 关联到 StoryCharacter

## API 接口

### POST /api/novel/projects/[id]/convert-to-comic

**请求体：**
```json
{
  "selected_scenes": [
    {
      "chapter_number": 1,
      "scene_indices": [0, 1, 3],
      "custom_scenes": ["自定义场景描述"]
    }
  ],
  "character_mappings": [
    {
      "novel_character_name": "张明",
      "action": "create",
      "role": "protagonist"
    }
  ],
  "comic_style_id": "uuid-xxx" // 可选
}
```

**响应：**
```json
{
  "success": true,
  "story_id": "uuid-xxx",
  "story_title": "我的小说（漫画改编）",
  "chapters_created": 5,
  "chapters": [
    { "id": "uuid-1", "title": "第1章：开端", "order": 1 }
  ],
  "characters_created": 3,
  "characters_linked": 0,
  "message": "成功将小说转换为漫画项目，共创建 5 个章节"
}
```

## 数据库变更

### Stories 表新增字段
- `source_type` (VARCHAR): "original" | "novel_adaptation"
- `source_novel_id` (UUID): 来源小说项目ID

### Chapters 表新增字段
- `source_novel_chapter_id` (UUID): 来源小说章节ID
- `source_scene_markers` (JSONB): 场景标记位置

### 迁移脚本
```sql
-- 已执行：prisma/migrations/manual/20260107_add_novel_source_tracking.sql
```

## 文件清单

### 1. 数据库 Schema
- `prisma/schema.prisma` - 添加 source_type, source_novel_id, source_novel_chapter_id, source_scene_markers

### 2. API 路由
- `src/app/api/novel/projects/[id]/convert-to-comic/route.ts` - 转换 API

### 3. 前端组件
- `src/app/(novel)/novel/[id]/components/ConvertToComicDialog.tsx` - 转换弹窗
- `src/app/(novel)/novel/[id]/ProjectHeader.tsx` - 添加转换按钮

### 4. 迁移文件
- `prisma/migrations/manual/20260107_add_novel_source_tracking.sql` - 手动 SQL 迁移

## 注意事项

### 1. Prisma Client 重新生成

由于文件锁定，需要手动执行：
```bash
# 关闭所有开发服务器后执行
npx prisma generate
```

### 2. 前置条件检查

- ⚠️ 小说必须有大纲数据且包含 keyEvents
- ⚠️ 如果没有大纲，先在「故事大纲」标签页生成

### 3. 算力消耗预估

- 场景提取分析：~5 算力
- 角色图像生成：~30 算力/角色
- 后续分镜生成：~10 算力/分镜

### 4. 未来优化方向

- [ ] AI 自动识别高视觉潜力场景
- [ ] 支持场景文本片段截取
- [ ] 角色库关联（链接已有角色而非创建新角色）
- [ ] 批量章节转换
- [ ] 双向同步（小说编辑后更新漫画）

## 故障排查

### 问题 1：转换按钮不显示
**解决**：检查小说是否有 outlines 数据

### 问题 2：场景列表为空
**解决**：在「故事大纲」页面生成章节大纲

### 问题 3：角色创建失败
**解决**：检查角色数据格式是否包含 name 字段

### 问题 4：转换后跳转失败
**解决**：检查浏览器控制台错误日志

## 联系支持

如有问题请在 GitHub Issues 提交反馈。
