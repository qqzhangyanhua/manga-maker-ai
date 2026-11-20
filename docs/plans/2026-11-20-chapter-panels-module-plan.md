# 章节分镜模块：实施计划

日期：2026-11-20
相关决策：[ADR-0001](../adr/0001-project-as-single-root.md)、[ADR-0002](../adr/0002-character-library-with-project-characters.md)、[ADR-0004](../adr/0004-story-to-project-sync-triggers.md)、[ADR-0005](../adr/0005-chapter-panels-module.md)
术语：见根目录 [CONTEXT.md](../../CONTEXT.md)（章节、阅读顺序、分镜、在场角色、主角色、候选图、建议角色）

## 1. 目标

`src/lib/project/chapter-panels/` 成为章节内分镜序列和在场角色的唯一 TypeScript 写入方。

不变量：

1. 每个章节的 `panel_order` 从 1 开始连续编号；项目范围的先后一律按阅读顺序（章节顺序，再章节内顺序）。
2. 在场角色只能是本项目的项目角色，不重复；服装必须属于该角色。
3. 主角色（`character_id`、`outfit_id`、`expression_type`）等于第一位在场角色，由 `panel_characters` 上的触发器派生，应用代码不写。
4. `Panel.project_id == chapter.project_id`。
5. 每个分镜有且只有一行 `panel_pipeline_states`。

## 2. 现状（2026-11-20 扫描）

| 问题 | 证据 |
|---|---|
| 分镜写入点分散 | `panel.create` 15 处（11 个路由 + 4 个 lib），`panel_order` 平移约 13 处 |
| 两种编号范围混用 | 按项目平移：`panel/route.ts`、`panel/[id]`、`insert`、`split`、`script-segment.ts` 合并、`reorder`、`batch-reorder`、`batch-delete`、`templates/[id]/apply`；按章节：`move-to-chapter`、`chapter/[id]/generate-*`、`canvas/panel-birth.ts` + `canvas_renumber_chapter_panels` |
| 主角色与在场角色不一致 | 项目侧接口只写 `character_id`，从不写 `panel_characters`（`panel/[id]/route.ts:122` 等）；主角色规则有 6 份 |
| 整章覆盖不是原子操作 | `generate-panels/route.ts:136-164`（及 `-stream`、`generate-nine-grid`）先删后建，删除不在建立的事务里 |
| 两个 `ApiError` 类 | `@/lib/api-helpers` 的 `(message, status, code?)` 约 38 处导入、约 90 处构造；`@/lib/api-error` 的 `(statusCode, code, message, details?)` 带子类体系，2 处导入；`instanceof` 互不识别 |

远端库只读审计（2026-11-20）：分镜 436；画布分镜 0；`panel_characters` 0 行；有主角色的分镜 14 个，全部没有在场角色；`panel_order` 有重复或空号的项目 8 个、章节 8 个。

约 10 个读取方按项目只用 `panel_order` 排序：`api/project/[id]`、`api/project/route.ts`、导出（服务端 `export/route.ts`、客户端 `export-utils.ts`、`LayoutExportTab.tsx`）、排版页自动编排、`story/[id]/panels(-optimized)`、版本快照与恢复、分镜页"插入到末尾"、`break-layout` 邻格查找、提示词上下文（`workflow-engine`、`generate-image`、`suggest-*`、`templates apply`、`merge`）、画布参考图。页面按分镜 id 引用，不存编号。

## 3. 模块接口（设计稿，实施时可微调）

```ts
const p = panels(projectId, { tx });          // 调用方已校验项目归属
await p.add(fields | fields[], where);         // where: { chapter, index? } | { after } | { before }
await p.remove(ids);                           // 返回 Discarded（被一起删除的候选图、流程状态、在场角色、画布关联数）
await p.place(ids, where);                     // 章节内移动或跨章节移动
await p.split(id, [part1, part2, ...]);        // 默认继承原分镜的在场角色和剧本片段
await p.merge(ids, fields?);                   // 默认在场角色取并集（第一格在前），保留第一格的剧本片段
await p.setCast(id, cast);                     // cast: 项目角色 id 有序数组
await p.setLead(ids, projectCharacterId);      // 把该角色移到最前，没有则加入
await p.replaceChapter(chapterId, fields[]);   // 原子替换整章，返回 { created, discarded }
await p.readingOrder({ select | include });    // 阅读顺序
```

