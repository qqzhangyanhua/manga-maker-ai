[根目录](../CLAUDE.md) > **src**

# 变更记录 (Changelog)

- 2026-03-01 18:53:41: 第六轮补扫 admin 子组件+hooks（32 文件）、DetailPanel（7 文件）、NineGrid（11 文件）、ProfessionalMode（14 文件）、CreateProjectDialog、StructuredResultView；共 66 文件，覆盖率 24.75% -> 35.17%。
- 2026-03-01 18:40:43: 第五轮补扫 admin 13 个页面 + InfiniteCanvas 14 个对话框/抽屉/辅助组件 + InspirationModeDialog + ImageGalleryPanel。
- 2026-03-01 10:13:03: 补扫 InfiniteCanvasView/ChapterRow/admin(users|transactions|prompt-templates)/PanelEditor。
- 2026-03-01 09:32:34: 续扫 admin(llm-providers/rag-management/generated-images/generation-logs/workflows) 与 scripts/[id]/hooks。
- 2026-03-01 00:41:16: 深扫 scripts/[id] 主体结构与 panel API。
- 2026-03-01 00:12:46: 补扫 Storyboard 与 nine-grid 子模块。
- 2026-02-28 23:40:57: 首次生成模块文档。

# 模块职责

`src` 是 Next.js 14 App Router 主应用，承载：
- 页面路由（novel、scripts、admin、gallery 等）
- `/api/*` 服务接口
- 小说代理层（`/api/novel/[...path]`）
- 前端业务组件与 hooks

# 入口与启动

- `src/app/layout.tsx`
- `src/app/providers.tsx`
- `src/app/page.tsx`
- `src/app/api/novel/[...path]/route.ts`

# 对外接口

## 核心 API 域

- 鉴权：`/api/auth/*`
- 角色：`/api/character/*`
- 故事/章节：`/api/story/*`、`/api/chapter/*`
- 分镜：`/api/panel/*`
- 小说代理：`/api/novel/*`
- 管理后台：`/api/admin/*`
- 画布：`/api/canvas/*`

## admin 子组件与 hooks 深扫（第六轮）

### admin/characters 组件层

- **CharacterTable.tsx**：角色表格，展示 name/description/story/创建时间，行操作（编辑/删除），通过 `useCharacterList` 获取分页数据。
- **CharacterFormDialog.tsx**：角色创建/编辑对话框，`react-hook-form` + `zod` 校验，字段 name/description/story_id，通过 `useCharacterForm` 的 `createMutation`/`updateMutation` 提交。
- **CharacterFilterBar.tsx**：筛选栏，keyword 搜索 + story_id 下拉过滤 + 创建按钮。获取故事列表来源 `/api/admin/stories`。
- **PaginationControls.tsx**：分页控件，首/前/后/末 + 页码指示器。
- **DeleteConfirmDialog.tsx**：删除确认弹窗，带 `AlertDialog` 标准化 UX。

### admin/characters hooks

- **useCharacterList.ts**：基于 React Query，GET `/api/admin/characters?page=&pageSize=&keyword=&story_id=`。返回 `{ data, pagination }` + `refetch`。依赖 `keyword`/`storyId` 变化重新查询。
- **useCharacterForm.ts**：封装 `useMutation` 的 create/update/delete 三个操作。POST/PUT/DELETE `/api/admin/characters`。成功后 `invalidateQueries` 刷新列表。

### admin/story-templates hooks

- **useStoryTemplateList.ts**：GET `/api/admin/story-templates?page=&keyword=&genre=&is_active=`。分页 + 筛选。
- **useStoryTemplateForm.ts**：create/update/delete 三操作，POST/PUT/DELETE `/api/admin/story-templates`。

### admin/comic-styles hooks

- **useComicStyleList.ts**：GET `/api/admin/comic-styles?page=&keyword=&is_active=`。分页 + 筛选。
- **useComicStyleForm.ts**：create/update/delete，操作 `/api/admin/comic-styles`。

### admin/panel-templates hooks

- **usePanelTemplateList.ts**：GET `/api/admin/panel-templates?page=&keyword=&layout_type=&is_active=`。
- **usePanelTemplateForm.ts**：create/update/delete，操作 `/api/admin/panel-templates`。

