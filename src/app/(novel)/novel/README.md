# 小说创作模块 (Novel Module)

> AI 辅助小说创作系统 - 从灵感到成稿的完整创作流程

---

## 📚 目录结构

```
src/app/(novel)/novel/
├── README.md                    # 本文档
├── DESIGN.md                    # 详细设计文档（UI/UX 规范）
├── theme.ts                     # 主题样式常量（紫色主题）
├── page.tsx                     # 小说项目列表页
├── components/                  # 共享组件
│   ├── CreateProjectDialog.tsx          # 新建项目对话框
│   ├── InspirationModeDialog.tsx        # 灵感模式对话框
│   └── inspiration/                     # 灵感模式子组件
│       ├── WelcomeView.tsx              # 欢迎界面
│       ├── QuestionView.tsx             # 问题引导界面
│       ├── GeneratingView.tsx           # 生成中界面
│       └── ResultView.tsx               # 结果展示界面
├── [id]/                        # 小说项目详情页
│   ├── page.tsx                         # 项目详情主页面
│   ├── ProjectHeader.tsx                # 项目头部组件
│   ├── ChaptersTab.tsx                  # 章节列表标签页
│   ├── types.ts                         # 类型定义
│   ├── useNovelProject.ts               # 项目数据管理 Hook
│   ├── components/                      # 详情页组件
│   │   ├── ChapterEditor.tsx            # 章节编辑器
│   │   ├── ChapterList.tsx              # 章节列表
│   │   ├── ChapterVersionManager.tsx    # 章节版本管理
│   │   ├── OutlineEditor.tsx            # 大纲编辑器
│   │   ├── CharacterManager.tsx         # 角色管理器
│   │   ├── WorldSettingEditor.tsx       # 世界观设定编辑器
│   │   ├── ProgressDashboard.tsx        # 进度仪表盘
│   │   ├── ProjectSettings.tsx          # 项目设置
│   │   ├── GenerateOutlineDialog.tsx    # 生成大纲对话框
│   │   ├── ContinueOutlineDialog.tsx    # 续写大纲对话框
│   │   ├── ExportDialog.tsx             # 导出对话框
│   │   ├── ConvertToComicDialog.tsx     # 转换为漫画对话框
│   │   ├── character/                   # 角色相关组件
│   │   │   ├── CharacterCard.tsx
│   │   │   ├── CharacterEditDialog.tsx
│   │   │   ├── GenerateCharacterImageDialog.tsx
│   │   │   ├── BatchGenerateDialog.tsx
│   │   │   └── ImagePreviewDialog.tsx
│   │   ├── relationship-graph/          # 角色关系图组件
│   │   │   ├── CharacterRelationshipGraph.tsx
│   │   │   ├── CharacterNode.tsx
│   │   │   ├── RelationshipEdge.tsx
│   │   │   ├── RelationshipEditDialog.tsx
│   │   │   └── GraphToolbar.tsx
│   │   └── world-setting/               # 世界观设定组件
│   │       ├── LocationEditor.tsx
│   │       ├── FactionEditor.tsx
│   │       ├── TimelineEditor.tsx
│   │       └── RuleEditor.tsx
│   ├── hooks/                           # 自定义 Hooks
│   ├── services/                        # 业务逻辑服务
│   ├── stores/                          # 状态管理
│   └── utils/                           # 工具函数
└── canvas/                      # 无限画布（小说转漫画）
    └── [id]/
        └── page.tsx                     # 无限画布页面
```

---

## 🎨 主题色系统 (Purple Elegance)

### 核心配色

| 用途 | 颜色值 | Tailwind 类名 | 说明 |
|------|--------|--------------|------|
| **主色调** | `#9333EA` | `purple-600` | 优雅、创意的紫色 |
| **次要色** | `#A855F7` | `purple-500` | 亮紫色，用于高亮 |
| **强调色** | `#C084FC` | `purple-400` | 行动号召按钮 |
| **背景渐变** | - | `from-purple-900/40 via-zinc-900 to-black` | 径向渐变背景 |
| **卡片背景** | `#18181B/40` | `bg-zinc-900/40` | 半透明玻璃态 |
| **边框** | `#9333EA/10` | `border-purple-500/10` | 紫色半透明边框 |
| **主要文本** | `#C4B5FD` | `text-purple-300` | 紫色调文本 |
| **次要文本** | `#D8B4FE` | `text-purple-200` | 浅紫色文本 |
| **弱化文本** | `#A1A1AA` | `text-zinc-400` | 灰色文本 |

