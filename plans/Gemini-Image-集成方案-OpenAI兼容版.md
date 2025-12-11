# Gemini Imagen 集成方案 (OpenAI 兼容架构)

**生成时间**: 2025-12-11  
**架构**: 基于 OpenAI API 格式的统一 Provider 管理  
**管理入口**: `/admin/llm-providers`

---

## 一、现有架构分析

### 1.1 您的 Provider 管理架构

```
/admin/llm-providers (统一配置管理)
  ↓
llm_providers 表
  ├── provider_type: "image_generation" | "text_generation" | ...
  ├── provider_name: "openai" | "gemini" | "sd" | ...
  ├── model: 模型名称
  ├── base_url: API 端点
  ├── api_key: 认证密钥
  ├── priority: 优先级 (数字越小越优先)
  └── enabled: 是否启用
       ↓
应用根据 provider_type 自动选择
  ├── "image_generation" → 图像生成场景
  ├── "text_generation" → LLM 对话场景
  └── 其他类型...
```

### 1.2 核心优势

✅ **统一管理**: 所有 AI 服务在一个界面配置  
✅ **灵活切换**: 通过 priority 控制默认服务  
✅ **多 Provider 支持**: 同一 type 可配置多个备用  
✅ **无需代码改动**: 新增服务只需配置数据库

---

## 二、Gemini 集成策略

### 2.1 核心问题

**Gemini Imagen API 并不兼容 OpenAI 格式**

| API | 请求格式 | 响应格式 |
|-----|---------|---------|
| **OpenAI** | `POST /v1/images/generations`<br>`{ model, prompt, n, size }` | `{ data: [{ b64_json }] }` |
| **Gemini** | `POST /v1/models/imagen-3:generateImages`<br>`{ prompt, numberOfImages, aspectRatio }` | `{ images: [{ imageData }] }` |

### 2.2 解决方案

#### 方案 A: 使用 OpenAI 格式代理 (推荐)

找一个 Gemini → OpenAI 格式的代理服务:

**选项 1**: OneAPI (开源聚合网关)
- 项目地址: https://github.com/songquanpeng/one-api
- 支持将 Gemini 转换为 OpenAI 格式
- 部署后可直接对接您的系统

**配置示例**:
```sql
INSERT INTO llm_providers (
  provider_type, provider_name, model, base_url, api_key, priority, enabled
) VALUES (
  'image_generation',
  'gemini',
  'imagen-3',  -- OneAPI 会转换为实际模型
  'https://your-oneapi-domain.com',  -- OneAPI 部署地址
  'sk-xxxxxx',  -- OneAPI 生成的 token
  1,
  true
);
```

**优点**:
- ✅ 无需修改代码,直接复用现有逻辑
- ✅ 支持多种 AI 服务统一接口
- ✅ 内置请求重试、负载均衡

**缺点**:
- ❌ 需要额外部署服务 (Docker 一键部署)
- ❌ 增加一层网络开销

---

#### 方案 B: 扩展 `image-generation.ts` 支持 Gemini 原生 API

在现有的 [`callImageGenerationByType()`](../src/lib/image-generation.ts:59-97) 中增加 Gemini 分支:

```typescript
// src/lib/image-generation.ts

// 在 switch 语句中添加
case "gemini":
case "imagen":
  return await callGeminiNativeAPI(
    provider.base_url,
    provider.model,
    imageParams,
    provider.api_key
  );
```

**实现 Gemini 原生调用**:

```typescript
async function callGeminiNativeAPI(
  baseUrl: string,
  model: string,
  params: ImageGenerationParams,
  apiKey: string
): Promise<ImageGenerationResult> {
  const { prompt, width = 1024, height = 1024 } = params;

  // Gemini API 端点格式
  const endpoint = `${normalizeBaseUrl(baseUrl)}/v1/models/${model}:generateImages`;

  // 计算长宽比
  const aspectRatio = inferAspectRatio(width, height);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey, // Gemini 使用 x-goog-api-key header
      },
      body: JSON.stringify({
        prompt,
        numberOfImages: 1,
        aspectRatio, // "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
        // 可选: 安全设置
        safetySettings: {
          harassment: "BLOCK_LOW",
          hateSpeech: "BLOCK_MEDIUM",
          sexuallyExplicit: "BLOCK_MEDIUM",
          dangerousContent: "BLOCK_LOW",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 处理安全过滤错误
      if (errorData.error?.message?.includes("SAFETY") || 
          errorData.error?.code === 400) {
        console.warn("Gemini 安全过滤触发,尝试软化提示词");
        return await callGeminiNativeAPI(
          baseUrl,
          model,
          { ...params, prompt: sanitizePromptForGemini(params.prompt) },
          apiKey
        );
      }

      throw new Error(`Gemini API 失败: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    // Gemini 返回格式: { images: [{ imageData: "base64..." }] }
    const images = data.images?.map((img: any) => img.imageData) || [];

    return {
      success: true,
      images,
      info: JSON.stringify({ model, aspectRatio }),
    };
  } catch (error) {
    console.error("Gemini 调用失败:", error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

// 长宽比推导
function inferAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9/16) < 0.1) return "9:16";
  if (Math.abs(ratio - 4/3) < 0.1) return "4:3";
  if (Math.abs(ratio - 3/4) < 0.1) return "3:4";
  return "1:1"; // 默认
}
```

**安全词过滤** (新建文件):

```typescript
// src/lib/prompt-sanitizer.ts

const GEMINI_SAFETY_REPLACEMENTS: Record<string, string> = {
  // 暴力相关
  "blood": "red liquid",
  "bleeding": "injured",
  "kill": "defeat",
  "murder": "confront",
  "death": "fallen",
  
  // 武器相关
  "gun": "device",
  "rifle": "tool",
  "knife": "blade",
  "sword": "weapon",
  "bomb": "explosive",
  
  // 战斗场景
  "war": "conflict",
  "battle": "confrontation",
  "fight": "struggle",
  "wound": "mark",
  "injury": "damage",
};