### admin/llm-providers 组件层

- **ProviderTable.tsx**：LLM 供应商表格，展示 name/type/base_url/is_active/model_count/created_at。行操作编辑/删除。
- **ProviderFormDialog.tsx**：供应商创建/编辑对话框，字段 name/type/base_url/api_key/is_active/description/models 数组。
- **ProviderTypeInfo.tsx**：类型说明组件，根据 provider type 展示简介和配置提示。
- **DeleteProviderDialog.tsx**：删除确认弹窗。

### admin/llm-providers hooks

- **useProviders.ts**：GET `/api/admin/llm-providers`，封装 create/update/delete + toggleActive + refreshModels 操作。

### admin/generation-logs 组件层

- **LogFilterBar.tsx**：日志筛选栏，status/type/user/日期范围。
- **LogTable.tsx**：日志表格，展示 type/model/status/user/prompt 截断/tokens/cost/耗时/创建时间。
- **LogDetailDialog.tsx**：日志详情弹窗，展示完整 prompt/result/error/metadata JSON。

### admin/generated-images 组件层

- **ImageFilterBar.tsx**：图片筛选栏，status/type/user/日期范围。
- **ImageGrid.tsx**：图片网格，缩略图 + 状态标记 + 点击查看详情。
- **ImageDetailDialog.tsx**：图片详情弹窗，大图 + prompt + 参数 + 下载/删除操作。

### admin/tags 组件层

- **TagMergeDialog.tsx**：标签合并对话框，选择源标签和目标标签，POST `/api/admin/tags/merge`。含预览合并影响和确认步骤。

### admin/rag-management 组件层

- **OverviewTab.tsx**：RAG 系统概览，StatsCard 四宫格（总文档/活跃索引/检索成功率/近期活动）。
- **IndexManagementTab.tsx**：索引管理，Table + 搜索 + 分页 + 单个索引操作（刷新/删除/详情）。
- **QualityMonitoringTab.tsx**：质量监控，一致性检查触发与结果展示。
- **MaintenanceTab.tsx**：维护操作，批量重建索引/清理过期数据/导出。

## admin 公共模式总结

所有 admin 页面遵循统一架构模式：
1. **鉴权 gating**：`useCurrentUser` + `role === admin` 检查。
2. **数据获取**：`useAdminList(endpoint)` 或自定义 hooks（`useXxxList`），返回分页结果。
3. **变更操作**：`useAdminMutations(endpoint)` 或自定义 hooks（`useXxxForm`），提供 create/update/delete。
4. **UI 模式**：表格 + 筛选栏 + 分页 + 弹窗表单 + 删除确认。
5. **hooks 模式**：`useXxxList` = `useQuery` + 分页筛选参数；`useXxxForm` = 3 个 `useMutation` + `invalidateQueries`。

## InfiniteCanvas DetailPanel 深扫（第六轮）

### DetailPanel/index.tsx（容器）
- 基于 `vaul` Drawer（右侧抽屉）。
- 监听 Zustand store `useDetailPanel()` 获取 `{ isOpen, nodeType, chapterId }`。
- 根据 `nodeType` 动态渲染对应面板：`script` -> `ScriptDetailPanel`，`shot` -> `ShotDetailPanel`，`scene` -> `SceneDetailPanel`，`final` -> `FinalDetailPanel`。
- 支持 ESC 键/点击遮罩/滑动关闭。

### DetailPanel/types.ts
- 定义 `LocationGroup`（场景分组）和 `ShotGroup`（镜头分组，含 groupIndex/startOrder/endOrder/shots/isComplete/placeholderCount/locationStats）。
- 依赖 Prisma `ShotDesign` 类型。

### ScriptDetailPanel.tsx
- 剧本分段详情面板，展示章节剧本分段内容。
- 数据获取：`useQuery` 从 `/api/canvas/chapter/{id}/scripts` 获取。
- 展示：按 segment 顺序展示每段的文本内容与元数据。

### ShotDetailPanel.tsx
- 镜头设计详情面板。
- 展示：镜头序号/描述/camera_angle/shot_size/panel_type/composition_hint/prompt/生成图片。
- 包含 `ShotGroupSection` 子组件，将镜头按 9 个一组分组渲染。