### 状态配色

| 状态 | 颜色 | 类名 | 说明 |
|------|------|------|------|
| **草稿** | 灰色 | `bg-zinc-800 text-zinc-400` | 未开始创作 |
| **创作中** | 紫色 | `bg-purple-500/10 text-purple-400` | 正在创作 |
| **已完成** | 绿色 | `bg-green-500/10 text-green-400` | 创作完成 |
| **关键章节** | 紫色 | `border-purple-500/50` | 重要章节标识 |

### 交互状态

```css
/* Hover 状态 */
hover:border-purple-500/30
hover:shadow-2xl hover:shadow-purple-500/20
hover:text-purple-400

/* Focus 状态 */
focus-visible:ring-purple-500/50

/* 装饰性光晕 */
bg-purple-500/30 blur-[100px]  /* 主光晕 */
bg-fuchsia-500/20 blur-[100px] /* 次光晕 */
```

---

## 🚀 核心功能

### 1. 项目列表页 (`/novel`)

**功能特性：**
- ✅ 项目卡片展示（封面、标题、状态、统计）
- ✅ 新建项目（标准模式）
- ✅ 灵感模式（AI 引导式创作）
- ✅ 封面生成（AI 自动生成封面图）
- ✅ 项目删除（带确认对话框）
- ✅ 无限画布入口（小说转漫画）
- ✅ 聚光灯效果（鼠标跟随光晕）
- ✅ 骨架屏加载状态
- ✅ 空状态引导

**主要组件：**
- `page.tsx` - 主页面组件
- `CreateProjectDialog.tsx` - 新建项目对话框
- `InspirationModeDialog.tsx` - 灵感模式对话框

**数据统计：**
- 章节数量
- 总字数
- 最后更新时间

---

### 2. 项目详情页 (`/novel/[id]`)

**功能特性：**
- ✅ 多标签页管理（章节、大纲、角色、世界观、进度、设置、版本、关系图）
- ✅ 章节编辑器（富文本编辑）
- ✅ 大纲管理（章节大纲生成与编辑）
- ✅ 角色管理（角色卡片、关系图、图片生成）
- ✅ 世界观设定（地点、势力、时间线、规则）
- ✅ 进度仪表盘（字数统计、章节进度、质量分析）
- ✅ 版本管理（章节版本对比、回滚）
- ✅ 导出功能（TXT、DOCX、PDF）
- ✅ 转换为漫画（跳转到无限画布）

**标签页说明：**

| 标签 | 图标 | 功能 | 说明 |
|------|------|------|------|
| **章节** | `BookOpen` | 章节列表与编辑 | 主要创作区域 |
| **大纲** | `FileText` | 大纲管理 | AI 生成章节大纲 |
| **角色** | `Users` | 角色管理 | 角色卡片、图片生成 |
| **世界观** | `Globe` | 世界观设定 | 地点、势力、时间线 |
| **进度** | `TrendingUp` | 进度仪表盘 | 字数统计、质量分析 |
| **设置** | `Settings` | 项目设置 | 基本信息、风格设定 |
| **版本** | `GitBranch` | 版本管理 | 章节版本对比 |
| **关系图** | `Network` | 角色关系图 | 可视化角色关系 |

---

### 3. 灵感模式 (Inspiration Mode)

**工作流程：**

```
欢迎界面 → 问题引导 → AI 生成 → 结果展示 → 创建项目
```

**引导问题：**
1. 故事类型（奇幻、科幻、现实、悬疑等）
2. 主角设定（性格、背景、目标）
3. 核心冲突（主要矛盾）
4. 故事基调（轻松、严肃、黑暗等）

**AI 生成内容：**
- 项目标题
- 故事简介
- 章节大纲（5-10 章）
- 主要角色（2-5 个）
- 世界观设定

---

### 4. 章节编辑器

**功能特性：**
- ✅ 富文本编辑（Markdown 支持）
- ✅ 实时字数统计
- ✅ 自动保存（防止数据丢失）
- ✅ 版本历史（支持回滚）
- ✅ AI 续写（基于上下文）
- ✅ AI 润色（优化描述）
- ✅ 快捷键支持（Ctrl+S 保存）

**编辑器工具栏：**
- 保存按钮
- 字数统计
- AI 续写
- AI 润色
- 版本历史
- 导出选项

---

### 5. 角色管理系统

**功能特性：**
- ✅ 角色卡片（头像、姓名、描述、性格）
- ✅ AI 生成角色图片（基于描述）
- ✅ 批量生成角色
- ✅ 角色关系图（可视化）
- ✅ 角色编辑（修改信息）
- ✅ 角色删除

