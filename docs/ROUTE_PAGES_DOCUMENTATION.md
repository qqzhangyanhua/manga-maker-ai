# Manga Maker AI - 路由页面功能完整分析

## 📊 项目概览

这是一个基于 Next.js 14 的**漫画/故事AI生成器**，包含17个路由页面，分为6个功能模块：
- **认证模块**（2个页面）- 登录、注册
- **首页营销**（1个页面）- 展示特性
- **创作模块**（3个页面）- 故事生成、剧本管理
- **分镜系统**（2个页面）- 分镜编辑、项目编辑
- **资产编辑**（3个页面）- 资产库、编辑器、工作流
- **管理后台**（6个页面）- 用户/风格/角色/LLM配置/用量管理

---

## 📁 目录结构

```
src/app/
├── page.tsx                              # 首页
├── auth/
│   ├── login/page.tsx                   # 登录页面
│   └── register/page.tsx                # 注册页面
├── assets/page.tsx                      # 资产管理系统（角色、姿势、场景）
├── editor/page.tsx                      # 画面精炼工作台
├── story/page.tsx                       # 故事创作页面
├── scripts/
│   ├── page.tsx                         # 剧本列表管理
│   └── [id]/page.tsx                    # 剧本详情编辑
├── storyboard/
│   ├── page.tsx                         # 分镜编辑系统
│   └── editor/[projectId]/page.tsx      # 项目编辑器
├── workflow/page.tsx                    # 工作流仪表板
└── admin/
    ├── page.tsx                         # 管理后台首页
    ├── users/page.tsx                   # 用户管理
    ├── comic-styles/page.tsx            # 漫画风格管理
    ├── characters/page.tsx              # 角色库管理
    ├── llm-providers/page.tsx           # LLM提供商配置
    └── usage/page.tsx                   # 用量与生成日志
```

---

## 🔐 权限矩阵

| 路由 | 公开访问 | 需登录 | 需管理员 |
|------|---------|--------|----------|
| `/` | ✅ | | |
| `/auth/login` | ✅ | | |
| `/auth/register` | ✅ | | |
| `/story` | | ✅ | |
| `/scripts` | | ✅ | |
| `/scripts/[id]` | | ✅ | |
| `/assets` | | ✅ | |
| `/editor` | | ✅ | |
| `/storyboard` | | ✅ | |
| `/storyboard/editor/[projectId]` | | ✅ | |
| `/workflow` | | ✅ | |
| `/admin` | | | ✅ |
| `/admin/users` | | | ✅ |
| `/admin/comic-styles` | | | ✅ |
| `/admin/characters` | | | ✅ |
| `/admin/llm-providers` | | | ✅ |
| `/admin/usage` | | | ✅ |

---

## 📖 详细页面功能

### 1️⃣ 认证模块（公开访问）

#### `/auth/login` - 登录页面

**功能**：用户邮箱密码登录

**特点**：
- 客户端渲染（"use client"）
- 响应式设计（两列布局）
- 使用 Toast 提示反馈
- 登录成功后重定向到首页

**使用的组件**：
- `Input`、`Button`、`Card`（shadcn/ui）
- `useRouter`、`useToast` hooks
- `lucide-react` 图标（LogIn, Shield, ArrowLeft）

**调用 API**：
- `POST /api/auth/login` - 邮箱密码登录

**权限要求**：无（公开页面）

---

#### `/auth/register` - 注册页面

**功能**：邮箱验证码注册

**特点**：
- 三步流程：发送验证码 → 填写信息 → 注册
- 60秒验证码倒计时
- 使用 OTP 组件输入6位验证码
- 支持昵称可选

**使用的组件**：
- `InputOTP` 组件（自定义 OTP 输入）
- `Input`、`Button`、`Label`
- 倒计时逻辑（useEffect 管理）