### SceneDetailPanel.tsx
- 场景图片详情面板。
- 展示：场景图片网格 + 每张场景图的生成参数与 prompt。

### FinalDetailPanel.tsx
- 最终漫画详情面板。
- 展示：最终合成漫画图 + 关联的镜头列表 + 生成参数。

### ShotGroupSection.tsx
- 镜头分组子组件，将连续 9 个镜头渲染为一组，标注起止序号和完整性状态。
- 使用 `ShotGroup` 类型。

## InfiniteCanvas NineGrid 深扫（第六轮）

### NineGrid/types.ts
- 核心类型定义：
  - `ShotDesignBasic`：镜头基础信息（id/shot_order/camera_angle/shot_size/panel_type/shot_description/composition_hint/prompt/generated_image_url/generation_status）。
  - `NineGridGenerateRequest`：生成请求体（shotIds/comicStyleId/plotSummary/characterReferences）。
  - `NineGridGenerateResponse`：生成响应（success/taskId/status/message）。
  - `GenerateNineGridDialogProps`：对话框 Props（open/onOpenChange/selectedShots/timelineId/chapterId/chapterSummary/onConfirm/isSubmitting）。
  - `NineGridSelectionState`：选择模式状态（isSelectMode/selectedShotIds）。
  - `ReferenceImageSource`：`"character_avatar" | "shot_image" | "scene" | "final"`。
  - `ReferenceImage`：参考图片（id/url/source/sourceId/thumbnail/metadata）。
  - `CharacterReference`：角色参考配置（id/name/role/avatar_url/selectedReferenceImages）。
  - `ProjectReferenceImagesResponse`/`ProjectCharactersResponse`：API 响应类型。
  - `ChapterCharactersResponse`（已废弃，标记 @deprecated）。

### NineGrid/prompt-builder.ts
- 九宫格提示词构建工具。
- `buildNineGridPrompt(shots, stylePrefix, plotSummary)` -> 构建 3x3 网格生成提示词，要求恰好 9 个镜头。
- `validateNineGridSelection(selectedShotIds, allShots)` -> 验证选择是否有效。
- `checkShotsConsecutive(selectedShots)` -> 检查镜头是否连续，返回 gaps 列表。
- 内部截断策略：plotSummary 截断至 400 字符，每个镜头描述截断至 100 字符。
- 输出模板：风格前缀 + 核心模板（8K/16:9/3x3）+ 9 行镜头描述 + 纯视觉输出指令。

### NineGrid/GenerateNineGridDialog.tsx
- 九宫格生成对话框。
- 展示选中的 9 个镜头摘要、剧情概述输入、当前漫画风格（从 `useTimelineConfig` + `useComicStyles` 获取）。
- 角色参考图可选（`CharacterReferenceSection`）。
- 镜头连续性检查（`checkShotsConsecutive`）：不连续时显示警告。
- 确认提交 `NineGridGenerateRequest`。

### NineGrid/CharacterReferenceSection.tsx
- 角色参考图区域。
- `useProjectCharacters(projectId)` 获取项目角色列表。
- 自动初始化角色参考状态（`useEffect`）。
- 操作：单击头像添加/取消参考图，移除单张参考图。
- 三种状态渲染：loading 骨架屏、缺 projectId 警告、无角色提示。

### NineGrid/CharacterReferenceCard.tsx
- 单角色参考图卡片。
- 展示：角色头像/名称/角色定位标签/选用按钮/已选参考图缩略图列表。
- 操作：选用头像切换（toggle）、移除单张参考图。

### NineGrid/ReferenceImagePicker.tsx
- 参考图片选择对话框（多标签页）。
- 四个标签页：角色头像（开发中）/ 镜头图片 / 场景库 / 最终分镜（开发中）。
- `useProjectReferenceImages` 获取项目参考图数据。
- 多选模式，上限 `maxImages`（默认 5 张）。

### NineGrid/hooks/useProjectCharacters.ts
- GET `/api/novel/projects/{projectId}/characters`。
- `staleTime: 5min`，`refetchOnWindowFocus: false`。

### NineGrid/hooks/useProjectReferenceImages.ts
- GET `/api/canvas/project/{projectId}/reference-images?types=shot,scene,final`。
- 类型映射：`shot_image` -> `shot`。
- `staleTime: 5min`。

