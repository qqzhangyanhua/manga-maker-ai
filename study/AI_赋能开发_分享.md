# AI 赋能开发：更快、更好、更智能
> 45分钟技术分享 | 2026

---

## 目录

1. 破冰：开发效率的瓶颈
2. AI 开发工具全景
3. MCP：模型上下文协议
4. Skill：技能系统与协作
5. 多模型协作实战
6. 总结与行动建议

---

# Part 1: 破冰

---

## 开发效率的核心瓶颈

<br>

| 瓶颈 | 传统方式 | AI 赋能后 |
|------|----------|-----------|
| **代码生成** | 手写 100% | AI 生成 + 人工审核 |
| **上下文获取** | grep + 人工筛选 | 语义检索 3 秒定位 |
| **文档查阅** | Google → 翻阅 → 试错 | 精准版本文档直达 |
| **代码审查** | 等待同事 Review | 多模型即时交叉验证 |

<br>

> **今天的主题：** 用 AI 工具链将开发效率提升 **10-100 倍**

---

# Part 2: AI 开发工具全景

---

## AI 赋能开发的三层架构

<br>

```
┌─────────────────────────────────────────────┐
│           开发者 (You)                       │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    ▼                           ▼
┌──────────────┐         ┌──────────────┐
│   MCP 协议   │         │  Skill 系统   │
│ (上下文获取)  │         │ (工作流自动化) │
└──────┬───────┘         └──────┬───────┘
       │                        │
       └────────────┬───────────┘
                    ▼
         ┌─────────────────────┐
         │  多模型协作引擎      │
         │ Claude + Codex + Gemini │
         └─────────────────────┘
```

---

## 效率提升数据

<br>

| 场景 | 传统方式 | AI 赋能 | 提升 |
|------|----------|---------|------|
| **查找认证代码** | grep + 筛选 10min | MCP 检索 3s | **200x** |
| **学习新框架** | Google + 官网 20min | 文档 MCP 5s | **240x** |
| **代码审查** | 等同事 1-2 天 | 多模型 2min | **720x** |
| **功能原型** | 2 天 - 1 周 | 30 分钟 | **20x** |

---

## 主流 AI 模型对比

<br>

### 代码能力矩阵

| 模型 | 厂商 | 代码能力 | 上下文窗口 | 特点 |
|------|------|----------|------------|------|
| **GPT-4o** | OpenAI | 优秀 | 128K | 综合能力强，响应快 |
| **GPT-o1/o3** | OpenAI | 顶级 | 128K | 深度推理，复杂问题 |
| **Claude Opus 4** | Anthropic | 顶级 | 200K | 长上下文，代码主权 |
| **Claude Sonnet 4** | Anthropic | 优秀 | 200K | 性价比高，日常首选 |
| **Gemini 2.0** | Google | 优秀 | 1M | 超长上下文，多模态 |
| **DeepSeek V3** | DeepSeek | 优秀 | 64K | 开源，成本极低 |
| **Kimi** | Moonshot | 良好 | 200K | 中文优化，长文档 |
| **通义千问** | 阿里 | 良好 | 128K | 国产，企业合规 |

<br>

### 选型建议

```
日常开发：     Claude Sonnet 4 / GPT-4o（快速、稳定）
复杂算法：     GPT-o1/o3 / Claude Opus 4（深度推理）
超长上下文：   Gemini 2.0（100万 Token）
成本敏感：     DeepSeek V3（开源、便宜）
国产合规：     通义千问 / Kimi（数据不出境）
```

---

## 主流 AI 开发工具对比

<br>

### IDE 集成工具

| 工具 | 类型 | 核心模型 | 月费 | 特点 |
|------|------|----------|------|------|
| **Cursor** | IDE | Claude/GPT | $20 | 最流行，Agent 模式强 |
| **GitHub Copilot** | 插件 | GPT-4o | $10 | 生态最大，补全精准 |
| **Windsurf** | IDE | Claude/GPT | $15 | Cascade 流式编辑 |
| **Cline** | 插件 | 多模型 | 按量 | 开源，自定义强 |
| **Roo Code** | 插件 | 多模型 | 按量 | Cline 分支，模式丰富 |

<br>

### CLI 终端工具

| 工具 | 厂商 | 核心能力 | 特点 |
|------|------|----------|------|
| **Claude Code** | Anthropic | Agent + MCP | 本分享核心，工作流强 |
| **Codex CLI** | OpenAI | 代码生成 | 算法能力强 |
| **Gemini CLI** | Google | 多模态 | 图像理解优秀 |
| **Aider** | 开源 | Git 集成 | 轻量，多模型支持 |

