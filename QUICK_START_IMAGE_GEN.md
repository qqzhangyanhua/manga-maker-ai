# 🚀 三视图生成 - 快速开始

## 📝 完整实现总结

你的三视图生成功能已经完成！以下是完整的架构和使用说明。

---

## 🏗️ 架构设计

```
用户操作
   ↓
前端 (CharacterDetailView)
   ↓
POST /api/character/generate-views
   ↓
┌─────────────────────────────────────┐
│  步骤 1: LLM 优化角色描述           │
│  ├─ callChatCompletionByType        │
│  └─ 输出: 优化后的详细描述           │
└─────────────────────────────────────┘
   ↓
┌─────────────────────────────────────┐
│  步骤 2: 生成三视图                 │
│  ├─ generateThreeViews()            │
│  ├─ 查找 provider (image_generation)│
│  ├─ 调用 SD API (3 次)              │
│  └─ 返回: base64 图片               │
└─────────────────────────────────────┘
   ↓
┌─────────────────────────────────────┐
│  步骤 3: 上传到 MinIO                │
│  ├─ base64ToBuffer()                │
│  ├─ minioClient.putObject() × 3     │
│  └─ 路径: users/{id}/characters/    │
│           {id}/views/{type}.png     │
└─────────────────────────────────────┘
   ↓
┌─────────────────────────────────────┐
│  步骤 4: 保存到数据库                │
│  └─ prisma.characterView.upsert()  │
└─────────────────────────────────────┘
   ↓
返回结果给前端
```

---

## ⚡ 3 步快速配置

### 第 1 步：启动 Stable Diffusion 服务

```bash
# 方法 A: 本地启动（需要 GPU）
cd stable-diffusion-webui
./webui.sh --api --listen

# 方法 B: 使用 Docker
docker run -d -p 7860:7860 --gpus all \
  sd-webui:latest --api
```

### 第 2 步：在管理后台添加配置

访问 **`http://localhost:3000/admin/llm-providers`**

添加配置（复制粘贴）：

```
provider_type: image_generation
provider_name: sd
model: sdxl
base_url: http://localhost:7860
api_key: (留空)
priority: 1
enabled: true
```

点击"新增配置"保存。

### 第 3 步：测试生成

1. 访问 `/assets` (角色库)
2. 点击任意角色 → 详情
3. 切换到"三视图"标签
4. 点击"生成三视图"
5. 等待 30-60 秒
6. 查看生成的正面/侧面/背面视图

---

## 📂 新增文件清单

```
src/lib/
├── image-generation.ts          ✅ 新建（图片生成封装）
│   ├── callImageGenerationByType()
│   ├── generateThreeViews()
│   └── base64ToBuffer()
│
src/app/api/character/
├── generate-views/route.ts      ✅ 已修改（集成图片生成）
│
文档/
├── IMAGE_GENERATION_SETUP.md    ✅ 新建（详细配置指南）
└── QUICK_START_IMAGE_GEN.md     ✅ 新建（快速开始）
```

---

## 🔧 配置参数说明

### LLM Provider 配置项

| 字段 | 作用 | 示例 |
|------|------|------|
| `provider_type` | **关键！**系统通过此字段查找服务 | `image_generation` |
| `provider_name` | 识别服务类型 | `sd`, `comfyui` |
| `model` | 记录使用的模型（不影响调用） | `sdxl`, `anything-v5` |
| `base_url` | **关键！**SD API 地址 | `http://localhost:7860` |
| `api_key` | 认证密钥（SD 通常不需要） | 留空或填写 |
| `priority` | 优先级（数字越小越优先） | `1` |
| `enabled` | 是否启用 | `true` |

### 图片生成参数 (可调整)

编辑 `src/lib/image-generation.ts` 的 `generateThreeViews` 函数：

```typescript
callImageGenerationByType({
  providerType,
  prompt: prompts.front,
  negative_prompt: negativePrompt,
  width: 512,        // 图片宽度
  height: 768,       // 图片高度（3:4 全身比例）
  steps: 25,         // 采样步数（15-30，越大质量越好但越慢）
  cfg_scale: 7.5,    // 提示词引导强度（7-12）
})
```

---

## 🎯 测试检查清单

- [ ] Stable Diffusion 服务运行正常
  ```bash
  curl http://localhost:7860/docs  # 应返回 API 文档
  ```

