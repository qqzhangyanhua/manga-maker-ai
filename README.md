# Manga Maker AI

一个端到端的 AI 漫画创作平台，覆盖“故事 → 剧本 → 分镜 → 图片 → 画面排版”全流程，内置数字演员管理、风格库、工作流调度与画面精炼工具。

## 核心能力

- 故事与剧本：故事大纲生成、模板化提示、可编辑并保存为剧本，支持多类型、角色数、长度控制（`/story`、`/scripts`）。
- 分镜编辑：文本片段 ↔ 分镜卡片双向定位，插入/拆分/合并分镜，自动保存（500ms 防抖）、快捷键（⌘/Ctrl + M/D/I），支持角色/风格选择、草图/Prompt 生成（`/storyboard/editor/[projectId]`）。
- 画面精炼中心：画布分格、对白气泡、模板（单格/二分/三格）、版本时间线、AI 润色并更新版本、导出 PNG、布局保存（`/editor`）。
- 工作流编排：一键创建“故事→脚本→分镜→图片→导出”工作流，轮询状态、查看结果、失败重试（`/workflow`）。
- 资产与模板：角色/表情/服装（数字演员）、场景库、漫画风格库、Prompt 示例与优化弹窗、故事模板选择（`/assets`、`/templates`、首页风格/角色选择）。
- 管理与统计：LLM 提供商配置、使用配额统计、生成任务与图片、上传接口、后台管理视图（`/admin`）。
- 图像生成队列：统一的图片生成队列 + MinIO 上传，支持面板/表情/服装/角色/场景/整页等类型（`src/lib/unified-image-generation.ts`）。

## 技术栈

- Next.js 14（App Router）+ React 18 + TypeScript
- UI：TailwindCSS + shadcn/ui（Radix UI），lucide-react 图标，Three.js/@react-three/fiber 用于姿势/3D 交互
- 数据层：PostgreSQL + Prisma ORM，MinIO/S3 对象存储
- AI/LLM：开放的 OpenAI-compatible 接口，通过数据库表 `llm_providers` 配置不同用途（storyboard/story/image/prompt 等）
- 认证与通信：JWT/bcrypt，Nodemailer SMTP 邮件
- 测试与质量：ESLint、Vitest（`scripts/run-vitest.mjs`）

## 目录速览

- `src/app`：路由与页面。`api/*` 为后端接口；`storyboard` 分镜工作区；`editor` 画面精炼；`story`/`scripts` 剧本；`workflow` 工作流；`admin` 后台；`auth` 登录注册；`assets` 资产库。
- `src/components`：UI 与业务组件。`Storyboard` 分镜卡片/脚本面板；`ImageEditor` 画布与时间线；`Workflow`/`Story`/`Template` 等业务模块；`ui` 为 shadcn 基础组件。
- `src/lib`：服务层与工具。数据库/认证、LLM 选择器、故事与提示构建、统一图片生成队列、MinIO 封装、邮件、用量配额、工作流引擎。
- `prisma`：`schema.prisma` 数据模型，`seed.ts` 种子脚本。
- `public/assets`：示例角色/风格图片，供展示与占位。

## 快速开始

### 前置依赖

- Node.js 18+
- npm（仓库附带 `package-lock.json`，如需 pnpm 请自担兼容性）
- PostgreSQL 14+
- MinIO 或任意 S3 兼容存储
- 可用的 OpenAI-compatible 接口与 SMTP 邮箱

### 安装与启动

```bash
git clone <YOUR_GIT_URL>
cd manga-maker-ai
npm install

# 初始化数据库（推荐使用脚本）
./scripts/init-db.sh

# 或手动执行：
# npx prisma migrate deploy  # 应用所有迁移
# npx prisma generate        # 生成 Prisma Client

# (可选) 打开 Prisma Studio
npx prisma studio

# 开发模式
npm run dev
# 访问 http://localhost:3000
```

**重要**: 数据库初始化现已使用 Prisma 迁移系统。详见 [数据库设置指南](docs/DATABASE_SETUP.md)。

### 环境变量（`.env.local` 示例）

```bash
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/manga_maker
DATABASE_SSL=false           # 可选，生产如需 SSL 设为 true

# 鉴权
AUTH_SECRET=replace_with_strong_secret
INITIAL_ADMIN_EMAIL=admin@example.com  # 可选，首次登录时自动提权为管理员

# 邮件
EMAIL_HOST=smtp.example.com
EMAIL_PORT=465
EMAIL_USER=you@example.com
EMAIL_PASSWORD=your_smtp_key
EMAIL_FROM="ComicAI <you@example.com>"

# 对象存储
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=input-image

# (可选) 使用配额
QUOTA_STORYBOARD_DAILY=20
QUOTA_STORY_DAILY=30
QUOTA_IMAGE_DAILY=50
```