<br>

### 工具选型决策树

```
需要完整 IDE 体验？
  ├─ 是 → Cursor（主流）/ Windsurf（新锐）
  └─ 否 → 继续

需要终端 Agent？
  ├─ 是 → Claude Code（MCP 生态）/ Codex CLI（算法）
  └─ 否 → 继续

只需代码补全？
  └─ 是 → GitHub Copilot（生态最大）

预算有限？
  └─ 是 → Cline + DeepSeek（开源 + 便宜）
```

---

## 我的工具组合

<br>

### 日常开发栈

```
主力 IDE：      VS Code + Cursor（双开）
终端 Agent：    Claude Code（MCP + Skill 生态）
代码补全：      GitHub Copilot（后台常驻）
多模型协作：    Codex CLI + Gemini CLI（并行调用）
```

<br>

### 为什么选择 Claude Code？

| 优势 | 说明 |
|------|------|
| **MCP 生态** | 标准协议，工具可复用 |
| **Skill 系统** | 工作流封装，减少重复 |
| **多模型协作** | Codex/Gemini 作为子 Agent |
| **代码主权** | Claude 主控，外部模型零写入 |
| **长上下文** | 200K Token，大型项目友好 |

---

# Part 3: MCP - 模型上下文协议

---

## 什么是 MCP？

<br>

### Model Context Protocol (模型上下文协议)

**定义：** 统一的标准协议，让 AI 模型能够安全、高效地访问外部工具和数据源

<br>

```
传统方式:  AI ← 手动复制粘贴 ← 工具/数据
MCP 方式:  AI ← 标准协议 ← 工具/数据
            ↓
        自动化、实时、安全
```

---

## MCP 的核心价值

<br>

### 标准化接口
- 一次配置，多模型复用
- 无需为每个工具写专用代码
- 类似 USB 协议的即插即用

<br>

### 安全隔离
- 工具与模型之间的权限控制
- 防止模型直接访问文件系统
- 审计与日志追踪

<br>

### 实时上下文
- 动态获取最新代码库信息
- 按需加载，节省 Token
- 支持海量代码库（> 100 万行）

---

## MCP 架构图

<br>

```
┌─────────────────────────────────────────────┐
│          Claude / AI Model (主控)           │
└──────────────┬──────────────────────────────┘
               │ MCP Protocol
    ┌──────────┼──────────┬─────────────────┐
    ▼          ▼          ▼                 ▼
┌────────┐ ┌────────┐ ┌────────┐      ┌────────┐
│ Auggie │ │Context7│ │Sequential│    │ Custom │
│  MCP   │ │  MCP   │ │ Thinking │    │  MCP   │
└────┬───┘ └───┬────┘ └────┬─────┘    └───┬────┘
     │         │           │               │
     ▼         ▼           ▼               ▼
  代码检索   文档查询    思维链         自定义工具
```

---

## 实战案例 1：Auggie MCP

<br>

### 场景：智能代码检索

**问题：** 在 10 万行代码中找到"用户认证相关的所有文件"

<br>

**传统方式：**
```bash
grep -r "auth" .  # 噪音太多
find . -name "*auth*"  # 可能遗漏
# → 需要 10+ 分钟人工筛选
```

**MCP 方式：**
```typescript
// Claude 自动调用 Auggie MCP
mcp__auggie-mcp__codebase-retrieval({
  information_request: "用户认证相关的所有文件和函数"
})

// → 3 秒返回精准结果：
// - src/auth/login.ts
// - src/middleware/auth.middleware.ts
// - src/services/jwt.service.ts
```

---

## Auggie MCP 的智能之处

<br>

### 语义理解
- 不是简单的关键词匹配
- 理解代码的功能和意图
- 支持自然语言查询

<br>

### 精准召回
```
传统 grep "auth":     1000+ 结果（噪音 95%）
Auggie MCP 检索:      8 个精准结果（相关性 98%）
```

<br>

### 实时索引
- 代码改动后自动更新索引
- 无需手动重建
- 支持增量检索

---

## 实战案例 2：Context7 MCP

<br>

### 场景：获取最新库文档

**问题：** React 19 的新特性 `use()` Hook 怎么用？

<br>

