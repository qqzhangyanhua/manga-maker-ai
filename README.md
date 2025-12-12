# Manga Maker AI

一个基于 AI 的漫画/分镜生成平台，支持"数字演员"角色管理系统，让用户能够创建具有一致外观的漫画角色，并在不同姿势、表情和服装下保持角色一致性。

## 核心功能

- **角色管理系统（数字演员）**
  - 三视图生成（正面/侧面/背面）
  - 表情矩阵（9种情绪）
  - 服装系统（多套服装管理）
  - 角色关系图谱
  - 相似角色生成

- **场景库管理**
  - 背景/环境资产管理
  - 场景分类（室内/室外/城市/自然/奇幻/科幻/历史/抽象）
  - 场景图片上传和引用

- **故事生成系统**
  - AI 驱动的故事大纲生成
  - 剧本扩展和细化
  - 角色设定管理
  - 故事模板系统
  - 多种类型支持（悬疑/爱情/冒险/科幻/日常/奇幻）

- **分镜编辑器**
  - 可视化分镜板编辑
  - 分镜插入/拆分/合并操作
  - 镜头角度和景别设置
  - AI 图片生成集成
  - 剧本文本管理

- **管理后台**
  - 用户管理（角色/状态控制）
  - 漫画风格库管理
  - LLM 提供商配置
  - 使用统计和日志查看

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **UI**: React + TailwindCSS + shadcn/ui (Radix UI)
- **认证**: JWT + bcrypt
- **AI 集成**: OpenAI-compatible APIs
- **3D**: Three.js (@react-three/fiber) - 用于姿势实验室
- **存储**: MinIO (S3-compatible)
- **邮件**: Nodemailer (SMTP)

## 快速开始

### 前置要求

