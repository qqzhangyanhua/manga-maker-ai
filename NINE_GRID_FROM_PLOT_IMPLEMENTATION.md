# 九宫格从剧情生成功能实施指南

## 问题总结

### 问题 1：数据库表不存在
```
The table `public.nine_grid_images` does not exist in the current database.
```

**原因**：Prisma Schema 已定义但未迁移到数据库

### 问题 2：需要两步生成流程
用户希望从剧情概述直接生成九宫格图片，需要：
1. **第一步**：使用 LLM 生成 9 个连续的分镜提示词
2. **第二步**：使用提示词生成九宫格图片（3×3，每格 16:9）

---

## 解决方案

### ✅ 已完成的工作

1. **LLM 分镜生成服务**：`src/lib/nine-grid-generator.ts`
   - ✅ 已实现完整的分镜提示词生成逻辑
   - ✅ 支持剧情概述、画面主题、参考图输入
   - ✅ 生成 9 个连续的电影镜头描述

2. **图片生成服务**：`src/lib/nine-grid-image-generator.ts`
   - ✅ 已修复 userId 参数传递问题
   - ✅ 支持九宫格图片生成

3. **新 API 端点**：`src/app/api/chapter/[id]/generate-nine-grid-from-plot/route.ts`
   - ✅ 整合两步流程
   - ✅ 支持从剧情概述生成九宫格
   - ✅ 完整的错误处理和日志记录

4. **数据库迁移 SQL**：`prisma/migrations/create_nine_grid_images_table.sql`
   - ✅ 创建 `nine_grid_images` 表的 SQL 脚本

---

## 实施步骤

### 步骤 1：创建数据库表

**方法 A：使用 SQL 文件（推荐）**

```bash
# 在终端执行
psql $DATABASE_URL -f prisma/migrations/create_nine_grid_images_table.sql
```

**方法 B：直接在数据库管理工具中执行**

打开 `prisma/migrations/create_nine_grid_images_table.sql`，复制 SQL 内容到数据库管理工具（如 pgAdmin、DBeaver）中执行。

**验证表是否创建成功**：

```sql
SELECT * FROM nine_grid_images LIMIT 1;
```

### 步骤 2：重新生成 Prisma Client

```bash
cd /Users/zhangyanhua/AI/manga-maker-ai
npx prisma generate
```

### 步骤 3：重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
pnpm dev
```

---

## API 使用说明

### 新接口：从剧情生成九宫格

**端点**：`POST /api/chapter/{chapterId}/generate-nine-grid-from-plot`

**请求参数**：

```typescript
{
  project_id: string;        // 必需：项目ID
  plot_summary: string;      // 必需：剧情概述
  comic_style_id?: string;   // 可选：漫画风格ID
  reference_image?: string;  // 可选：参考图URL
}
```

**响应**：

```typescript
{
  success: true,
  image_url: string,         // 生成的九宫格图片URL
  nine_grid_id: string,      // 数据库记录ID
  panels: Array<{            // 生成的9个分镜提示词
    panel_order: number,
    description: string,
    visual_prompt: string,
    camera_angle: string,
    shot_size: string,
    panel_type: string,
    importance: string
  }>,
  message: string
}
```

**示例请求**：

```javascript
const response = await fetch(`/api/chapter/${chapterId}/generate-nine-grid-from-plot`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    project_id: 'project-uuid',
    plot_summary: '一个年轻的剑客在森林中遇到了神秘的老人，老人传授给他失传已久的剑法。剑客从怀疑到信任，最终领悟了剑法的真谛。',
    comic_style_id: 'style-uuid',  // 可选
    reference_image: 'https://example.com/character.jpg',  // 可选
  }),
});