export function sanitizePromptForGemini(prompt: string): string {
  let sanitized = prompt;
  
  for (const [unsafe, safe] of Object.entries(GEMINI_SAFETY_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${unsafe}\\b`, 'gi');
    sanitized = sanitized.replace(regex, safe);
  }
  
  // 添加风格前缀软化
  sanitized = `artistic manga illustration, stylized ${sanitized}`;
  
  return sanitized;
}
```

**优点**:
- ✅ 完全控制,可定制参数
- ✅ 无需额外部署

**缺点**:
- ❌ 需要修改代码
- ❌ 每次新增 Provider 需要写适配逻辑

---

### 2.3 推荐实施路径

#### 🎯 短期 (1-2天): 方案 B (代码扩展)

直接修改 [`image-generation.ts`](../src/lib/image-generation.ts),快速验证 Gemini 效果。

#### 🚀 长期 (1周后): 迁移到 OneAPI (方案 A)

如果效果好,部署 OneAPI 统一所有 AI 服务:
```
OneAPI
├── Gemini Imagen (图像生成)
├── Claude (文本生成)
├── GPT-4 (文本生成)
└── 其他服务...
```

---

## 三、完整实施步骤

### Phase 1: 代码集成 (1-2天)

#### 步骤 1: 修改 `image-generation.ts`

```typescript
// src/lib/image-generation.ts

// 在 callImageGenerationByType() 的 switch 中添加:
export async function callImageGenerationByType(
  params: { providerType: string } & ImageGenerationParams
): Promise<ImageGenerationResult> {
  const { providerType, ...imageParams } = params;
  const provider = await ensureLlmProvider(providerType);

  switch (provider.provider_name.toLowerCase()) {
    case "sd":
    case "stable-diffusion":
    case "automatic1111":
      return await callStableDiffusionAPI(provider.base_url, imageParams, provider.api_key);

    case "openai":
    case "dall-e":
    case "dalle":
      return await callOpenAIImageAPI(
        provider.base_url,
        provider.model || "dall-e-3",
        imageParams,
        provider.api_key
      );

    // ✅ 新增 Gemini 支持
    case "gemini":
    case "imagen":
      return await callGeminiNativeAPI(
        provider.base_url,
        provider.model || "imagen-3",
        imageParams,
        provider.api_key
      );

    case "comfyui":
      throw new Error("ComfyUI 支持暂未实现");

    default:
      throw new Error(`不支持的 provider_name: ${provider.provider_name}`);
  }
}
```

#### 步骤 2: 添加 Gemini 调用函数

将上面的 `callGeminiNativeAPI()` 和 `inferAspectRatio()` 添加到文件末尾。

#### 步骤 3: 创建安全词过滤

新建 `src/lib/prompt-sanitizer.ts`,添加 `sanitizePromptForGemini()` 函数。

---

### Phase 2: 数据库配置 (5分钟)

在 `/admin/llm-providers` 添加配置:

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
  'image_generation',
  'gemini',  -- 关键: 触发 switch case
  'imagen-3',
  'https://generativelanguage.googleapis.com',
  'YOUR_GEMINI_API_KEY',  -- 从 Google AI Studio 获取
  1,  -- 设为最高优先级
  true
);
```

**获取 API Key**:
1. 访问: https://aistudio.google.com/app/apikey
2. 创建新 API Key
3. 复制到 `api_key` 字段

---

### Phase 3: 测试验证 (1小时)

#### 测试 1: 基础生成

```bash
# 通过 API 测试
curl -X POST http://localhost:3000/api/character/generate-views \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "YOUR_CHARACTER_ID",
    "description": "anime girl with blue hair, cyberpunk style"
  }'
```

**期望结果**:
- ✅ 返回 3 张 base64 图片
- ✅ 图片上传到 MinIO
- ✅ 数据库写入 `character_views` 表

#### 测试 2: 安全过滤处理

```bash
# 测试敏感词
curl ... -d '{
  "character_id": "...",
  "description": "warrior with bloody sword in battle scene"
}'
```

**期望行为**:
1. 第一次调用触发安全过滤
2. 自动软化提示词: "warrior with red liquid blade in confrontation scene"
3. 重试成功返回图片

#### 测试 3: 前端测试

1. 访问 `/assets` → 选择角色 → 详情
2. 点击"生成三视图"
3. 观察控制台和网络请求
4. 确认图片显示正常

---

## 四、优化建议

### 4.1 支持参考图 (角色一致性)

Gemini 支持在请求中传入参考图提高一致性:

```typescript
// src/lib/image-generation.ts

async function callGeminiNativeAPI(
  baseUrl: string,
  model: string,
  params: ImageGenerationParams & { referenceImages?: string[] }, // 新增
  apiKey: string
): Promise<ImageGenerationResult> {
  const { prompt, referenceImages, width = 1024, height = 1024 } = params;

  const requestBody: any = {
    prompt,
    numberOfImages: 1,
    aspectRatio: inferAspectRatio(width, height),
  };

  // ✅ 添加参考图支持
  if (referenceImages && referenceImages.length > 0) {
    requestBody.referenceImages = referenceImages.map(url => ({
      imageUrl: url,
      weight: 0.7, // 参考权重 0-1
    }));
  }

  // ... 其余代码
}
```

**使用示例**:

```typescript
// 生成新表情时使用三视图作为参考
const character = await prisma.character.findUnique({
  where: { id: characterId },
  include: { views: true },
});

const referenceImages = character.views.map(v => v.image_url);

const result = await callImageGenerationByType({
  providerType: "image_generation",
  prompt: `${character.description}, happy expression`,
  referenceImages, // 传入参考图
});
```

---

### 4.2 智能 Provider 切换

如果 Gemini 失败 (安全过滤/配额超限),自动切换到备用服务:

```typescript
// src/lib/image-generation.ts