**角色卡片信息：**
- 头像（AI 生成或上传）
- 姓名
- 年龄
- 性格特征
- 背景故事
- 角色关系

**角色关系图：**
- 节点：角色卡片
- 边：关系类型（朋友、敌人、家人、恋人等）
- 交互：拖拽、缩放、编辑关系

---

### 6. 世界观设定编辑器

**四大模块：**

#### 6.1 地点 (Locations)
- 地点名称
- 地点描述
- 地理位置
- 重要性标记

#### 6.2 势力 (Factions)
- 势力名称
- 势力描述
- 领导者
- 势力关系

#### 6.3 时间线 (Timeline)
- 事件名称
- 事件时间
- 事件描述
- 影响范围

#### 6.4 规则 (Rules)
- 规则名称
- 规则描述
- 适用范围
- 限制条件

---

### 7. 进度仪表盘

**统计指标：**
- 总字数
- 章节数量
- 完成进度（百分比）
- 平均章节字数
- 创作天数
- 日均字数

**质量分析：**
- 爽点密度（网文特色）
- 节奏分析
- 开篇吸引力
- 主角吸引力
- 冲突强度

**可视化图表：**
- 字数增长曲线
- 章节进度条
- 质量雷达图

---

### 8. 版本管理系统

**功能特性：**
- ✅ 自动版本保存（每次编辑）
- ✅ 版本列表（时间线展示）
- ✅ 版本对比（Diff 视图）
- ✅ 版本回滚（恢复到历史版本）
- ✅ 版本筛选（按时间、作者）

**版本信息：**
- 版本号
- 创建时间
- 修改内容摘要
- 字数变化
- 作者（用户/AI）

---

### 9. 导出功能

**支持格式：**
- ✅ TXT（纯文本）
- ✅ DOCX（Word 文档）
- ✅ PDF（排版文档）

**导出选项：**
- 选择章节范围
- 包含封面
- 包含目录
- 包含角色表
- 包含世界观设定

---

### 10. 无限画布 (`/novel/canvas/[id]`)

**功能说明：**
- 小说转漫画的可视化工作台
- 基于时间线的场景管理
- 支持章节分析、镜头生成、场景图片生成
- 详见 `/novel/canvas/[id]/README.md`（如有）

---

## 🛠️ 技术栈

### 前端框架
- **Next.js 14** (App Router)
- **React 18** (Server Components + Client Components)
- **TypeScript** (严格类型检查)

### UI 组件库
- **shadcn/ui** (基于 Radix UI)
- **Tailwind CSS** (原子化 CSS)
- **lucide-react** (SVG 图标库)

### 状态管理
- **React Hooks** (useState, useEffect, useCallback)
- **Custom Hooks** (useNovelProject, useCurrentUser)

### 数据获取
- **Fetch API** (RESTful API 调用)
- **Server-Sent Events (SSE)** (流式生成)

### 性能优化
- **Dynamic Import** (代码分割)
- **Lazy Loading** (按需加载组件)
- **Suspense** (加载状态管理)
- **Skeleton Screens** (骨架屏)

---

## 📡 API 端点

### 项目管理
- `GET /api/novel/projects` - 获取项目列表
- `POST /api/novel/projects` - 创建项目
- `GET /api/novel/projects/:id` - 获取项目详情
- `PUT /api/novel/projects/:id` - 更新项目
- `DELETE /api/novel/projects/:id` - 删除项目
- `POST /api/novel/projects/:id/generate-cover` - 生成封面

### 章节管理
- `GET /api/novel/projects/:id/chapters` - 获取章节列表
- `POST /api/novel/chapters` - 创建章节
- `PUT /api/novel/chapters/:id` - 更新章节
- `DELETE /api/novel/chapters/:id` - 删除章节
- `POST /api/novel/chapters/generate/stream` - 流式生成章节（SSE）

### 大纲管理
- `POST /api/novel/progressive/concept` - 生成概念
- `POST /api/novel/progressive/structure` - 生成结构
- `POST /api/novel/progressive/detailed-outline` - 生成详细大纲
- `POST /api/novel/progressive/analyze` - 质量分析

### 角色管理
- `GET /api/novel/projects/:id/characters` - 获取角色列表
- `POST /api/novel/characters` - 创建角色
- `PUT /api/novel/characters/:id` - 更新角色
- `DELETE /api/novel/characters/:id` - 删除角色
- `POST /api/novel/characters/:id/generate-image` - 生成角色图片

