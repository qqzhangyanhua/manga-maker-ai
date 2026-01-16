# Novel-Backend 集成指南

## 概述

本指南介绍如何验证和使用无限画布功能与 novel-backend 服务的集成。

## 前置条件

### 1. 环境变量配置

确保 `.env` 文件包含以下配置：

```bash
# Novel-Backend 服务地址
NOVEL_BACKEND_URL=http://localhost:8000

# 数据库连接
DATABASE_URL=postgresql://manga:manga123@localhost:5432/manga

# 其他必需配置
AUTH_SECRET=your-secret-key
```

### 2. 服务启动顺序

**步骤 1：启动 PostgreSQL 数据库**
```bash
# 使用 Docker Compose
docker-compose up -d postgres

# 或直接启动 PostgreSQL
psql -U manga -d manga
```

**步骤 2：启动 novel-backend 服务**
```bash
cd services/novel-backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**步骤 3：启动 Next.js 应用**
```bash
# 在项目根目录
pnpm dev
# 或
npm run dev
```

## 集成状态

### ✅ 已集成服务

| 端点 | 状态 | novel-backend API | 说明 |
|------|------|------------------|------|
| `POST /api/canvas/chapter/[id]/generate-script` | ✅ 已集成 | `/api/novel/canvas/analyze-script` | 剧本分析 |
| `POST /api/canvas/chapter/[id]/generate-shots` | ✅ 已集成 | `/api/novel/canvas/plan-shots` | 镜头规划 |

### 🚧 待集成服务（使用 MOCK 数据）

| 端点 | 状态 | 待实现的 novel-backend API | 说明 |
|------|------|---------------------------|------|
| `POST /api/canvas/chapter/[id]/generate-scenes` | 🚧 MOCK | `/api/novel/canvas/generate-scenes` | 场景图生成 |
| `POST /api/canvas/chapter/[id]/generate-finals` | 🚧 MOCK | `/api/novel/canvas/generate-finals` | 最终漫画图 |

## 验证步骤

### 步骤 1：健康检查

验证 novel-backend 服务是否正常运行：

```bash
# 测试健康检查端点
curl http://localhost:8000/health

# 预期响应
{
  "status": "healthy",
  "service": "novel-backend",
  "version": "1.0.0"
}
```

### 步骤 2：测试剧本分析 API

直接测试 novel-backend 的剧本分析功能：

```bash
curl -X POST http://localhost:8000/api/novel/canvas/analyze-script \
  -H "Content-Type: application/json" \
  -d '{
    "chapter_content": "在一个阳光明媚的早晨，主人公李明走在上学的路上，突然听到身后传来急促的脚步声...",
    "chapter_number": 1
  }'
```

**预期响应：**
```json
{
  "success": true,
  "segments": [
    {
      "segment_order": 1,
      "content": "早晨上学路上的片段",
      "scene_description": "城市街道，清晨，阳光洒在人行道上",
      "character_actions": "李明背着书包走路，突然停下回头",
      "dialogue": null,
      "estimated_duration": 30,
      "emotion_tone": "平静转紧张"
    }
  ]
}
```

### 步骤 3：测试镜头规划 API

```bash
curl -X POST http://localhost:8000/api/novel/canvas/plan-shots \
  -H "Content-Type: application/json" \
  -d '{
    "script_content": "李明走在上学路上",
    "scene_description": "城市街道，清晨",
    "character_actions": "李明背着书包走路",
    "available_characters": []
  }'
```

**预期响应：**
```json
{
  "success": true,
  "shots": [
    {
      "shot_order": 1,
      "shot_type": "establishing",
      "camera_angle": "平视",
      "shot_size": "远景",
      "character_focus": "李明",
      "action_description": "李明从远处走来",
      "dialogue": null,
      "visual_notes": "街道背景，晨光效果",
      "estimated_duration": 15
    }
  ]
}
```

### 步骤 4：端到端测试

1. **登录系统**
   - 访问 `http://localhost:3000`
   - 使用测试账号登录

2. **创建小说项目**
   - 导航到小说模块
   - 创建新项目并填写章节内容

3. **打开无限画布**
   - 点击项目的"打开画布"按钮
   - 进入 `/novel/canvas/[id]` 页面

4. **测试生成流程**

   **4.1 生成剧本**
   - 点击第一个章节的"生成剧本"按钮
   - 观察浏览器控制台日志：
     ```
     开始生成剧本
     调用 novel-backend 剧本分析
     章节内容获取成功
     剧本分析完成
     剧本生成成功
     ```
   - 验证数据库中创建了 `ScriptSegment` 记录

   **4.2 生成镜头**
   - 等待剧本生成完成（状态变为 "completed"）
   - 点击"生成镜头"按钮
   - 观察控制台日志：
     ```
     开始生成镜头
     为剧本片段生成镜头
     镜头规划完成
     镜头生成成功
     ```
   - 验证数据库中创建了 `ShotDesign` 记录

   **4.3 生成场景图（MOCK）**
   - 点击"生成场景图"按钮
   - 控制台应显示 `"使用 MOCK 数据生成场景图"`
   - 响应中 `metadata.is_mock = true`

   **4.4 生成最终图（MOCK）**
   - 点击"生成漫画图"按钮
   - 控制台应显示 `"使用 MOCK 数据生成最终漫画图"`
   - 响应中 `metadata.is_mock = true`

