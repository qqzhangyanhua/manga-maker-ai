# 14 /commit Skill：智能 Git 提交

**模式：时间线叙事（Timeline）**

四格漫画竖版布局，标题在漫画顶部居中，风格简洁、清晰易懂，展示 /commit Skill 的自动化工作流程，所有元素均以卡通风格表现，适合用于网络传播。

---

## 标题（居中）：
**《/commit Skill：从"fix bug"到专业提交》**（中文，加粗）

---

## 第一格（完整横格）：
- **场景**：对比传统 Git 提交方式
- **画面布局**：左右分屏

### 左半边 - 小刚的传统方式（灰色调）：
- **时间标注**：⏱️ 手动操作
- **画面**：
  - 小刚在终端输入：
    ```bash
    git add .
    git commit -m "fix bug"
    ```
  - 小刚表情：随意、不在意
- **提交历史显示**：
  ```
  * fix bug
  * update code
  * fix
  * wip
  * asdfasdf
  ```
- **标注**（红色）：
  - ❌ 提交信息不清晰
  - ❌ 不符合规范
  - ❌ 无法追溯改动原因

### 右半边 - 小红的 Skill 方式（蓝色科技调）：
- **时间标注**：⚡ 自动生成
- **画面**：
  - 小红在终端输入简单命令：
    ```bash
    /commit
    ```
  - 小红表情：轻松、满意
- **提交信息预览**：
  ```
  refactor(auth): migrate JWT to middleware

  - Extract validation logic from controllers
  - Add error handling for expired tokens
  - Improve test coverage to 95%

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- **标注**（绿色）：
  - ✓ 符合 Conventional Commit
  - ✓ 清晰描述改动
  - ✓ 便于追溯和回滚

---

## 第二格（完整横格）：
- **场景**：/commit Skill 自动执行流程（Step 1-2）
- **画面布局**：流程图 + 可视化

### Step 1 - git diff（左侧）：
- **图标**：🔍 分析改动
- **画面**：
  - 终端显示 `git diff` 输出：
    ```diff
    - const token = req.headers.authorization
    + const token = await verifyToken(req)
    ```
  - /commit Skill 拟人化形象（Git 专家）拿着放大镜检查代码
  - 分析气泡："检测到：重构认证逻辑"
- **标注**："Step 1: 分析改动内容"

### Step 2 - git log（右侧）：
- **图标**：📚 学习风格
- **画面**：
  - 终端显示 `git log -10 --oneline` 输出：
    ```
    feat: add dark mode
    fix: resolve login issue
    docs: update API docs
    ```
  - /commit Skill 形象拿着笔记本记录
  - 学习气泡："发现项目风格：不使用 emoji，type 在前"
- **标注**："Step 2: 学习提交风格"

### 底部进度条：
- **进度条**：██░░░ 40% 完成
- **文字说明**："正在分析代码改动和项目风格..."

---

## 第三格（完整横格）：
- **场景**：/commit Skill 自动执行流程（Step 3-4）
- **画面布局**：流程图 + 可视化

### Step 3 - 生成提交信息（左侧）：
- **图标**：✍️ 生成信息
- **画面**：
  - /commit Skill 形象坐在"AI 写作台"前
  - 屏幕显示生成过程：
    ```
    🤔 改动类型：重构（refactor）
    🎯 影响范围：认证模块（auth）
    📝 主要改动：
      - 提取验证逻辑到中间件
      - 添加过期令牌错误处理
      - 测试覆盖率提升到 95%
    ```
  - 思考气泡："需要符合 Conventional Commit 规范"
- **标注**："Step 3: 生成提交信息"

### Step 4 - 自动提交（右侧）：
- **图标**：🚀 执行提交
- **画面**：
  - 终端显示提交命令执行：
    ```bash
    git commit -m "$(cat <<'EOF'
    refactor(auth): migrate JWT to middleware

    - Extract validation logic from controllers
    - Add error handling for expired tokens
    - Improve test coverage to 95%

    Co-Authored-By: Claude <noreply@anthropic.com>
    EOF
    )"
    ```
  - /commit Skill 形象按下"提交"按钮
  - 成功特效：✨ 绿色对勾
- **标注**："Step 4: 自动提交"

### 底部进度条：
- **进度条**：████░ 80% 完成
- **文字说明**："正在生成符合规范的提交信息并提交..."

---

## 第四格（完整横格）：
- **场景**：最终结果 + 价值总结
- **画面布局**：结果展示 + 价值卡片

### 顶部 - 提交成功：
- **终端显示**：
  ```bash
  ✓ git status
  On branch main
  nothing to commit, working tree clean

  Latest commit:
  refactor(auth): migrate JWT to middleware
  ```
- **小红的反应**：
  - 表情：满意、竖起大拇指
  - 对话气泡："完美！省了好多时间～"

### 底部 - /commit Skill 的智能之处（三张卡片）：

#### 卡片 1 - 改动分析（左侧）：
- **图标**：🔍
- **标题**："改动分析"
- **内容**：
  ```
  if (newFile) → type: feat
  if (bugfix) → type: fix
  if (refactor) → type: refactor
  if (docs) → type: docs
  ```

#### 卡片 2 - 风格学习（中间）：
- **图标**：📚
- **标题**："风格学习"
- **内容**：
  ```
  分析最近 10 次提交

  如果项目使用 Emoji:
  "✨ feat: add dark mode"

  如果项目使用纯文本:
  "feat: add dark mode"
  ```

#### 卡片 3 - 自动对齐（右侧）：
- **图标**：🎯
- **标题**："自动对齐"
- **内容**：
  ```
  提交消息与项目风格
  自动对齐

  ✓ 符合 Conventional Commit
  ✓ 清晰描述改动
  ✓ 便于团队协作
  ```

### 最底部总结：
- **大字标题**（加粗）：
  **"从 'fix bug' 到专业提交，只需一个命令：/commit"**
- **对比数据**：
  - 传统方式：手写提交信息（2-5 分钟，质量不稳定）
  - /commit Skill：自动生成（5 秒，质量一致）
  - **效率提升：24-60x** 🚀

---

## 附加风格要求：
- 第一格左右对比要强烈：随意提交 vs 专业提交
- 第二、三格的流程图要清晰：用数字标注步骤（Step 1-4）
- /commit Skill 的拟人化形象要一致：Git 专家，穿印有 Git 标志的衣服
- 进度条要动态展示：40% → 80% → 100%
- 第四格的三张卡片要整齐排列，图标醒目
- 代码示例要真实：使用实际的 git 命令和提交信息格式
- 整体风格：教育性 + 实用性，展示自动化的价值