### 常用命令

- `npm run dev`：本地开发
- `npm run build` / `npm run start`：生产构建与运行
- `npm run lint`：ESLint
- `npm test` / `npm run test:watch`：Vitest
- `npx prisma migrate dev --name <name>` / `npx prisma migrate deploy`：数据库迁移

## 后端与配置要点

- LLM/图片服务：在 `/admin/llm-providers` 或直接写入表 `llm_providers` 配置不同 `provider_type`（如 `storyboard`、`story_generator`、`image_generation`、`prompt_optimizer`），字段包含 `base_url`、`model`、`api_key`、`priority`、`enabled`。
- 存储：图片生成结果会上传到 MinIO `MINIO_BUCKET_NAME`，需确保桶已存在或具备创建权限。
- API 路由：`/api/story*`（故事）、`/api/storyboard*`（分镜）、`/api/panel*`（分镜操作）、`/api/image-generation`、`/api/workflow*`、`/api/assets`/`scene`/`character`、`/api/admin/*` 等。

## 前端体验入口与路由详解

### 核心路由页面

#### 1. 首页与认证
- **`/`** - 平台首页
  - 产品介绍、功能特性、定价展示
  - 30秒体验 AI 漫画生成（TrialDialog）
  - 新手引导（OnboardingDialog）
  - 快速入口导航

- **`/auth/login`** - 用户登录
- **`/auth/register`** - 用户注册
  - 邮箱验证码注册
  - 支持关联体验作品

#### 2. 剧本与故事创作
- **`/story`** - 故事创作页
  - AI 生成完整故事大纲
  - StoryGenerator 组件

- **`/scripts`** - 剧本列表页
  - 查看和管理所有生成的剧本
  - 按时间、类型筛选
  - 删除、编辑操作

- **`/scripts/[id]`** - 剧本详情与分镜管理
  - 故事信息编辑（标题、前提）
  - 章节列表展示
  - 分镜列表视图（PanelListView）
  - 角色管理（StoryCharacterList）
  - AI 生成分镜（支持流式 SSE）
  - 生成图库（StoryImagesGallery）

#### 3. 分镜项目与编辑
- **`/projects`** - 分镜项目列表
  - 查看所有分镜项目
  - 项目卡片展示（标题、描述、分镜数、已出图数）
  - 快速进入编辑或导出

- **`/storyboard`** - 分镜生成页面
  - 自由输入剧本生成分镜
  - 模板填空生成分镜
  - 生成设置（默认角色、风格、软模式）
  - 分镜预览与单张图片生成
  - 批量图片生成与导出

- **`/storyboard/editor/[projectId]`** - 分镜项目编辑器
  - 双栏布局：剧本视图（左）+ 分镜卡片（右）
  - 分镜操作：插入、合并、拆分、删除
  - 批量操作：
    - 多选模式（Shift 范围选择）
    - 批量修改角色/风格/镜头参数
    - 批量生成图片
    - 批量删除
  - AI 建议：
    - 续写建议（ContinuationSuggestionDialog）
    - 优化建议（OptimizationSuggestionDialog）
  - 快捷键支持：⌘M 合并、⌘D 拆分、⌘I 插入
  - 实时保存（500ms 防抖）

- **`/storyboard/layout/[projectId]`** - 分镜排版页面

- **`/panel/editor/[panelId]`** - 单个分镜编辑器

#### 4. 资产管理系统
- **`/assets`** - 资产管理中心
  - **角色库标签页**（CharacterLibrary）
    - 角色列表与创建
    - 三视图生成
    - 表情矩阵生成
    - 服装管理
  - **3D 姿态辅助库**（PoseLabEditor）
    - 3D 人偶编辑器
    - 姿势保存与应用
  - **场景库标签页**（SceneLibrary）
    - 场景列表与创建
    - 场景类型分类
  - 显示今日用量统计（分镜生成、图像生成、LLM 调用）

#### 5. 模板与工作流
- **`/templates`** - 模板市场
  - 三个标签页：官方模板、社区模板、我的模板
  - 搜索与筛选：
    - 关键词搜索
    - 标签筛选（对话、战斗、情感等）
    - 分镜数量范围
    - 模板类型（短篇、条漫、四格等）
    - 难度等级（新手/进阶）
    - 角色数量
  - 模板操作：预览、点赞、应用到项目
  - 分页浏览

