# 配置 Image Edit Provider

本文档说明如何为 AI 图片修改功能配置 LLM Provider。

## 概述

AI 图片修改功能使用 `image_edit` provider type 来生成图片修改提示词。该 provider 负责将用户的修改需求转换为详细的图片生成提示词。

## 配置步骤

### 1. 通过数据库添加 Provider

在 `llm_providers` 表中插入新的 provider 配置：

```sql
INSERT INTO llm_providers (
  provider_type,
  provider_name,
  model,
  base_url,
  api_key,
  priority,
  enabled
) VALUES (
  'image_edit',           -- Provider 类型
  'openai',               -- Provider 名称（如 openai, anthropic 等）
  'gpt-4',                -- 使用的模型
  'https://api.openai.com', -- API 基础 URL
  'sk-your-api-key',      -- API 密钥
  1,                      -- 优先级（数字越小优先级越高）
  true                    -- 是否启用
);
```

### 2. 通过管理界面添加 Provider

1. 登录管理后台：`/admin`
2. 进入 "LLM Providers" 管理页面
3. 点击 "添加 Provider"
4. 填写以下信息：
   - **Provider Type**: `image_edit`
   - **Provider Name**: `openai` 或其他兼容的提供商
   - **Model**: `gpt-4` 或 `gpt-3.5-turbo`
   - **Base URL**: OpenAI 或兼容 API 的基础 URL
   - **API Key**: 你的 API 密钥
   - **Priority**: 1（如果有多个 provider，数字越小优先级越高）
   - **Enabled**: 勾选

### 3. 支持的 Provider

目前支持任何与 OpenAI Chat Completion API 兼容的服务：

- **OpenAI**: `https://api.openai.com`
- **Azure OpenAI**: `https://YOUR-RESOURCE.openai.azure.com`
- **其他兼容服务**: 任何支持 `/v1/chat/completions` 端点的服务

## 工作原理

1. 用户在图片编辑器中输入修改描述
2. 系统调用 `image_edit` provider 的图片生成服务
3. **将原图作为参考图（reference image）**，结合修改需求生成新图
4. 支持多种返回格式：
   - Base64 图片：自动上传到 MinIO
   - 图片 URL：直接使用
   - Markdown 图片链接：提取 URL
5. 更新 Panel 并保存到数据库

## API 使用示例

### 请求

```typescript
POST /api/panel/{panelId}/ai-edit

{
  "imageUrl": "https://example.com/image.png",  // 原图 URL（作为参考）
  "modifyPrompt": "把背景换成晴朗的天空，增加阳光效果"
}
```

### 响应

```json
{
  "success": true,
  "imageUrl": "https://example.com/new-image.png",
  "optimizedPrompt": "漫画面板, 把背景换成晴朗的天空，增加阳光效果, manga style, high quality, detailed",
  "message": "图片修改成功"
}
```

### 实现细节

API 内部调用 `callImageGenerationByType` 时传递参考图：

```typescript
const result = await callImageGenerationByType({
  providerType: "image_edit",
  prompt: fullPrompt,
  width: 1024,
  height: 768,
  referenceImageUrls: [imageUrl],  // 关键：原图作为参考
});
```

参考图会被转换为 base64 并作为 multimodal content 发送给 LLM，LLM 可以"看到"原图并根据修改需求生成新图。

## 注意事项

1. **API Key 安全**: 确保 API Key 安全存储，不要提交到版本控制
2. **参考图大小**: 参考图会被转换为 base64，图片过大可能影响性能
3. **成本控制**: 每次 AI 修改都会消耗 API 调用额度和配额，建议设置使用限制
4. **性能**: 图片生成可能需要较长时间（通常 10-30 秒）
5. **支持的服务**: 需要使用支持 multimodal（图文混合）输入的 LLM，如：
   - OpenAI GPT-4 Vision
   - Google Gemini Pro Vision
   - Anthropic Claude 3 (Opus/Sonnet/Haiku)
   - 其他兼容 OpenAI multimodal API 的服务

## 未来改进

- [x] ~~集成 img2img API~~ (已实现：通过 referenceImageUrls)
- [ ] 支持局部修改（Inpainting/遮罩编辑）
- [ ] 支持风格转换
- [ ] 添加图片生成进度查询
- [ ] 支持批量修改
- [ ] 支持多个参考图（已支持 API，待前端实现）
- [ ] 优化参考图传输（压缩、CDN 加速）
