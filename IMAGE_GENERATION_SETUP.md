# 🎨 AI 图片生成服务配置指南

本文档介绍如何配置 AI 图片生成服务用于角色三视图生成、表情矩阵等功能。

## 📋 配置步骤

### 1. 准备 Stable Diffusion 服务

你需要一个 Stable Diffusion API 服务，有以下选项：

#### 选项 A：自建 Stable Diffusion (推荐)

使用 **Automatic1111 WebUI**：

```bash
# 克隆仓库
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# 启动（需要 GPU）
./webui.sh --api --listen

# 服务将运行在 http://localhost:7860
# API 端点: http://localhost:7860/sdapi/v1/txt2img
```

**推荐模型：**
- **SDXL 1.0** - 高质量通用模型
- **Anything V5** - 动漫风格角色
- **Realistic Vision** - 写实风格

#### 选项 B：租用 GPU 服务器

- **RunPod**: https://www.runpod.io/ (~$0.3/小时)
- **Vast.ai**: https://vast.ai/ (~$0.2/小时)
- **Lambda Labs**: https://lambdalabs.com/

部署 Automatic1111 模板，开启 API 访问。

---

### 2. 在管理后台添加配置

访问 `/admin/llm-providers` 页面，添加新配置：

#### 配置参数说明：

| 字段 | 值 | 说明 |
|------|-----|------|
| **provider_type** | `image_generation` | ✅ 必须，系统通过此字段识别图片生成服务 |
| **provider_name** | `sd` 或 `stable-diffusion` | 服务类型标识 |
| **model** | `sdxl` 或 `anything-v5` | 模型名称（仅供记录，不影响调用） |
| **base_url** | `http://your-server:7860` | ✅ 必须，SD API 地址 |
| **api_key** | 留空 | SD 通常不需要 API Key |
| **priority** | `1` | 数字越小优先级越高 |
| **enabled** | `true` | 启用此配置 |

#### 示例配置：

**自建服务器（本地）：**
```
provider_type: image_generation
provider_name: sd
model: sdxl
base_url: http://localhost:7860
api_key: (留空)
priority: 1
enabled: true
```

**租用服务器（公网）：**
```
provider_type: image_generation
provider_name: sd
model: anything-v5
base_url: http://123.45.67.89:7860
api_key: (如果设置了认证则填写)
priority: 1
enabled: true
```

---

### 3. 测试配置

#### 方法 1：通过界面测试

1. 登录系统
2. 进入角色库（Assets）
3. 选择一个角色 → 点击详情
4. 切换到"三视图"标签
5. 点击"生成三视图"按钮
6. 等待生成（约 30-60 秒）

#### 方法 2：通过 API 测试

```bash
# 获取登录 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# 测试生成三视图
curl -X POST http://localhost:3000/api/character/generate-views \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "角色ID",
    "description": "蓝色双马尾少女，赛博朋克风格"
  }'
```

---

## 🔧 高级配置

### 多个图片生成服务

你可以配置多个 provider，系统会按 `priority` 排序选择：

```
# 配置 1：高质量服务（优先使用）
provider_type: image_generation
priority: 1
base_url: http://high-quality-server:7860

# 配置 2：备用服务（主服务故障时使用）
provider_type: image_generation  
priority: 2
base_url: http://backup-server:7860
```

### 专用三视图服务

为三视图单独配置更适合的模型：

```
provider_type: three_view_gen
provider_name: sd
model: realistic-vision
base_url: http://your-server:7860
priority: 1
enabled: true
```

然后在代码中指定：
```typescript
const result = await generateThreeViews(
  characterDescription,
  "three_view_gen"  // 使用专用服务
);
```

---

## 🎯 提示词优化建议

系统会自动优化提示词，但你可以在角色描述中包含以下关键词提高生成质量：

### 风格类
- `anime style` - 动漫风格
- `realistic` - 写实风格
- `cyberpunk` - 赛博朋克
- `fantasy` - 奇幻风格

### 质量类
- `8k, ultra detailed` - 高分辨率
- `professional character design` - 专业角色设计
- `clean background` - 干净背景
- `full body` - 全身视图

### 角色特征
- 明确描述：发型、发色、服装、配饰
- 表情：`confident expression`, `neutral face`
- 姿势：`T-pose`, `standing`, `looking at camera`

---

## ❓ 常见问题

### Q1: 生成速度慢怎么办？

**解决方案：**
1. 减少 `steps` 参数（默认 25，可降至 15-20）
2. 使用更快的采样器（如 `DPM++ SDE Karras`）
3. 降低分辨率（512x512 比 1024x1024 快 4 倍）

编辑 `src/lib/image-generation.ts` 修改默认参数：
```typescript
steps: 15,  // 从 25 改为 15
cfg_scale: 7,  // 保持不变
```

### Q2: 生成的图片不符合预期

**解决方案：**
1. 优化角色描述，使用更具体的词汇
2. 调整 `cfg_scale`（7-12 之间，数值越大越符合提示词）
3. 尝试不同的模型（动漫角色推荐 Anything V5）

### Q3: 出现"未找到图片生成服务配置"错误

**检查清单：**
- ✅ 确认在 `/admin/llm-providers` 添加了配置
- ✅ `provider_type` 必须是 `image_generation`
- ✅ `enabled` 设置为 `true`
- ✅ `base_url` 格式正确（`http://` 或 `https://`）

### Q4: SD 服务器报错"Connection refused"

**解决方案：**
1. 检查 SD 服务是否运行：`curl http://localhost:7860`
2. 确认启动时使用了 `--api` 参数
3. 如果是远程服务器，检查防火墙设置

### Q5: 图片质量不佳

**优化建议：**
1. 使用更好的模型（SDXL 优于 SD 1.5）
2. 增加 `steps` 参数（25-30）
3. 调整 `cfg_scale`（尝试 8-10）
4. 添加负面提示词（negative_prompt）

---

## 📊 性能参考

| 配置 | 生成时间 | 质量 | GPU 要求 |
|------|---------|------|---------|
| SD 1.5 + 512x512 + 20 steps | 5-10 秒 | 中等 | 4GB VRAM |
| SDXL + 512x768 + 25 steps | 15-30 秒 | 高 | 8GB VRAM |
| SDXL + 1024x1024 + 30 steps | 60-120 秒 | 极高 | 12GB VRAM |

---

## 🔐 安全建议

1. **不要将 SD 服务暴露在公网**（使用内网或 VPN）
2. 如果必须公网访问，启用 API 认证
3. 定期更新 SD WebUI 到最新版本
4. 使用环境变量存储敏感配置（如 API Key）

---

## 📚 相关资源

- **Stable Diffusion WebUI**: https://github.com/AUTOMATIC1111/stable-diffusion-webui
- **模型下载**: https://civitai.com/
- **提示词指南**: https://prompthero.com/
- **ComfyUI**: https://github.com/comfyanonymous/ComfyUI

---

## 🆘 获取帮助

如遇问题：
1. 查看浏览器控制台和服务器日志
2. 检查 SD 服务的日志输出
3. 参考本文档的"常见问题"部分

需要技术支持请联系开发团队。