**调用 API**：
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/register` - 完成注册并自动登录

**权限要求**：无（公开页面）

---

### 2️⃣ 首页营销（公开访问）

#### `/` - 首页

**功能**：项目营销首页，展示特性和示例

**特点**：
- 展示6个预设角色卡片
- 动态加载漫画风格（6列网格）
- 多个 CTA 按钮（进入画面精炼、选择风格等）
- 页脚信息

**使用的组件**：
- `Header`、`HeroSection` 组件
- `StyleCard`、`CharacterCard`、`GeneratorSection` 组件
- `Tabs` 与分区展示

**调用 API**：
- `GET /api/comic-styles?enabled=true` - 获取启用的漫画风格列表

**权限要求**：无（公开页面）

---

### 3️⃣ 创作模块（需登录）

#### `/story` - 故事创作页面

**功能**：AI 生成故事大纲

**特点**：
- 简化的容器布局
- 集成 `StoryGenerator` 组件
- 支持故事生成完成回调

**使用的组件**：
- `StoryGenerator` 组件（主要业务逻辑）

**调用 API**：
- `POST /api/story/generate` - 使用 LLM 生成故事大纲

**权限要求**：需登录

---

#### `/scripts` - 剧本列表

**功能**：管理所有创建的剧本

**特点**：
- 卡片网格布局（3列响应式）
- 支持删除操作（确认对话框）
- 显示剧本类型、创建时间、前言
- 进入分镜编辑的快捷按钮

**使用的组件**：
- `Card`、`Badge`、`Button`
- `AlertDialog` - 删除确认
- `lucide-react` 图标（Plus, Edit, Trash2）

**调用 API**：
- `GET /api/story` - 获取剧本列表
- `DELETE /api/story/{id}` - 删除剧本

**权限要求**：需登录

---

#### `/scripts/[id]` - 剧本详情编辑

**功能**：编辑单个剧本及其分镜面板

**特点**：
- 三列布局：故事信息面板（左） + 分镜列表（中） + 编辑对话框
- 渐进式加载（故事 → 面板 → 角色资产）
- 支持新增、编辑、删除分镜
- 自动同步与错误处理

**使用的组件**：
- `StoryInfoPanel` - 故事信息编辑
- `PanelListView` - 分镜列表显示
- `PanelEditDialog` - 分镜编辑对话框
- `ErrorBoundary` - 错误边界

**使用的 Hooks**：
- `useStoryDataOptimized` - 优化的数据加载
- `useUpdateStory`, `useCreatePanel`, `useUpdatePanel`, `useDeletePanel` - React Query mutations
- `useCharacterAssets` - 角色资产
- `useUIState` - 统一 UI 状态管理

**调用 API**：
- `GET /api/story/{id}` - 获取故事详情
- `GET /api/story/{id}/panels` - 获取分镜列表
- `PATCH /api/story/{id}` - 更新故事
- `POST /api/story/{id}/panels` - 创建分镜
- `PATCH /api/panel/{id}` - 更新分镜
- `DELETE /api/panel/{id}` - 删除分镜
- `GET /api/character` - 获取角色列表

**权限要求**：需登录

---

### 4️⃣ 分镜系统（需登录）

#### `/storyboard` - 分镜编辑系统

**功能**：从文本脚本生成分镜布局和图像

**特点**：
- Tabs 切换：自由创作 vs 结构模板
- 左侧编辑区 + 右侧预览区
- 支持 AI 图像生成
- 对白优化功能
- 智能排版（按重要度和类型自动布局）
- 使用 Suspense 加载优化

**使用的组件**：
- `ScriptInput` - 脚本输入
- `NarrativeTemplateSelector` - 叙事模板
- `AutoLayoutGrid` - 智能布局网格
- `DialogueRefiner` - 对白优化
- `PanelDetails` - 分镜详情
- `GenerationSettings` - 生成设置
- `UsageBadge` - 用量显示

**使用的 Hooks**：
- `useStoryIntegration` - 故事集成
- `useMetadata` - 获取角色和风格
- `useStoryboardGeneration` - 分镜生成
- `useImageGeneration` - 图像生成
- `useUsage` - 用量追踪

**调用 API**：
- `POST /api/story/expand` - 将脚本拆解为分镜
- `POST /api/panel/generate-image` - 生成分镜图像
- `GET /api/character` - 获取角色列表
- `GET /api/comic-styles` - 获取漫画风格
- `GET /api/usage` - 获取用量信息

**权限要求**：需登录

---

#### `/storyboard/editor/[projectId]` - 项目编辑器

**功能**：二列式分镜编辑器（脚本+分镜）

**特点**：
- 左侧脚本窗格（40%） vs 右侧分镜卡片（60%）
- 文本脚本段与分镜面板同步高亮
- 支持分镜操作：合并、拆分、插入
- 键盘快捷键支持（⌘M合并、⌘D拆分、⌘I插入）
- 实时选择同步

**使用的组件**：
- `ScriptEditorPane` - 脚本编辑器
- `PanelPane` - 分镜卡片容器
- `InsertPanelDialog` - 插入分镜对话框

**使用的 Hooks**：
- `useStoryboardData` - 数据和操作管理
- `useKeyboardShortcuts` - 键盘快捷键

**调用 API**：
- `GET /api/project/{id}` - 获取项目及其分镜
- `PATCH /api/panel/{id}` - 更新分镜
- `POST /api/panel/insert` - 插入新分镜
- `POST /api/panel/split` - 拆分分镜
- `POST /api/panel/merge` - 合并分镜
- `POST /api/panel/generate-sketch` - 生成草图
- `POST /api/panel/generate-prompt` - 生成提示词

**权限要求**：需登录

---

### 5️⃣ 资产与编辑（需登录）

#### `/assets` - 资产管理系统

**功能**：管理角色、姿势、场景资产库

**特点**：
- Tabs 三大模块：角色 + 姿势 + 场景
- 显示日用量统计（分镜生成、图像生成、LLM）
- 用量实时警告（剩余≤3高亮黄色，≤0高亮红色）
- 3D 姿态编辑器集成

**使用的组件**：
- `CharacterLibrary` - 角色库
- `SceneLibrary` - 场景库
- `PoseLabEditor` - 3D 姿态编辑器
- `UsageBadge` - 用量显示

**使用的 Hooks**：
- `useUsage` - 获取用量数据

**调用 API**：
- `GET /api/usage` - 获取用量统计
- `GET /api/character` - 获取用户角色
- `GET /api/scene` - 获取用户场景

**权限要求**：需登录

---

#### `/editor` - 画面精炼工作台

**功能**：Canvas 编辑器，用于分格、气泡、再次润色

**特点**：
- Canvas 实时编辑（分格、气泡添加、撤销重做）
- 版本管理与时间线
- 支持上传本地图片或加载外部 URL
- 导出 PNG 功能
- 模板系统（单格、两列、三网格）
- 实时历史跟踪

**使用的组件**：
- `CanvasWorkspace` - Canvas 编辑区（ref controller）
- `ActionSidebar` - 左侧工具栏
- `VersionTimeline` - 版本时间线
- `FilterBar` - 筛选条件栏

**使用的 Hooks**：
- `useVersionManager` - 版本管理
- `useImageOptimizer` - AI 图像优化
- `usePagination` - 分页
- `useRef` - Canvas 控制器引用

**调用 API**：
- `GET /api/versions` - 获取版本列表（带分页、筛选）
- `POST /api/versions` - 创建版本记录
- `PATCH /api/versions/{id}` - 更新版本布局

**权限要求**：需登录

---

#### `/workflow` - 工作流仪表板

**功能**：故事转漫画自动化工作流管理

**特点**：
- 集成 `WorkflowDashboard` 组件（主要业务逻辑）
- 监控工作流执行状态

**使用的组件**：
- `WorkflowDashboard` - 工作流仪表板

**调用 API**：
- 由 `WorkflowDashboard` 内部管理

**权限要求**：需登录

---

### 6️⃣ 管理员模块（需登录 + 需 Admin 角色）

#### `/admin` - 管理后台首页

**功能**：管理员导航中心

**特点**：
- 权限检查（角色验证）
- 5个主要功能卡片：
  - 模型配置
  - 风格管理
  - 角色库
  - 用户管理
  - 用量日志
- 每个功能快捷导航

**使用的组件**：
- `useCurrentUser` - 获取当前用户信息
- `lucide-react` 图标
- `Button`、`Link` 导航

**使用的 Hooks**：
- `useCurrentUser` - 获取用户角色验证

**权限要求**：需登录 + 需 admin 角色

---

#### `/admin/users` - 用户管理

**功能**：创建、编辑、删除、封禁用户

**特点**：
- 表单：邮箱、密码、昵称、角色、状态、验证状态
- 用户表格（ID、邮箱、昵称、角色、状态、创建时间）
- 编辑时邮箱禁用、密码可选
- 创建时密码必填
- 删除确认对话框

**使用的组件**：
- `Input`、`Label`、`Switch`、`Select`
- `Button`、`AlertDialog`
- 表格展示

**调用 API**：
- `GET /api/admin/users` - 获取所有用户
- `POST /api/admin/users` - 创建用户（免验证码）
- `PUT /api/admin/users/{id}` - 更新用户
- `DELETE /api/admin/users/{id}` - 删除用户

**权限要求**：需登录 + 需 admin 角色

---

#### `/admin/comic-styles` - 漫画风格管理

**功能**：管理首页展示的漫画风格（新增、编辑、排序、启用/禁用）

**特点**：
- 表格展示：预览标签、名称、标识、排序、状态、使用次数
- 排序功能：上下移动调整优先级
- 启用/禁用切换
- 编辑对话框：风格标识、中英文名、图片URL、标签颜色、描述、AI提示词、排序权重
- 颜色选择器（预设6种颜色）

**使用的组件**：
- `Dialog`、`DialogContent`、`DialogHeader`
- 颜色选择器（自定义按钮）
- `Input`、`Textarea`、`Label`
- `AlertDialog` - 删除确认

**使用的 Hooks**：
- `useComicStyleList` - 风格列表管理
- `useComicStyleForm` - 表单管理

**调用 API**：
- `GET /api/admin/comic-styles` - 获取所有风格
- `POST /api/admin/comic-styles` - 创建风格
- `PATCH /api/admin/comic-styles/{id}` - 更新风格（启用/排序）
- `DELETE /api/admin/comic-styles/{id}` - 删除风格

**权限要求**：需登录 + 需 admin 角色

---

#### `/admin/characters` - 角色库管理

**功能**：查看和管理所有用户创建的角色

**特点**：
- 分页（每页20条）
- 筛选：关键词、用户ID、状态
- 表格展示（ID、所属用户、名称、状态等）
- 编辑、删除操作
- 响应式布局

**使用的组件**：
- `CharacterFilterBar` - 筛选栏
- `CharacterTable` - 角色表格
- `CharacterFormDialog` - 编辑对话框
- `DeleteConfirmDialog` - 删除确认
- `PaginationControls` - 分页控制

**使用的 Hooks**：
- `useCharacterList` - 角色列表（带分页筛选）
- `useCharacterForm` - 表单管理

**调用 API**：
- `GET /api/admin/characters?...` - 获取角色列表（支持分页、搜索、筛选）
- `POST /api/admin/characters` - 创建角色
- `PATCH /api/admin/characters/{id}` - 更新角色
- `DELETE /api/admin/characters/{id}` - 删除角色

**权限要求**：需登录 + 需 admin 角色

---

#### `/admin/llm-providers` - LLM 提供商配置

**功能**：管理 AI 模型提供商配置（OpenAI、Stable Diffusion 等）

**特点**：
- Provider Type 信息卡片（说明各 provider_type 用途）
- 表格展示：提供商名称、模型、优先级、启用状态
- 编辑、复制、删除操作
- 表单：provider_type、provider_name、model、base_url、api_key、priority、enabled

**使用的组件**：
- `ProviderTypeInfo` - Provider 类型说明
- `ProviderTable` - 配置表格
- `ProviderFormDialog` - 编辑对话框
- `DeleteProviderDialog` - 删除确认

**使用的 Hooks**：
- `useProviders` - 提供商 CRUD 管理

**调用 API**：
- `GET /api/llm-providers` - 获取所有提供商配置
- `POST /api/llm-providers` - 创建配置
- `PATCH /api/llm-providers/{id}` - 更新配置
- `DELETE /api/llm-providers/{id}` - 删除配置

**权限要求**：需登录 + 需 admin 角色

---

#### `/admin/usage` - 用量与生成日志

**功能**：查看用户用量统计和生成日志

**特点**：
- 高级筛选：用户ID、查看天数、日志条数、起始/结束日期、动作类型、状态
- 日用量统计：表格展示 + 简易柱状图
- 生成日志：表格展示（用户、项目、provider、耗时、错误）
- 导出 CSV 功能
- 实时聚合统计

**使用的组件**：
- `Input`、`Label`、`Button`
- `select` 原生元素（动作、状态筛选）
- 自定义柱状图（纯 CSS 实现）
- 日志表格

**使用的函数**：
- `exportCsv()` - 导出到 CSV 文件

**调用 API**：
- `GET /api/admin/usage?...` - 获取用量统计和日志（支持筛选）

**权限要求**：需登录 + 需 admin 角色

---

## 🔄 典型用户流程

### 从故事到漫画的完整流程

```
1. 首页 (/)
   → 选择漫画风格和角色

