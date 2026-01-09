# 🔄 需要重启开发服务器

## 问题描述

刚刚执行了数据库迁移，为 `scenes` 表添加了 `source_chapter_id` 等新字段。
虽然数据库已更新，Prisma Client 也已重新生成，但 **Next.js 开发服务器仍在使用旧的 Prisma Client 缓存**。

## ⚠️ 立即操作（必须）

### 方法 1：使用重启脚本（最简单）

```bash
# 在终端中停止当前的 pnpm dev（按 Ctrl+C）
# 然后运行
./restart-dev.sh
pnpm dev
```

### 方法 2：手动重启

```bash
# 1. 在终端中按 Ctrl+C 停止 pnpm dev

# 2. 清除缓存
rm -rf .next

# 3. 重新启动
pnpm dev
```

### 方法 3：最简单（但可能不够）

```bash
# 在终端中按 Ctrl+C 停止当前的 pnpm dev
# 重新运行
pnpm dev
```

> **提示**：如果方法 3 不起作用，请使用方法 1 或方法 2

## 已完成的修复

✅ 执行了数据库迁移，添加了以下字段到 `scenes` 表：
   - `source_chapter_id` (UUID) - 来源章节ID
   - `source_novel_id` (UUID) - 来源小说项目ID
   - `generation_params` (JSONB) - 生成参数存档
   - `is_ai_generated` (BOOLEAN) - 是否AI生成
   - `generation_cost` (INTEGER) - 生成消耗的算力

✅ 创建了 `suggested_scenes` 表用于章节背景生成

✅ 重新生成了 Prisma Client

✅ 创建了必要的索引和外键约束

✅ 清除了 `.next` 和缓存文件

## 验证

重启后，访问以下 API 应该不再报错：
- `/api/story/[id]/generated-images`

错误信息应该消失：
```
Unknown argument `source_chapter_id`. Available options are marked with ?.
```

## 为什么需要重启？

Node.js 在启动时会将 Prisma Client 加载到内存中并缓存。即使我们：
1. ✅ 更新了数据库 schema
2. ✅ 重新生成了 Prisma Client
3. ✅ Next.js 重新编译了代码

**Node.js 进程仍然在使用内存中的旧 Prisma Client**。只有完全重启进程才能加载新的 Prisma Client。

---

**重启后可以删除此文件和 `restart-dev.sh`**