const data = await response.json();
console.log('生成的九宫格图片:', data.image_url);
console.log('生成的分镜提示词:', data.panels);
```

### 原有接口：从现有分镜生成九宫格

**端点**：`POST /api/chapter/{chapterId}/generate-nine-grid-image`

**请求参数**：

```typescript
{
  project_id: string;        // 必需：项目ID
  panel_ids: string[];       // 必需：9个分镜ID数组
  comic_style_id?: string;   // 可选：漫画风格ID
  style_prompt?: string;     // 可选：风格提示词
  reference_image?: string;  // 可选：参考图URL
}
```

---

## 前端集成建议

### 修改 NineGridDialog 组件

在 `src/app/scripts/[id]/components/NineGridDialog.tsx` 中添加：

1. **新增模式选择**：
   - 模式 1：从现有分镜生成（原有功能）
   - 模式 2：从剧情概述生成（新功能）

2. **新增表单字段**（模式 2）：
   - 剧情概述输入框（多行文本）
   - 漫画风格选择（复用现有）
   - 参考图选择（复用现有）

3. **生成进度显示**：
   ```
   步骤 1/2：正在生成分镜提示词...
   步骤 2/2：正在生成九宫格图片...
   ```

4. **结果展示**：
   - 显示生成的九宫格图片
   - 可选：显示生成的 9 个分镜提示词

### 示例代码结构

```typescript
// 在 NineGridDialog.tsx 中添加
const [mode, setMode] = useState<'from-panels' | 'from-plot'>('from-panels');
const [plotSummary, setPlotSummary] = useState('');
const [generationStep, setGenerationStep] = useState<1 | 2 | null>(null);

