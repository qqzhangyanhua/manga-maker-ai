# Repository Guidelines - Manga Maker AI

本文档为 AI 编程助手提供代码库规范指引。项目是基于 Next.js 14 (App Router) + TypeScript 的端到端 AI 漫画创作平台。

---

## 1. 项目结构与模块组织

### 核心目录
- **`src/app`** - Next.js App Router 入口
  - `auth/` - 登录/注册页面
  - `admin/` - 后台管理(LLM 提供商配置、使用统计)
  - `projects/[projectId]` - 项目主页（剧本编辑器）及 `focus`、`storyboard`、`storyboard/layout`、`layout` 子页面；作品一律按 projectId 寻址
  - `storyboard/` - 快速分镜工具（旧的 `editor/[projectId]`、`layout/[projectId]` 只做重定向）
  - `assets/` - 资产库(角色、场景、姿态实验室)
  - `story/` - 新建项目（故事构思）；`scripts/[id]/` 存放剧本编辑器组件，路由本身只做重定向
  - `workflow/` - 工作流编排
  - `editor/` - 画面精炼工作台
  - `api/` - **所有后端 API 路由**，命名为 `route.ts`

- **`src/components`** - React 组件
  - `ui/` - shadcn/ui 基础组件(基于 Radix UI)
  - 业务组件: `Storyboard`, `AssetLibrary`, `PoseLab`, `ImageEditor` 等

- **`src/lib`** - 服务层与工具函数
  - 数据库: `db.ts` (Prisma Client)
  - 认证: `auth.ts`, `auth-helpers.ts` (JWT)
  - LLM 调用: `llm-provider.ts`, `llm-selector.ts`
  - 图像生成: `unified-image-generation.ts`, `comic-panel-composer.ts`
  - 存储: `minio.ts`
  - 工具: `utils.ts` (cn 函数), `api-error.ts`, `api-response.ts`

- **`src/hooks`** - 自定义 React Hooks
  - `use-toast.ts` - Toast 通知
  - `use-storyboard-sync.ts` - 分镜数据同步

- **`src/types`** - TypeScript 类型定义
  - 所有复杂类型定义独立文件，禁止内联在组件中

- **`prisma/`** - 数据库
  - `schema.prisma` - Prisma 模型定义
  - `migrations/` - 数据库迁移历史
  - `seed.ts` - 种子数据

- **`scripts/`** - 工具脚本
  - `init-db.sh` - 数据库初始化
  - `run-vitest.mjs` - Vitest 测试运行器

- **`services/novel-backend/`** - Python FastAPI 后端(小说生成 + RAG)

---

## 2. 开发命令速查

### 包管理
```bash
npm install          # 安装依赖(必须使用 npm，项目有 package-lock.json)
```

### 开发与构建
```bash
npm run dev          # 本地开发，端口 3000
npm run build        # 生产构建
npm run start        # 启动生产构建产物
```

### 代码质量
```bash
npm run lint         # ESLint 检查(提交前必须通过)
npm run type-check   # TypeScript 类型检查(tsc --noEmit)
```

### 测试
```bash
npm test             # 运行所有测试(Vitest，只用 mock)
npm run test:watch   # 监听模式
pnpm test:db         # 本地 Postgres 通道，见 docs/testing/test-db.md

# 运行单个测试文件
npx vitest run src/lib/utils.test.ts

# 运行匹配模式的测试
npx vitest run --grep "auth"
```

### 数据库(Prisma)
```bash
npx prisma generate           # 生成 Prisma Client(修改 schema 后必须执行)
npx prisma migrate dev        # 开发环境迁移(创建新迁移)
npx prisma migrate deploy     # 生产环境迁移(应用已有迁移)
npx prisma studio             # 可视化数据库浏览器
npx prisma db seed            # 运行种子脚本

# 初始化数据库(推荐使用脚本)
./scripts/init-db.sh
```

### Python 后端(Novel Backend)
```bash
cd services/novel-backend
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 3. 代码风格规范

### TypeScript 严格要求
1. **禁止使用 `any` 类型**
   - 使用 `unknown` 并进行类型守卫
   - 复杂类型提取到独立 `type.ts` 文件
   
2. **类型定义位置**
   - 组件内部简单类型: 可内联
   - 跨文件共享类型: 放入 `src/types/` 对应文件
   - 模块私有复杂类型: 同目录创建 `type.ts`

### 命名约定
```typescript
// 组件与类 - PascalCase
export function StoryboardEditor() {}
export class ImageProcessor {}

