# 项目根对齐：迁移计划

日期：2026-11-18
相关决策：[ADR-0001](../adr/0001-project-as-single-root.md)、[ADR-0002](../adr/0002-character-library-with-project-characters.md)、[ADR-0003](../adr/0003-novel-as-project-source.md)、[ADR-0004](../adr/0004-story-to-project-sync-triggers.md)
术语：见根目录 [CONTEXT.md](../../CONTEXT.md)

## 1. 目标

```
User
├── 角色库 Character（用户级，可跨项目复用）
├── 场景库 Scene（用户级）
├── 小说 NovelProject（独立，可作为项目来源）
└── 项目 Project（唯一作品根）
    ├── 设定：genre / premise / outline / comic_style_id / style_reference_image / 连载状态
    ├── 来源：source_novel_id -> NovelProject（真实外键）
    ├── 项目角色 ProjectCharacter -> Character
    ├── 建议角色 SuggestedCharacter
    ├── 章节 Chapter（project_id 必填）
    │   ├── 剧本 / 剧本片段
    │   ├── 章节角色状态 ChapterCharacterState
    │   └── 分镜 Panel（chapter_id 必填）
    │       └── 候选图 PanelVariant
    ├── 页面 ComicPage / 导出 ExportHistory
    └── 版本 ProjectVersion / 生成任务 GenerationTask
```

不变量：

1. `Panel.project_id == Panel.chapter.project_id`。
2. 分镜绑定的 `character_id` 必须在该项目的 ProjectCharacter 中。
3. 前端所有创作页面都以 `projectId` 寻址，不再出现 `storyId`。

## 2. 现状要点（2026-11-18 扫描）

| 问题 | 证据 |
|---|---|
| 作品被拆成 Story 和 Project 两半 | `Project.story_id` 可选，Story 对 Project 是一对多 |
| 系统实际默认一对一 | `src/app/api/story/[id]/route.ts` 只取 `projects` 中最近更新的 1 个 |
| 角色不属于项目 | `Character` 只有 `user_id`，与作品的关系只经 `StoryCharacter` |
| Panel 双上级且无一致性约束 | `Panel.project_id`（必填）+ `Panel.chapter_id`（可选，章节属于 Story） |
| 剧本三套表示 | `Story.outline`、`StoryScript`（挂在 Project 上，`/api/storyboard`、`/api/project/[id]`、版本恢复、导出在用）、`ScriptSegment` |
| 分镜两套表示 | `Panel` 与 `ShotDesign` |
| 跨线软关联 | `Story.source_novel_id`、`Chapter.source_novel_chapter_id`、`CanvasTimeline.novel_project_id` 均无外键 |
| 路由错位 bug | `src/app/gallery/[id]/page.tsx:281` 用 `project_id` 跳转 `/scripts/[storyId]` |
| 导航无先后 | `menu-data.ts` 把"创作新故事 / 剧本管理 / 分镜编辑 / 分镜项目"并列 |

影响面（`src/` 中直接访问 Prisma 的文件数）：`prisma.story` 39、`prisma.project` 33、`prisma.chapter` 30、`prisma.panel` 49、`prisma.character` 50、`prisma.storyCharacter` 9。Python 服务只读写 `novel_*`、`world_*` 等表，不受 Story/Project 合并影响。

## 2.1 阶段 0 审计结果（2026-11-18，`npx tsx scripts/audit-project-root.ts`）