### NineGrid/hooks/useChapterCharacters.ts
- GET `/api/novel/chapter/{chapterId}/characters`。
- 已废弃（类型标记 @deprecated），推荐使用 `useProjectCharacters` 替代。
- 始终启用查询（`enabled: true`），内部处理空 chapterId。

## ProfessionalMode 深扫（第六轮）

### ProfessionalMode/index.tsx（入口）
- 专业创作模式对话框（向导式工作流）。
- 状态管理：`useWorkflowMachine`（useReducer 驱动的 FSM）。
- 工作流阶段：`genre_select` -> `options_generating` -> `options_select` -> `editing` -> `preview` -> `completing`。
- 核心回调：`fetchGenres` / `checkPendingSession` / `resumeSession` / `startWorkflow` / `generateOptions` / `handleSelectOption` / `handleConfirmPhase` / `handleRedoPhase` / `completeWorkflow`。
- 会话恢复：打开时检查未完成会话，24 小时过期。
- 关闭保护：有进度时弹出 `AlertDialog` 确认离开。

### ProfessionalMode/types.ts
- 完整类型系统：
  - `Template`/`Genre`/`WorkflowSession`/`GeneratedOption`/`PhaseResult`。
  - `DialogStage`：7 种阶段枚举。
  - `WorkflowState`：完整状态机字段。
  - `WorkflowAction`：25+ 种 action 类型。
  - 各 Stage 组件 Props：`GenreSelectProps`/`CompletingProps`/`OptionsSelectProps`/`EditingProps`/`PreviewProps`。
  - `WORKFLOW_PHASES` 常量：creative/setting/framework/writing 四阶段。
  - `OPTIMIZATION_PRESETS` 常量：更详细/更简洁/更有创意/加强逻辑/增强情感。
  - `initialState` 初始状态。

### ProfessionalMode/useWorkflowMachine.ts
- `useReducer` + `workflowReducer`：处理 25+ 种 action。
- 关键转换逻辑：
  - `START_WORKFLOW_SUCCESS` -> 自动进入 `options_generating`。
  - `GENERATE_OPTIONS_SUCCESS` -> 进入 `options_select`。
  - `SELECT_OPTION` -> 进入 `editing`，设置 `editingContent`。
  - `CONFIRM_PHASE` -> 累加 `phaseResults`，4 阶段完成进入 `preview`，否则继续 `options_generating`。
  - `REDO_PHASE` -> 过滤掉目标阶段及之后的结果，重新进入 `options_generating`。
- AbortController：支持取消生成操作。

### ProfessionalMode/api.ts
- 统一 API 封装层。
- `SessionExpiredError` 自定义错误类（HTTP 404 触发）。
- API 函数：
  - `fetchGenres()` -> GET `/api/novel/templates/genres`
  - `checkPendingSession()` -> GET `/api/novel/workflow/pending`
  - `startWorkflow(genre)` -> POST `/api/novel/workflow/start`
  - `executePhase(sessionId, templateId, inputData)` -> POST `/api/novel/workflow/{sessionId}/execute`
  - `optimizeResult(sessionId, currentResult, instruction)` -> POST `/api/novel/workflow/{sessionId}/optimize`
  - `nextPhase(sessionId)` -> POST `/api/novel/workflow/{sessionId}/next`
  - `previousPhase(sessionId)` -> POST `/api/novel/workflow/{sessionId}/previous`
  - `completeWorkflow(sessionId, title, description)` -> POST `/api/novel/workflow/{sessionId}/complete`
  - `generateOptions(sessionId)` -> POST `/api/novel/workflow/{sessionId}/generate-options`
  - `selectOption(sessionId, optionId, editedContent)` -> POST `/api/novel/workflow/{sessionId}/select-option`
  - `redoPhase(sessionId, phase)` -> POST `/api/novel/workflow/{sessionId}/redo-phase`
  - `generateProjectInfo(sessionId)` -> POST `/api/novel/workflow/{sessionId}/generate-project-info`

### ProfessionalMode/stages/GenreSelect.tsx
- 创作类型选择界面。Grid 布局展示可选专题。
- 特殊：通用模板（`general`）使用虚线边框区分。
- 会话恢复提示：`showResumePrompt` 时展示"继续创作/开始新的"选项。