export async function callImageGenerationByType(
  params: { providerType: string } & ImageGenerationParams
): Promise<ImageGenerationResult> {
  const { providerType, ...imageParams } = params;

  // 获取所有可用 Provider (按 priority 排序)
  const providers = await prisma.llmProvider.findMany({
    where: { provider_type: providerType, enabled: true },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
  });

  if (providers.length === 0) {
    throw new Error(`未找到可用的 ${providerType} 配置`);
  }

  // 依次尝试每个 Provider
  for (const provider of providers) {
    try {
      console.log(`尝试使用 Provider: ${provider.provider_name} (优先级 ${provider.priority})`);
      
      const result = await callProviderAPI(provider, imageParams);
      
      if (result.success) {
        return result;
      }

      console.warn(`Provider ${provider.provider_name} 返回失败: ${result.error}`);
    } catch (error) {
      console.error(`Provider ${provider.provider_name} 异常:`, error);
    }
  }

  throw new Error("所有 Provider 均失败");
}

function callProviderAPI(
  provider: LlmProvider,
  params: ImageGenerationParams
): Promise<ImageGenerationResult> {
  switch (provider.provider_name.toLowerCase()) {
    case "gemini":
      return callGeminiNativeAPI(provider.base_url, provider.model, params, provider.api_key);
    case "openai":
      return callOpenAIImageAPI(provider.base_url, provider.model, params, provider.api_key);
    case "sd":
      return callStableDiffusionAPI(provider.base_url, params, provider.api_key);
    default:
      throw new Error(`未知 Provider: ${provider.provider_name}`);
  }
}
```

**配置示例** (多个备用):

```sql
-- 主力: Gemini (优先级 1)
INSERT INTO llm_providers (...) VALUES ('image_generation', 'gemini', 'imagen-3', ..., 1, true);

-- 备用 1: DALL-E (优先级 2)
INSERT INTO llm_providers (...) VALUES ('image_generation', 'openai', 'dall-e-3', ..., 2, true);

-- 备用 2: SD (优先级 3)
INSERT INTO llm_providers (...) VALUES ('image_generation', 'sd', 'sdxl', ..., 3, true);
```

---

### 4.3 监控与日志

在 [`generation_logs`](../prisma/schema.prisma:247-262) 表中记录每次调用:

```typescript
// src/lib/image-generation.ts

export async function callImageGenerationByType(
  params: { providerType: string; userId?: string } & ImageGenerationParams
): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  const provider = await ensureLlmProvider(params.providerType);

  try {
    const result = await callProviderAPI(provider, params);

    // ✅ 记录成功日志
    await logGeneration({
      userId: params.userId,
      action: "image_generation",
      providerType: params.providerType,
      status: "success",
      durationMs: Date.now() - startTime,
      requestPayload: { prompt: params.prompt, provider: provider.provider_name },
      responsePayload: { imageCount: result.images.length },
    });

    return result;
  } catch (error) {
    // ❌ 记录失败日志
    await logGeneration({
      userId: params.userId,
      action: "image_generation",
      providerType: params.providerType,
      status: "failed",
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "未知错误",
    });

    throw error;
  }
}
```

---

## 五、缺失功能补全建议

根据报告分析,以下功能仍需实现:

### 1. LoRA 训练系统 (高优先级)

**推荐方案**: 集成 Replicate API

```typescript
// src/lib/lora-training.ts (新建)

import Replicate from "replicate";

export async function trainCharacterLora(
  characterId: string,
  trainingImages: string[]
): Promise<string> {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const training = await replicate.trainings.create(
    "ostris/flux-dev-lora-trainer",
    "e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497",
    {
      destination: `your-username/character-${characterId}`,
      input: {
        steps: 1000,
        lora_rank: 16,
        optimizer: "adamw8bit",
        batch_size: 1,
        resolution: "512,768,1024",
        autocaption: true,
        input_images: trainingImages.join(","),
        trigger_word: `sks_${characterId.slice(0, 8)}`,
      },
    }
  );

  // 更新数据库
  await prisma.character.update({
    where: { id: characterId },
    data: {
      training_status: "training",
      lora_model_url: `replicate://training/${training.id}`,
    },
  });

  return training.id;
}
```

---

### 2. 漫画导出功能

```bash
npm install jspdf jszip
```

```typescript
// src/lib/comic-export.ts (新建)