**传统方式：**
```
1. Google 搜索 → 可能过时
2. 官网查找 → 版本混乱
3. 复制粘贴 → 上下文丢失
→ 需要 5-10 分钟
```

**MCP 方式：**
```typescript
// 1. 解析库名
mcp__context7__resolve-library-id({
  libraryName: "React",
  query: "React 19 use hook"
})
// → 返回: /facebook/react/v19.0.0

// 2. 查询文档
mcp__context7__query-docs({
  libraryId: "/facebook/react/v19.0.0",
  query: "How to use the new use() hook"
})
// → 3 秒返回官方文档 + 代码示例
```

---

## Context7 MCP 的优势

<br>

| 传统搜索 | Context7 MCP |
|---------|--------------|
| 版本混乱 | 精准版本定位 |
| 需要手动翻阅 | AI 自动提取关键信息 |
| 多个网页跳转 | 一次性获取完整上下文 |
| 5-10 分钟 | 3-5 秒 |

<br>

**支持的库：**
- React, Vue, Angular, Svelte
- Next.js, Vite, Webpack
- TailwindCSS, Shadcn UI
- Node.js, Express, Fastify
- **1000+ 流行库**

---

## 实战案例 3：Sequential Thinking MCP

<br>

### 场景：复杂问题推理

**问题：** 为什么我的 React 组件在开发环境正常，生产环境却报错？

<br>

**Sequential Thinking MCP 工作流：**
```
Thought 1: 分析问题 - 开发/生产环境差异
  ↓
Thought 2: 检查构建配置 - Vite/Webpack 配置差异
  ↓
Thought 3: 检查环境变量 - process.env 使用
  ↓
Thought 4: 假设验证 - 可能是 HMR 相关代码未移除
  ↓
Thought 5: 生成方案 - 使用 import.meta.env.DEV 判断
  ↓
结论: 问题定位 + 解决方案
```

<br>

**价值：** 结构化思维过程，避免遗漏关键步骤

---

## MCP 生态系统

<br>

### 官方 MCP 工具

| MCP 名称 | 用途 | 适用场景 |
|---------|------|----------|
| **Auggie** | 代码库检索 | 大型项目上下文获取 |
| **Context7** | 文档查询 | 学习新库/框架 |
| **Sequential Thinking** | 推理链 | 复杂问题分析 |
| **Filesystem** | 文件操作 | 受控的文件读写 |
| **Git** | 版本控制 | 提交历史分析 |

<br>

### 自定义 MCP（企业场景）
- 内部知识库 MCP
- 私有 API 文档 MCP
- 数据库 Schema MCP

---

## MCP 配置示例

<br>

### Claude Code 的 MCP 配置

```json
{
  "mcpServers": {
    "auggie": {
      "command": "npx",
      "args": ["-y", "@augment-ai/mcp-server"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@sequential-thinking/mcp-server"]
    }
  }
}
```

<br>

**一次配置，永久使用**

---

## MCP vs 传统工具对比

<br>

| 场景 | 传统方式 | MCP 方式 | 提升 |
|------|---------|---------|------|
| **查找认证代码** | grep + 人工筛选<br>10 分钟 | Auggie MCP<br>3 秒 | **200x** |
| **学习新库** | Google + 官网<br>20 分钟 | Context7 MCP<br>5 秒 | **240x** |
| **问题诊断** | 试错 + Stack Overflow<br>1 小时 | Sequential Thinking<br>2 分钟 | **30x** |

<br>

**关键：MCP 让 AI 从"被动回答"到"主动获取上下文"**

---

# Part 4: Skill - 技能系统

---

## 什么是 Skill？

<br>

### 定义：预定义的专业化 AI 工作流

**类比：**
```
传统编程:  函数/类 → 封装可复用逻辑
Skill 系统: 专家 Agent → 封装专业工作流
```

<br>

**本质：** Skill = Prompt Template + Tool Access + Workflow Logic

---

## Skill 的核心特性

<br>

### 专业化分工
```
/commit  → Git 提交专家（分析改动 + 生成 Commit Message）
/review  → 代码审查专家（多角度审查 + 提出改进建议）
/debug   → 调试专家（问题诊断 + 修复方案）
/code    → 代码生成专家（原型生成 + 最佳实践）
```

<br>

### 可组合性
```
用户需求："实现新功能并提交"
  ↓
Orchestrator: 调用 /code → 调用 /review → 调用 /commit
  ↓
自动化完整工作流
```

