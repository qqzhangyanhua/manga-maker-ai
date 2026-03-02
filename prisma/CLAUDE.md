[根目录](../CLAUDE.md) > **prisma**

# 变更记录 (Changelog)

- 2026-03-01 09:32:34: 续扫 `schema.prisma` 后半段与托管迁移抽样（`20251221000000`、`20260126000000`、`20260131`），补充工作流/模板/版本/标签/导出等模型信息。
- 2026-03-01 00:41:16: 全量重扫，补齐模型清单与手工迁移概览。
- 2026-03-01 00:12:46: 补扫 manual 迁移 SQL。
- 2026-02-28 23:40:57: 首次生成模块文档。

# 模块职责

`prisma` 是全局数据契约层，服务于 Next.js Prisma Client 与 FastAPI SQLAlchemy 的共享数据库结构。

# 入口与启动

- 主 Schema：`prisma/schema.prisma`
- 托管迁移：`prisma/migrations/*/migration.sql`
- 手工迁移：`prisma/migrations/manual/*.sql`
- 种子：`prisma/seed.ts`

# 对外接口

- 不直接提供 HTTP 接口，通过 Prisma Client 间接供 API 层使用。

# 关键依赖与配置

- `DATABASE_URL`（PostgreSQL）
- `prisma` / `@prisma/client`

# 数据模型

## 后半段模型（本轮补扫重点）

- 角色/剧情推荐：`SuggestedCharacter`, `SuggestedScene`
- 工作流：`Workflow`, `GenerationTask`
- 模板体系：`PanelTemplate`, `TemplateLike`, `LayoutTemplate`
- 版本管理：`ProjectVersion`, `ImagePageVersion`
- 标签系统：`Tag`, `Tagging`
- 交易计费：`CreditTransaction`, `UsageStat`, `GenerationLog`
- 排版导出：`ComicPage`, `ExportHistory`
- 无限画布关联阶段：`ChapterCharacterState` 等

## 抽样迁移结论

1. `20251221000000_add_chapter_panel_tracking_to_generated_images`
   - 新增 `generated_images.chapter_id` 与 `generated_images.panel_ids[]`。
   - 新建索引 `idx_generated_images_chapter`。
   - 回滚脚本未提供。

2. `20260126000000_add_character_prompt_and_nine_grid_workflow`
   - 新增九宫格链路核心表：
     - `character_prompt_templates`
     - `shot_prompt_compositions`
     - `nine_grid_generations`
   - 扩展 `shot_designs` 状态机字段（character/final_prompt/nine_grid/selection）。
   - 添加 CHECK 约束与外键，附带 `updated_at` 触发器。
   - 幂等性：大量 `IF NOT EXISTS`，但部分 `ADD CONSTRAINT` 未加保护，重复执行风险中等。

3. `20260131_add_style_guide_to_novel_project`
   - 新增 `novel_projects.style_guide JSONB`。
   - 含 `IF NOT EXISTS`，幂等性高。

# 测试与质量

- schema 层无单测；依赖 API/集成验证。
- 迁移后必须执行 `pnpm prisma generate`。
- 建议给高风险迁移补充“预检查 SQL + 回滚 SQL”。

# 常见问题 (FAQ)

1. 为什么 Python 服务也受 schema 变更影响？
   因为共享同一 PostgreSQL。

2. 手工迁移和 Prisma 托管迁移冲突怎么办？
   以数据库真实结构为准，手工同步 `schema.prisma`。

3. 为什么某些迁移重复执行失败？
   多见于未使用 `IF NOT EXISTS` 的约束/索引定义。

# 相关文件清单

- `/Users/zhangyanhua/AI/manga-maker-ai/prisma/schema.prisma`
- `/Users/zhangyanhua/AI/manga-maker-ai/prisma/migrations/20251221000000_add_chapter_panel_tracking_to_generated_images/migration.sql`
- `/Users/zhangyanhua/AI/manga-maker-ai/prisma/migrations/20260126000000_add_character_prompt_and_nine_grid_workflow/migration.sql`
- `/Users/zhangyanhua/AI/manga-maker-ai/prisma/migrations/20260131_add_style_guide_to_novel_project/migration.sql`
- `/Users/zhangyanhua/AI/manga-maker-ai/prisma/migrations/manual/`
- `/Users/zhangyanhua/AI/manga-maker-ai/prisma/seed.ts`