### ProfessionalMode/stages/OptionsGenerating.tsx
- 方案生成中界面。`ProgressIndicator` + loading 动画 + 当前阶段描述。

### ProfessionalMode/stages/OptionsSelect.tsx
- 方案选择界面。3 列卡片展示 AI 生成的 3 个方案。
- 每个卡片展示 summary + content 截断（300 字符）+ 选择按钮。
- 底部"重新生成方案"按钮。

### ProfessionalMode/stages/Editing.tsx
- 编辑确认界面。`ProgressIndicator` + Textarea 全文编辑 + 返回重选/确认按钮。

### ProfessionalMode/stages/Preview.tsx
- 预览汇总界面。四阶段结果卡片，每阶段含"重做"按钮。
- AI 自动生成项目名称和描述（`generateProjectInfo`）。
- 进入页面时自动触发一次（`useRef` 防重复）。

### ProfessionalMode/stages/Completing.tsx
- 完成界面。项目标题输入（必填）+ 描述（可选）+ 创建按钮。

### ProfessionalMode/stages/SessionExpired.tsx
- 会话过期界面。提示重新开始。

### ProfessionalMode/components/ProgressIndicator.tsx
- 四阶段进度指示器。圆形图标 + 连接线。已完成绿色、当前紫色、未到灰色。

### ProfessionalMode/components/OptimizationPanel.tsx
- AI 智能优化面板。预设优化按钮（5 种）+ 自定义指令输入 + 优化触发。

### ProfessionalMode/components/HistoryPanel.tsx
- 优化历史面板。版本列表 + 恢复到指定版本。

## 小说前端杂项组件深扫（第六轮）

### CreateProjectDialog.tsx
- 创建小说项目对话框。`react-hook-form` + `zod` 校验。
- 字段：title（必填，最长 200）/description（可选）/genre（下拉：悬疑/言情/冒险/科幻/奇幻/其他）/target_words（数字，默认 50000）。
- POST `/api/novel/projects` 创建，成功后 `toast.success` + `form.reset`。

### StructuredResultView.tsx（690 行，需关注拆分）
- 结构化结果展示组件，支持双视图模式：可视化 / 原文编辑。
- 智能 JSON 解析：直接 `JSON.parse` + markdown 代码块提取。
- 按阶段选择展示组件：
  - `creative` -> `CreativeView`：核心概念/类型/目标读者/卖点/灵感来源。
  - `setting` -> `WorldSettingView` + `CharacterCard`：世界观/角色设定。
  - `framework` -> `OutlineView`：故事概述/主线剧情/支线/章节规划。
  - 默认 -> `GenericJsonView`：递归 JSON 展示。
- 内置组件：`CollapsibleCard`（可折叠卡片）、`CharacterCard`（角色展示卡片，分主角/配角）。
- 字段名中英文映射表（`fieldNames`）。

## InfiniteCanvas 对话框/抽屉链路（前轮补扫，保留）

### GenerateSceneDialog.tsx
- 场景生成对话框。为章节选择漫画风格并触发场景生成。
- 数据获取：`/api/canvas/styles` 获取风格列表，`/api/canvas/chapter/{id}/style` 获取当前风格。
- 操作：选择风格 -> 校验角色资产完备性 -> 触发生成。
- 角色资产状态检查：显示每个角色是否有基础图片（`CharacterAssetStatusFull`）。

### GenerateFinalDialog.tsx
- 最终漫画生成的角色选择对话框。
- 从 `/api/canvas/timeline/{id}/novel-characters` 获取小说角色列表。
- 角色分组渲染：主角 / 反派 / 配角 / 其他，按角色类型分组展示。
- 默认选中所有主角，用户可全选/清空/逐个切换。

### CharacterPreparationDrawer.tsx
- 角色准备管理抽屉（Sheet 组件）。
- 分两个区域：章节角色 + 待升级小说角色。

### GenerateShotImageDialog.tsx（517 行）
- 单镜头图片生成对话框。双源角色获取策略（章节角色 -> 小说角色降级）。

### ShotCharacterBindingPanel.tsx（490 行）
- 分镜角色 Prompt 绑定面板。POST `/api/canvas/shot/{id}/compose-prompt`。