2. 故事创作 (/story)
   → AI 生成故事大纲

3. 剧本管理 (/scripts)
   → 查看和编辑剧本列表
   → 进入详情页 (/scripts/[id]) 细化剧本和分镜

4. 分镜系统 (/storyboard)
   → 脚本转换为分镜布局
   → 生成分镜图像

5. 项目编辑 (/storyboard/editor/[projectId])
   → 细化分镜内容
   → 合并/拆分/插入操作

6. 画面精炼 (/editor)
   → Canvas 编辑分格、气泡
   → 再次优化图像

7. 导出完成的漫画页面
```

### 资产管理流程

```
资产库 (/assets)
├─ 角色库 → 新增/编辑角色
├─ 姿势库 → 3D 编辑器设计姿态
└─ 场景库 → 上传/管理背景

在生成时引用资产 → 确保角色一致性
```

### 管理员工作流

```
后台首页 (/admin)
├─ 用户管理 → CRUD 用户、角色分配
├─ 风格管理 → 首页展示内容
├─ 角色库管理 → 审核用户角色
├─ LLM 配置 → 配置模型供应商
└─ 用量查询 → 成本与配额监控
```

---

## 🛠️ 核心技术栈

| 层级 | 技术选择 |
|------|--------|
| **框架** | Next.js 14 App Router |
| **UI** | shadcn/ui (Radix UI) + TailwindCSS |
| **状态管理** | React Query (useQuery/useMutation) + 自定义 hooks |
| **认证** | JWT + HTTP-only Cookie |
| **数据库 ORM** | Prisma |
| **3D** | Three.js + @react-three/fiber (姿态编辑) |
| **图表** | 自定义 CSS 柱状图 |
| **表单** | 受控组件 + Dialog 模式 |

---

## 💡 设计亮点与改进建议

### ✅ 优秀设计

1. **数据结构清晰**：Character、Scene、Story、Panel 关系紧凑，无冗余复制
2. **特殊情况最小化**：分镜操作通过重新序号化消除边界情况
3. **组件化彻底**：每个页面都分解为小组件，未见超过 500 行的文件
4. **钩子抽象适当**：`useStoryboardData`、`useVersionManager` 等充分分离关注点
5. **权限控制清晰**：公开、用户、管理员三级权限明确
6. **API 设计一致**：统一的错误处理和响应格式

### ⚠️ 改进建议

1. **管理员权限检查重复**：每个管理页面都重复权限检查代码，建议提取为 Layout 级别的中间件
2. **长表单拆分**：如 `comic-styles` 编辑表单可进一步拆分为子组件
3. **错误边界统一**：部分页面缺少 ErrorBoundary，建议全局统一错误处理
4. **加载状态优化**：某些页面可增加骨架屏（Skeleton）提升用户体验

---

## 📝 开发注意事项

### 代码规范

1. **TypeScript 严格模式**：禁止使用 `any` 类型，所有类型必须显式定义
2. **文件长度限制**：单文件不超过 500 行，超过则拆分为子组件或 hooks
3. **包管理器**：始终使用 `pnpm`，禁止使用 `npm`
4. **类型定义**：共享类型抽取到独立的 `types.ts` 文件
5. **图标使用**：使用 `lucide-react` 图标库，避免使用 emoji

### 命名约定

- **组件**：PascalCase（如 `CharacterLibrary`）
- **Hook**：camelCase + use 前缀（如 `useStoryboard`）
- **API 路由**：kebab-case（如 `/api/comic-styles`）
- **文件名**：kebab-case（如 `character-library.tsx`）

### 测试要求

- 所有 API 端点应有对应的测试用例
- 关键业务逻辑组件应有单元测试
- 使用 Vitest + React Testing Library 进行测试

---

## 🔗 相关文档

- [API 文档](./API_DOCUMENTATION.md) - 完整的后端 API 接口文档
- [CLAUDE.md](../CLAUDE.md) - 项目指导文档
- [Prisma Schema](../prisma/schema.prisma) - 数据库结构定义

---

*本文档由 Claude Code 自动生成，最后更新时间：2025-12-12*
