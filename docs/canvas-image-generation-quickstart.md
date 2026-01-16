# 无限画布图像生成快速验证指南

## 🚀 快速开始

### 前置要求

1. **依赖安装**
   ```bash
   # 安装 node-canvas (对话框功能)
   pnpm add canvas
   
   # 确认现有依赖已安装
   pnpm install
   ```

2. **环境配置**
   
   确认 `.env.local` 包含:
   ```env
   # MinIO 配置
   MINIO_ENDPOINT=localhost
   MINIO_PORT=9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_BUCKET=manga-maker
   
   # novel-backend 配置
   NOVEL_BACKEND_URL=http://localhost:8001
   
   # 数据库
   DATABASE_URL=postgresql://...
   ```

3. **服务启动**
   ```bash
   # 启动 MinIO (Docker)
   docker-compose up -d minio
   
   # 启动 novel-backend
   cd services/novel-backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
   
   # 启动 Next.js (新终端)
   cd ../..
   pnpm dev
   ```

4. **图像生成提供商配置**
   
   访问: http://localhost:3000/admin/llm-providers
   
   确保有 `provider_type="image_generation"` 的配置:
   - **Stable Diffusion**: ComfyUI 或 AUTOMATIC1111 API
   - **或 OpenAI DALL-E**: (可选,但不推荐用于漫画)

---

## ✅ 验证步骤

### Step 1: 创建时间线

1. 访问: http://localhost:3000/novel/canvas
2. 点击 "新建时间线"
3. 输入小说项目ID和标题
4. 点击 "创建"

**预期结果**: 时间线创建成功,自动跳转到时间线详情页

---

### Step 2: 添加章节

1. 在时间线详情页,点击 "添加章节"
2. 选择小说章节
3. 点击 "确认"

**预期结果**: 章节卡片显示在时间线上,状态为 "待生成剧本"

---

### Step 3: 生成剧本 (剧本分析)

1. 点击章节卡片上的 "生成剧本" 按钮
2. 等待 5-10 秒

**预期结果**:
- ✅ 状态变为 "剧本已完成"
- ✅ 显示 "剧本片段数: N"
- ✅ 控制台无报错

**验证数据库**:
```sql
SELECT * FROM script_segment WHERE timeline_chapter_id = '章节ID';
```

---

### Step 4: 生成镜头 (镜头规划)

1. 点击 "生成镜头" 按钮
2. 等待 10-20 秒

**预期结果**:
- ✅ 状态变为 "镜头已完成"
- ✅ 显示 "镜头数: M"
- ✅ 控制台无报错

**验证数据库**:
```sql
SELECT sd.*, ss.segment_order 
FROM shot_design sd
JOIN script_segment ss ON sd.script_segment_id = ss.id
WHERE ss.timeline_chapter_id = '章节ID';
```

---

### Step 5: 生成场景图 ⭐ (新功能)

1. 点击 "生成场景图" 按钮
2. 观察控制台日志

**预期日志**:
```
开始生成场景图
提示词优化完成
提交图像生成任务 (shot_id=xxx)
所有图像任务已提交
等待图像生成 (taskId=xxx)
场景图生成成功 (imageUrl=http://minio:9000/...)
场景图生成完成 (successCount=N)
```

**预期结果**:
- ✅ 状态变为 "场景图已完成"
- ✅ 显示 "场景图数: M"
- ✅ 图像已上传到 MinIO
- ✅ 数据库保存了 MinIO URL

**验证数据库**:
```sql
SELECT si.*, sd.shot_description
FROM scene_image si
JOIN shot_design sd ON si.shot_design_id = sd.id
WHERE sd.script_segment_id IN (
  SELECT id FROM script_segment WHERE timeline_chapter_id = '章节ID'
);
```

**验证 MinIO**:
```bash
# 使用 MinIO Console 查看
http://localhost:9001
# 或使用 mc 命令行
mc ls local/manga-maker/generated/
```

---

### Step 6: 生成漫画图 ⭐ (新功能)

1. 点击 "生成漫画图" 按钮
2. 观察控制台日志

**预期日志**:
```
开始生成最终漫画图
对话框布局分析完成
添加对话框 (scene_id=xxx, bubbleCount=2)
对话框添加成功 (imageUrl=http://minio:9000/...)
最终漫画图生成完成 (successCount=N)
```

**预期结果**:
- ✅ 状态变为 "漫画图已完成"
- ✅ 显示 "漫画图数: M"
- ✅ 有对话的场景:图像上可见对话框
- ✅ 无对话的场景:直接使用场景图

**验证数据库**:
```sql
SELECT cp.*, si.image_url as scene_url
FROM comic_panel_result cp
JOIN scene_image si ON cp.scene_image_id = si.id
WHERE cp.shot_design_id IN (
  SELECT sd.id 
  FROM shot_design sd
  JOIN script_segment ss ON sd.script_segment_id = ss.id
  WHERE ss.timeline_chapter_id = '章节ID'
);
```

**验证对话框**:
下载 `comic_panel_result.image_url` 的图片,检查:
- ✅ 对话框位置正确(top-left/top-right/bottom-left/bottom-right/center)
- ✅ 对话框样式正确(speech/thought/shout/whisper)
- ✅ 文字清晰可读
- ✅ 对话框未超出画布边界

---

## 🐛 常见问题排查

### 问题 1: 场景图生成卡住

**症状**: 点击 "生成场景图" 后长时间无响应

**排查步骤**:
1. 检查 `novel-backend` 是否运行:
   ```bash
   curl http://localhost:8001/health
   ```
