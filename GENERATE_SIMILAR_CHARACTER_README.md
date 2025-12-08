# 生成相似角色功能说明

## 功能概述

"生成相似角色"是一个基于现有角色快速生成变体角色的功能，允许用户通过自然语言描述变化需求，AI 自动生成 1-3 个角色变体，用户可选择满意的结果保存到角色库。

## 使用场景

1. **角色变体创作**：基于主角生成配角/反派/家人等相似角色
2. **快速迭代**：对角色外观不满意时，快速生成替代方案
3. **系列角色**：创建同一世界观下的角色系列（如不同职业的队友）

## 使用步骤

### 1. 进入角色详情页

1. 访问资产库页面（`/assets`）
2. 点击任意角色卡片，进入角色详情页
3. 在页面右上角找到"生成相似角色"按钮

### 2. 输入变化描述

点击按钮后，会弹出对话框，包含以下选项：

- **变化描述**（必填）：用自然语言描述你想要的变化，例如：
  - "把头发改成银色，眼睛改成蓝色"
  - "年龄设定为少年，身材更瘦小"
  - "服装改成现代校服风格"
  - "性别改为女性，增加长发"

- **生成数量**（必选）：选择生成 1 张、2 张或 3 张

### 3. 开始生成

1. 输入完成后，点击"开始生成"按钮
2. 系统将：
   - 使用 LLM 分析原角色特征
   - 结合你的变化描述生成优化的 AI 绘画提示词
   - 并发生成指定数量的角色图片
3. 预计等待时间：约 10 秒 × 生成数量（取决于图片生成服务器性能）

### 4. 预览和选择

生成完成后，会在对话框中显示所有生成的图片：

- 图片以卡片形式展示，支持多选
- 点击图片卡片可选中/取消选中
- 可以看到每张图片使用的优化提示词

### 5. 保存到角色库

1. 选择满意的图片（至少 1 张）
2. 点击"保存选中的角色"按钮
3. 系统会自动：
   - 为每张图片创建新角色
   - 命名格式：`{原角色名} (变体1/2/3)`
   - 继承原角色的标签，并添加"AI生成"和"相似角色"标签
   - 在描述中记录变化内容

## 配置要求

### 1. LLM Provider 配置（必需）

该功能需要配置 `character_analyzer` 类型的 LLM provider：

```sql
INSERT INTO llm_providers (provider_type, provider_name, model, base_url, api_key, priority, enabled)
VALUES (
  'character_analyzer',
  'openai',
  'gpt-4',
  'https://api.openai.com',
  'sk-your-api-key',
  1,
  true
);
```

**配置说明：**
- `provider_type`: 必须是 `character_analyzer`
- `provider_name`: LLM 服务商，支持 OpenAI 兼容的 API
- `model`: 模型名称（推荐 GPT-4 或 GPT-3.5-turbo）
- `base_url`: API 地址
- `api_key`: API 密钥
- `priority`: 优先级（数字越小优先级越高）
- `enabled`: 是否启用

### 2. 图片生成服务配置（必需）

该功能还需要配置 `image_generation` 类型的 provider（用于实际生成图片）：

```sql
INSERT INTO llm_providers (provider_type, provider_name, model, base_url, api_key, priority, enabled)
VALUES (
  'image_generation',
  'sd',  -- stable-diffusion
  'sdxl',
  'http://your-sd-server:7860',
  '',  -- SD 通常不需要 API key
  1,
  true
);
```

**配置说明：**
- `provider_type`: 必须是 `image_generation`
- `provider_name`: 图片生成服务类型
  - `sd` / `stable-diffusion` / `automatic1111` - Stable Diffusion (Automatic1111 WebUI)
  - `comfyui` - ComfyUI（暂未实现）
- `base_url`: 图片生成服务器地址（如 Stable Diffusion WebUI 的地址）
- `model`: 模型名称（可以填写使用的 SD 模型，如 `sdxl`）

### 3. 配置管理界面

管理员可以在 `/admin/llm-providers` 页面管理所有 LLM provider 配置。

## API 接口说明

### POST `/api/character/generate-similar`

生成相似角色的 API 端点。

**请求头：**
```
Content-Type: application/json
Cookie: comicai_session={jwt_token}  # 需要登录
```

**请求体：**
```json
{
  "character_id": "uuid",           // 原角色ID
  "variation_prompt": "string",     // 变化描述
  "count": 1 | 2 | 3,               // 生成数量
  "provider_type": "image_generation" // 可选，图片生成服务类型
}
```