import { jsPDF } from "jspdf";
import JSZip from "jszip";

export async function exportComicToPDF(projectId: string): Promise<Blob> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { panels: { orderBy: { panel_order: "asc" } } },
  });

  if (!project) throw new Error("项目不存在");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < project.panels.length; i++) {
    const panel = project.panels[i];
    
    if (i > 0) pdf.addPage();

    if (panel.generated_image) {
      const imgResponse = await fetch(panel.generated_image);
      const imgBlob = await imgResponse.blob();
      const imgData = await blobToBase64(imgBlob);
      
      pdf.addImage(imgData, "PNG", 10, 10, 190, 140);
    }

    if (panel.dialogue) {
      pdf.setFontSize(12);
      pdf.text(panel.dialogue, 10, 160, { maxWidth: 190 });
    }
  }

  return pdf.output("blob");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

---

### 3. 提示词优化器

```typescript
// src/lib/prompt-optimizer.ts (新建)

import { callChatCompletionByType } from "./llm-provider";

export async function optimizePromptWithLLM(
  userInput: string,
  context?: {
    panelType?: "closeup" | "medium" | "wide" | "action";
    style?: string;
    characterDescription?: string;
  }
): Promise<string> {
  const systemPrompt = `你是专业的漫画分镜提示词专家。
将用户的简单描述转换为详细的 AI 图像生成提示词。

要求:
1. 输出纯英文,逗号分隔的关键词
2. 包含视觉细节 (构图、光线、角度、表情)
3. 符合漫画/动漫风格
4. 避免可能触发内容审核的词汇
5. 根据分镜类型调整构图描述

示例:
输入: "主角生气地看着敌人"
输出: "anime character with angry expression, clenched fists, intense glare, dynamic camera angle, medium shot, dramatic lighting, manga style, high quality"`;

  const contextInfo = [];
  if (context?.panelType) {
    const typeMap = {
      closeup: "特写镜头 - 聚焦面部表情和眼神",
      medium: "中景镜头 - 半身或胸部以上",
      wide: "全景镜头 - 展示环境和人物全身",
      action: "动作镜头 - 强调动态和力量感",
    };
    contextInfo.push(`分镜类型: ${typeMap[context.panelType]}`);
  }

  if (context?.characterDescription) {
    contextInfo.push(`角色特征: ${context.characterDescription}`);
  }

  if (context?.style) {
    contextInfo.push(`漫画风格: ${context.style}`);
  }

  const userMessage = `
用户输入: ${userInput}

${contextInfo.length > 0 ? `\n上下文:\n${contextInfo.join("\n")}` : ""}

请生成优化后的提示词 (仅输出英文关键词,不要解释):
  `.trim();

  const result = await callChatCompletionByType({
    providerType: "text_generation",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  });

  return result.content.trim();
}
```

---

## 六、总结

### 您的架构优势

✅ **高度灵活**: 新增 AI 服务只需配置,无需改代码 (除了首次适配)  
✅ **多 Provider 容错**: 自动降级到备用服务  
✅ **统一管理**: 一个后台管理所有 AI 配置  
✅ **易于扩展**: 未来可轻松添加更多 Provider

### 集成 Gemini 只需 3 步

1. **修改代码** (30分钟): 在 `image-generation.ts` 添加 Gemini 分支
2. **数据库配置** (5分钟): `/admin/llm-providers` 插入配置
3. **测试验证** (1小时): 前后端测试确认可用

### 后续优化方向

- [ ] 部署 OneAPI 统一所有 AI 服务 (长期)
- [ ] 实现智能 Provider 自动切换
- [ ] 添加参考图支持 (角色一致性)
- [ ] 补全 LoRA 训练、导出、优化器等功能

---

**文档版本**: v2.0 (基于 OpenAI 兼容架构)  
**最后更新**: 2025-12-11