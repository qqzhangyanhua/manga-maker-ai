# 画布剧本片段/镜头设计与项目剧本、分镜合并：设计文档

- 日期：2026-11-20
- 状态：已确认（2026-11-20，用户选择方案 A；第 6 节待定项已决策）
- 关联：ADR-0001（项目吸收故事）、ADR-0002（角色库 + 项目角色）、ADR-0003（小说作为项目来源）、`docs/plans/2026-11-18-project-root-alignment-plan.md`

## 1. 问题

小说转漫画的画布流水线和项目内的剧本/分镜编辑器是两套并行的数据模型，同一个概念各存一份：

| 领域概念（CONTEXT.md） | 项目侧（剧本编辑器） | 画布侧（无限画布） |
|---|---|---|
| 章节 | `Chapter`（属于项目） | `TimelineChapter`（属于时间线，`chapter_id` 指向**小说章节** `NovelChapter`，无外键） |
| 剧本片段 | `StoryScript.segments` JSON（每个项目一份，不分章节），`Panel.script_segment_id` 是字符串软引用 | `ScriptSegment` 表（属于 `TimelineChapter`） |
| 分镜 | `Panel`（属于章节，单角色 `character_id`、`outfit_id`、`expression_type`） | `ShotDesign`（属于剧本片段，多角色 `character_ids[]`、`outfit_ids[]`、`expression_types[]` 平行数组） |
| 候选图 | `PanelVariant` | `ComicPanelResult`（另有 `NineGridGeneration`、`ShotPromptComposition` 挂在 `ShotDesign` 上） |

后果：

- 画布里做的分镜进不了项目，不能排版导出。`ComicPanelResult.exported_to_panel_id` 预留了导出字段，但没有任何代码写它（远端库 64 条结果，0 条导出）。
- CONTEXT.md 已把"镜头设计 (ShotDesign)""时间线章节"列为应避免的说法，代码里仍是两套。
- 同一部小说转成项目之后，画布上的剧本和分镜与项目章节没有关系，用户在两处各做一遍。

## 2. 现状数据（远端库，2026-11-20 只读审计）

| 项 | 数量 |
|---|---|
| 画布时间线 | 23（已归属项目 0；15 条有多个候选项目，等用户在画布上选择；8 条对应的小说还没有改编项目） |
| `timeline_chapters` | 20，全部指向 `novel_chapters`；其中只有 1 条对应的小说章节已经转成项目章节 |
| `script_segments` | 117 |
| `shot_designs` | 257（有图 7） |
| `comic_panel_results` | 64（已导出到分镜 0） |

数据量小，一次性回填成本低；难点在代码：33 个服务端文件直接读写 `ScriptSegment`/`ShotDesign`/`TimelineChapter`/`ComicPanelResult`，3 个前端组件依赖 `ShotDesign` 类型。Python 后端的画布服务只返回分析结果、不写这几张表，合并不影响 Python 侧的数据访问。

## 3. 方案对比

### 方案 A：数据收敛到项目侧（推荐）

画布变成"项目章节的生产视图"：时间线章节锚定项目章节，剧本片段和分镜只存一份，挂在项目章节上；画布特有的流水线状态（各阶段进度、九宫格、提示词合成）作为分镜的附属记录保留。

- 优点：符合 CONTEXT.md 和 ADR-0001"项目是唯一根"；画布产出直接可排版导出；剧本编辑器和画布看到同一份分镜。
- 缺点：改动面大（33 个服务端文件），需要分步双写，周期长。

### 方案 B：保留两套，加"导出到项目"

画布表不动，新增一个动作把 `ShotDesign` + 选中的 `ComicPanelResult` 物化为项目章节下的 `Panel` + `PanelVariant`，写 `exported_to_panel_id`。

- 优点：改动小，几天可上线，不碰现有画布链路。
- 缺点：分镜仍存两份，导出后两边各改各的会分叉；与领域语言冲突的状态被固化。

### 方案 C：画布表改名并入项目侧，项目编辑器改读画布表

把 `ScriptSegment`/`ShotDesign` 当成规范表，剧本编辑器改为读它们，`Panel` 退化。

- 缺点：`Panel` 被排版、导出、画廊分享、版本快照、批量生成等大量项目侧功能使用，反向迁移成本高于方案 A，不考虑。

## 4. 推荐方案 A 的分步设计

每一步都可独立上线、可回滚，沿用阶段 1-4 的模式（手工 SQL 迁移 + 回填脚本 dry-run/apply + 双写触发器或服务层双写）。

### 5c-1 锚定：时间线章节指向项目章节