### PromptRefineDialog.tsx（450 行）
- Prompt 微调对话框。GET/POST `/api/canvas/shot/{id}/refine-prompt`。

### ShotNineGridDialog.tsx（500 行）
- 候选图九宫格生成对话框。POST `/api/canvas/shot/{id}/generate-nine-grid` SSE 流。

### UpgradeNovelCharacterDialog.tsx
- 小说角色升级确认对话框。

### TimelineSettings.tsx
- 时间线全局设置。PATCH `/api/canvas/timeline/{id}`。

### CharacterLibraryDrawer.tsx
- 角色库抽屉，管理角色身份证 Prompt。

### CharacterPromptEditorDialog.tsx
- 角色 Prompt 编辑器。三种模式：create_base/create_variant/edit。

### CharacterStatusCard.tsx / NovelCharacterCard.tsx
- 角色状态展示卡片。

### GenerationProgress.tsx / TopProgressPanel.tsx
- 生成进度显示组件。

## InfiniteCanvas 关键视图（前轮补扫，保留）

### InfiniteCanvasView.tsx
- 基于 ReactFlow 的大画布容器。
- 性能优化：`Map(id->node)` + 关键字段浅比较、`useMemo`/`useCallback` 稳定化。
- 工作流：`useRealtimeCanvas` SSE + `useWorkflowAutomation` 自动化推进。

### ChapterRow.tsx
- 轻量时间线行组件：`剧本 -> 镜头 -> 漫画图` 三节点状态推进。

## PanelEditor 组件簇（`src/app/scripts/[id]/components/PanelEditor/*`）

已覆盖 12 个组件，核心职责分层：编辑与卡片呈现 / 结构操作 / 资产绑定 / 生成辅助。

## 小说前端杂项（前轮补扫，保留）

### InspirationModeDialog.tsx
- AI 对话式故事构建（灵感模式），流程：welcome -> question -> generating -> result。

### ImageGalleryPanel.tsx
- 图片管理面板，`useInfiniteQuery` 无限分页加载。

# 页面路由（摘要）

- 创作：`/scripts`、`/scripts/[id]`、`/storyboard`、`/editor`
- 小说：`/novel`、`/novel/[id]`、`/novel/canvas/[id]`
- 管理：`/admin`、`/admin/*`（16+ 子页面）

# 关键依赖与配置

- React Query / SWR / Zustand
- Tailwind + shadcn/ui + Radix
- ReactFlow / Tiptap / Fabric.js / Vaul
- dnd-kit（分镜拖拽排序）
- `@/lib/*` 为共享服务层

# 数据模型

- 通过 `@/lib/db` 访问 Prisma。
- 主要实体：`Story`、`Chapter`、`Panel`、`Character`、`GeneratedImage`、`Workflow`、`GenerationLog`、`CreditTransaction`。

# 测试与质量

- 已有 30+ `*.test.ts(x)`。
- 高优先回归：鉴权、配额扣费、分镜生成、小说代理、后台批量操作、工作流状态机。
- 已识别风险：
  - `StructuredResultView.tsx` 690 行，超过 500 行阈值，应拆分 `CreativeView`/`WorldSettingView`/`OutlineView`/`CharacterCard` 为独立文件。
  - `GenerateShotImageDialog` 517 行接近拆分阈值，角色源降级逻辑可提取为独立 hook。
  - `ShotCharacterBindingPanel` 490 行，N+1 查询模式（每个角色一次 fetch prompts）可优化为批量接口。
  - `useChapterCharacters` hook 已废弃但仍在使用，应迁移到 `useProjectCharacters`。
  - `NineGrid/CharacterReferenceSection` 初始化 `useEffect` 依赖数组含 `onUpdateCharacterReferences` 回调，如父组件未 memo 化可能导致无限循环。
  - ProfessionalMode API 层 `GeneratedOption` 接口在 `api.ts` 和 `types.ts` 中重复定义，应统一。

# 常见问题 (FAQ)

1. 为什么有 React Query 和 SWR 并存？
   历史演进，逐步迁移中。新业务优先 React Query。

2. 为什么 admin 页面很多都长得像？
   复用 `useAdminList` + `useXxxList`/`useXxxForm` hooks 与通用分页/过滤组件。