- [ ] 管理后台配置已添加
  ```bash
  # 检查数据库
  psql -d cartoon -c "SELECT * FROM llm_providers WHERE provider_type='image_generation';"
  ```

- [ ] MinIO 服务正常
  ```bash
  curl http://111.228.37.74:9000/minio/health/live
  ```

- [ ] 生成测试
  - 登录系统
  - 选择角色 → 详情 → 三视图 → 生成
  - 观察浏览器控制台和服务器日志

---

## 📊 预期结果

### 成功情况

**前端显示：**
- 加载动画 → "生成中..."
- 30-60 秒后显示三张图片
- Toast 提示："三视图生成完成"

**MinIO 存储：**
```
http://111.228.37.74:9000/input-image/
  └── users/{userId}/characters/{characterId}/views/
      ├── front.png    ✅
      ├── side.png     ✅
      └── back.png     ✅
```

**数据库记录：**
```sql
SELECT * FROM character_views WHERE character_id = '...';
-- 应有 3 条记录（front, side, back）
```

### 失败情况处理

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| "未找到图片生成服务配置" | Provider 未配置 | 检查 `/admin/llm-providers` |
| "Connection refused" | SD 服务未启动 | 启动 SD WebUI |
| "Timeout" | 生成时间过长 | 减少 steps 或降低分辨率 |
| "CUDA out of memory" | GPU 显存不足 | 降低分辨率或关闭其他程序 |

---

## 🔥 性能优化建议

### 快速模式（适合测试）
```typescript
width: 512,
height: 512,      // 方形，生成更快
steps: 15,        // 减少步数
```

### 高质量模式（适合生产）
```typescript
width: 512,
height: 768,      // 3:4 全身比例
steps: 30,        // 更多步数
```

### 并行生成（高级）
修改 `generateThreeViews` 使用 `Promise.all`（已实现）：
- 同时生成 3 张图片
- 总时间 ≈ 单张时间（而非 3 倍）

---

## 🎨 提示词调优技巧

### 角色描述示例

**好的描述：**
```
蓝色双马尾少女，赛博朋克风格，黑色紧身战斗服，
发光霓虹线条装饰，自信的表情，机械手臂，
全身视图，专业角色设计，高清细节
```

**不好的描述：**
```
一个女孩  # 太简单
```

### 常用关键词

```typescript
// 风格
anime style, cel shading, flat colors  // 动漫
realistic, photorealistic              // 写实
cyberpunk, sci-fi, fantasy            // 主题

// 质量
8k, ultra detailed, professional character design
clean background, white background

// 视角
full body, T-pose, character turnaround
front view, side view, back view
```

---

## 🐛 调试技巧

### 查看详细日志

**服务器端：**
```bash
# Next.js 日志
pnpm dev

# 查看生成过程
开始生成三视图，角色描述: ...
front 视图已上传: http://...
side 视图已上传: http://...
back 视图已上传: http://...
三视图生成完成
```

**浏览器端：**
```javascript
// 打开控制台查看请求
Network → XHR → generate-views

// 查看返回数据
{
  "success": true,
  "views": { ... },
  "prompts": { ... }
}
```

### 测试单个 API 调用

```typescript
// 在浏览器控制台测试
const result = await fetch('/api/character/generate-views', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    character_id: '你的角色ID',
    description: '测试描述'
  })
});

console.log(await result.json());
```

---

## 📚 下一步

现在三视图生成已经完成，你可以：

1. ✅ **表情矩阵生成** - 类似逻辑，生成 9 种表情
2. ✅ **服装变换** - 为不同服装生成图片
3. ✅ **LoRA 训练** - 使用三视图训练角色一致性模型
4. ✅ **批量生成** - 为多个角色批量生成三视图

参考文档：
- `IMAGE_GENERATION_SETUP.md` - 详细配置说明
- `src/lib/image-generation.ts` - 代码实现

---

## 🆘 需要帮助？

检查清单：
- [ ] SD 服务正常运行
- [ ] Provider 配置正确
- [ ] MinIO 可访问
- [ ] 数据库连接正常
- [ ] 网络通畅（前端 ↔ 后端 ↔ SD）

仍有问题？查看：
1. 浏览器控制台错误
2. Next.js 服务器日志
3. SD WebUI 终端输出
4. MinIO 连接状态

---

**🎉 祝你使用愉快！**