2. 检查图像生成提供商配置:
   ```sql
   SELECT * FROM llm_provider WHERE provider_type = 'image_generation';
   ```
3. 检查 ComfyUI/SD 服务状态:
   ```bash
   curl http://comfyui-host:port/
   ```
4. 查看前端控制台和 `logs/combined.log`:
   ```bash
   tail -f logs/combined.log
   ```

---

### 问题 2: 对话框显示乱码

**症状**: 漫画图上的对话框文字显示为方框或乱码

**原因**: 服务器缺少中文字体

**解决方案** (Ubuntu/Debian):
```bash
# 安装中文字体
sudo apt-get update
sudo apt-get install fonts-noto-cjk

# 重启 Next.js 服务
```

**解决方案** (macOS):
```bash
# macOS 自带中文字体,一般无需额外安装
# 如果仍有问题,检查 node-canvas 安装:
pnpm rebuild canvas
```

---

### 问题 3: MinIO 上传失败

**症状**: 控制台报错 `Failed to upload image to MinIO`

**排查步骤**:
1. 检查 MinIO 服务:
   ```bash
   docker ps | grep minio
   ```
2. 检查 MinIO 连接:
   ```bash
   curl http://localhost:9000/minio/health/live
   ```
3. 检查 bucket 是否存在:
   ```bash
   mc ls local/manga-maker
   ```
4. 检查环境变量:
   ```bash
   echo $MINIO_ENDPOINT
   echo $MINIO_ACCESS_KEY
   ```

---

### 问题 4: 图像生成任务超时

**症状**: 控制台报错 `等待图像生成超时`

**原因**: 
- 图像生成服务响应慢 (ComfyUI/SD 负载高)
- 超时时间设置太短 (默认60秒)

**解决方案**:
1. 增加超时时间 (修改 `generate-scenes/route.ts`):
   ```typescript
   const taskStatus = await waitForTaskCompletion(task.taskId, 120000); // 改为120秒
   ```
2. 优化图像生成参数 (减少 steps):
   ```typescript
   await generateImage("scene", prompt, userId, {
     steps: 20,  // 减少步数
     width: 512, // 降低分辨率
     height: 512,
   });
   ```
3. 检查 ComfyUI/SD 性能:
   - 是否使用 GPU
   - 是否有其他任务占用

---

## 📊 性能基准

### 正常预期

| 步骤 | 耗时 (章节3000字,10个镜头) | 说明 |
|------|---------------------------|------|
| 生成剧本 | 5-10秒 | 1次 LLM 调用 |
| 生成镜头 | 15-30秒 | 3-5次 LLM 调用 (并发) |
| 生成场景图 | 60-120秒 | 10个图像生成任务 (串行等待) |
| 生成漫画图 | 30-60秒 | 5-10次对话框分析 + node-canvas 处理 |
| **总耗时** | **2-4分钟** | 全流程 |

### 性能优化建议

1. **场景图生成改为并发**
   ```typescript
   // 当前:串行等待 (慢)
   for (const task of tasks) {
     await waitForTaskCompletion(task.taskId);
   }
   
   // 优化:批量并发 (快)
   await Promise.allSettled(
     tasks.map(task => waitForTaskCompletion(task.taskId))
   );
   ```

2. **降低图像分辨率**
   - 场景图: 800x600 → 512x512
   - 漫画图: 1024x768 → 768x576

3. **使用更快的 AI 模型**
   - LLM: GPT-4 → GPT-3.5-turbo
   - 图像: Stable Diffusion 1.5 → SD Turbo

---

## 🎯 成功标准

### 功能完整性

- ✅ 剧本分析成功率 > 95%
- ✅ 镜头规划成功率 > 95%
- ✅ 场景图生成成功率 > 90%
- ✅ 漫画图生成成功率 > 90%

### 图像质量

- ✅ 场景图符合镜头描述
- ✅ 对话框位置合理,不遮挡关键画面
- ✅ 对话框文字清晰可读
- ✅ 图像无明显伪影(artifacts)

### 性能指标

- ✅ 单章节生成(10镜头) < 5分钟
- ✅ 图像生成任务超时率 < 5%
- ✅ API 响应时间 < 30秒 (不含图像生成)

---

## 📝 测试报告模板

```markdown
## 测试环境
- Node.js 版本: ___
- Python 版本: ___
- 图像生成提供商: ___
- GPU: ___

## 测试数据
- 小说章节: ___
- 章节字数: ___
- 生成剧本片段数: ___
- 生成镜头数: ___

## 测试结果
- [ ] 剧本生成成功
- [ ] 镜头生成成功
- [ ] 场景图生成成功 (成功数/总数: ___)
- [ ] 漫画图生成成功 (成功数/总数: ___)

## 性能数据
- 生成剧本耗时: ___秒
- 生成镜头耗时: ___秒
- 生成场景图耗时: ___秒
- 生成漫画图耗时: ___秒
- **总耗时**: ___秒

## 图像质量
- [ ] 场景图质量良好
- [ ] 对话框位置合理
- [ ] 对话框文字清晰
- [ ] 无明显伪影

## 问题记录
1. ___
2. ___

## 结论
✅ 通过 / ❌ 失败

**评分**: ___/100
```

---

## 🔗 相关文档

- [实施报告](./canvas-image-generation-integration.md)
- [无限画布设计](./plans/2026-01-16-infinite-canvas-design.md)
- [统一图像生成](../src/lib/unified-image-generation.ts)

---

**祝测试顺利!** 🚀

如有问题,请查看控制台日志和 `logs/combined.log`。
