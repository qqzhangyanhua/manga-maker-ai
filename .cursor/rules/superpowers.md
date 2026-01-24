# Superpowers Skills - Cursor 集成

本项目已集成 Superpowers 开发工作流 skills。这些 skills 会在相关场景下自动触发。

## 🎯 核心工作流

### 1. 开发前 - 设计与规划

**brainstorming** (`.cursor/skills/brainstorming/SKILL.md`)
- **触发时机**: 用户要求构建功能、创建组件、添加特性前
- **作用**: 通过苏格拉底式提问探索需求,细化设计
- **必须**: 在编写任何代码前使用

**writing-plans** (`.cursor/skills/writing-plans/SKILL.md`)
- **触发时机**: 有了批准的设计文档后
- **作用**: 将工作分解为 2-5 分钟的小任务,每个任务包含:
  - 确切的文件路径
  - 完整的代码
  - 验证步骤
- **输出**: 可执行的实现计划

### 2. 开发中 - 实现与测试

**test-driven-development** (`.cursor/skills/test-driven-development/SKILL.md`)
- **触发时机**: 实现任何功能或 bugfix 前
- **强制流程**: RED-GREEN-REFACTOR
  1. 编写失败的测试
  2. 观察测试失败
  3. 编写最小代码使其通过
  4. 观察测试通过
  5. 提交
- **违规处理**: 删除在测试前编写的代码

**subagent-driven-development** (`.cursor/skills/subagent-driven-development/SKILL.md`)
- **触发时机**: 执行实现计划时(当前会话)
- **作用**: 为每个任务启动子代理,进行双阶段审查:
  1. 规格合规性审查
  2. 代码质量审查
- **优势**: 快速迭代,自主工作数小时

**executing-plans** (`.cursor/skills/executing-plans/SKILL.md`)
- **触发时机**: 有书面实现计划需要执行时(独立会话)
- **作用**: 批量执行计划,设置审查检查点

### 3. 调试与修复

**systematic-debugging** (`.cursor/skills/systematic-debugging/SKILL.md`)
- **触发时机**: 遇到任何 bug、测试失败、意外行为时
- **必须**: 在提出修复方案前使用
- **流程**: 4 阶段根因分析
  1. 现象观察
  2. 假设形成
  3. 验证测试
  4. 根因确认

**verification-before-completion** (`.cursor/skills/verification-before-completion/SKILL.md`)
- **触发时机**: 声称工作完成、修复、测试通过前
- **必须**: 运行验证命令并确认输出
- **原则**: 证据先于断言

### 4. 协作与审查

**requesting-code-review** (`.cursor/skills/requesting-code-review/SKILL.md`)
- **触发时机**: 完成任务、实现主要功能、合并前
- **作用**: 验证工作是否满足需求

**receiving-code-review** (`.cursor/skills/receiving-code-review/SKILL.md`)
- **触发时机**: 收到代码审查反馈时
- **必须**: 实施建议前使用,特别是反馈不清晰或技术上有疑问时
- **要求**: 技术严谨性和验证,而非盲目实施

### 5. Git 工作流

**using-git-worktrees** (`.cursor/skills/using-git-worktrees/SKILL.md`)
- **触发时机**: 开始需要隔离的功能工作前
- **作用**: 创建隔离的 git worktree,智能目录选择和安全验证

**finishing-a-development-branch** (`.cursor/skills/finishing-a-development-branch/SKILL.md`)
- **触发时机**: 实现完成,所有测试通过时
- **作用**: 引导完成开发工作,呈现结构化选项(merge/PR/cleanup)

### 6. 并行开发

**dispatching-parallel-agents** (`.cursor/skills/dispatching-parallel-agents/SKILL.md`)
- **触发时机**: 面对 2+ 个独立任务,无共享状态或顺序依赖时
- **作用**: 并发子代理工作流

## 🔧 元技能

**using-superpowers** (`.cursor/skills/using-superpowers/SKILL.md`)
- **触发时机**: 开始任何对话时
- **作用**: 建立如何查找和使用 skills
- **要求**: 在任何响应(包括澄清问题)前必须调用 Skill 工具

**writing-skills** (`.cursor/skills/writing-skills/SKILL.md`)
- **触发时机**: 创建新 skills、编辑现有 skills、部署前验证时
- **作用**: 遵循最佳实践创建 skills

## 📋 使用方式

### 自动触发
这些 skills 会在相关场景下**自动触发**,无需手动调用命令。

### 手动引用(如需要)
如果需要明确使用某个 skill,可以说:
- "请使用 brainstorming skill 帮我设计这个功能"
- "按照 test-driven-development skill 的流程实现"
- "用 systematic-debugging skill 分析这个问题"

## ⚠️ 重要原则

1. **测试驱动**: 先写测试,后写代码
2. **系统化而非临时**: 流程优于猜测
3. **降低复杂性**: 简单性是首要目标
4. **证据优于声明**: 验证后再宣布成功
5. **YAGNI**: You Aren't Gonna Need It - 不要过度设计
6. **DRY**: Don't Repeat Yourself - 避免重复

## 🚀 典型工作流示例

```
用户: "我想添加一个用户认证功能"
  ↓
AI 自动触发 brainstorming
  ↓ (探索需求,呈现设计)
用户批准设计
  ↓
AI 自动触发 writing-plans
  ↓ (创建详细实现计划)
用户: "开始实施"
  ↓
AI 自动触发 subagent-driven-development
  ↓ (为每个任务启动子代理)
每个子任务自动触发 test-driven-development
  ↓ (RED-GREEN-REFACTOR 循环)
任务间自动触发 requesting-code-review
  ↓ (验证规格合规性和代码质量)
所有任务完成
  ↓
AI 自动触发 finishing-a-development-branch
  ↓ (呈现 merge/PR 选项)
```

---

**注意**: 这些 skills 是强制性工作流,而非建议。AI 会在任何任务前检查相关 skills。
