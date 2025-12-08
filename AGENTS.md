# Repository Guidelines

## 项目结构与模块组织
- `src/app` 为 Next.js App Router 入口，包含登陆/注册（`auth`）、后台（`admin`）、分镜（`storyboard`）、素材（`assets`）等页面，API 路由集中在 `src/app/api` 处理角色、风格与生成请求。
- `src/components` 收录通用与业务组件（`ui` 为 shadcn 库，`AssetLibrary`、`Storyboard`、`PoseLab` 等交互模块），`src/hooks` 放置自定义状态与数据同步逻辑，`src/config` 管理常量与主题配置，`src/lib` 为服务层（Prisma 连接、LLM/图像生成、MinIO、邮件与工具函数）。
- 数据模型在 `prisma/schema.prisma`，静态示例资源位于 `public/assets`，脚本辅助放在 `scripts`。环境变量建议集中在 `.env.local`。

## 构建、测试与开发命令
- `npm install`：安装依赖（保持与 `package-lock.json` 一致）。
- `npm run dev`：本地开发调试，默认端口 3000。
- `npm run build`：生产构建；`npm run start`：启动构建产物。
- `npm run lint`：运行 Next/ESLint 规则，提交前必须通过。
- Prisma：修改模型后运行 `npx prisma generate`，本地需要迁移时执行 `npx prisma migrate dev`（确保正确的 `DATABASE_URL`）。

## 代码风格与命名约定
- TypeScript + Next.js，组件/文件用 `PascalCase`，函数与变量用 `camelCase`，App Router API 使用 `route.ts`。
- 缩进 2 空格，尽量避免 `any`；表单校验优先 `zod` + `react-hook-form`；样式使用 Tailwind 工具类并复用 shadcn `ui` 组件。
- 服务与工具放 `src/lib`，保持组件无副作用；注释与用户文案统一使用中文。

## 测试指引
- 当前未内置自动化测试；新增功能请自带用例，可引入 Vitest + Testing Library，命名 `*.test.ts(x)`，放在 `src/__tests__` 或与模块同目录。
- 覆盖重点：`src/lib` 纯函数、表单校验逻辑、关键 API handler；外部依赖（MinIO、邮件、LLM）使用 Mock，避免真实调用。

## 提交与合并请求规范
- Git 历史采用类 Conventional Commits：`feat:`、`chore:`、`docs:` 前缀 + 简短中文摘要，单行说明核心改动。
- PR 需包含：变更摘要、关联 Issue/任务编号、UI 变更的截图或录屏、是否涉及 schema 迁移或新增环境变量、已执行 `npm run lint`/相关测试的说明。避免在同一 PR 混入无关重构，数据库与配置改动需补充回滚/灰度方案。

## 安全与配置提示
- 必填环境变量：`DATABASE_URL`（可选 `DATABASE_SSL`）、`MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY/MINIO_BUCKET_NAME/MINIO_USE_SSL`、`EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASSWORD/EMAIL_FROM`。缺失将导致启动或发送邮件失败。
- 生产环境需检查 MinIO bucket 访问策略，避免默认公开；日志与存储禁止泄露敏感信息；所有外部 URL 通过服务层生成并验证输入。