3. scripts/[id] 为什么组件和 hooks 很多？
   该模块是创作主战场，拆分是为了压低单文件复杂度并隔离副作用。

4. ProfessionalMode 的四阶段工作流如何串联？
   `useWorkflowMachine` 是 useReducer FSM，阶段完成后自动触发下一阶段的 `generateOptions`，直到 4 阶段全部确认后进入 preview。每阶段可重做。

5. NineGrid 九宫格生成是什么？
   从连续镜头中选 9 个，构建 3x3 网格 prompt（含风格前缀、剧情概述、镜头描述），调 AI 一次性生成 9 格连续漫画图。支持角色参考图注入。

6. DetailPanel 抽屉是什么？
   InfiniteCanvas 中点击节点后弹出的右侧 Vaul Drawer，根据节点类型（script/shot/scene/final）渲染不同详情面板。

# 相关文件清单（第六轮新增）

- `src/app/admin/characters/components/CharacterTable.tsx`
- `src/app/admin/characters/components/CharacterFormDialog.tsx`
- `src/app/admin/characters/components/CharacterFilterBar.tsx`
- `src/app/admin/characters/components/PaginationControls.tsx`
- `src/app/admin/characters/components/DeleteConfirmDialog.tsx`
- `src/app/admin/characters/hooks/useCharacterList.ts`
- `src/app/admin/characters/hooks/useCharacterForm.ts`
- `src/app/admin/story-templates/hooks/useStoryTemplateList.ts`
- `src/app/admin/story-templates/hooks/useStoryTemplateForm.ts`
- `src/app/admin/comic-styles/hooks/useComicStyleList.ts`
- `src/app/admin/comic-styles/hooks/useComicStyleForm.ts`
- `src/app/admin/panel-templates/hooks/usePanelTemplateList.ts`
- `src/app/admin/panel-templates/hooks/usePanelTemplateForm.ts`
- `src/app/admin/llm-providers/hooks/useProviders.ts`
- `src/app/admin/llm-providers/components/ProviderTable.tsx`
- `src/app/admin/llm-providers/components/ProviderFormDialog.tsx`
- `src/app/admin/llm-providers/components/ProviderTypeInfo.tsx`
- `src/app/admin/llm-providers/components/DeleteProviderDialog.tsx`
- `src/app/admin/generation-logs/components/LogFilterBar.tsx`
- `src/app/admin/generation-logs/components/LogTable.tsx`
- `src/app/admin/generation-logs/components/LogDetailDialog.tsx`
- `src/app/admin/generated-images/components/ImageFilterBar.tsx`
- `src/app/admin/generated-images/components/ImageGrid.tsx`
- `src/app/admin/generated-images/components/ImageDetailDialog.tsx`
- `src/app/admin/tags/components/TagMergeDialog.tsx`
- `src/app/admin/rag-management/components/OverviewTab.tsx`
- `src/app/admin/rag-management/components/IndexManagementTab.tsx`
- `src/app/admin/rag-management/components/QualityMonitoringTab.tsx`
- `src/app/admin/rag-management/components/MaintenanceTab.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/index.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/types.ts`
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ScriptDetailPanel.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/SceneDetailPanel.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/FinalDetailPanel.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotGroupSection.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/types.ts`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/prompt-builder.ts`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/GenerateNineGridDialog.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceCard.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/ReferenceImagePicker.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useProjectCharacters.ts`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useProjectReferenceImages.ts`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useChapterCharacters.ts`
- `src/app/(novel)/novel/components/ProfessionalMode/index.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/types.ts`
- `src/app/(novel)/novel/components/ProfessionalMode/useWorkflowMachine.ts`
- `src/app/(novel)/novel/components/ProfessionalMode/api.ts`
- `src/app/(novel)/novel/components/ProfessionalMode/stages/GenreSelect.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/stages/OptionsGenerating.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/stages/OptionsSelect.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/stages/Editing.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/stages/Preview.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/stages/Completing.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/stages/SessionExpired.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/components/ProgressIndicator.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/components/OptimizationPanel.tsx`
- `src/app/(novel)/novel/components/ProfessionalMode/components/HistoryPanel.tsx`
- `src/app/(novel)/novel/components/CreateProjectDialog.tsx`
- `src/app/(novel)/novel/components/StructuredResultView.tsx`