const handleGenerateFromPlot = async () => {
  setGenerationStep(1);
  
  try {
    const response = await fetch(`/api/chapter/${chapterId}/generate-nine-grid-from-plot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        plot_summary: plotSummary,
        comic_style_id: formData.comicStyleId,
        reference_image: formData.referenceImageId,
      }),
    });
    
    setGenerationStep(2);
    
    const data = await response.json();
    
    if (data.success) {
      toast({
        title: '生成成功',
        description: '九宫格图片已生成',
      });
      onSuccess();
    }
  } catch (error) {
    toast({
      title: '生成失败',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setGenerationStep(null);
  }
};
```

---

## 生成流程详解

### 第一步：LLM 生成分镜提示词

**输入**：
- 剧情概述
- 漫画风格（可选）
- 参考图（可选）

**处理**：
1. 调用 `generateNineGridPanels()` 函数
2. 使用 `script_analyzer` 类型的 LLM 提供商
3. 应用专业的电影分镜系统提示词
4. 生成 9 个连续的镜头描述

**输出**：
```json
[
  {
    "panel_order": 1,
    "description": "远景，森林深处，阳光透过树叶洒下斑驳的光影...",
    "visual_prompt": "forest clearing, dappled sunlight, young swordsman...",
    "camera_angle": "正视",
    "shot_size": "远景",
    "panel_type": "action",
    "importance": "high"
  },
  // ... 8 more panels
]
```

### 第二步：生成九宫格图片

**输入**：
- 9 个分镜提示词
- 剧情概述（用于整体描述）
- 风格提示词（可选）
- 参考图（可选）

**处理**：
1. 构建九宫格图片生成提示词
2. 调用 `callImageGenerationByType()` 函数
3. 使用 `image_generation` 类型的提供商
4. 生成尺寸：1536×864（3×3，每格 16:9）

**提示词格式**：
```
根据"[剧情概述]"，生成一张具有凝聚力的3×3网格图像，包含在同一环境中的9个不同摄像机镜头，严格保持人物/物体、服装和光线的一致性，8K分辨率，16：9画幅。

风格：[风格提示词]

参考图：[参考图URL]
请严格保持参考图中的人物外观、服装风格、色彩倾向和美术气质。

镜头01：[visual_prompt_1]
镜头02：[visual_prompt_2]
...
镜头09：[visual_prompt_9]

图1是[主体描述]，图9是[主体描述]。

生成的一定是九宫格，且每个格子比例都是16：9，所有镜头保持视觉一致性。
```

**输出**：
- 九宫格图片（PNG 格式）
- 上传到 MinIO
- 保存记录到数据库

---

## 算力消耗

每次从剧情生成九宫格会消耗：
1. **LLM 调用**：1 次（`script_analyzer` 类型）
2. **图片生成**：1 次（`image_generation` 类型）

总计：2 次算力消耗

---

## 测试清单

### 数据库测试
- [ ] 表 `nine_grid_images` 已创建
- [ ] 索引已创建（`idx_nine_grid_images_user`, `idx_nine_grid_images_chapter`）
- [ ] Prisma Client 已重新生成

### API 测试
- [ ] 新接口可以正常调用
- [ ] 认证检查正常
- [ ] 参数验证正常
- [ ] LLM 生成分镜成功
- [ ] 图片生成成功
- [ ] 图片上传到 MinIO 成功
- [ ] 数据库记录保存成功
- [ ] 算力扣除正常
- [ ] 错误处理正常

### 功能测试
- [ ] 从剧情概述生成九宫格成功
- [ ] 生成的图片是 3×3 布局
- [ ] 每个格子比例接近 16:9
- [ ] 视觉一致性良好
- [ ] 分镜提示词有连续性
- [ ] 漫画风格应用正确
- [ ] 参考图风格继承正确

### 前端测试（待实现）
- [ ] 模式切换正常
- [ ] 剧情输入框正常
- [ ] 生成进度显示正常
- [ ] 结果展示正常
- [ ] 错误提示正常

---

## 注意事项

### 1. 数据库权限
如果 Prisma migrate 失败（权限不足），使用提供的 SQL 文件手动创建表。

### 2. LLM 提供商配置
确保在 `/admin/llm-providers` 中配置了：
- `provider_type: "script_analyzer"` - 用于生成分镜提示词
- `provider_type: "image_generation"` - 用于生成图片

### 3. 图片尺寸
- 总尺寸：1536×864（16:9 比例）
- 每格尺寸：512×288（16:9 比例）
- 3×3 布局

### 4. 算力消耗
每次生成消耗 2 次算力，确保用户有足够的余额。

### 5. 生成时间
整个流程可能需要 30-60 秒：
- LLM 生成：10-20 秒
- 图片生成：20-40 秒

建议在前端显示进度条或加载动画。

---

## 后续优化建议

1. **流式响应**：使用 Server-Sent Events (SSE) 实时推送生成进度
2. **缓存机制**：缓存相似剧情的分镜提示词
3. **批量生成**：支持一次生成多个九宫格
4. **预览功能**：生成前预览分镜提示词
5. **编辑功能**：允许用户编辑生成的提示词后再生成图片
6. **历史记录**：查看和重用之前生成的九宫格

---

## 故障排查

### 问题：表不存在
```
The table `public.nine_grid_images` does not exist
```
**解决**：执行步骤 1 的数据库迁移

### 问题：LLM 返回格式错误
```
AI 返回的内容格式不正确，无法解析为 JSON
```
**解决**：检查 LLM 提供商配置，确保模型支持 JSON 输出

### 问题：图片生成失败
```
需要消耗算力的操作必须提供 userId
```
**解决**：已修复，确保使用最新代码

### 问题：算力不足
```
QUOTA_EXCEEDED
```
**解决**：用户需要充值或等待配额重置

---

## 总结

本次实施完成了从剧情概述直接生成九宫格图片的完整流程，包括：

1. ✅ 数据库表结构设计和迁移 SQL
2. ✅ LLM 分镜提示词生成服务（已存在）
3. ✅ 图片生成服务修复（userId 参数）
4. ✅ 新 API 端点整合两步流程
5. ✅ 完整的错误处理和日志记录
6. ✅ 算力消耗和配额检查
7. 📝 前端集成建议（待实现）

**下一步**：
1. 执行数据库迁移
2. 测试 API 功能
3. 实现前端界面
4. 进行端到端测试
