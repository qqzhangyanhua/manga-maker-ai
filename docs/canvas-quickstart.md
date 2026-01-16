# 🚀 无限画布集成快速开始

## 5 分钟验证集成

本指南帮助您快速验证 novel-backend 集成是否成功。

---

## Step 1: 启动服务（3 个终端）

### 终端 1：PostgreSQL 数据库
```bash
# 如果使用 Docker
docker-compose up -d postgres

# 验证连接
psql postgresql://manga:manga123@localhost:5432/manga -c "SELECT 1;"
```

### 终端 2：novel-backend 服务
```bash
cd services/novel-backend

# 激活虚拟环境
source .venv/bin/activate

# 启动服务
uvicorn app.main:app --reload --port 8000

# 看到这个输出表示成功：
# 🚀 Novel Backend Service 启动
# 📊 数据库: localhost:5432/manga
# 🤖 AI 模型: gpt-4
```

**验证：** 访问 http://localhost:8000/health

### 终端 3：Next.js 应用
```bash
# 在项目根目录
pnpm dev
# 或
npm run dev

# 看到这个输出表示成功：
# ▲ Next.js 14.x.x
# - Local:        http://localhost:3000
```

**验证：** 访问 http://localhost:3000

---

## Step 2: 准备测试数据

### 方式 A：使用现有小说项目

如果您已有小说项目：
1. 登录系统
2. 进入小说模块
3. 选择一个已有章节内容的项目
4. 跳到 Step 3

### 方式 B：快速创建测试项目

**SQL 脚本（在 psql 中执行）：**

```sql
-- 1. 创建测试用户（如果没有）
INSERT INTO users (id, email, password_hash, credits)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@canvas.com',
  '$2b$10$abcdefghijklmnopqrstuvwxyz', -- 假密码，需要真实注册
  10000
)
ON CONFLICT (email) DO NOTHING;

-- 2. 创建小说项目
INSERT INTO novel_projects (id, user_id, title, genre, outline)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  '测试无限画布',
  '奇幻',
  '{"premise": "一个关于无限画布的测试故事"}'
);

-- 3. 创建章节并添加内容
INSERT INTO novel_chapters (id, project_id, chapter_number, title, content)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  1,
  '第一章：开始',
  '在一个阳光明媚的早晨，主人公小明走在上学的路上。突然，他听到身后传来急促的脚步声，回头一看，竟然是失踪多年的好友小红。两人相视一笑，开始了新的冒险旅程。他们决定探索城市中心的神秘塔楼，那里据说隐藏着古老的秘密。'
);

-- 4. 创建画布时间线
INSERT INTO canvas_timelines (id, novel_project_id, user_id, title, total_chapters)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  '测试时间线',
  1
);

-- 5. 创建时间线章节节点
INSERT INTO timeline_chapters (id, timeline_id, chapter_id, chapter_number)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  1
);
```

---

## Step 3: 测试生成流程

### 3.1 访问画布页面

打开浏览器：
```
http://localhost:3000/novel/canvas/33333333-3333-3333-3333-333333333333
```

**预期界面：**
- 顶部导航：返回按钮、设置按钮、全部生成按钮
- 时间线统计：`0/1 章节完成 | 0 镜头 | 0 图片`
- 章节卡片：`第 1 章` → 剧本、镜头、场景图、漫画图（4 个节点）

### 3.2 生成剧本（真实 AI 调用）

**操作步骤：**
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 点击"剧本"节点的"生成"按钮

**预期控制台输出：**
```
生成剧本按钮被点击
开始生成章节步骤: 44444444-4444-4444-4444-444444444444, 步骤: generate-script
```

**预期服务端日志（终端 3 - Next.js）：**
```
开始生成剧本 { chapterId: '444...', userId: '000...' }
章节内容获取成功 { contentLength: 180, chapterNumber: 1 }
调用 novel-backend 剧本分析
剧本分析完成 { segmentCount: 3 }
剧本生成成功 { segmentCount: 3, durationMs: 8500 }
```

**预期 novel-backend 日志（终端 2）：**
```
INFO: 剧本分析请求: chapter_number=1, content_length=180
INFO: LLM 调用开始: model=gpt-4, max_tokens=4000
INFO: LLM 响应成功: segments=3
```

**验证成功标志：**
- ✅ 剧本节点状态变为绿色 ✓ `3 个`
- ✅ 镜头节点的"生成"按钮变为可点击（不再禁用）

### 3.3 生成镜头（真实 AI 调用）

**操作步骤：**
点击"镜头"节点的"生成"按钮

**预期控制台输出：**
```
生成镜头按钮被点击
开始生成章节步骤: 44444444-4444-4444-4444-444444444444, 步骤: generate-shots
为剧本片段生成镜头
镜头规划完成
```

**预期耗时：** ~8-15 秒（取决于剧本片段数量）

**验证成功标志：**
- ✅ 镜头节点显示 ✓ `9 个`（假设 3 个片段，每片段 3 镜头）
- ✅ 场景图节点可点击

### 3.4 生成场景图（MOCK 数据）

**操作步骤：**
点击"场景图"节点的"生成"按钮

**预期控制台输出：**
```
使用 MOCK 数据生成场景图
场景图生成成功 (MOCK)
```

