# 分镜写入收口到章节分镜模块：章节内编号、主角色由在场角色派生

分镜的增删、移动、排序、拆分合并和整章替换此前分散在约 15 个写入点，`panel_order` 一部分按项目平移、一部分按章节平移，主角色 (`panels.character_id`) 有 6 处各自维护，项目侧接口只写主角色不写在场角色 (`panel_characters`)，两者会不一致。我们决定由 `src/lib/project/chapter-panels/` 作为分镜序列和在场角色的唯一 TypeScript 写入方；`panel_order` 改为章节内从 1 开始连续编号，项目范围的读取一律走模块提供的阅读顺序（先章节顺序，再章节内顺序）；主角色及其兼容字段 (`character_id`、`outfit_id`、`expression_type`) 由 `panel_characters` 上的数据库触发器从第一位在场角色派生，应用代码不直接写。

## Considered Options

- **项目内全局连续编号**：读取方不用改，但章节内每次插入都要平移后续所有章节，已有的章节重排接口也要重编整个项目。
- **章节内编号但允许空号**：写入简单，但批量排版和九宫格依赖连号，空号要在读取方各自处理。
- **主角色只在 TypeScript 里派生**：便于单测，但旧镜头导入和剧本片段换章节两条 SQL 路径也写在场角色，规则会在两种语言里各存一份。

## Consequences

- 约 10 个按项目排序 `panel_order` 的读取方（导出、排版分页、版本快照、插入到末尾、拆版邻格查找等）先切到阅读顺序，再执行重新编号迁移；批量排版和拆版只在同一章节内生效；版本恢复按章节重新编号。
- 只有项目角色能在场，未确认的小说人物作为建议角色，不进 `panel_characters`。
- 整章替换（按章节重新生成、应用模板、恢复版本）在一个事务内完成，旧分镜连同候选图、流程状态和画布关联一起删除。
- 所有写入方迁完后，数据库加 `UNIQUE (chapter_id, panel_order) DEFERRABLE INITIALLY DEFERRED`，并用触发器拒绝与第一位在场角色不一致的 `character_id` 写入。
- 编号锁沿用 `(hashtext('canvas_panels'), hashtext(chapter_id))`，`canvas_renumber_chapter_panels` 改为章节内纯 1..N，`canvas_move_segment_panels` 同时重编移出的章节。
- 涉及编号、整章替换和触发器的测试放在单独的 `npm run test:db`，连 docker-compose 的本地 Postgres；未配置测试库时跳过，`npm test` 仍只用 mock。