**响应体（成功）：**
```json
{
  "success": true,
  "generated_images": [
    {
      "image_url": "data:image/png;base64,...",  // base64 格式的图片
      "optimized_prompt": "string"               // LLM 生成的优化提示词
    }
  ],
  "original_character": {
    "name": "string",
    "description": "string",
    "tags": ["string"]
  },
  "variation_prompt": "string",
  "message": "成功生成 N 个角色变体"
}
```

**响应体（失败）：**
```json
{
  "error": "错误描述",
  "details": "详细错误信息（可选）"
}
```

**错误码：**
- `400` - 参数错误（缺少必填字段、生成数量不合法等）
- `401` - 未登录或 token 无效
- `404` - 角色不存在或无权访问
- `500` - 服务器错误（LLM 调用失败、图片生成失败等）

## 技术架构

### 流程图

```
用户输入变化描述 + 选择生成数量
    ↓
API 验证用户登录和角色所有权
    ↓
获取原角色信息（name, description, tags）
    ↓
调用 LLM (character_analyzer)
    ↓
LLM 分析角色特征 + 结合变化描述
    ↓
生成优化的 AI 绘画提示词
    ↓
并发调用图片生成 API (image_generation)
    ↓
返回 base64 图片数组
    ↓
前端展示预览，用户选择
    ↓
用户点击保存 → 调用 POST /api/character
    ↓
创建新角色，继承标签和描述
```

### 关键组件

1. **后端 API**：`src/app/api/character/generate-similar/route.ts`
2. **前端对话框**：`src/components/AssetLibrary/GenerateSimilarDialog.tsx`
3. **LLM 调用**：`src/lib/llm-provider.ts` - `callChatCompletionByType()`
4. **图片生成**：`src/lib/image-generation.ts` - `callImageGenerationByType()`

### 数据流

1. **输入**：`character_id`, `variation_prompt`, `count`
2. **LLM 处理**：
   - System Prompt：角色设计师角色定义
   - User Message：原角色信息 + 变化要求
   - Output：优化的 AI 绘画提示词
3. **图片生成**：
   - Prompt：LLM 生成的提示词
   - Negative Prompt：通用负面提示词（避免低质量、多人等）
   - 参数：512x768（3:4 人物比例）、25 步、CFG 7.5
4. **输出**：Base64 图片数组 + 提示词

## 性能优化

1. **并发生成**：多张图片同时生成，而非串行，减少总等待时间
2. **Base64 临时存储**：生成的图片先以 base64 返回，只有用户保存时才上传到 MinIO
3. **错误容错**：单张图片生成失败不影响其他图片，返回成功生成的部分

## 常见问题

### Q1: 生成失败，提示"未找到可用的模型配置"

**原因**：未配置 `character_analyzer` 或 `image_generation` 类型的 LLM provider。

**解决方法**：
1. 进入 `/admin/llm-providers` 页面
2. 添加对应类型的配置（参考上文"配置要求"部分）

### Q2: 生成的图片与描述不符

**原因**：LLM 生成的提示词可能不够精确，或图片生成模型理解有偏差。

**解决方法**：
1. 使用更详细、具体的变化描述
2. 调整 LLM 的 temperature 参数（在代码中默认为 0.7）
3. 尝试更换更强大的 LLM 模型（如 GPT-4）
4. 多生成几次，选择最满意的结果

### Q3: 生成速度很慢

**原因**：图片生成服务器性能不足，或网络延迟。

**解决方法**：
1. 使用本地部署的 Stable Diffusion 服务器（推荐）
2. 减少生成步数（在代码中调整 `steps` 参数，默认 25）
3. 使用更快的图片生成模型
4. 一次只生成 1 张图片

### Q4: 保存的角色没有出现在列表中

**原因**：前端列表没有自动刷新。

**解决方法**：
1. 点击"返回角色列表"按钮
2. 手动刷新页面（F5）
3. 或者在代码中添加自动刷新逻辑

## 未来改进

1. **流式生成**：每生成一张图片立即显示，不必等待全部完成
2. **批量保存优化**：一次性上传所有选中的图片，而非串行保存
3. **生成历史**：记录用户的生成历史，支持重新选择
4. **高级选项**：允许用户调整图片生成参数（尺寸、步数、CFG 等）
5. **相似度控制**：添加滑块控制变化幅度（轻微 / 中等 / 显著）

## 更新日志

- **2025-12-08**：首次实现"生成相似角色"功能
  - 后端 API：POST `/api/character/generate-similar`
  - 前端组件：`GenerateSimilarDialog`
  - LLM Provider 类型：`character_analyzer`
  - 支持 1-3 张图片并发生成
  - Base64 临时预览 + 选择保存机制
