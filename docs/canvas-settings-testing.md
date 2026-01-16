# 无限画布设置功能测试指南

> **测试类型:** 集成测试 + 手动测试  
> **测试范围:** 设置面板 + 性能优化  
> **预计时间:** 15 分钟

---

## 🧪 测试前准备

### 1. 环境检查

```bash
# 确保服务运行
pnpm dev

# 检查数据库连接
psql manga_maker -c "SELECT COUNT(*) FROM canvas_timelines;"

# 检查 novel-backend 状态 (可选)
curl http://localhost:8000/health
```

### 2. 准备测试数据

```sql
-- 创建测试时间线 (如果不存在)
INSERT INTO canvas_timelines (
  id, 
  novel_project_id, 
  user_id, 
  title, 
  config,
  total_chapters
) VALUES (
  gen_random_uuid(),
  'your-project-id',
  'your-user-id',
  '测试时间线',
  '{"auto_generate": true, "use_character_library": true}',
  1
) RETURNING id;

-- 记录返回的 timeline_id 用于后续测试
```

---

## ✅ 测试用例 1: 设置面板 UI

### 1.1 打开设置面板

**步骤:**
1. 访问 `http://localhost:3000/novel/canvas/{timeline_id}`
2. 点击右上角"设置"按钮

**预期结果:**
- ✅ 弹出设置对话框
- ✅ 对话框标题显示"时间线设置"
- ✅ 显示 8 个配置项
- ✅ 当前配置值正确显示

**截图位置:** 保存到 `docs/screenshots/settings-dialog.png`

---

### 1.2 修改配置项

**测试场景 A: AI 模型切换**

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 点击"AI 模型"下拉框 | 显示 GPT-4 和 GPT-3.5 选项 |
| 2 | 选择"GPT-3.5 (快速)" | 下拉框显示更新 |
| 3 | 不保存,点击"取消" | 对话框关闭,配置未变 |

**测试场景 B: 镜头密度调整**

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 点击"镜头密度"下拉框 | 显示 3 个选项 |
| 2 | 选择"密集 (6-8 镜头/片段)" | 下拉框更新 |
| 3 | 查看提示文字 | 显示"控制每个剧本片段生成的镜头数量" |

**测试场景 C: 资产库开关**

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 点击"使用角色库"开关 | 开关状态切换 |
| 2 | 点击"使用场景库"开关 | 开关状态切换 |
| 3 | 开关有平滑动画 | ✅ |

---

### 1.3 保存配置

**步骤:**
1. 修改以下配置:
   - AI 模型 → GPT-3.5
   - 镜头密度 → 密集
   - 视觉风格 → 动漫
2. 点击"保存设置"按钮

**预期结果:**
- ✅ 按钮显示"保存中..."
- ✅ 1-2 秒后显示 Toast: "保存成功"
- ✅ 对话框自动关闭
- ✅ 页面自动刷新

**验证数据库:**

```sql
SELECT id, title, config 
FROM canvas_timelines 
WHERE id = 'your-timeline-id';

-- 预期 config 字段:
-- {
--   "ai_model": "gpt-3.5-turbo",
--   "shot_density": "dense",
--   "visual_style": "anime",
--   "auto_generate": true,
--   "use_character_library": true,
--   "use_scene_library": true
-- }
```

---

## ⚡ 测试用例 2: 性能优化

### 2.1 准备测试数据

```sql
-- 创建测试章节
INSERT INTO timeline_chapters (
  id,
  timeline_id,
  chapter_number,
  script_status,
  shot_status
) VALUES (
  gen_random_uuid(),
  'your-timeline-id',
  1,
  'pending',
  'pending'
) RETURNING id;

-- 创建 5 个剧本片段
INSERT INTO script_segments (
  timeline_chapter_id,
  segment_order,
  content,
  scene_description,
  character_actions
) VALUES 
  ('chapter-id', 1, '测试内容1', '场景描述1', '角色动作1'),
  ('chapter-id', 2, '测试内容2', '场景描述2', '角色动作2'),
  ('chapter-id', 3, '测试内容3', '场景描述3', '角色动作3'),
  ('chapter-id', 4, '测试内容4', '场景描述4', '角色动作4'),
  ('chapter-id', 5, '测试内容5', '场景描述5', '角色动作5');

-- 更新章节状态
UPDATE timeline_chapters 
SET script_status = 'completed', script_segment_count = 5
WHERE id = 'chapter-id';
```

---

### 2.2 性能基准测试

**测试步骤:**

1. 打开浏览器开发者工具
2. 切换到 Console 标签
3. 点击章节的"生成镜头"按钮
4. 记录控制台日志

**预期日志输出:**

```
[INFO] 开始生成镜头 { chapterId: "...", userId: "..." }
[INFO] 剧本片段获取成功 { segmentCount: 5 }
[INFO] 开始并行生成镜头 { segmentCount: 5 }
[INFO] 为剧本片段生成镜头 { segmentOrder: 1 }
[INFO] 为剧本片段生成镜头 { segmentOrder: 2 }
[INFO] 为剧本片段生成镜头 { segmentOrder: 3 }
[INFO] 为剧本片段生成镜头 { segmentOrder: 4 }
[INFO] 为剧本片段生成镜头 { segmentOrder: 5 }
[INFO] 镜头规划完成 { segmentId: "...", shotCount: 3 }
[INFO] 镜头规划完成 { segmentId: "...", shotCount: 4 }
[INFO] 镜头规划完成 { segmentId: "...", shotCount: 3 }
[INFO] 镜头规划完成 { segmentId: "...", shotCount: 4 }
[INFO] 镜头规划完成 { segmentId: "...", shotCount: 3 }
[INFO] 镜头生成成功 { shotCount: 17, durationMs: 4823 }
                                      ^^^^^^^ 关键指标
```

