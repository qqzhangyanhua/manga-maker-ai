# 小说封面功能数据库迁移说明

## 变更内容

在 `novel_projects` 表中添加 `cover_image` 字段用于存储AI生成的封面图URL。

## 迁移SQL

```sql
-- 添加封面字段
ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- 添加注释
COMMENT ON COLUMN novel_projects.cover_image IS 'AI生成的封面图URL';
```

## 执行方式

### 方式一：使用 Prisma（推荐）

```bash
# 生成 Prisma Client
npx prisma generate

# 推送schema变更（需要数据库访问权限）
npx prisma db push
```

### 方式二：手动执行SQL

如果 `prisma db push` 因为权限问题失败，请联系数据库管理员手动执行上述SQL。

### 方式三：通过管理工具

1. 打开数据库管理工具（如 pgAdmin, DBeaver, Prisma Studio等）
2. 连接到数据库
3. 在 `novel_projects` 表上执行 ALTER TABLE 语句

## 验证迁移

执行以下SQL检查字段是否添加成功：

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'novel_projects'
  AND column_name = 'cover_image';
```

期望输出：
```
 column_name  | data_type | is_nullable
--------------+-----------+-------------
 cover_image  | text      | YES
```

## Prisma Schema 变更

```prisma
model NovelProject {
  // ... 其他字段
  cover_image     String?  // AI生成的封面图URL
  // ...
}
```

## 向后兼容性

- ✅ **零破坏性**：新增可空字段，不影响现有数据
- ✅ **向后兼容**：现有项目的 `cover_image` 为 `null`，前端显示占位图
- ✅ **API兼容**：不影响现有的项目列表和详情API

## 相关文件

- **Schema**: `prisma/schema.prisma`
- **Migration SQL**: `prisma/migrations/add_cover_image_to_novel_project/migration.sql`
- **API**: `src/app/api/novel/projects/[id]/generate-cover/route.ts`
- **Frontend**: `src/app/(novel)/novel/page.tsx`

## 功能说明

1. **展示封面**：在小说项目列表页面展示封面图
2. **生成封面**：鼠标悬停卡片时显示"生成封面"按钮
3. **AI生成**：点击按钮调用AI生成封面图并上传到MinIO
4. **自动更新**：生成成功后自动更新项目封面

## 测试步骤

1. 执行数据库迁移
2. 启动开发服务器：`pnpm dev`
3. 访问小说列表页面：`http://localhost:3000/novel`
4. 悬停项目卡片，点击"生成封面"按钮
5. 等待生成完成（约5-10秒）
6. 验证封面图片正确显示

## 故障排查

### 问题1: `prisma db push` 失败

**原因**: 外键约束冲突或权限不足

**解决方案**:
- 使用方式二或方式三手动执行SQL
- 或者使用 `npx prisma migrate dev --name add_cover_image`

### 问题2: API返回 "未找到可用的模型配置"

**原因**: 缺少 `image_generation` 或 `prompt_optimizer` 配置

**解决方案**:
1. 访问 `/admin/llm-providers`
2. 添加以下两个provider配置：
   - `provider_type`: `prompt_optimizer`
   - `provider_type`: `image_generation`

### 问题3: 生成的图片无法显示

**原因**: MinIO未正确配置或图片URL无效

**解决方案**:
1. 检查 `.env` 中的 MinIO 配置
2. 确保 MinIO 服务正常运行
3. 检查 bucket 权限设置

## 成本控制

每次生成封面消耗算力：
- **提示词优化**: 约 5-10 算力（`prompt_optimizer`）
- **图像生成**: 约 30-50 算力（`image_generation`）
- **总计**: 约 35-60 算力/次

建议在 `llm_providers` 表中合理设置 `credits_cost` 字段。