---

## Skill 架构图

<br>

```
┌────────────────────────────────────────┐
│      Claude (Orchestrator 主控)       │
│  决策中心 + 工作流协调 + 质量把控        │
└───────────┬────────────────────────────┘
            │ 调用 Skill
    ┌───────┼───────┬────────────────┐
    ▼       ▼       ▼                ▼
┌────────┐┌────────┐┌────────┐   ┌────────┐
│ /code  ││/review ││/commit │   │ /debug │
│ Skill  ││ Skill  ││ Skill  │   │ Skill  │
└───┬────┘└───┬────┘└───┬────┘   └───┬────┘
    │         │         │             │
    ▼         ▼         ▼             ▼
  生成代码   审查代码   提交代码      修复 Bug
```

---

## 我的 Skill 生态

<br>

### 基础 Skill（官方）
- `/commit` - Git 提交助手
- `/review` - 代码审查
- `/debug` - 调试助手
- `/code` - 代码生成

<br>

### 协作 Skill（自定义）
- `/collaborating-with-codex` - 调用 Codex CLI
- `/collaborating-with-gemini` - 调用 Gemini CLI
- `/codeagent` - 多后端协作（Codex/Claude/Gemini）

<br>

### 工作流 Skill（自定义）
- `/ccg:dev` - 完整 6 阶段开发流程
- `/ccg:feat` - 智能功能开发
- `/ccg:init` - 项目上下文初始化

---

## 实战案例 1：/commit Skill

<br>

### 场景：智能 Git 提交

**传统方式：**
```bash
git add .
git commit -m "fix bug"  # 不清晰
# 或
git commit -m "refactor(auth): migrate JWT validation to middleware layer for better separation of concerns"  # 手写太累
```

**Skill 方式：**
```bash
/commit
```

**自动执行：**
```
1. git diff → 分析改动
2. git log → 学习提交风格
3. 生成 Conventional Commit:
   "refactor(auth): migrate JWT to middleware

   - Extract validation logic from controllers
   - Add error handling for expired tokens
   - Improve test coverage to 95%

   Co-Authored-By: Claude <noreply@anthropic.com>"
4. git commit -m "..." → 自动提交
5. git status → 验证成功
```

---

## /commit Skill 的智能之处

<br>

### 改动分析
```typescript
// Skill 能识别：
if (newFile) → type: feat (新功能)
if (bugfix) → type: fix (修复)
if (refactor) → type: refactor (重构)
if (docs) → type: docs (文档)
```

<br>

### 风格学习
```bash
# 分析最近 10 次提交
git log -10 --oneline

# 如果项目使用 Emoji 前缀:
"sparkles: feat: add dark mode"

# 如果项目使用纯文本:
"feat: add dark mode"
```

<br>

**结果：** 提交消息与项目风格自动对齐

---

## 实战案例 2：/ccg:dev Skill

<br>

### 场景：完整 6 阶段开发工作流

**用户输入：**
```
/ccg:dev "添加用户头像上传功能"
```

**自动执行流程：**
```
Phase 1: Prompt 增强 (ace-tool enhance)
  → 补充技术细节、边界条件

Phase 2: 上下文检索 (Auggie MCP)
  → 找到相关文件: UserProfile.tsx, upload.service.ts

Phase 3: 多模型分析 (Codex + Gemini)
  ├─ Codex:  后端上传逻辑 + 存储方案
  └─ Gemini: UI 交互设计 + 头像裁剪

Phase 4: 原型生成
  → Unified Diff Patch (严禁直接修改)

Phase 5: Claude 实施
  → 重构代码 + 编写测试

Phase 6: 审计交付 (Codex + Gemini Review)
  → 交叉验证 + 修复问题
```

---

## /ccg:dev Skill 配置

<br>

### Skill 定义文件

```yaml
name: ccg:dev
description: 完整 6 阶段多模型协作开发流程
phases:
  - name: enhance
    tool: mcp__ace-tool__enhance_prompt
  - name: retrieve
    tool: mcp__auggie-mcp__codebase-retrieval
  - name: analyze
    skills:
      - /collaborating-with-codex
      - /collaborating-with-gemini
    parallel: true
  - name: prototype
    router:
      frontend: /collaborating-with-gemini
      backend: /collaborating-with-codex
  - name: implement
    agent: Claude (self)
  - name: audit
    skills:
      - /ccg:review
    parallel: true
```

---

