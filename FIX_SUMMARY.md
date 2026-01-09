# 🐛 Bug 修复总结

## 问题

API 报错：
```
Unknown argument `source_chapter_id`. Available options are marked with ?.
```

## 根本原因

代码中查询 `scenes` 表时使用了 `source_chapter_id` 字段，但该字段在数据库中不存在。

## 已完成的修复

### 1. ✅ 数据库迁移

执行了 SQL 迁移，为 `scenes` 表添加了 5 个新字段：

```sql
ALTER TABLE "scenes" ADD COLUMN "source_chapter_id" UUID;
ALTER TABLE "scenes" ADD COLUMN "source_novel_id" UUID;
ALTER TABLE "scenes" ADD COLUMN "generation_params" JSONB;
ALTER TABLE "scenes" ADD COLUMN "is_ai_generated" BOOLEAN DEFAULT false;
ALTER TABLE "scenes" ADD COLUMN "generation_cost" INTEGER DEFAULT 0;
```

### 2. ✅ 创建新表

```sql
CREATE TABLE "suggested_scenes" (
  -- 用于 AI 章节场景建议的新表
);
```

### 3. ✅ 创建索引

```sql
CREATE INDEX "idx_scenes_source_chapter" ON "scenes"("source_chapter_id");
CREATE INDEX "idx_scenes_source_novel" ON "scenes"("source_novel_id");
CREATE INDEX "idx_scenes_user_ai_generated" ON "scenes"("user_id", "is_ai_generated");
```

### 4. ✅ Prisma Client 更新

重新生成了 Prisma Client，现在包含新字段。

### 5. ✅ 清除缓存

- 删除了 `.next` 目录
- 清除了 `node_modules/.cache`
- 清除了 Prisma 缓存

## ⚠️ 需要您做的事

**请立即重启开发服务器！**

在运行 `pnpm dev` 的终端中：
1. 按 `Ctrl+C` 停止服务器
2. 运行 `pnpm dev` 重新启动

或者运行：
```bash
./restart-dev.sh
pnpm dev
```

## 为什么必须重启？

虽然所有修复都已完成，但 **Node.js 进程仍在使用旧的 Prisma Client**。

- ❌ 热重载无法更新 Prisma Client
- ❌ 重新编译无法更新 Prisma Client
- ✅ 只有重启进程才能加载新的 Prisma Client

## 验证

重启后，错误应该消失。您可以访问：
- http://localhost:3000/scripts/[storyId] （故事脚本页面）

应该能正常加载图片列表，不再出现 500 错误。

## 清理

重启验证成功后，可以删除这些临时文件：
- `RESTART_REQUIRED.md`
- `FIX_SUMMARY.md`
- `restart-dev.sh`

---

**修复日期**: 2026-01-09  
**影响范围**: `/api/story/[id]/generated-images` 路由