- `timeline_chapters` 新增 `project_chapter_id uuid null`，外键 `chapters(id) on delete set null`。原 `chapter_id`（小说章节）保留，语义改名为来源小说章节（字段改名放到阶段 6）。
- 时间线已归属项目时：按 `chapters.project_id = timeline.project_id and chapters.source_novel_chapter_id = timeline_chapters.chapter_id` 找项目章节；找不到就按小说章节创建项目章节（复用 convert-to-comic 的章节创建逻辑，抽到 `src/lib/project/chapter.ts`）。
- 触发时机：时间线归属项目时（PATCH `project_id`、POST 自动归属）、画布新增章节时；另提供回填脚本。
- 未归属项目的时间线保持现状，不创建任何项目数据。

### 5c-2 剧本片段挂到项目章节

- `script_segments` 新增 `chapter_id uuid null`（外键 `chapters`，级联删除），由 5c-1 的锚点回填；画布写入剧本片段时同时写 `chapter_id`。
- 剧本编辑器的 `StoryScript.segments` JSON 暂不改，阶段 6 前保持兼容；新代码以 `script_segments` 表作为"剧本片段"的规范存储。剧本编辑器改读表单独排期（它按项目而非章节存，需要先拆分到章节）。

### 5c-3 分镜收敛：ShotDesign 物化为 Panel

- `panels` 补齐画布需要的字段：`script_segment_id` 改为真正的外键（uuid，指向 `script_segments`）、`location_key`、`negative_prompt`、`generation_status`。
- 多角色绑定：新增 `panel_characters`（`panel_id`、`project_character_id`、`outfit_id`、`expression_type`、`sort_order`），替代 `ShotDesign` 的三组平行数组；`Panel.character_id` 保留为"主角色"兼容字段，阶段 6 再决定去留（见第 6 节待定项 1）。
- `shot_designs` 新增 `panel_id uuid unique null`。双写期：画布创建/更新镜头设计时由服务层同步写对应 `Panel`（不用数据库触发器，因为要拆数组、映射项目角色，逻辑放 `src/lib/project/` 更好测）。
- 画布特有的流水线状态（`character_prompt_status`、`final_prompt_status`、`nine_grid_status`、`selection_status`、`prompt_composition_id`、`nine_grid_generation_id`）不进 `Panel`，迁到附属表 `panel_pipeline_states`（`panel_id` 主键），`ShotPromptComposition`/`NineGridGeneration` 增加 `panel_id` 并回填。
- 候选图：`ComicPanelResult` 回填为 `PanelVariant`（`variant_type = 'canvas_final'`，生成参数放新增的 `generation_params jsonb`），双写期两边都写。

### 5c-4 读切换与删除

- 画布 API 逐个改为读 `Panel`/`PanelVariant`/`panel_pipeline_states`，前端 `ShotDesign` 类型换成分镜类型。按接口分批（详情面板 -> 生成镜头 -> 生成图片/九宫格 -> 最终漫画）。
- 全部切换并稳定一个发布周期后，在阶段 6 删除 `shot_designs`、`comic_panel_results` 及双写代码。

## 5. 验证

- 每步回填脚本在远端库先 dry-run，计数前后一致：项目章节数、剧本片段数、镜头设计数 = 对应分镜数、结果数 = 对应候选图数。
- 双写期增加一致性审计脚本：`shot_designs.panel_id` 为空或对应分镜字段不一致的行数应为 0。
- 手动链路：小说转漫画 -> 画布归属项目 -> 生成剧本 -> 生成镜头 -> 生成图片 -> 在项目分镜编辑器里能看到同一批分镜并排版导出。
- `npm run type-check`、`npm run lint`、`npm test`。

## 6. 决策（2026-11-20 用户确认）

- 采用方案 A，按 5c-1 至 5c-4 分步实施，不做方案 B 过渡。
- 分镜多角色采用 `panel_characters` 关联表，`Panel.character_id` 保留为主角色兼容字段。
- 小说还没有改编项目的时间线：在画布页提供"创建漫画项目"入口，创建后自动归属，并纳入 5c-1。

## 7. 原待定项（已决策，保留备查）

1. **分镜多角色**：采用 `panel_characters` 关联表，还是在 `panels` 上加数组字段沿用画布写法？推荐关联表（能挂外键、能约束"只能引用项目角色"）。
2. **未归属项目的时间线**：5c-1 只处理已归属项目的时间线。8 条小说还没有改编项目的时间线，是继续留在画布侧，还是在画布上提供"创建漫画项目"入口？
3. **是否先上方案 B 作为过渡**：方案 A 周期长；如果用户急需"画布结果进项目排版"，可先做方案 B 的导出动作，5c-3 落地后导出动作自然废弃。