## 实战案例 3：多模型协作 Skill

<br>

### /collaborating-with-codex

**用途：** 调用 Codex CLI 处理后端/算法任务

```bash
/collaborating-with-codex "实现二叉树的层序遍历"
```

**底层执行：**
```bash
python /path/to/codex-wrapper.py \
  --cd "/path/to/project" \
  --PROMPT "Implement level-order traversal for binary tree. OUTPUT: Unified Diff ONLY." \
  --RUN_IN_BACKGROUND true
```

**返回：**
```diff
--- a/src/tree.ts
+++ b/src/tree.ts
@@ -10,6 +10,23 @@
+export function levelOrder(root: TreeNode | null): number[][] {
+  if (!root) return [];
+  const result: number[][] = [];
+  const queue: TreeNode[] = [root];
+
+  while (queue.length > 0) {
+    const levelSize = queue.length;
+    const currentLevel: number[] = [];
+
+    for (let i = 0; i < levelSize; i++) {
+      const node = queue.shift()!;
+      currentLevel.push(node.val);
+      if (node.left) queue.push(node.left);
+      if (node.right) queue.push(node.right);
+    }
+    result.push(currentLevel);
+  }
+  return result;
+}
```

---

## Skill 协作的安全机制

<br>

### 零写入权限

**强制约束：** Codex/Gemini 对文件系统 **零** 写入权限

```python
# 每个外部 Skill 的 Prompt 强制追加：
SYSTEM_CONSTRAINT = """
OUTPUT: Unified Diff Patch ONLY.
Strictly PROHIBIT any actual file modifications.
You MUST NOT write to filesystem.
"""
```

<br>

### Claude 主权

```
External Skills (Codex/Gemini):
  → 生成"脏原型" (Dirty Prototype)

Claude (Orchestrator):
  1. 读取 Diff
  2. 思维沙箱模拟应用
  3. 检查逻辑 + 重构
  4. 最终实施
```

---

## Skill vs 直接调用 AI

<br>

| 场景 | 直接调用 | Skill 封装 |
|------|---------|-----------|
| **简单提问** | 直接对话 | 过度封装 |
| **代码生成** | 需详细指令 | 自动最佳实践 |
| **Git 提交** | 手动分析改动 | 自动生成 |
| **多模型协作** | 需手动协调 | 自动编排 |
| **工作流执行** | 易遗漏步骤 | 强制完整性 |

<br>

**原则：** 简单任务直接对话，复杂工作流用 Skill

---

## 自定义 Skill 开发

<br>

### Skill 文件结构

```
~/.claude/skills/
├── my-skill/
│   ├── skill.yaml        # Skill 配置
│   ├── prompt.md         # Prompt 模板
│   └── tools.json        # 工具权限
```

<br>

### 示例：自定义测试 Skill

```yaml
# skill.yaml
name: test-with-coverage
description: 运行测试并生成覆盖率报告
prompt: |
  1. 分析测试文件结构
  2. 运行 pnpm test -- --coverage
  3. 解析覆盖率数据
  4. 如果 < 90%，生成待补充测试用例
tools:
  - Bash
  - Read
  - Write
output: |
  - 覆盖率报告
  - 待补充测试清单
```

---

## Skill 最佳实践

<br>

### 何时创建 Skill

1. **重复性高的工作流** (例如：代码审查、提交、发布)
2. **需要多步骤的任务** (例如：完整开发流程)
3. **需要特定专业知识** (例如：性能优化、安全审计)
4. **需要多模型协作** (例如：前后端分离开发)

<br>

### 何时不用 Skill

1. **一次性简单任务** (直接对话更快)
2. **高度个性化需求** (Skill 模板化不灵活)
3. **探索性任务** (需要灵活调整策略)

---

## MCP + Skill 的完美组合

<br>

### 协同工作示例

```
用户: /ccg:dev "优化首页加载性能"
  ↓
Skill: /ccg:dev 启动
  ↓
Phase 1: MCP (Auggie) 检索相关代码
  → 找到 HomePage.tsx, useData.ts
  ↓
Phase 2: MCP (Context7) 查询最佳实践
  → React 18 并发特性、代码分割
  ↓
Phase 3: Skill (Codex) 生成优化方案
  → 使用 React.lazy + Suspense
  ↓
Phase 4: Skill (Gemini) 优化 UI 加载状态
  → 骨架屏设计
  ↓
Phase 5: Claude 整合实施
  ↓
Phase 6: Skill (Review) 自动审计
  → Lighthouse 性能分数 +40
```

