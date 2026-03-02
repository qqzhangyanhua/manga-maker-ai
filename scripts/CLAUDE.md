[根目录](../CLAUDE.md) > **scripts**

# 变更记录 (Changelog)

- 2026-03-01 10:13:03: 补扫其余 `migrate-*.ts`（`migrate-comic-style.ts`、`migrate-suggested-characters.ts`、`migrate-panel-characters.ts`、`migrate-quality-score.ts`），追加幂等性/回滚性审计与风险分级。
- 2026-03-01 09:32:34: 续扫迁移/校验脚本（`migrate-phase2-data.ts`、`migrate-add-cover-image.ts`、`migrate-gallery.ts`、`fix-timeline-chapter-ids.ts`、`verify-migration.ts`、`verify-generated-images-migration.ts`、`create-nine-grid-table.ts`），补充幂等性与回滚风险评估。
- 2026-03-01 00:41:16: 全量重扫，按用途分类列出全部 47 个脚本文件。
- 2026-02-28 23:40:57: 首次生成模块文档。

# 模块职责

`scripts` 提供工程运维脚本，覆盖数据库迁移、一次性修复、环境初始化、验证与诊断。

# 入口与启动

- 初始化：`init-db.sh`、`setup-minio.ts`、`setup-novel-module.sh`
- 迁移：`migrate-*.ts`、`create-nine-grid-table.ts`
- 校验：`verify-*.ts`、`check-*.ts`、`diagnose-*.ts`
- 修复：`fix-*.ts`、`auto-fix-*.ts`

运行方式：
- `pnpm tsx scripts/<name>.ts`
- `bash scripts/<name>.sh`

# 对外接口

- 无 HTTP 接口，CLI 直接执行。

# 关键依赖与配置

- Prisma + PostgreSQL（`DATABASE_URL`）
- MinIO 相关环境变量（对象存储脚本）
- 统一使用 pnpm + tsx

# 数据模型

脚本本身不定义模型，直接操作 Prisma 模型与 SQL 表结构。

# 迁移脚本风险审计（本轮补充）

## 已补扫脚本

### 1) `migrate-comic-style.ts`
- 功能：给 `characters` 增加 `comic_style_id` 字段、索引与外键。
- 幂等性：中高。`ADD COLUMN IF NOT EXISTS` 与 `CREATE INDEX IF NOT EXISTS` 已防重；外键通过查询约束存在性后再创建。
- 风险：中。使用 `$executeRawUnsafe`，若 SQL 来源被污染会有注入面（当前脚本内联常量，实际风险可控）。
- 回滚：无自动回滚。

### 2) `migrate-suggested-characters.ts`
- 功能：把 `Story.suggested_characters(JSONB)` 迁移到 `suggested_characters` 规范化表。
- 幂等性：低到中。重复执行会重复插入（无基于 story/temp_id 的去重 upsert）。
- 风险：中高。逐条 create，缺少事务包裹；中途失败会产生部分迁移状态。
- 回滚：无自动回滚。

### 3) `migrate-panel-characters.ts`
- 功能：从 panel 描述提取角色名，回填 `panel.character_id`。
- 幂等性：中。仅处理 `character_id = null`，重复执行大体安全。
- 风险：中高。名称提取 + 模糊匹配可能误绑定同名或近似名角色；脚本中 `where: any` 牺牲类型约束。
- 可控措施：支持 `--dry-run`、`--story-id`、`--chapter-id` 缩小影响面。
- 回滚：无自动回滚。

### 4) `migrate-quality-score.ts`
- 功能：读取外部 SQL 并按分号拆句执行，创建 `quality_scores` 相关结构。
- 幂等性：依赖 SQL 本身，脚本层把“already exists/42P07”视为可忽略。
- 风险：中高。按分号拆句对函数体/复杂 SQL 不稳，且无事务包裹。
- 回滚：无自动回滚。

## 上轮已审计脚本（保留）

### 5) `migrate-phase2-data.ts`
- 功能：`panel.character_name -> character_id`，补齐 `character.reference_image`。
- 幂等性：中等。
- 风险：按名称匹配角色可能误匹配。

### 6) `migrate-add-cover-image.ts`
- 功能：给 `novel_projects` 增加 `cover_image` 列。
- 幂等性：高。
- 风险：低。

### 7) `migrate-gallery.ts`
- 功能：读取 SQL 文件并逐句执行。
- 幂等性：依赖 SQL 文件。
- 风险：中高（语句拆分 + 无事务）。

# 测试与质量

- 以验证脚本和人工确认为主。
- 建议迁移脚本统一改造到“事务 + dry-run + 变更日志 + 回滚 SQL”模式。

# 常见问题 (FAQ)

1. 为什么同类脚本很多？
   历史迭代沉淀，建议把一次性脚本归档到 `scripts/archive/`。

2. 为什么执行后数据不一致？
   常见是环境变量指向错误数据库，或脚本按名称映射产生误匹配。

3. 如何降低迁移风险？
   先验证（`verify-*`）再迁移，迁移前导出关键表快照。

4. 哪几个脚本最需要优先改造？
   `migrate-suggested-characters.ts`、`migrate-panel-characters.ts`、`migrate-quality-score.ts`（优先补事务和幂等策略）。

# 相关文件清单

- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/migrate-comic-style.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/migrate-suggested-characters.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/migrate-panel-characters.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/migrate-quality-score.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/migrate-phase2-data.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/migrate-add-cover-image.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/migrate-gallery.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/fix-timeline-chapter-ids.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/verify-migration.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/verify-generated-images-migration.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/create-nine-grid-table.ts`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/init-db.sh`
- `/Users/zhangyanhua/AI/manga-maker-ai/scripts/run-vitest.mjs`