- 所有动词都走同一条内部路径：锁章节 -> 读草稿 -> 在草稿上编辑 -> `plan()` 算出差异 -> 一次写入。`plan()` 是纯函数，可以不连数据库单测。
- 每次写入锁 `pg_advisory_xact_lock(hashtext('canvas_panels'), hashtext(chapter_id))`；跨章节移动按 id 顺序锁两个章节。不传 `tx` 时自开事务。
- 模块校验章节、分镜、在场角色都属于该项目，抛 `@/lib/api-error` 的 400/404 错误；归属校验留给调用方。
- 普通字段编辑（提示词、对白、镜头、图片）不经过模块。

## 4. 分步实施

每一步单独提交、可单独回滚。

### 步骤 0：统一 ApiError

- `@/lib/api-error` 的 `ApiError(statusCode, code, message, details?)` 作为唯一的类；`@/lib/api-helpers` 删除自己的类，改为转出 `ApiError`，`handleApiError` 改用 `toJSON()`（响应体不变：`{ error, code }`，有 `details` 时附带）。
- 用 TypeScript 编译器 API 的一次性脚本把所有 `new ApiError(message, status, code)` 改写为 `new ApiError(status, code, message)`；缺 `code` 的按状态码补（404 `NOT_FOUND`、403 `FORBIDDEN` 等）。
- `src/lib/project/*`、`src/lib/canvas/*` 直接从 `@/lib/api-error` 导入，去掉 4 个测试文件里为 `@/lib/api-helpers` 手写的假 `ApiError`。
- 验证：`npm run type-check`、`npm run lint`、`npm test` 与改动前基线一致。

### 步骤 1：读取方切到阅读顺序

- 在模块里先提供 `readingOrder` 和共享的 `orderBy`（`chapter.chapter_order`、`panel_order`、`id`），上面列出的读取方全部改用它。这一步在新旧编号下结果都正确。
- `batch-layout` 要求所选分镜在同一章节；`break-layout` 只在同一章节内找邻格。

### 步骤 2：迁移 + 模块骨架 + `test:db`

- 手工 SQL 迁移（含回滚，先 dry-run 出计数）：按阅读顺序把每个章节重编为 1..N（并列按 `created_at`、`id`）；为 14 个有主角色无在场角色的分镜补在场角色行，角色不在项目里时按 `minor` 加入项目角色；新增 `panel_characters` 上的主角色触发器；`canvas_renumber_chapter_panels` 改为章节内纯 1..N；`canvas_move_segment_panels` 同时重编移出的章节。
- 模块骨架：`panels()`、内部草稿与 `plan()`、锁与事务。
- `npm run test:db`：单独的 Vitest 配置，连 docker-compose 的本地 Postgres，执行 `prisma migrate deploy` 和手工 SQL 后跑；未配置测试库时跳过。覆盖编号、整章替换原子性、主角色触发器、跨章节移动加锁。

### 步骤 3：写入方分批迁入

1. 画布 `panel-birth.ts`、`shot-store.ts` 的在场角色写入。
2. 插入、删除、批量删除、跨章节移动、排序（前端拖拽改为发送锚点：某格之前/之后，或章节 + 位置）、`batch-apply-character` 改用 `setLead`、`PATCH /api/panel/[id]` 的 `character_id` 改用 `setLead`。
3. 拆分、合并。
4. 按章节重新生成（`generate-panels`、`-stream`、`generate-nine-grid`）、应用模板、恢复版本改用 `replaceChapter`；恢复版本按章节重编。

### 步骤 4：删除旧副本

`shot-store.ts` 的 `createCanvasShots`、`replacePanelCharacters`、两份 `syncMainCharacter`、`panel-birth.ts` 私有的 `ensureProjectCharacters`、各路由里的平移代码。

### 步骤 5：数据库约束

- `UNIQUE (chapter_id, panel_order) DEFERRABLE INITIALLY DEFERRED`。
- 触发器拒绝与第一位在场角色不一致的 `character_id` 写入。

## 5. 不在本计划内

- 版本快照保存在场角色和主角色（后续单独做）。
- 项目访问上下文、付费生成、LLM 分镜入口等架构评审中的其他候选（后续以本模块为基础）。
- `panel/split/route.ts:186,207` 的中点计算运算符优先级问题（单独修复）。