// 函数与变量 - camelCase
const fetchPanels = async () => {}
let userCredits = 1000;

// 常量 - UPPER_SNAKE_CASE(可选，优先 camelCase)
const MAX_PANELS_PER_PROJECT = 100;

// 私有函数/变量 - 下划线前缀(可选)
function _internalHelper() {}

// API 路由文件 - route.ts(Next.js 约定)
// src/app/api/panel/split/route.ts

// 类型文件 - type.ts 或 types.ts
// src/app/panel/editor/[panelId]/type.ts
```

### 格式化与缩进
- **缩进**: 2 空格(不是 Tab)
- **引号**: 双引号优先，模板字符串用反引号
- **分号**: 保持一致(项目当前使用分号)
- **行宽**: 无硬性限制，但避免超过 120 字符

### 导入顺序
```typescript
// 1. React 核心
import { useState, useEffect } from "react";

// 2. Next.js 模块
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// 3. 第三方库(按字母排序)
import { z } from "zod";
import { clsx } from "clsx";

// 4. 本地模块(@/ 别名)
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";

// 5. 类型导入(可选分组)
import type { Panel } from "@prisma/client";
```

### 样式规范
- **优先使用 Tailwind 工具类**，避免自定义 CSS
- **复用 shadcn/ui 组件**(`src/components/ui`)
- **条件样式合并**: 使用 `cn()` 函数
  ```typescript
  import { cn } from "@/lib/utils";
  
  <div className={cn(
    "base-class",
    isActive && "active-class",
    error ? "error-class" : "normal-class"
  )} />
  ```

### 表单校验
- **必须使用 `zod`** 定义 Schema
- **结合 `react-hook-form`** 处理表单
- **API 路由中验证请求体**
  ```typescript
  import { z } from "zod";
  
  const panelSchema = z.object({
    panel_id: z.string().uuid(),
    split_hint: z.string().optional(),
  });
  
  const body = panelSchema.parse(await req.json());
  ```

### 错误处理
- **API 路由**: 统一使用 `try-catch` + `NextResponse.json()`
  ```typescript
  try {
    // 业务逻辑
  } catch (error) {
    console.error("Operation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
  ```

- **组件**: 使用 Error Boundary 或 `useToast` 显示错误
  ```typescript
  import { toast } from "@/hooks/use-toast";
  
  toast({
    title: "操作失败",
    description: error.message,
    variant: "destructive",
  });
  ```

### 注释与文档
- **注释语言**: 统一使用**中文**
- **用户文案**: 统一使用**中文**
- **何时写注释**:
  - ✅ 复杂业务逻辑(为什么这样做)
  - ✅ 非直观的算法或数据结构
  - ✅ 临时 Workaround 或已知问题
  - ❌ 自解释的代码(避免冗余注释)

---

## 4. API 路由开发规范

### 标准结构(基于实际代码)
```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    
    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 2. 请求体解析与验证
    const body = await req.json();
    const { panel_id } = body;
    
    if (!panel_id) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    // 3. 权限检查
    const resource = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: { project: true },
    });
    
    if (resource?.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 4. 业务逻辑
    const result = await someOperation();

    // 5. 返回结果
    return NextResponse.json({ success: true, data: result });
    
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
```

### 状态码使用
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未登录
- `403` - 无权限
- `404` - 资源不存在
- `500` - 服务器错误

---

## 5. 测试规范

### 测试文件组织
```
src/
  lib/
    utils.ts
    utils.test.ts          # 与源文件同目录
  __tests__/               # 或集中在此目录
    integration/
      api.test.ts
```

### 测试命名
```typescript
// 文件名: *.test.ts 或 *.spec.ts
// 测试套件: describe + 中文描述
describe("图片生成队列", () => {
  it("应该正确入队并返回任务ID", async () => {
    // 测试逻辑
  });
  
  it("队列满时应该拒绝新任务", async () => {
    // 测试逻辑
  });
});
```

### 测试重点
- ✅ `src/lib` 中的纯函数
- ✅ 表单校验 Schema(zod)
- ✅ 关键 API handler 逻辑
- ✅ 自定义 Hooks

### Mock 外部依赖
```typescript
import { vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    panel: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock MinIO
vi.mock("@/lib/minio", () => ({
  uploadToMinio: vi.fn().mockResolvedValue("https://mock-url.png"),
}));
```

---

## 6. Git 提交规范

### Commit Message 格式
```
<type>: <简短中文摘要>

<可选的详细描述>
```

### Type 前缀
- `feat:` - 新功能
- `fix:` - Bug 修复
- `chore:` - 杂项(依赖更新、配置调整)
- `docs:` - 文档更新
- `refactor:` - 重构(不改变功能)
- `test:` - 测试相关
- `perf:` - 性能优化

### 示例
```bash
feat: 添加分镜批量选择功能

- 支持 Shift 范围选择
- 支持 Ctrl/Cmd 多选
- 批量操作面板 UI
```

### Pull Request 要求
- [ ] 简洁的变更摘要(中文)
- [ ] 关联的 Issue 编号(如有)
- [ ] UI 变更截图/录屏
- [ ] 是否涉及数据库迁移
- [ ] 是否新增环境变量
- [ ] 已通过 `npm run lint`
- [ ] 已测试核心功能
- [ ] 回滚方案(如为破坏性变更)

---

## 7. 环境变量配置

### 必填变量(`.env.local`)
```bash
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/manga_maker
DATABASE_SSL=false  # 生产环境设为 true

# 认证
AUTH_SECRET=your-secret-key-min-32-chars
INITIAL_ADMIN_EMAIL=admin@example.com  # 可选，首次登录提权

# 对象存储(MinIO/S3)
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=input-image

# 邮件(SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=465
EMAIL_USER=noreply@example.com
EMAIL_PASSWORD=smtp-password
EMAIL_FROM="Manga Maker <noreply@example.com>"

# 可选 - 用量配额
QUOTA_STORYBOARD_DAILY=20
QUOTA_STORY_DAILY=30
QUOTA_IMAGE_DAILY=50
```

### LLM 提供商配置
通过数据库表 `llm_providers` 配置，字段:
- `provider_type`: `storyboard` | `story_generator` | `image_generation` | `prompt_optimizer`
- `base_url`: API 端点
- `model`: 模型名称
- `api_key`: 密钥
- `priority`: 优先级(数字越小越优先)
- `enabled`: 是否启用

---

## 8. 安全与最佳实践

### 安全检查清单
- [ ] 所有 API 路由验证用户身份
- [ ] 敏感操作检查资源权限(user_id 匹配)
- [ ] 用户输入使用 `zod` 验证
- [ ] 生产环境 MinIO bucket 非公开
- [ ] 日志中不输出密钥/Token
- [ ] 外部 URL 通过服务层生成

### 性能优化
- **数据库查询**: 使用 Prisma 的 `select` 和 `include` 减少冗余字段
- **图片上传**: 使用统一队列(`unified-image-generation.ts`)
- **分镜自动保存**: 使用 500ms 防抖(debounce)

### 组件开发原则
- **保持组件无副作用**(纯展示组件)
- **数据获取放在 Server Component** 或 API 路由
- **状态管理**: 优先 `useState` + Context，复杂场景用 Zustand
- **避免 prop drilling**: 超过 3 层考虑 Context

---

## 9. 常见问题与调试

### Prisma 相关
```bash
# 问题: 修改 schema 后类型不匹配
npx prisma generate

# 问题: 迁移失败
npx prisma migrate reset  # 警告: 删除所有数据!

# 问题: 查看当前数据库状态
npx prisma studio
```

### 类型错误
```bash
# 完整类型检查
npm run type-check

# 检查单个文件
npx tsc --noEmit src/app/api/panel/route.ts
```

### 构建失败
```bash
# 清理缓存重新构建
rm -rf .next
npm run build
```

---

## 10. 相关文档索引

- `README.md` - 项目整体介绍与快速开始
- `docs/README.md` - 文档索引（含 archive 说明）
- `docs/DATABASE_SETUP.md` - 数据库设置指南
- `services/novel-backend/RAG_GUIDE.md` - RAG 向量检索配置
- `PHASE_4_COMPLETION.md` - 分镜编辑器功能迭代
- `SCRIPT_EDITOR_FEATURES.md` - 剧本编辑器功能说明
- `PROMPT_OPTIMIZATION_GUIDE.md` - 提示词优化指南

---

**最后更新**: 2026-01-17  
**维护者**: AI Coding Agents