| 指标 | 数值 | 对方案的影响 |
|---|---|---|
| Story / Project / Chapter / Panel | 8 / 32 / 18 / 436 | 数据量小，回填可以单事务完成 |
| Story 拥有的 Project 数量 | 0 个：1；1 个：7；多个：0 | 不存在一对多，待定项 1 不需要处理；1 个 Story 需要新建 Project |
| 没有 story_id 的 Project | 25 个，共 295 个分镜 | 这些是独立分镜项目，本身已经是 Project，只需补设定字段为空 |
| 章节归属与项目不一致的分镜 | 0 | 不变量 1 在现有数据上成立，可以直接加约束 |
| 没有 chapter_id 的分镜 | 319（全部在没有章节的项目里） | 阶段 4 需要为这些项目自动建"第一章" |
| 角色被 Story 引用的次数 | 0 次：25；1 次：15；多次：0 | 25 个角色只在角色库中，不属于任何作品；回填后仍留在角色库 |
| 分镜绑定的角色不在故事角色中 | 无故事项目 13；有故事项目 0 | 这 13 个分镜所在的项目回填时要补对应的项目角色 |
| 悬空的软关联 | 1 个 canvas_timeline 指向已删除的小说 | 阶段 5 加外键前先清理或置空 |
| 同一部小说被转成多个 Story | 1 部小说，2 个 Story | 已确认允许一部小说对应多个项目，`source_novel_id` 不加唯一约束 |

## 3. 分阶段方案

每个阶段都可以单独上线、单独回滚。阶段 1 到 3 不删除任何旧列或旧表。

### 阶段 0：数据审计与小修（不改 schema）

- 执行预检查 SQL，统计：
  - Story 拥有 0 / 1 / 多个 Project 的数量；
  - 没有 story_id 的 Project 数量；
  - `panel.chapter_id` 非空但 `chapter.story_id != project.story_id` 的分镜数量；
  - 同一个 Character 被多个 Story 引用的数量。
- 根据结果确定"一个 Story 对应多个 Project"的处理规则（见第 5 节待定项）。
- 修复 `gallery/[id]` 的跳转错误。（已完成；阶段 3a 改为直接跳转分镜所属项目 `/projects/[projectId]`）
- 审计脚本：`scripts/audit-project-root.ts`（只读事务），结果见 2.1 节。

### 阶段 1：增量 schema 与数据回填

新增（全部可空或带默认值）：

- `projects`：`genre`、`premise`、`outline`(Json)、`template_id`、`comic_style_id`(FK)、`style_reference_image`、`is_serialized`、`serial_status`、`is_sample`、`sample_category`、`source_type`、`source_novel_id`(FK -> novel_projects，`ON DELETE SET NULL`，不唯一)。Story 到 Project 的映射直接沿用已有的 `projects.story_id`，不另加追踪列。阶段 1 中 `story_id` 不加唯一约束，因为模板应用、工作流引擎等现有流程仍可能为同一个 Story 新建 Project；阶段 2 收口这些流程后加了唯一索引。
- 注意 `projects.style` 是自由文本的画风描述（如"日式漫画"），不是 `comic_styles` 的 ID，和新的 `comic_style_id` 是两回事。`/api/gallery/[id]` 用 `project.style` 去查 `comic_styles`，结果永远为空，属于已有问题，留到阶段 3 统一处理。
- `chapters.project_id`(FK，可空，`ON DELETE SET NULL`)。迁移期删除项目时不能连带删除仍属于 Story 的章节，阶段 4 再改为 `CASCADE`。
- 新表 `project_characters`：`project_id`、`character_id`、`role`、`character_arc`、`display_order`，唯一约束 `(project_id, character_id)`。
- `suggested_characters.project_id`(FK，可空)。
- `canvas_timelines.project_id`(FK，可空)。回填时只处理无歧义的情况：同一用户下以该小说为来源的项目恰好只有一个；其余的列入报告，留到阶段 5 由用户在画布中选择。

回填脚本 `scripts/migrate-story-to-project.ts`（单事务、幂等、可重复执行）：

1. 每个 Story 确定主 Project：已有则取最近更新的，没有则新建；把 Story 字段写到主 Project 上（新建的 Project 写入 `story_id`）。阶段 1 中 Story 仍是权威来源，重复执行会用 Story 的值覆盖 Project。审计显示当前没有一个 Story 对应多个 Project 的情况，脚本遇到这种情况时直接报错退出，不做自动合并。
2. `chapters.project_id` = 主 Project。
3. `story_characters` 复制为 `project_characters`；再把各项目分镜中已绑定、但不在项目角色里的角色补进去（role 记为 `minor`）。
4. `suggested_characters.project_id` = 主 Project。
5. `canvas_timelines.project_id`：同一用户下以该小说为来源的项目恰好只有一个时才关联，其余列入报告。
6. 事务末尾校验不变量（分镜与章节的项目一致、所有章节已归属项目），不成立则整体回滚。