- Node.js 18+ (推荐使用 [nvm](https://github.com/nvm-sh/nvm))
- pnpm 8+ (必须使用 pnpm，不要使用 npm)
- PostgreSQL 14+
- MinIO 或 S3-compatible 存储

### 安装

```bash
# 克隆仓库
git clone <YOUR_GIT_URL>
cd manga-maker-ai

# 安装依赖（必须使用 pnpm）
pnpm install
```

### 环境配置

创建 `.env` 文件：

```bash
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/manga_maker

# 认证
AUTH_SECRET=your_random_secret_for_jwt

# 邮件服务 (SMTP)
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=465
EMAIL_USER=your@qq.com
EMAIL_PASSWORD=your_smtp_key
EMAIL_FROM="ComicAI <your@qq.com>"

# MinIO 对象存储
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=manga-assets
```

### 数据库设置

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# (可选) 打开 Prisma Studio 查看数据
npx prisma studio
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 开发命令

```bash
# 开发
pnpm dev              # 启动开发服务器

# 构建
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器

# 代码质量
pnpm lint             # 运行 ESLint

# 测试
pnpm test             # 运行 Vitest 测试
pnpm test:watch       # 监听模式运行测试

# 数据库
npx prisma generate   # 生成 Prisma Client
npx prisma migrate dev --name <name>  # 创建迁移
npx prisma migrate deploy             # 应用迁移（生产）
npx prisma studio     # 打开数据库 GUI
```

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── auth/          # 认证端点
│   │   ├── character/     # 角色 CRUD 和生成
│   │   ├── scene/         # 场景库管理
│   │   ├── story/         # 故事生成和管理
│   │   ├── panel/         # 分镜操作
│   │   ├── project/       # 项目管理
│   │   └── admin/         # 管理后台
│   ├── admin/             # 管理后台页面
│   ├── assets/            # 资产库页面
│   ├── auth/              # 登录/注册页面
│   ├── scripts/           # 故事/剧本管理页面
│   ├── storyboard/        # 分镜编辑器页面
│   └── layout.tsx         # 根布局
├── components/
│   ├── AssetLibrary/      # 角色和场景管理组件
│   ├── Storyboard/        # 分镜编辑器组件
│   ├── PoseLab/           # 3D 姿势编辑器组件
│   └── ui/                # shadcn/ui 组件
├── hooks/                 # 自定义 React Hooks
├── lib/                   # 共享工具库
│   ├── auth.ts            # JWT 签名/验证
│   ├── db.ts              # Prisma 客户端单例
│   ├── llm-provider.ts    # LLM API 集成
│   ├── story-generator.ts # 故事生成助手
│   ├── generation-log.ts  # 生成日志工具
│   ├── usage.ts           # 使用统计和配额管理
│   └── mailer.ts          # 邮件验证
└── app/globals.css        # 全局样式

prisma/
└── schema.prisma          # 数据库模式
```

## API 文档

详细的 API 接口文档请参考：
- [API 接口文档](./docs/api-documentation.md) - 完整的 REST API 参考
- [CLAUDE.md](./CLAUDE.md) - 项目架构和开发指南

主要 API 端点：
- `/api/auth/*` - 认证相关
- `/api/character/*` - 角色管理和生成
- `/api/scene/*` - 场景库管理
- `/api/story/*` - 故事生成和管理
- `/api/project/*` - 项目管理
- `/api/panel/*` - 分镜操作
- `/api/admin/*` - 管理后台（需要管理员权限）

## 数据库模型

核心数据模型：
- `User` - 用户账户（邮箱验证、角色、状态）
- `Character` - 角色实体（带 LoRA 训练状态）
- `CharacterView` - 三视图参考图
- `CharacterExpression` - 表情矩阵
- `CharacterOutfit` - 服装系统
- `Scene` - 场景/背景资产
- `Story` - 故事大纲和角色设定
- `Project` - 漫画/分镜项目
- `Panel` - 分镜面板
- `GeneratedImage` - 生成的图片库
- `GenerationLog` - AI 生成操作日志
- `UsageStat` - 使用统计

详细的数据库模式请查看 `prisma/schema.prisma`

## LLM 提供商配置

系统支持多个 LLM 提供商，通过 `llm_providers` 表配置：

```typescript
{
  provider_type: "prompt_optimizer" | "character_analyzer" | "story_generator" | "image_generation",
  provider_name: "openai",
  model: "gpt-4",
  base_url: "https://api.openai.com",
  api_key: "sk-...",
  priority: 1,      // 数字越小优先级越高
  enabled: true
}
```

系统使用 `provider_type` 作为查找键，自动选择优先级最高的启用提供商。

## 代码规范

1. **严格类型检查**: 禁止使用 `any` 类型，所有类型必须显式定义
2. **类型定义**: 共享类型提取到独立的 `types.ts` 文件
3. **文件长度**: 单个文件不超过 500 行，超过则拆分为子组件或 hooks
4. **包管理器**: 必须使用 `pnpm`，禁止使用 `npm`
5. **图标使用**: 使用 `lucide-react` 图标，不使用 emoji

## 已知限制

1. **图片生成**: 当前使用占位符 URL，生产环境需要集成：
   - Stable Diffusion API (ComfyUI, Automatic1111 等)
   - DALL-E API
   - 其他图片生成服务

2. **LoRA 训练**: 未实现，角色 `training_status` 始终为 `pending`

3. **MinIO 存储**: 需要本地运行 MinIO 服务器或使用云端 S3-compatible 存储

## 示例应用

`example/` 目录包含一个独立的照片转漫画 Web 应用，演示 AI 生成工作流：
- 将照片转换为漫画风格分镜
- 使用 OpenAI GPT 生成剧本
- 使用 DALL-E 生成图片
- 纯 HTML/CSS/JavaScript（无框架）

这是独立于主 Next.js 应用的参考实现。

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

[MIT License](LICENSE)

## 支持

如有问题或建议，请提交 [Issue](https://github.com/your-repo/manga-maker-ai/issues)