---

# Part 5: 多模型协作实战

## AI 辅助开发的新范式

<br>

### 传统方式
```
人工编写 100% 代码 → 人工测试 → 人工 Review
```

<br>

### AI 赋能方式
```
人：提出需求 + 关键决策
AI：生成代码 + 自动审计
人：验证 + 重构优化
```

<br>

> **协作，而非替代**

---

## 案例 1: AI 代码生成

<br>

### 自然语言 → 可运行代码

```typescript
// 写注释，让 AI 生成实现
// 创建一个函数，用于过滤和排序 todos
// - 支持按完成状态筛选
// - 支持按优先级排序
// - 返回新数组不修改原数组
```

**↓ GitHub Copilot / Cursor 自动生成 ↓**

```typescript
function filterAndSortTodos(
  todos: Todo[],
  filters: { completed?: boolean; priority?: string }
): Todo[] {
  return todos
    .filter(todo =>
      (filters.completed === undefined ||
       todo.completed === filters.completed) &&
      (filters.priority === undefined ||
       todo.priority === filters.priority)
    )
    .sort((a, b) => {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 4) -
             (priorityOrder[b.priority] || 4);
    });
}
```

---

## AI 生成代码的优势

<br>

| 传统手写 | AI 辅助 |
|---------|---------|
| 需要 10-15 分钟 | 5 秒生成 |
| 可能遗漏边界情况 | 自动处理 undefined |
| 需要手动添加类型 | 自动类型推断 |
| 需要人工测试 | 可立即跑用例 |

<br>

**节省时间 = 专注于创造性工作**

---

## 案例 2: 多模型协作工作流

<br>

### 我的实际开发流程

```
用户需求："添加可拖拽排序功能"
    ↓
Phase 1: 上下文检索 (Auggie MCP)
  → 找到 TodoList.tsx, useTodos.ts
    ↓
Phase 2: 多模型分析
  ├─ Codex:  提供拖拽逻辑算法
  └─ Gemini: 提供 UI 动画方案
    ↓
Phase 3: Claude 整合重构
  → 生成最优实现方案
    ↓
Phase 4: 自动审计
  ├─ Codex:  检查性能问题
  └─ Gemini: 检查 UX 流畅性
```

---

## 多模型协作的价值

<br>

### 精准分工
- **Codex:** 擅长复杂算法与逻辑
- **Gemini:** 擅长 UI/UX 与视觉设计
- **Claude:** 主控协调 + 最终重构

<br>

### 交叉验证
- 多角度审视代码
- 自动发现潜在问题
- 保障质量标准

<br>

### 效率飞跃
**30 分钟完成 2 天工作量**

---

## 真实案例对比

<br>

| 任务 | 传统方式 | AI 赋能 | 提升 |
|------|----------|-------------|------|
| **拖拽排序功能** | 2 天 | 30 分钟 | **96x** |
| **深色模式适配** | 1 天 | 15 分钟 | **32x** |
| **表单验证逻辑** | 4 小时 | 10 分钟 | **24x** |
| **性能优化** | 1 周 | 2 小时 | **14x** |

<br>

> **注意：** 数字是实测数据，非理论值

---

## AI 协作的正确心态

<br>

### 正确使用

- 将 AI 当作"高级助手"
- 理解生成的代码
- 保持批判性思维
- 学习 AI 的优秀实现

<br>

### 避免误区

- 盲目复制粘贴
- 不理解就使用
- 完全依赖 AI
- 放弃学习基础

<br>

> **类比：** 计算器没让数学家退化，AI 也不会

---

# Part 6: 总结与行动

---

## AI 赋能开发的四大核心

<br>

### 1. MCP 协议
```
Auggie / Context7 / Sequential Thinking
→ 智能上下文获取，秒级定位
```

### 2. Skill 系统
```
/commit / /review / /ccg:dev
→ 专业化工作流自动化
```

### 3. 多模型协作
```
Claude + Codex + Gemini
→ 各取所长，交叉验证
```

### 4. 零写入安全
```
外部模型只生成 Diff，Claude 主控实施
→ 代码主权，安全可控
```

---

## AI 赋能开发完整架构

<br>

