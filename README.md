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

# 生成 Prisma Client
npx prisma generate
# 初始化数据库（本地开发可直接创建空库后执行）
npx prisma migrate dev
# (可选) 打开 Prisma Studio
npx prisma studio

# 开发模式
npm run dev
# 访问 http://localhost:3000
```

### 环境变量（`.env.local` 示例）

```bash
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/manga_maker
DATABASE_SSL=false           # 可选，生产如需 SSL 设为 true

# 鉴权
AUTH_SECRET=replace_with_strong_secret

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

## 前端体验入口

- `/`：首页风格与角色类型选择，生成入口。
- `/story`：故事生成/模板选择/可编辑并保存。
- `/storyboard`：分镜项目列表；`/storyboard/editor/[projectId]` 进入分镜编辑（自动保存、快捷键、插入/合并/拆分、草图/提示生成）。
- `/editor`：画面精炼中心（分格模板、对白气泡、AI 润色、版本时间线、导出/保存布局）。
- `/workflow`：一键工作流创建与状态监控。
- `/assets`、`/templates`、`/admin`：资产、模板与后台管理。

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