**性能验收标准:**

| 片段数量 | 优化前 (串行) | 优化后 (并行) | 是否通过 |
|---------|-------------|-------------|---------|
| 3 片段 | 9-15秒 | < 6秒 | ✅ |
| 5 片段 | 15-25秒 | < 10秒 | ✅ |
| 8 片段 | 24-40秒 | < 15秒 | ✅ |

**注意:** 实际耗时取决于 novel-backend 响应速度和网络延迟

---

### 2.3 并发安全测试

**测试场景:** 同时为多个章节生成镜头

**步骤:**
1. 准备 3 个章节,每个章节有 3 个剧本片段
2. 快速点击 3 个章节的"生成镜头"按钮
3. 观察所有章节都能正常完成

**预期结果:**
- ✅ 3 个章节同时处理
- ✅ 没有数据竞争或冲突
- ✅ 所有章节状态正确更新
- ✅ 数据库记录完整

**验证查询:**

```sql
SELECT 
  tc.id,
  tc.chapter_number,
  tc.shot_status,
  tc.shot_count,
  COUNT(sd.id) as actual_shot_count
FROM timeline_chapters tc
LEFT JOIN script_segments ss ON ss.timeline_chapter_id = tc.id
LEFT JOIN shot_designs sd ON sd.script_segment_id = ss.id
WHERE tc.timeline_id = 'your-timeline-id'
GROUP BY tc.id, tc.chapter_number, tc.shot_status, tc.shot_count;

-- 预期: shot_count = actual_shot_count
```

---

## 🐛 错误处理测试

### 3.1 网络错误场景

**测试步骤:**
1. 停止 novel-backend 服务: `Ctrl+C`
2. 点击"生成镜头"按钮
3. 观察错误处理

**预期结果:**
- ✅ 章节状态更新为"error"
- ✅ 显示错误提示: "novel-backend 服务不可用"
- ✅ 控制台记录详细错误日志
- ✅ 不影响其他章节

---

### 3.2 无效配置场景

**测试步骤:**
1. 打开设置面板
2. 使用浏览器开发者工具修改请求:
   ```javascript
   fetch('/api/canvas/timeline/xxx', {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       config: { ai_model: 'invalid-model' }
     })
   });
   ```
3. 观察后端响应

**预期结果:**
- ⚠️ 当前版本: 接受任意配置值 (无严格验证)
- 🔮 未来优化: 添加 Zod Schema 验证

---

## 📊 性能监控

### 4.1 Chrome DevTools Performance

**步骤:**
1. 打开 DevTools → Performance 标签
2. 点击"Record"
3. 执行"生成镜头"操作
4. 停止录制并分析

**关注指标:**
- ⏱️ 网络请求耗时
- 🎨 UI 渲染时间
- 💾 内存使用情况

---

### 4.2 数据库查询性能

```sql
-- 查看慢查询 (如果启用了 pg_stat_statements)
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%canvas_timeline%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🎯 回归测试清单

### 功能验证

- [ ] 设置面板可以正常打开和关闭
- [ ] 所有配置项都能修改
- [ ] 保存配置后数据库正确更新
- [ ] 并行生成镜头性能提升 > 50%
- [ ] 错误处理机制正常工作
- [ ] Toast 提示正确显示

### UI/UX 验证

- [ ] 对话框样式符合设计规范
- [ ] 表单交互流畅无卡顿
- [ ] 加载状态清晰可见
- [ ] 移动端适配正常 (可选)

### 性能验证

- [ ] 5 片段生成 < 10 秒
- [ ] 内存无明显泄漏
- [ ] 并发操作稳定

---

## 📝 测试报告模板

```markdown
# 无限画布设置功能测试报告

**测试日期:** 2026-01-16  
**测试人员:** [姓名]  
**环境:** 开发环境 / 测试环境

## 测试结果概览

| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 设置面板 UI | ✅ 通过 | - |
| 配置保存 | ✅ 通过 | - |
| 性能优化 | ✅ 通过 | 5片段 4.8秒 |
| 错误处理 | ✅ 通过 | - |
| 并发安全 | ✅ 通过 | - |

## 性能数据

| 片段数 | 优化前 | 优化后 | 提升 |
|-------|--------|--------|------|
| 3 | 12秒 | 4秒 | 67% |
| 5 | 23秒 | 5秒 | 78% |

## 发现的问题

1. [问题描述]
   - 严重程度: [低/中/高]
   - 复现步骤: ...
   - 截图: ...

## 建议

- [优化建议或改进方向]

## 结论

✅ 功能正常,可以部署  
⚠️ 存在问题,需要修复  
❌ 严重问题,不可部署
```

---

## 🚀 自动化测试 (未来)

### Playwright E2E 测试示例

```typescript
// tests/e2e/canvas-settings.spec.ts

import { test, expect } from '@playwright/test';

test('设置面板基本功能', async ({ page }) => {
  await page.goto('/novel/canvas/test-timeline-id');
  
  // 打开设置
  await page.click('button:has-text("设置")');
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  
  // 修改 AI 模型
  await page.click('text=AI 模型');
  await page.click('text=GPT-3.5');
  
  // 保存
  await page.click('button:has-text("保存设置")');
  await expect(page.locator('text=保存成功')).toBeVisible();
});

test('并行生成性能', async ({ page }) => {
  await page.goto('/novel/canvas/test-timeline-id');
  
  const startTime = Date.now();
  await page.click('text=生成镜头');
  
  // 等待完成
  await page.waitForSelector('text=✓', { timeout: 15000 });
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(10000); // 10秒内完成
});
```

---

**测试完成后,请填写测试报告并提交到:** `docs/test-reports/canvas-settings-{date}.md`