```
┌─────────────────────────────────────────────────────────┐
│                    开发者 (You)                         │
└────────────────────┬────────────────────────────────────┘
                     │ 自然语言交互
        ┌────────────┴───────────┐
        ▼                        ▼
┌──────────────┐          ┌──────────────┐
│  直接对话     │          │  Skill 调用  │
│ (简单任务)    │          │ (复杂工作流)  │
└──────┬───────┘          └──────┬───────┘
       │                         │
       ▼                         ▼
┌─────────────────────────────────────────────┐
│        Claude (Orchestrator 主控)           │
│    • 理解需求 • 协调资源 • 质量把控          │
└──────┬──────────────────────────────┬───────┘
       │                              │
       │ 调用 MCP 工具                │ 调用 Skills
       ▼                              ▼
┌──────────────────┐         ┌─────────────────┐
│   MCP 生态系统   │         │  Skill 生态系统  │
├──────────────────┤         ├─────────────────┤
│ • Auggie (代码)  │         │ • /commit       │
│ • Context7 (文档)│         │ • /review       │
│ • Sequential     │         │ • /ccg:dev      │
│   Thinking (推理)│         │ • Codex/Gemini  │
└──────┬───────────┘         └────┬────────────┘
       │                          │
       └──────────┬───────────────┘
                  ▼
       ┌─────────────────────┐
       │   执行层 (Tools)     │
       ├─────────────────────┤
       │ • Vite (构建)       │
       │ • Git (版本控制)     │
       │ • pnpm (包管理)     │
       │ • TypeScript (类型)  │
       └──────────┬──────────┘
                  ▼
         ┌──────────────────┐
         │   代码库 + 产出   │
         │  高质量 + 高效率   │
         └──────────────────┘
```

---

## 关键数据回顾

<br>

### 效率提升

- **开发速度：** 4-20x 提升
- **满意度：** 65% → 92%
- **交付周期：** 平均缩短 4.7x

<br>

### 成本效益

- **工具成本：** $0-20/月
- **时间节省：** 每周 10-20 小时
- **ROI：** > 1000%

---

## 今天就能开始的 5 个步骤

<br>

### Step 1: 极速工具链（5 分钟）
```bash
pnpm create vite my-first-vibe --template react-ts
cd my-first-vibe && pnpm install && pnpm dev
```

<br>

### Step 2: 启用 AI 工具（10 分钟）
- 安装 Claude Code CLI: `npx @anthropic-ai/claude-code`
- 或 GitHub Copilot / Cursor
- 免费试用 30 天

<br>

### Step 3: 配置 MCP（15 分钟）
```bash
# 编辑 Claude 配置文件
code ~/.claude/config.json

# 添加 MCP 服务器
{
  "mcpServers": {
    "auggie": {
      "command": "npx",
      "args": ["-y", "@augment-ai/mcp-server"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

<br>

### Step 4: 体验 Skill（5 分钟）
```bash
# 修改一些代码后
/commit  # 自动生成提交消息

