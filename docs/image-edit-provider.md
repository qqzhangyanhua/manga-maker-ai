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
2. 系统调用 `image_edit` provider 将修改描述转换为详细提示词
3. （TODO）使用生成的提示词调用图片生成 API（Stable Diffusion img2img）
4. 将生成的图片上传到存储并更新 Panel

## API 使用示例

### 请求

```typescript
POST /api/panel/{panelId}/ai-edit

{
  "imageUrl": "https://example.com/image.png",
  "modifyPrompt": "把背景换成晴朗的天空，增加阳光效果"
}
```

### 响应

```json
{
  "success": true,
  "imageUrl": "https://example.com/new-image.png",
  "optimizedPrompt": "bright sunny sky, warm sunlight, clear blue atmosphere...",
  "message": "图片修改成功"
}
```

## 注意事项

1. **API Key 安全**: 确保 API Key 安全存储，不要提交到版本控制
2. **图片生成**: 当前 API 端点返回占位符图片，需要集成真实的图片生成服务（如 Stable Diffusion）
3. **成本控制**: 每次 AI 修改都会消耗 API 调用额度，建议设置使用限制
4. **性能**: 图片生成可能需要较长时间，建议使用异步队列处理

## 未来改进

- [ ] 集成 Stable Diffusion img2img API
- [ ] 支持局部修改（Inpainting）
- [ ] 支持风格转换
- [ ] 添加图片生成进度查询
- [ ] 支持批量修改