### 世界观设定
- `GET /api/novel/projects/:id/world-setting` - 获取世界观设定
- `PUT /api/novel/projects/:id/world-setting` - 更新世界观设定

### 导出功能
- `POST /api/novel/projects/:id/export` - 导出项目

### 无限画布
- `POST /api/canvas/timeline` - 创建时间线
- `GET /api/canvas/timeline/:id` - 获取时间线
- `POST /api/canvas/analyze-script` - 分析章节脚本
- `POST /api/canvas/generate-shots` - 生成镜头
- `POST /api/canvas/generate-scenes` - 生成场景图片

---

## 🎯 设计原则

### 1. 用户体验优先
- **即时反馈**：所有操作都有加载状态和成功/失败提示
- **防止数据丢失**：自动保存、版本管理、离开页面提醒
- **渐进式引导**：灵感模式引导新用户快速上手

### 2. 性能优化
- **代码分割**：使用 Dynamic Import 减少初始包大小
- **懒加载**：非首屏组件按需加载
- **骨架屏**：提供即时视觉反馈

### 3. 类型安全
- **严格类型检查**：所有组件和函数都有完整类型定义
- **类型推导**：利用 TypeScript 的类型推导能力
- **避免 any**：禁止使用 `any` 类型

### 4. 可维护性
- **组件化**：功能拆分为独立组件
- **主题统一**：使用 `theme.ts` 统一管理样式
- **文档完善**：代码注释和 README 文档

### 5. 无障碍性
- **WCAG AA 标准**：对比度符合无障碍标准
- **键盘导航**：支持键盘快捷键
- **语义化 HTML**：使用正确的 HTML 标签

---

## 🔧 开发指南

### 添加新功能

1. **创建组件**
   ```tsx
   // src/app/(novel)/novel/[id]/components/NewFeature.tsx
   import { novelTheme } from "../../theme";

   export function NewFeature() {
     return (
       <div className={novelTheme.card.base}>
         {/* 组件内容 */}
       </div>
     );
   }
   ```

2. **使用主题样式**
   ```tsx
   import { novelTheme } from "../theme";

   <Button className={novelTheme.button.primary}>保存</Button>
   <Card className={novelTheme.card.highlight}>...</Card>
   ```

3. **添加 API 调用**
   ```tsx
   async function fetchData() {
     const response = await fetch("/api/novel/...");
     if (!response.ok) throw new Error("请求失败");
     return response.json();
   }
   ```

### 修改主题色

1. 打开 `theme.ts`
2. 修改对应的 Tailwind 类名
3. 确保对比度符合 WCAG AA 标准
4. 测试所有交互状态（hover、focus、active）

### 性能优化建议

1. **使用动态导入**
   ```tsx
   const HeavyComponent = lazy(() => import("./HeavyComponent"));

   <Suspense fallback={<Skeleton />}>
     <HeavyComponent />
   </Suspense>
   ```

2. **避免不必要的重渲染**
   ```tsx
   const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
   const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
   ```

3. **使用骨架屏**
   ```tsx
   {loading ? <Skeleton className="h-20 w-full" /> : <Content />}
   ```

---

## 📝 常见问题

### Q: 如何修改主题色？
A: 编辑 `theme.ts` 文件，修改对应的 Tailwind 类名。确保新颜色符合 WCAG AA 对比度标准。

### Q: 如何添加新的标签页？
A: 在 `page.tsx` 中添加新的 `TabsTrigger` 和 `TabsContent`，并创建对应的组件。

### Q: 如何实现自动保存？
A: 使用 `useEffect` 监听数据变化，配合 `debounce` 函数延迟保存请求。

### Q: 如何处理大文件导出？
A: 使用流式下载，后端返回 `Content-Disposition: attachment` 头，前端创建 Blob 下载。

### Q: 如何优化首屏加载速度？
A: 使用 Dynamic Import 和 Suspense，将非首屏组件延迟加载。

---

## 🔗 相关文档

- [DESIGN.md](./DESIGN.md) - 详细设计文档（UI/UX 规范）
- [theme.ts](./theme.ts) - 主题样式常量
- [项目主 README](../../../README.md) - 整体项目文档
- [API 文档](../../../docs/API.md) - API 接口文档（如有）

---

## 📄 许可证

本项目遵循项目根目录的许可证。

---

**最后更新：** 2026-01-18
**维护者：** ComicAI Team
**版本：** 2.0.0