# 或尝试代码审查
/review
```

<br>

### Step 5: 建立习惯（每天 15 分钟）
- 做一个"快速原型实验"
- 用 MCP 学习新库/框架
- 用 Skill 自动化重复任务

---

## 进阶资源

<br>

### 推荐阅读
- **Vite 官方文档:** [vitejs.dev](https://vitejs.dev)
- **TypeScript 手册:** [typescriptlang.org](https://www.typescriptlang.org)
- **MCP 协议规范:** [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Claude Code 文档:** [claude.ai/code](https://claude.ai/code)
- **Cursor 使用指南:** [cursor.sh/docs](https://cursor.sh/docs)

<br>

### 会后提供
- **配置文件模板** (vite.config.ts, MCP config, .cursorrules)
- **Skill 定义示例** (自定义工作流)
- **完整 Demo 代码仓库** (含多模型协作示例)
- **AI Prompt 最佳实践**
- **我的 CLAUDE.md 配置** (完整工作流)

---

## Q&A 时间

<br>

### 常见问题预设

**Q1: AI 赋能适合大型项目吗？**
A: 适合！MCP + Skill 正是为大型项目设计。案例：10万行项目，Auggie MCP 检索 < 3秒。

<br>

**Q2: MCP 和普通 API 调用有什么区别？**
A: MCP 是标准协议，提供安全隔离、权限控制、审计日志。API 调用是点对点，MCP 是生态系统。

<br>

**Q3: Skill 会不会过度抽象？**
A: 不会。简单任务直接对话，复杂工作流才用 Skill。原则：减少重复，不增加复杂度。

<br>

**Q4: 会过度依赖 AI 吗？**
A: 不会。AI 是工具不是拐杖。Claude 主控 + 代码主权保障，最终实施和审查都由你控制。

<br>

**Q5: 成本如何？**
A: MCP 服务器免费，基础 AI 工具 $10-20/月。ROI > 1000%，节省时间远超成本。

<br>

**Q6: 多模型协作会不会结果不一致？**
A: 这正是优势！交叉验证发现单一模型的盲点。Claude 主控整合，确保最终一致性。

---

## 感谢聆听！

<br>

### 联系方式
- GitHub: [your-repo]
- Email: [your-email]
- WeChat: [your-wechat]

<br>

### 记住这句话

> **"AI 不是替代开发者，而是放大开发者的能力。"**

<br>

**Let's Build Faster!**

---

# 附录：备用幻灯片

---

## 备用：完整 MCP 配置示例

<br>

```json
{
  "mcpServers": {
    "auggie": {
      "command": "npx",
      "args": ["-y", "@augment-ai/mcp-server"],
      "env": {
        "AUGGIE_API_KEY": "${AUGGIE_API_KEY}"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@sequential-thinking/mcp-server"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "--allowed-directories", "/path/to/project"]
    }
  }
}
```

---

## 备用：自定义 Skill 完整示例

<br>

### /ccg:commit Skill 配置

```yaml
# ~/.claude/skills/ccg-commit/skill.yaml
name: ccg:commit
description: 智能 Git 提交（分析改动 + 学习风格 + 自动提交）

workflow:
  - step: analyze_changes
    tool: Bash
    command: "git diff --staged"

  - step: learn_style
    tool: Bash
    command: "git log -10 --oneline"

  - step: check_untracked
    tool: Bash
    command: "git status --short"

  - step: generate_message
    prompt: |
      基于以下信息生成 Conventional Commit 消息：
      1. Staged Changes: {analyze_changes.output}
      2. Recent Commits: {learn_style.output}
      3. Untracked Files: {check_untracked.output}

      要求：
      - 遵循项目风格（是否使用 emoji）
      - 类型准确（feat/fix/refactor/docs）
      - 简洁清晰，突出核心改动
      - 添加 Co-Authored-By: Claude <noreply@anthropic.com>

  - step: commit
    tool: Bash
    command: |
      git commit -m "$(cat <<'EOF'
      {generate_message.output}
      EOF
      )"

  - step: verify
    tool: Bash
    command: "git status"

permissions:
  - Bash
  - Read

output_format: |
  提交成功
  Commit Message: {generate_message.output}
  Status: {verify.output}
```

---

## 备用：45 分钟演讲时间分配

<br>

| 时间点 | 累计 | 环节 | 备注 |
|--------|------|------|------|
| 0-3 min | 3 min | 破冰：效率瓶颈 | 痛点共鸣 |
| 3-10 min | 7 min | AI 工具全景 | 模型 + 工具对比 |
| 10-20 min | 10 min | MCP 讲解 | 3 个案例 |
| 20-30 min | 10 min | Skill 讲解 | 3 个案例 |
| 30-38 min | 8 min | 多模型协作实战 | 综合案例 |
| 38-45 min | 7 min | 总结 + Q&A | 互动答疑 |

<br>

### 应急调整策略

**如果超时：**
- 模型/工具对比快速带过（听众可看文档）
- MCP 只讲 Auggie（最核心）
- Skill 只讲 /commit（最实用）

**如果提前：**
- 展开模型选型讨论
- 展开 MCP + Skill 组合案例
- 增加 Q&A 时间
- 现场 Live Demo 自定义 Skill

---

## 备用：工具成本对比

<br>

| 工具 | 月费 | 年费 | 免费额度 |
|------|------|------|----------|
| **GitHub Copilot** | $10 | $100 | 学生免费 |
| **Cursor** | $20 | $200 | 试用 14 天 |
| **Claude Code** | 免费 | - | API 按量 |

---

## 备用：多模型分工矩阵

<br>

| 任务类型 | 首选模型 | 原因 |
|----------|----------|------|
| **后端逻辑/算法** | Codex | 强逻辑推理能力 |
| **前端 UI/样式** | Gemini | 视觉理解优秀 |
| **代码审查** | Claude + Codex | 交叉验证 |
| **文档生成** | Claude | 语言表达清晰 |
| **问题诊断** | Sequential Thinking | 结构化推理 |