配套文件：
- 迁移：`prisma/migrations/manual/20261118_project_root_phase1.sql`（幂等，单事务）
- 回滚：`prisma/migrations/manual/20261118_project_root_phase1_rollback.sql`
- 回填：`npx tsx scripts/migrate-story-to-project.ts`（预演），加 `--apply` 写入

**部署顺序**：必须先对数据库执行迁移 SQL，再部署用新 schema 生成的 Prisma Client。新 Client 默认会查询全部列，库里缺列时 Project、Chapter、SuggestedCharacter、CanvasTimeline 的查询都会报错。旧 Client 访问已迁移的库不受影响。

**执行记录（2026-11-18）**：
- 本地沙箱库（远端数据只读复制）演练：迁移执行 2 次；回填写入后预演全为 0；第二次写入无变更；回滚后结构恢复、旧数据完整；重新迁移再回填结果一致。
- 远端库 `cartoon` 已执行迁移和回填：新建 1 个项目，更新 7 个项目设定，18 个章节、5 个建议角色关联到项目，写入 17 个项目角色（15 个来自故事角色，2 个来自分镜绑定）。独立核对 SQL 各项不一致计数均为 0。
- 画布时间线：15 个属于同一部被改编成 2 个项目的小说，需要在阶段 5 由用户选择项目；8 个对应的小说还没有改编成项目。

### 阶段 2：服务层收口与双写

- 双写用数据库触发器完成（[ADR-0004](../adr/0004-story-to-project-sync-triggers.md)），方向只有 Story -> 主项目：
  - `stories` 插入时创建主项目，更新时同步设定（改名时同步标题）；
  - `chapters`、`suggested_characters` 按 `story_id` 自动填 `project_id`；
  - `story_characters` 增删改同步到 `project_characters`；删除故事引起的级联删除不同步，项目保留为独立项目。
  - `projects.story_id` 加唯一索引 `unique_projects_story`，一个故事最多一个主项目。
- 新增 `src/lib/project/`：`findStoryProject`、`ensureStoryProject`。所有为故事创建项目的地方改为取主项目：`POST /api/project`（故事已有项目时直接返回）、`templates/[id]/apply`、`trial/claim`、`workflow-engine.ts`、`prisma/seed.ts`。
- `/api/storyboard` 带 `storyId` 时：主项目没有分镜和剧本就写入主项目，否则新建不关联故事的独立项目；同时补了故事归属校验（其他用户的故事返回 403，且不扣配额）。
- 待做：`getProjectForUser`、`listProjectCharacters`、`assertCharacterInProject`、`assertPanelInProject`；角色引用校验（分镜绑定、参考图选择、角色识别只接受项目角色）。这些改动会改变现有接口行为，和阶段 3 的读切换一起做。

配套文件：
- 迁移：`prisma/migrations/manual/20261119_project_root_phase2.sql`（幂等，单事务；存在一个故事多个项目时报错退出）
- 回滚：`prisma/migrations/manual/20261119_project_root_phase2_rollback.sql`（只删触发器、函数和唯一索引，已同步的数据保留）。回滚阶段 1 之前必须先回滚阶段 2。

**部署顺序**：迁移和代码哪个先上线都可以。代码先上线时 `ensureStoryProject` 会自己创建主项目；迁移先上线时旧代码的 `project.create`（带 `story_id`）会因为唯一索引失败，所以建议先部署代码再执行迁移。

