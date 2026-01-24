# 🚀 Superpowers Skills 快速指南

## ✅ 安装状态

Superpowers skills 已成功集成到本项目!

- **Skills 位置**: `.cursor/skills/`
- **规则文件**: `.cursor/rules/superpowers.md`
- **版本**: 4.1.1 (来自 Claude Code)

## 🎯 如何使用

### 在 Cursor 中使用 Superpowers

**重要**: Cursor 不支持 `/superpowers:*` 命令格式。但 skills 会**自动触发**!

#### 自动触发示例

```
你说: "我想添加用户登录功能"
  ↓
AI 会自动读取 brainstorming skill 并引导你完成设计

你说: "帮我实现这个计划"
  ↓
AI 会自动使用 test-driven-development 和 subagent-driven-development

你说: "这个 bug 怎么修?"
  ↓
AI 会自动使用 systematic-debugging 进行根因分析
```

#### 手动引用(可选)

如果需要明确使用某个 skill:

```
"请使用 brainstorming skill 帮我设计数据库架构"
"按照 test-driven-development 的流程实现这个功能"
"用 systematic-debugging 分析这个性能问题"
```

## 📚 已安装的 Skills

### 🎨 设计与规划
- **brainstorming** - 交互式需求探索和设计细化
- **writing-plans** - 创建可执行的实现计划

### 💻 开发与实现
- **test-driven-development** - TDD 红绿重构循环
- **subagent-driven-development** - 子代理驱动的快速迭代
- **executing-plans** - 批量执行计划

### 🐛 调试与修复
- **systematic-debugging** - 4 阶段系统化调试
- **verification-before-completion** - 完成前验证

### 🤝 协作与审查
- **requesting-code-review** - 请求代码审查
- **receiving-code-review** - 响应审查反馈

### 🌳 Git 工作流
- **using-git-worktrees** - 并行开发分支
- **finishing-a-development-branch** - 完成开发分支

### ⚡ 高级功能
- **dispatching-parallel-agents** - 并发任务处理

### 📖 元技能
- **using-superpowers** - Skills 系统使用指南
- **writing-skills** - 创建新 skills

## 🔍 查看 Skill 详情

所有 skills 都在 `.cursor/skills/` 目录下,每个都有一个 `SKILL.md` 文件:

```bash
# 查看所有 skills
ls .cursor/skills/

# 查看某个 skill 的详细说明
cat .cursor/skills/brainstorming/SKILL.md
cat .cursor/skills/test-driven-development/SKILL.md
cat .cursor/skills/systematic-debugging/SKILL.md
```

## 💡 典型工作流

### 场景 1: 开发新功能

```
1. 你: "我想添加评论功能"
   AI: 自动使用 brainstorming 探索需求

2. 你: "设计看起来不错,开始实施吧"
   AI: 自动使用 writing-plans 创建详细计划

3. 你: "执行计划"
   AI: 自动使用 subagent-driven-development
       每个任务自动应用 test-driven-development

4. 完成后
   AI: 自动使用 finishing-a-development-branch
       提供 merge/PR 选项
```

### 场景 2: 修复 Bug

```
1. 你: "用户登录后会话丢失"
   AI: 自动使用 systematic-debugging
       - 观察现象
       - 形成假设
       - 验证测试
       - 确认根因

2. AI 提出修复方案
   AI: 自动使用 test-driven-development
       - 先写失败的测试
       - 实现修复
       - 验证测试通过

3. 你: "修好了吗?"
   AI: 自动使用 verification-before-completion
       运行验证命令并展示结果
```

### 场景 3: 代码审查

```
1. 你: "帮我审查这段代码"
   AI: 自动使用 requesting-code-review
       - 检查规格合规性
       - 检查代码质量
       - 按严重性报告问题

2. 你提供反馈
   AI: 自动使用 receiving-code-review
       - 技术严谨地响应
       - 验证建议的可行性
       - 避免盲目实施
```

## ⚙️ 核心原则

Superpowers 遵循这些开发原则:

1. **测试驱动开发 (TDD)**
   - 先写测试,后写代码
   - RED → GREEN → REFACTOR

2. **系统化而非临时**
   - 遵循流程而非猜测
   - 有章可循

3. **降低复杂性**
   - 简单性是首要目标
   - YAGNI (You Aren't Gonna Need It)

4. **证据优于声明**
   - 先验证,再宣布成功
   - 展示测试结果

5. **DRY (Don't Repeat Yourself)**
   - 避免代码重复
   - 提取共用逻辑

## 🆚 Cursor vs Claude Code

| 特性 | Cursor (当前) | Claude Code |
|------|--------------|-------------|
| Skills 支持 | ✅ 通过项目集成 | ✅ 原生支持 |
| 命令格式 | 自动触发或自然语言 | `/superpowers:*` 命令 |
| 安装位置 | `.cursor/skills/` | `~/.claude/plugins/` |
| 更新方式 | 手动复制 | `/plugin update` |

## 🔄 更新 Skills

当 superpowers 有新版本时:

```bash
# 1. 检查 Claude Code 中的版本
ls ~/.claude/plugins/cache/claude-plugins-official/superpowers/

# 2. 复制最新版本到项目
cp -r ~/.claude/plugins/cache/claude-plugins-official/superpowers/*/skills/* \
  .cursor/skills/
```

## 📖 更多资源

- **官方仓库**: https://github.com/obra/superpowers
- **详细文档**: `.cursor/skills/*/SKILL.md`
- **项目规则**: `.cursor/rules/superpowers.md`

## 🎉 开始使用

现在你可以直接开始开发,skills 会自动在合适的时机激活!

试试这些命令:
- "帮我设计一个用户认证系统" (触发 brainstorming)
- "实现这个功能" (触发 test-driven-development)
- "这个 bug 怎么回事?" (触发 systematic-debugging)

---

**提示**: 如果你想在 Claude Code 中使用原生的 `/superpowers:*` 命令,可以切换到 Claude Code 编辑器 (claude.ai/code)。