**预期响应：**
```json
{
  "success": true,
  "scenes": [...],
  "metadata": {
    "is_mock": true  // ⚠️ 表示这是占位数据
  }
}
```

**预期耗时：** < 1 秒

### 3.5 生成最终图（MOCK 数据）

**操作步骤：**
点击"漫画图"节点的"生成"按钮

**预期响应包含 `is_mock: true`**

**完成后：**
- ✅ 时间线统计更新：`1/1 章节完成`
- ✅ 所有 4 个节点显示 ✓

---

## Step 4: 验证数据库

```sql
-- 查看剧本片段
SELECT
  segment_order,
  content,
  scene_description,
  emotion_tone
FROM script_segments
WHERE timeline_chapter_id = '44444444-4444-4444-4444-444444444444'
ORDER BY segment_order;

-- 预期结果：3-8 行数据，每行包含真实的剧本内容

-- 查看镜头设计
SELECT
  sd.shot_order,
  sd.camera_angle,
  sd.shot_size,
  sd.shot_description
FROM shot_designs sd
JOIN script_segments ss ON sd.script_segment_id = ss.id
WHERE ss.timeline_chapter_id = '44444444-4444-4444-4444-444444444444'
ORDER BY ss.segment_order, sd.shot_order;

-- 预期结果：9-24 行数据（每个剧本片段 3-5 个镜头）
```

---

## Step 5: 测试错误处理

### 测试 1：服务不可用

**操作：** 停止 novel-backend（Ctrl+C 终端 2）

**再次点击"生成剧本"按钮**

**预期：**
- ❌ 错误提示：`novel-backend 服务不可用，请稍后重试`
- ❌ 剧本节点状态变为红色 ✗

**恢复：** 重启 novel-backend

### 测试 2：章节内容为空

**操作：** 清空章节内容
```sql
UPDATE novel_chapters
SET content = ''
WHERE id = '22222222-2222-2222-2222-222222222222';
```

**点击"生成剧本"**

**预期：**
- ❌ 错误提示：`章节内容为空，无法生成剧本`
- HTTP 400 错误

**恢复：** 恢复章节内容

---

## 性能基准

| 操作 | 预期耗时 | 说明 |
|------|---------|------|
| 剧本生成（3 片段） | 8-12 秒 | LLM 调用 |
| 镜头规划（3 片段） | 10-15 秒 | 每片段 LLM 调用 |
| 场景图（MOCK） | < 1 秒 | 仅数据库操作 |
| 最终图（MOCK） | < 1 秒 | 仅数据库操作 |

**如果耗时超过 30 秒：**
- 检查 novel-backend 的 LLM API 配置
- 查看 novel-backend 日志是否有 API 错误
- 验证网络连接

---

## 常见问题

### Q1: "未登录" 错误

**原因：** Cookie 未设置或已过期

**解决：**
1. 访问 http://localhost:3000/login
2. 使用测试账号登录
3. 重新访问画布页面

### Q2: "章节不存在" 错误

**原因：** URL 中的 timeline ID 错误

**解决：**
```sql
-- 查询正确的 ID
SELECT id, title FROM canvas_timelines WHERE user_id = 'your-user-id';
```

### Q3: 剧本生成返回空结果

**原因：** novel-backend LLM 配置问题

**检查：**
```bash
# 在 services/novel-backend/.env
cat .env | grep LLM

# 应该看到：
# LLM_API_KEY=sk-...
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_MODEL=gpt-4
```

### Q4: 重试 3 次后仍失败

**原因：** novel-backend 服务异常或 LLM API 问题

**调试：**
```bash
# 查看 novel-backend 日志
# 终端 2 应该显示详细错误信息

# 测试 LLM API 连通性
curl -X POST $LLM_BASE_URL/chat/completions \
  -H "Authorization: Bearer $LLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'
```

---

## 下一步

✅ **集成验证成功后：**

1. **查看详细文档：**
   - [集成指南](./novel-backend-integration-guide.md) - 完整部署流程
   - [测试策略](./canvas-integration-testing.md) - 单元/集成测试
   - [实施总结](./canvas-integration-summary.md) - 技术细节

2. **探索前端功能：**
   - 点击"设置"按钮（目前显示 console.log）
   - 测试"全部生成"按钮（批量生成所有章节）
   - 折叠/展开章节卡片

3. **准备生产环境：**
   - 配置 Credits 消耗系统
   - 添加速率限制
   - 实现实时进度反馈（SSE）

4. **等待后端完成：**
   - generate-scenes 真实集成
   - generate-finals 真实集成

---

## 成功验收标准

- [x] novel-backend 健康检查通过
- [x] 剧本生成返回真实 AI 数据（非 mock）
- [x] 镜头规划返回真实 AI 数据（非 mock）
- [x] 数据库正确保存 ScriptSegment 和 ShotDesign
- [x] 错误处理正常工作（服务不可用、内容为空）
- [x] 日志记录完整（前端控制台 + 服务端终端）

**全部通过？恭喜！您已成功完成 novel-backend 集成！🎉**

---

**文档版本：** v1.0.0
**最后更新：** 2026-01-16
**维护者：** Claude Code + 架构团队