**执行记录（2026-11-19）**：
- 本地沙箱库（远端数据只读复制）演练 24 项检查全部通过：迁移执行两次；新故事自动建主项目并复制设定；`ensureStoryProject` 取到同一个项目；重复建项目被唯一索引拒绝；设定与改名同步、只改 `updated_at` 不同步；章节与建议角色自动归属；故事角色增、改、换人、删同步；删除故事后项目和项目角色保留；事务内建故事再取主项目；回滚后触发器与索引删除、`ensureStoryProject` 自行建项目；重新迁移成功。演练后回填预演全为 0（跳过的时间线除外）。
- 远端库 `cartoon` 已执行迁移：4 个触发器和唯一索引已建立；没有缺主项目的故事，没有未归属项目的章节；事务内冒烟测试（新建故事、章节、故事角色后回滚）确认主项目创建、章节归属、项目角色同步都生效，未留下数据；回填预演全为 0（跳过的时间线除外）。

### 阶段 3：读切换与前端路由

分三步上线：3a 页面路由与导航，3b API 读切换，3c 项目角色引用校验。

**3a 页面路由与导航（已完成，2026-11-19）**

- 新路由 `/projects/[projectId]` 是项目主页：故事主项目显示剧本编辑器，没有故事的独立项目（25 个，阶段 4 补章节之前没有剧本可编辑）直接重定向到分镜编辑器。原计划的"设定 -> 角色 -> 剧本 -> 分镜 -> 排版导出"标签页留到阶段 4 之后，现在的剧本编辑器已经带有阶段条。
- 子路由：`/projects/[projectId]/focus`（专注模式）、`/storyboard`（分镜编辑器）、`/storyboard/layout`（分镜排版）、`/layout`（排版编辑器）。剧本编辑器和专注模式的组件仍放在 `src/app/scripts/[id]/`（约 15 个模块从这里 import），改为接收 `storyId`、`routeProjectId` 的命名导出组件，页面链接都用 `projectId`。
- 旧 URL 改为服务端重定向，保留查询参数：`/scripts` -> `/projects`；`/scripts/[storyId]`、`/scripts/[storyId]/focus` 通过 `ensureStoryProject` 换成主项目；`/storyboard/editor/[id]`、`/storyboard/layout/[id]`、`/layout-editor/[id]` 换到项目下的对应路径。未登录跳登录页，ID 非法或无权访问跳 `/projects`。
- 站内链接改到新路由：项目卡片、工作台、画廊详情（直接用分镜的 `project_id`）、快速分镜、故事生成器、个人中心。注册领取体验作品、智能导入、小说转漫画在 3b 改为直接用接口返回的 `projectId`。
- 项目列表改名"我的项目"，卡片标出"剧本 / 分镜"两类；工作台"最近作品"改为列出最近项目。
- 删除：删除故事主项目时连同故事一起删除（`deleteProjectWithStory`），删除故事时连同主项目一起删除（`deleteStoryWithProject`），都在一个事务里，先删故事再删项目。
- 导航：创作（工作台 / 我的项目 / 新建项目 / 小说）、资产库（角色库 / 场景库 / 模板）、工具（快速分镜 / 生成图库 / 一键生成 / 画面精炼）。命令面板、首页快速入口、页脚同步修改。

已知情况：有些故事的分镜在阶段 2 之前生成在别的项目上，所以故事主项目在列表里显示 0 个分镜，同名的独立项目里才有分镜。是否把它们合并到主项目，留到阶段 4 和"第一章"回填一起决定。

**3b API 读切换（已完成，2026-11-19）**

- `/api/story/[id]`、`/panels`、`/panels-optimized`、`/generated-images` 改用 `findStoryProject` 取主项目，不再依赖 `projects take:1`。
- `/api/story/[id]/generated-images` 的 `projectId` 参数原来不校验归属，现在只接受当前用户自己的项目（否则 404）。
- `POST /api/story` 在同一事务里建故事并取主项目，返回 `projectId`；`/api/trial/claim` 返回 `projectId`；`convert-to-comic` 返回 `project_id`。智能导入、注册领取体验作品、小说转漫画直接跳转 `/projects/[projectId]`。
- `/api/gallery/[id]` 的风格改为读项目的 `comic_style_id` 关联。原来把自由文本 `projects.style`（如"日式漫画"）当 UUID 查 `comic_styles`，查不到或直接报错。
- 设定字段的读取仍走 Story：阶段 2 的触发器保证主项目和故事一致，剧本编辑器继续通过 `/api/story/[id]` 读写，等阶段 4 章节改挂项目后再整体切换。