- **`/workflow`** - 工作流管理
  - 工作流仪表板（WorkflowDashboard）
  - 一键创建自动化工作流
  - 状态监控与结果查看

#### 6. 图像处理与展示
- **`/editor`** - 画面精炼工作台
  - 核心功能：
    - AI 重新润色图片
    - 画布编辑（CanvasWorkspace）
    - 拖拽分格线
    - 添加对白气泡
  - 布局模板：单格、双栏、三宫格
  - 版本管理：
    - 版本时间线（VersionTimeline）
    - 版本切换与对比
    - 保存布局状态
  - 导出功能：导出 PNG 图片
  - 筛选与分页：按项目 ID、任务 ID 筛选

- **`/generated`** - 生成图库
  - 按时间回溯所有生成的图片
  - 筛选功能：
    - 关键词搜索（提示词）
    - 风格筛选
    - 来源筛选（分镜/角色/姿态/场景）
  - 分页浏览（20 张/页）
  - 跳转到关联项目

#### 7. 社区与分享
- **`/gallery`** - 作品画廊
  - 展示社区分享的漫画作品
  - 网格布局展示
  - 鼠标悬停查看提示词

- **`/gallery/[id]`** - 作品详情页
  - 作品图片与基本信息
  - 对话、描述展示
  - 生成提示词（如果作者开启 show_prompt）
  - 技术参数：镜头类型、角度、景别
  - 关联资产：角色、场景、服装
  - 跳转到完整项目

#### 8. 示例与学习
- **`/samples`** - 示例项目
  - 按难度分类：
    - 入门示例（beginner）- 4 格简单结构
    - 进阶示例（intermediate）- 更多分镜和情节
    - 高级示例（advanced）- 复杂故事结构
  - 功能：
    - 预览示例内容（SamplePreviewDialog）
    - 一键复制到账号
    - 自由修改和学习

#### 9. 个人中心
- **`/profile`** - 个人中心
  - **总览标签页**：
    - 算力余额卡片
    - 累计消耗统计
    - 账户状态信息
    - 快速入口（剧本、项目、图库、资产）
  - **算力管理标签页**：
    - 当前余额展示
    - 充值功能（RechargeDialog）
    - 使用统计
    - 交易记录（TransactionsDialog）
  - **账户设置标签页**：
    - 编辑基本信息（EditProfileDialog）
    - 修改密码（ChangePasswordDialog）
    - 更换邮箱
    - 安全设置

- **`/profile/shared`** - 个人分享页面

#### 10. 其他页面
- **`/creators`** - 创作者页面
- **`/publishers`** - 发布者页面
- **`/studios`** - 工作室页面

### 核心工作流程

1. **故事创作流程**：
   `/story` → `/scripts/[id]` → 生成分镜 → `/storyboard/editor/[projectId]`

2. **快速分镜流程**：
   `/storyboard` → 输入剧本/选择模板 → 生成分镜 → `/storyboard/editor/[projectId]`

3. **资产准备流程**：
   `/assets` → 创建角色/场景 → 应用到分镜项目

4. **学习参考流程**：
   `/samples` → 复制示例 → `/scripts/[id]` → 修改学习

5. **画面精炼流程**：
   生成分镜图片 → `/editor` → 添加分格/对白 → 导出成品

### 设计风格
- 统一背景色：`bg-[#0f0f13]`
- 强调色：橙色（`orange-500`）
- 卡片样式：`bg-zinc-900/50 backdrop-blur-sm border-zinc-800`
- 文字颜色：白色标题 + `zinc-400` 描述

## 已知限制与待办

- 真实图片生成依赖已配置的 `image_generation` 提供商；未配置时将报错，需要外部 Stable Diffusion/DALL·E 兼容接口。
- 工作流导出能力仍为 TODO（`exportFormat` 预留）。
- LoRA/自训练未实现，角色 `training_status` 目前为占位。
- 分镜批量选择/批量操作与拖拽排序处于规划中（见 `PHASE_4_COMPLETION.md`）。
- ControlNet 草图生成 API 预留尚未接入具体服务。

## 相关文档

- `PHASE_4_COMPLETION.md`：分镜编辑器近期迭代与待办
- `SCRIPT_EDITOR_IMPLEMENTATION.md`、`SCRIPT_EDITOR_FEATURES.md`：剧本/脚本模块说明
- `QUICK_START_IMAGE_GEN.md`、`IMAGE_GENERATION_SETUP.md`：图片生成配置
- `PROMPT_OPTIMIZATION_GUIDE.md`、`PROMPT_OPTIMIZATION_DIALOG` 相关组件：提示词优化
- `CLAUDE.md`、`docs/`：更多架构与 API 参考