## 常见问题排查

### 问题 1：novel-backend 连接失败

**错误信息：**
```
novel-backend 服务不可用，请稍后重试
```

**解决方案：**
1. 检查 novel-backend 是否启动：
   ```bash
   curl http://localhost:8000/health
   ```

2. 检查环境变量：
   ```bash
   echo $NOVEL_BACKEND_URL
   # 应输出: http://localhost:8000
   ```

3. 查看 novel-backend 日志：
   ```bash
   # 在 novel-backend 终端查看输出
   ```

### 问题 2：章节内容为空

**错误信息：**
```
章节内容为空，无法生成剧本
```

**解决方案：**
1. 确保 TimelineChapter 关联了 NovelProject
2. NovelProject 的 chapters 中有对应章节内容
3. 检查数据库查询：
   ```sql
   SELECT content FROM "Chapter" WHERE novel_project_id = 'xxx' AND chapter_number = 1;
   ```

### 问题 3：超时错误

**错误信息：**
```
HTTP Timeout
```

**解决方案：**
1. LLM 生成可能较慢，默认超时 60 秒
2. 检查 novel-backend 的 LLM 配置：
   ```bash
   # 在 services/novel-backend/.env
   LLM_API_KEY=your-api-key
   LLM_BASE_URL=https://api.openai.com/v1
   LLM_MODEL=gpt-4
   ```

3. 如需调整超时，修改 `NovelBackendClient` 构造函数：
   ```typescript
   this.timeout = config?.timeout || 120000; // 120秒
   ```

## 数据流验证

### 完整数据流

```
用户点击"生成剧本"
  ↓
Next.js API: /api/canvas/chapter/[id]/generate-script
  ↓
NovelBackendClient.analyzeScript()
  ↓
HTTP POST: http://localhost:8000/api/novel/canvas/analyze-script
  ↓
novel-backend: ScriptAnalyzer.analyze_chapter()
  ↓
OpenAI API (LLM 调用)
  ↓
返回 segments[]
  ↓
Next.js 保存到 Prisma (ScriptSegment)
  ↓
更新 TimelineChapter.script_status = "completed"
  ↓
前端刷新显示
```

### 数据库验证查询

```sql
-- 查看章节状态
SELECT
  id,
  chapter_number,
  script_status,
  shot_status,
  scene_status,
  final_status,
  script_segment_count,
  shot_count
FROM "TimelineChapter"
WHERE timeline_id = 'your-timeline-id';

-- 查看剧本片段
SELECT * FROM "ScriptSegment"
WHERE timeline_chapter_id = 'your-chapter-id'
ORDER BY segment_order;

-- 查看镜头设计
SELECT sd.* FROM "ShotDesign" sd
JOIN "ScriptSegment" ss ON sd.script_segment_id = ss.id
WHERE ss.timeline_chapter_id = 'your-chapter-id'
ORDER BY sd.shot_order;
```

## 性能监控

### 日志查看

**Next.js 服务端日志：**
```bash
# 在运行 pnpm dev 的终端中查看
# 关键日志：
# - "开始生成剧本"
# - "调用 novel-backend 剧本分析"
# - "剧本分析完成"
# - "剧本生成成功"
```

**浏览器控制台日志：**
```javascript
// 前端组件日志
console.log("开始全部生成流程")
console.log("处理章节: xxx, 章节号: 1")
console.log("生成剧本按钮被点击")
```

### 性能指标

可通过日志中的 `durationMs` 字段监控性能：

```json
{
  "message": "剧本生成成功",
  "chapterId": "xxx",
  "segmentCount": 5,
  "durationMs": 12500  // 12.5秒
}
```

**性能基准：**
- 剧本生成：< 30秒（取决于 LLM 响应速度）
- 镜头规划：< 20秒/片段
- 场景图生成（MOCK）：< 1秒
- 最终图生成（MOCK）：< 1秒

## 下一步

### 完成 MOCK 服务集成

1. **实现 generate-scenes 后端服务**
   - 在 `services/novel-backend/app/services/canvas/` 创建 `scene_composer.py`
   - 添加 API 端点到 `services/novel-backend/app/routers/canvas.py`

2. **实现 generate-finals 后端服务**
   - 创建 `comic_generator.py`
   - 集成图像生成 API（Stable Diffusion / DALL-E）

3. **更新 NovelBackendClient**
   - 添加 `generateScenes()` 方法
   - 添加 `generateFinals()` 方法

4. **替换 MOCK 代码**
   - 移除 generate-scenes 和 generate-finals 中的 MOCK 标记
   - 调用真实的后端服务

## 联系方式

如有问题，请查看：
- 项目 README: `/README.md`
- novel-backend 文档: `/services/novel-backend/README.md`
- API 日志: 浏览器控制台 + 服务端终端