**3c 项目归属与角色引用校验（已完成，2026-11-19）**

- `src/lib/project/access.ts` 提供 `getProjectForUser`、`assertChapterInProject`、`assertPanelsInProject`、`listProjectCharacters`、`ensureProjectCharacters`、`filterOwnedCharacterIds`，有单元测试。
- 章节归属：`/api/chapter/[id]/generate-panels`、`generate-panels-stream`、`generate-nine-grid`、`generate-nine-grid-image`、`generate-nine-grid-from-plot` 要求章节属于请求里的 `project_id`，否则 400（流式接口用 SSE error 事件返回）；`/api/panel/move-to-chapter` 只能移到同一项目的章节；`/api/story/[id]/import-text` 建章节时写入 `project_id`。
- 角色引用：分镜绑定角色（`POST /api/panel`、`PATCH /api/panel/[id]`、`batch-update`、`batch-apply-character`、`insert`、`split`、`merge`、`/api/storyboard`）只接受当前用户角色库里的角色，不在项目角色里的自动加入（`role=minor`）；别人的角色返回 400 `INVALID_CHARACTER`。LLM 产出的角色 ID 只保留本人角色库里的，其余当作未绑定，不让整个请求失败。`/api/panel/[id]/sketch` 在扣配额前校验请求里的角色。
- 和原计划的差别：没有做成"只接受项目角色"的硬限制，而是从角色库自动加入项目角色，前端不用先维护项目角色列表。
- 已在 dev server 上实测：绑定他人角色 400、绑定本人角色自动加入项目角色且不重复、跨项目移动分镜 400、项目内移动正常、他人修改分镜 403；临时数据已清理。
- 前端可见变化：如果旧章节没有 `project_id`，章节生成和移动分镜会被拒绝。远端库已回填全部章节，审计没有未归属的章节。

### 阶段 4：收紧约束

- 没有章节的项目自动创建"第一章"，再把这些项目的分镜挂到该章节上。
- `chapters.project_id`、`panels.chapter_id` 改为 NOT NULL，`chapters.project_id` 外键改为 `ON DELETE CASCADE`。
- 增加检查（触发器或服务层断言），保证 `panel.project_id` 与章节一致。
- `Chapter.story_id` 改为可空，停止写入。

### 阶段 5：小说线对齐

- `convert-to-comic` 改为创建或更新 Project（`source_novel_id`），小说人物生成角色并加入项目角色。
- `CanvasTimeline` 按 `project_id` 关联，画布角色来源改为项目角色。
- `ScriptSegment`/`ShotDesign` 与项目的剧本片段和分镜合并，单独出设计文档后再动手。

### 阶段 6：清理

在线上稳定运行至少一个发布周期后：删除 `Story`、`StoryCharacter`、`StoryScript`、`Chapter.story_id`、`Project.story_id`、`/api/story/**` 兼容层和旧路由重定向。删除前先导出备份。

## 4. 每个阶段的验证

- `npm run type-check`、`npm run lint`、`npm test` 全部通过。
- 回填脚本在生产数据副本上演练：重复执行结果不变，审计计数前后一致（章节数、项目角色数、分镜数）。
- 手动走一遍主链路：新建项目 -> 添加角色 -> 生成剧本 -> 生成分镜 -> 生成图片 -> 排版导出；小说转漫画后能在同一个项目里继续创作。

## 5. 待定项

1. ~~一个 Story 对应多个 Project 时如何处理~~：阶段 0 审计显示没有这种数据，回填脚本遇到时报错退出即可。
2. ~~一部小说是否允许对应多个项目~~：允许（2026-11-18 确认）。
3. 场景是否也采用"场景库 + 项目场景"模式，还是继续只挂用户。目前倾向于和角色保持一致，但优先级低于角色。
4. 旧的 `/api/story/**` 兼容层保留多久，是否有外部调用方（`example/` 客户端、Swagger 文档）。
