[根目录](../../CLAUDE.md) > [services](../) > **novel-backend**

# 模块职责

`services/novel-backend` 是小说生成 FastAPI 微服务，提供：
- 小说项目/章节 CRUD（含流式 SSE 章节生成）
- RAG 向量检索与索引维护（ChromaDB + OpenAI Embedding）
- 渐进式 10 步大纲生成（concept -> structure -> detailed-outline -> scene-breakdown -> analyze）
- 世界观提取与管理
- 画布流水线（剧本分析 -> 镜头规划 -> 角色识别 -> 漫画生成）
- 批量操作与导出（docx/pdf）
- 灵感引导与工作流模板

# 入口与启动

- 服务入口：`services/novel-backend/app/main.py`
- 本地启动：`cd services/novel-backend && uvicorn app.main:app --reload --port 8000`
- 虚拟环境：`python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- 健康检查：`GET /health`
- API 文档：`GET /docs`（FastAPI Swagger UI）

生命周期：启动时预热数据库连接池 + 初始化 RAG 向量服务（ChromaDB）。

# 对外接口

主要路由模块（全部注册于 `app/main.py`）：

| 路由模块 | 前缀 | 职责 |
|---|---|---|
| `project_crud.py` | `/projects` | 小说项目 CRUD |
| `project_generation.py` | `/projects` | 项目生成相关（封面、大纲等） |
| `chapters.py` | `/chapters` | 章节 CRUD + SSE 流式生成 |
| `versions.py` | `/versions` | 章节版本管理 |
| `progressive.py` | `/progressive` | 渐进式 10 步大纲（concept/structure/detailed-outline/scene-breakdown/analyze） |
| `rag_index.py` | `/rag` | RAG 文档索引 |
| `rag_search.py` | `/rag` | RAG 语义搜索 |
| `rag_maintenance.py` | `/rag` | RAG 索引维护 |
| `canvas.py` | `/canvas` | 画布流水线（剧本分析/镜头规划/角色识别/漫画生成） |
| `world.py` | `/world` | 世界观记忆库 CRUD + 关系 + 伏笔 |
| `world_extraction.py` | `/world` | AI 世界观提取（SSE 流式） |
| `search.py` | `/search` | 全文搜索（全局 + 项目内向后兼容） |
| `export.py` | `/export` | 导出（txt/docx/pdf） |
| `batch.py` | `/batch` | 批量操作 |
| `inspiration.py` | `/inspiration` | 灵感引导（6 步问答 + AI 生成故事雏形） |
| `templates.py` | `/templates` | 写作模板 |
| `workflow.py` | `/workflow` | 专业创作工作流（多阶段会话管理） |

## Canvas 路由深度参考 (`/canvas`)

Canvas 路由（`app/routers/canvas.py`）是小说转漫画的核心流水线 API，提供 6 个端点：

| 端点 | 方法 | 职责 | 请求体 | 依赖服务 |
|---|---|---|---|---|
| `/canvas/analyze-script` | POST | 分析章节文本生成剧本片段 | `AnalyzeScriptRequest`(chapter_content, chapter_number) | `ScriptAnalyzer` |
| `/canvas/plan-shots` | POST | 为剧本片段规划镜头 | `PlanShotsRequest`(script_content, scene_description, character_actions, available_characters?) | `ShotPlanner` |
| `/canvas/generate-finals` | POST | 生成最终漫画图 | `GenerateFinalsRequest`(scenes: SceneInput[], comic_style, add_speech_bubbles) | `ComicGenerator` |
| `/canvas/identify-characters` | POST | 从文本识别角色 | `IdentifyCharactersRequest`(dialogue?, scene_description, available_characters[]) | `CharacterIdentifier` |
| `/canvas/batch-identify-characters` | POST | 批量多镜头角色识别 | `BatchIdentifyCharactersRequest`(shots[], available_characters[]) | `CharacterIdentifier` |
| `/canvas/timeline/{timeline_id}/stream` | GET (SSE) | 实时推送时间轴状态更新 | path: timeline_id | 内部事件生成器（TODO: 接入 Redis/MQ） |

Canvas 流水线的典型调用顺序：
1. `analyze-script` -- 输入章节文本 -> 输出剧本片段（ScriptSegment[]）
2. `plan-shots` -- 输入剧本片段 -> 输出镜头设计（ShotDesign[]）
3. `identify-characters` 或 `batch-identify-characters` -- 为镜头匹配在场角色
4. `generate-finals` -- 输入场景列表 -> 输出漫画面板（ComicPanelResult[]）

SSE 端点注意事项：
- `timeline/{timeline_id}/stream` 当前仅实现心跳（30 秒间隔）+ 连接确认，实际状态推送尚为 TODO
- 事件类型：`connected` / `status_update` / `count_update` / `heartbeat` / `error`

## World 路由深度参考 (`/world`)

世界观记忆库路由（`app/routers/world.py`）提供完整的世界观条目管理，共 10 个端点：

### 条目 CRUD

| 端点 | 方法 | 职责 |
|---|---|---|
| `/world/projects/{project_id}/entries` | POST | 创建世界观条目（6 种类型：location/character/event/item/rule/foreshadowing） |
| `/world/projects/{project_id}/entries` | GET | 列表查询（type/search/tags 过滤 + 分页 + 按类型统计） |
| `/world/projects/{project_id}/entries/{entry_id}` | GET | 获取单个条目详情（含双向关系） |
| `/world/projects/{project_id}/entries/{entry_id}` | PATCH | 更新条目（`model_dump(exclude_unset=True)` 部分更新） |
| `/world/projects/{project_id}/entries/{entry_id}` | DELETE | 删除条目 |

所有端点通过 `verify_project_ownership()` 校验项目所有权。条目使用 `selectinload` 预加载双向关系（`outgoing_relations` / `incoming_relations`）。

### 关系管理

| 端点 | 方法 | 职责 |
|---|---|---|
| `/world/projects/{project_id}/relations` | POST | 创建条目间关系（含重复检测 + 自引用防护） |
| `/world/projects/{project_id}/relations/{relation_id}` | DELETE | 删除关系 |
| `/world/relation-types` | GET | 获取所有关系类型（4 大类：location/character/event/foreshadow，17 种关系） |

### 伏笔专用

| 端点 | 方法 | 职责 |
|---|---|---|
| `/world/projects/{project_id}/foreshadowing` | GET | 获取伏笔列表（按状态分组：planted/brewing/revealed + 统计） |
| `/world/projects/{project_id}/foreshadowing/{entry_id}/status` | PATCH | 更新伏笔状态（planted -> brewing -> revealed，revealed 时可设 actual_reveal_chapter） |
| `/world/projects/{project_id}/foreshadowing/pending` | GET | 获取待揭示伏笔（按 current_chapter 区分待揭示 vs 逾期） |

### 元数据

| 端点 | 方法 | 职责 |
|---|---|---|
| `/world/entry-types` | GET | 获取所有条目类型定义（来自 `ENTRY_TYPE_SCHEMAS`） |
| `/world/health` | GET | 模块健康检查 |

## World Extraction 路由深度参考 (`/world` -- AI 提取)

世界观 AI 提取路由（`app/routers/world_extraction.py`），注册在同一 `/world` 前缀下：

| 端点 | 方法 | 职责 |
|---|---|---|
| `/world/projects/{project_id}/extract/stream` | POST (SSE) | 流式 AI 提取世界观条目（从指定章节中提取，实时推送 progress/entry/complete/error 事件） |
| `/world/projects/{project_id}/extract/save` | POST | 批量保存提取结果（BatchSaveRequest -> BatchSaveResponse） |

提取请求参数：`ExtractionRequest`（project_id, chapter_ids[1-50], entry_types[], min_confidence 0.0-1.0）

## Workflow 路由深度参考 (`/workflow`)

专业创作工作流路由（`app/routers/workflow.py`）提供多阶段会话管理，共 12 个端点：

| 端点 | 方法 | 职责 |
|---|---|---|
| `/workflow/pending` | GET | 获取用户未完成的工作流会话（用于会话恢复） |
| `/workflow/start` | POST | 启动创作工作流（创建会话，支持 genre 参数，含 `clean_genre` 清洗） |
| `/workflow/{session_id}` | GET | 获取工作流会话状态（当前阶段、进度、可用模板） |
| `/workflow/{session_id}/execute` | POST | 执行当前阶段模板（template_id + input_data -> LLM 生成） |
| `/workflow/{session_id}/optimize` | POST | 优化当前阶段结果（current_result + optimization_instruction -> AI 优化） |
| `/workflow/{session_id}/next` | POST | 进入下一阶段 |
| `/workflow/{session_id}/previous` | POST | 返回上一阶段 |
| `/workflow/{session_id}/complete` | POST | 完成工作流并创建项目（project_title + description -> NovelProject） |
| `/workflow/{session_id}/generate-options` | POST | 自动生成 3 个方案选项（根据会话上下文） |
| `/workflow/{session_id}/select-option` | POST | 选择并确认方案（option_id + edited_content 可选编辑） |
| `/workflow/{session_id}/redo-phase` | POST | 回退到指定阶段重做（清除目标阶段及之后数据） |
| `/workflow/{session_id}/generate-project-info` | POST | 基于已完成内容自动生成项目标题和描述 |
| `/workflow/{session_id}` | DELETE | 放弃工作流（标记 abandoned，当前 501 Not Implemented） |

核心数据结构：
- `CreateSessionRequest` -- genre（含 `clean_genre` 验证器去除括号内容）
- `ExecutePhaseRequest` -- template_id + input_data
- `SelectOptionRequest` -- option_id + edited_content
- 所有端点依赖 `workflow_service`（`app/services/workflow_service.py`）

## Inspiration 路由深度参考 (`/inspiration`)

灵感引导路由（`app/routers/inspiration.py`）提供 6 步问答式引导流程，共 4 个端点：

| 端点 | 方法 | 职责 |
|---|---|---|
| `/inspiration/start` | POST | 开始灵感模式（创建会话，返回第 1 个问题） |
| `/inspiration/next` | POST | 提交答案并获取下一个问题（含幂等校验：step 匹配检查，409 冲突时返回 current_step） |
| `/inspiration/generate` | POST | 生成故事雏形（OpenAI 结构化输出 -> StoryDraft） |
| `/inspiration/create-project` | POST | 基于灵感结果创建项目（从服务端会话获取 draft，不信任前端传入；创建后清理会话防重复） |

安全特性：
- 会话所有权校验（session.user_id == user_id）
- 幂等步骤校验（request.step == session.current_step，409 Conflict）
- draft 从服务端获取不信任前端（`create-project` 从 session.generated_draft 读取）
- 创建项目后立即清理会话

响应类型使用判别联合（Discriminated Union）：`NextQuestionResponse = Union[NextQuestionData, CompletedData]`，通过 `is_last` 字段判别。

## Versions 路由深度参考 (`/versions`)

章节版本管理路由（`app/routers/versions.py`）实现"生成 -> 评分 -> 修改 -> 重新生成 -> 对比 -> 选择"循环：

关键端点包括版本 CRUD、质量评分、版本对比（diff）、版本选择。

质量评分维度（`QualityDimensions`）：
- `readability` -- 可读性（0-100）
- `emotional_depth` -- 情感深度
- `pacing` -- 节奏把控
- `originality` -- 原创性
- `coherence` -- 逻辑连贯性

每个维度含 `score` + `details`，另附 `ImprovementSuggestion[]`（dimension, suggestion, priority: high/medium/low）。

## Search 路由深度参考 (`/search`)

全局搜索路由（`app/routers/search.py`）：

| 端点 | 方法 | 职责 |
|---|---|---|
| `/search/projects/{project_id}` | GET | 项目内搜索（旧端点，向后兼容，内部转发到全局搜索） |
| `/search/global` | POST | 全局搜索（GlobalSearchRequest + SearchFilters -> 分页结果 + 聚合统计） |
| `/search/suggest` | POST | 搜索建议 |
| `/search/filters` | POST | 保存过滤器 |
| `/search/filters` | GET | 获取保存的过滤器列表 |
| `/search/history` | GET | 获取搜索历史 |

向后兼容策略：旧 `/search/projects/{project_id}` 端点内部构造 `GlobalSearchRequest`（限定 project_ids），调用 `SearchService.global_search()`，然后转换为旧格式响应。

## Export 路由深度参考 (`/export`)

| 端点 | 方法 | 职责 |
|---|---|---|
| `/export/projects/{project_id}` | POST | 导出小说（txt/docx/pdf），返回 StreamingResponse 文件流 |

支持配置：`ExportConfig`（chapter_range, include_metadata, include_outline, chapter_separator, font_size, font_family）

# 关键依赖与配置

- 依赖清单：`services/novel-backend/requirements.txt`
- 核心依赖：FastAPI 0.115, SQLAlchemy 2.0（async）, asyncpg, Pydantic 2.10, OpenAI, ChromaDB 0.4, tiktoken, jieba
- 配置：`services/novel-backend/app/config.py`（Pydantic Settings）
- 关键环境变量：
  - `DATABASE_URL` - PostgreSQL（与 Next.js 共享同一库）
  - `JWT_SECRET` - 与前端一致的 JWT 密钥
  - `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` - LLM 配置
  - `OPENAI_EMBEDDING_MODEL` - Embedding 模型
  - `CHROMA_HOST` / `CHROMA_PORT` - ChromaDB 连接
  - `RAG_*` - RAG 相关配置

# 数据模型

- ORM 模型：`services/novel-backend/app/models.py`
- Pydantic Schema：`services/novel-backend/app/schemas/*.py`
- 复用主库 PostgreSQL（与 Next.js 共享 `DATABASE_URL`）
- 核心实体：
  - `NovelProject` - 小说项目
  - `NovelChapter` - 小说章节
  - `NovelChapterVersion` - 章节版本
  - `WorldEntry` - 世界观条目（6 种类型：location/character/event/item/rule/foreshadowing）
  - `EntryRelation` - 条目间关系（17 种关系类型，4 大类）
  - `QualityScore` - 质量评分（5 维度 + 改进建议）
  - 画布相关（manual SQL）：`timeline`, `script_segment`, `shot_design`, `scene_image`, `comic_panel_result`

## Pydantic Schema 深度参考 (`app/schemas/`)

Schema 目录包含 5 个功能模块的请求/响应验证定义：

### inspiration.py -- 灵感引导

核心数据结构：
- `StoryDraft` -- 故事雏形完整输出（用于 OpenAI 结构化输出）
  - `title_suggestions`: 3 个标题建议
  - `description`: 故事简介（约 200 字）
  - `protagonist`: 主角设定（name, role, traits, appearance, background）
  - `world_setting`: 世界观（locations, factions, rules, timeline）
  - `outline`: 章节大纲（3-15 章，含 key_events, characters, plot_lines, is_key_chapter）
- `QuestionResponse` -- 6 步问答引导中的单个问题（type: choice/text）
- `StartSessionResponse` / `SubmitAnswerRequest` / `GenerateRequest` -- 会话流程控制

### export.py -- 导出配置

- `ExportRequest` -- 导出请求（format: txt/docx/pdf + ExportConfig）
- `ExportConfig` -- 导出选项（chapter_range, include_metadata, include_outline, chapter_separator, font_size, font_family）
- `ExportResponse` -- 导出结果（file_size, filename）

### search_schemas.py -- 全文搜索

请求模型：
- `GlobalSearchRequest` -- 全局搜索（query, filters, sort_by, 分页）
- `SearchFilters` -- 过滤器（project_ids, date_range, word_count_range, status, cool_point_types, chapter_number_range）
- `SearchSuggestRequest` -- 搜索建议
- `SaveFilterRequest` -- 保存过滤器

响应模型：
- `GlobalSearchResponse` -- 搜索结果（分页 + 聚合统计 by_project/by_cool_point_type/by_status）
- `SearchResultItem` -- 结果项（含高亮 content_snippet, relevance_score 0-1, cool_points[]）
- `SearchHistoryResponse` / `SavedFiltersResponse` -- 历史/保存的过滤器

内部模型：
- `SearchQueryBuilder` -- PostgreSQL tsquery 构建器

### world_schemas.py -- 世界观记忆库

安全特性：
- `sanitize_html()` -- XSS 防护（优先 bleach，降级正则）
- `SanitizedTextMixin` -- 自动净化 name/description/hint_text/properties/tags 字段
- 所有文本字段均有最大长度限制（name:200, description:5000, hint_text:2000, tags:每个50字符最多20个）

条目类型（EntryType）：`location` / `character` / `event` / `item` / `rule` / `foreshadowing`

核心 CRUD Schema：
- `CreateEntryRequest` / `UpdateEntryRequest` -- 条目创建/更新（含伏笔专用字段：planted_chapter, planned_reveal_chapter, hint_text, foreshadow_status）
- `EntryResponse` -- 完整条目响应（含 relations + referenced_by 双向关系列表）
- `EntryListResponse` -- 列表响应（含 by_type 统计）

关系 Schema：
- `CreateRelationRequest` -- 创建条目间关系（source_id, target_id, relation_type, chapter_context）
- `RelationResponse` -- 关系响应（含 source_name/target_name 简化信息）

伏笔 Schema：
- `ForeshadowStatus`: planted / brewing / revealed
- `ForeshadowingListResponse` -- 按状态分组的伏笔列表 + 统计
- `PendingForeshadowingResponse` -- 待揭示 + 逾期伏笔

元定义：
- `EntryQueryParams` -- 查询参数（type, search, tags, 分页）
- `RelationTypesResponse` / `EntryTypesResponse` -- 类型元数据

### extraction_schemas.py -- AI 世界观提取

- `ExtractionRequest` -- 提取请求（project_id, chapter_ids[1-50], entry_types[], min_confidence 0.0-1.0）
- `ExtractedEntry` -- AI 提取的单个条目（type, name, description, properties, confidence, source_text, 伏笔字段）

SSE 事件模型（流式提取进度）：
- `ExtractionProgressEvent` -- 进度（phase: preparing/analyzing/extracting/deduplicating/warning/skipping）
- `ExtractionEntryEvent` -- 实时推送发现的条目（含去重标记 is_duplicate）
- `ExtractionCompleteEvent` -- 完成（total_extracted, by_type, duplicates_found）
- `ExtractionErrorEvent` -- 错误

批量保存：
- `BatchSaveRequest` / `BatchSaveResponse` -- 批量保存提取结果（saved_count, failed_count, saved_ids, errors）

# 服务层

| 服务文件 | 职责 |
|---|---|
| `generation_service.py` | 章节生成（SSE 流式） |
| `progressive_outline_service.py` | 渐进式大纲 10 步生成 |
| `outline_analyzer.py` | 大纲质量分析（cool points/pacing/opening hook） |
| `rag_service.py` | RAG 检索服务 |
| `vector_service.py` | 向量索引服务（ChromaDB 封装） |
| `search_service.py` | 全文搜索 |
| `export_service.py` | docx/pdf 导出 |
| `batch_service.py` | 批量操作 |
| `quality_service.py` | 章节质量评估（5 维度打分） |
| `world_extractor_service.py` | AI 世界观提取 |
| `inspiration_service.py` | 灵感引导（6 步问答 + 故事雏形生成） |
| `template_service.py` | 写作模板 |
| `workflow_service.py` | 工作流（多阶段会话管理、方案生成、项目创建） |
| `prompt_templates.py` | Prompt 模板管理 |
| `canvas/script_analyzer.py` | 剧本分段分析 |
| `canvas/shot_planner.py` | 镜头规划 |
| `canvas/character_identifier.py` | 角色识别 |
| `canvas/comic_generator.py` | 对话框布局分析与漫画生成 |

# 测试与质量

- 测试目录：`services/novel-backend/test/`
- 测试文件：
  - `test/test_rag.py` - RAG 检索测试
  - `test/test_outline_continuation.py` - 大纲续写测试
  - `test/test_plot_continuity.py` - 剧情连续性测试
  - `test/test_chapter_detail_api.py` - 章节详情 API 测试
  - `test/test_web_novel_features.py` - 网文功能测试
- 建议优先回归：RAG 检索、渐进式大纲、章节生成流式输出、canvas 流水线、灵感引导会话

# 常见问题 (FAQ)

1. 为什么不要直接让前端访问本服务？
   认证依赖 Next.js 代理层（`/api/novel/[...path]/route.ts`），直接访问会绕过 cookie->JWT 转换链路。

2. RAG 失败怎么办？
   先看 `GET /health` 与 `GET /rag/stats`，再核对 `OPENAI_EMBEDDING_*` 与 `CHROMA_*` 配置。服务启动时会检测 RAG 是否可用，不可用时降级为关键词匹配。

3. 数据库与 Next.js 是同一个吗？
   是的，共享同一个 PostgreSQL 实例。Python 端通过 SQLAlchemy async 访问，Node 端通过 Prisma 访问。

4. routers 目录下为什么有 `.venv`？
   这是误操作产生的嵌套虚拟环境，应清理。

5. canvas/timeline SSE 端点可以用于生产吗？
   当前仅实现心跳和连接确认，实际状态推送标注为 TODO。需要接入 Redis/MQ 才能用于生产。

6. world_schemas 中的 XSS 防护是怎么工作的？
   所有文本输入通过 `SanitizedTextMixin` 自动净化，优先使用 `bleach.clean()`（如安装），否则降级到正则去标签。`sanitize_dict_values` 递归处理嵌套字典。

7. workflow 的 DELETE 端点（放弃工作流）可用吗？
   当前返回 501 Not Implemented，需要后续实现。

8. inspiration 的会话存储在哪里？
   `InspirationService` 使用内存存储（非持久化）。服务重启后会话丢失。生产环境应考虑迁移到 Redis。

9. search 旧端点和新端点有什么区别？
   旧 `GET /search/projects/{project_id}` 仅支持项目内搜索，内部转发到新 `POST /search/global`（限定 project_ids）。新端点支持跨项目搜索、高级过滤、聚合统计。

# 相关文件清单

- `services/novel-backend/app/main.py`
- `services/novel-backend/app/config.py`
- `services/novel-backend/app/models.py`
- `services/novel-backend/app/database.py`
- `services/novel-backend/app/middleware/auth.py`
- `services/novel-backend/app/routers/*.py`（17 个路由模块）
- `services/novel-backend/app/routers/project_models.py` -- 项目 Pydantic 模型
- `services/novel-backend/app/routers/rag_models.py` -- RAG Pydantic 模型
- `services/novel-backend/app/services/*.py`（14 个服务）
- `services/novel-backend/app/services/canvas/*.py`（4 个画布服务）
- `services/novel-backend/app/schemas/__init__.py` -- 空文件
- `services/novel-backend/app/schemas/inspiration.py` -- 灵感引导 Schema
- `services/novel-backend/app/schemas/export.py` -- 导出 Schema
- `services/novel-backend/app/schemas/search_schemas.py` -- 全文搜索 Schema
- `services/novel-backend/app/schemas/world_schemas.py` -- 世界观记忆库 Schema（含 XSS 防护）
- `services/novel-backend/app/schemas/extraction_schemas.py` -- AI 世界观提取 Schema
- `services/novel-backend/requirements.txt`
- `services/novel-backend/test/*.py`（5 个测试文件）

# 变更记录 (Changelog)

- 2026-03-01 00:41:16: 深度扫描 world.py（10 端点 + 关系管理 + 伏笔专用）、workflow.py（12 端点 + 多阶段会话）、inspiration.py（4 端点 + 幂等校验 + 安全特性）、world_extraction.py（SSE 流式提取）、search.py（全局搜索 + 向后兼容）、export.py（文件流导出）、versions.py（质量评分 5 维度），追加全部路由深度参考与 FAQ。
- 2026-03-01 00:41:16: 深度扫描 canvas 路由全部 6 个端点 + schemas 目录全部 5 个功能文件，追加 Canvas 路由深度参考、Pydantic Schema 深度参考、FAQ 补充。
- 2026-03-01 00:12:46: 补扫 canvas 服务层。
- 2026-02-28 23:40:57: 首次生成模块文档。
