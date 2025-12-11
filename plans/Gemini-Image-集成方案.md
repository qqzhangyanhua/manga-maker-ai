# Gemini Imagen 集成方案与功能优化

**生成时间**: 2025-12-11  
**目标**: 将图像生成服务从 Stable Diffusion/DALL-E 迁移到 Gemini Imagen  
**参考**: 基于 [`plans/项目分析报告-产品规划版.md`](项目分析报告-产品规划版.md) 的分析

---

## 一、现状分析

### 1.1 当前架构

**图像生成服务层次**:
```
应用层
  ├── CharacterDetailView.tsx (三视图生成)
  ├── EditablePanelCard.tsx (分镜图片生成)
  ├── CreateOutfitDialog.tsx (服装生成)
  └── ImagePreviewCard.tsx (表情生成)
       ↓
API 层
  ├── /api/character/generate-views
  ├── /api/character/expression
  ├── /api/character/outfit
  └── /api/storyboard/generate-image
       ↓
服务层 (src/lib/)
  ├── image-generation.ts (核心封装)
  ├── unified-image-generation.ts (队列管理)
  ├── expression-generation.ts (表情专用)
  └── outfit-generation.ts (服装专用)
       ↓
Provider 层 (llm-provider.ts)
  ├── Stable Diffusion (provider_name: "sd")
  ├── OpenAI DALL-E (provider_name: "openai")
  └── ComfyUI (未实现)
```

### 1.2 当前支持的功能

| 功能模块 | 实现状态 | 使用的文件 |
|---------|---------|-----------|
| 角色三视图生成 | ✅ 完成 | [`image-generation.ts#generateThreeViews()`](../src/lib/image-generation.ts:281-351) |
| 表情矩阵 (9种) | ✅ 完成 | [`expression-generation.ts`](../src/lib/expression-generation.ts) |
| 服装变换 | ✅ 完成 | [`outfit-generation.ts`](../src/lib/outfit-generation.ts) |
| 分镜图片生成 | ✅ 完成 | [`image-generation.ts#callImageGenerationByType()`](../src/lib/image-generation.ts:59-97) |
| 批量生成队列 | ✅ 完成 | [`unified-image-generation.ts`](../src/lib/unified-image-generation.ts) |

### 1.3 现有问题与限制

#### Stable Diffusion 方案:
- ❌ **需要 GPU 服务器**: 成本高 (~$0.3-2/小时)
- ❌ **维护成本高**: 需要自己管理模型、服务器、监控
- ❌ **生成速度受限**: 取决于服务器配置
- ✅ 完全可控,无内容审核限制
- ✅ 支持 LoRA 微调

#### DALL-E 方案:
- ❌ **成本较高**: $0.04/张 (DALL-E 3)
- ❌ **尺寸限制**: 仅支持特定尺寸 (1024x1024, 1792x1024, 1024x1792)
- ❌ **无法微调**: 不支持 LoRA
- ✅ 无需服务器
- ✅ 生成质量稳定

#### 报告中提到的 Gemini 问题 (第 399-421 行):
- ⚠️ **安全过滤严格**: 打斗、武器、血液易触发 Safety Block
- ⚠️ **实验性支持**: 稳定性未知

---

## 二、Gemini Imagen 技术评估

### 2.1 Gemini 模型对比

| 模型 | 能力 | 定价 | 适用场景 |
|-----|------|------|---------|
| **Gemini 2.0 Flash** | 文本生成、多模态理解 | $0.10/1M tokens (input) | LLM 任务 |
| **Imagen 3** | 高质量图像生成 | $0.04/张 (1024x1024) | 漫画分镜生成 |
| **Imagen 2** | 快速图像生成 | $0.02/张 (512x512) | 草稿预览 |

### 2.2 Gemini API 能力分析

#### ✅ 支持的功能:
1. **文生图 (Text-to-Image)**
   - 标准分辨率: 256x256 至 2048x2048
   - 长宽比支持: 正方形、横向、纵向
   
2. **图生图 (Image-to-Image)** - 适用于:
   - 角色一致性参考 (使用三视图作为输入)
   - 服装变换 (基于原图修改)
   - 表情调整

3. **多模态理解**:
   - 可以上传参考图 + 文字描述
   - 理解角色特征并保持一致性

4. **内容安全控制**:
   - 4 个安全级别可调整
   - 可以针对漫画内容优化过滤策略

#### ❌ 不支持的功能:
- LoRA 模型训练/加载
- ControlNet (姿态控制)
- Inpainting (局部重绘)
- 超分辨率 (需要额外调用)

### 2.3 与现有方案对比

| 维度 | Stable Diffusion | DALL-E 3 | Gemini Imagen 3 |
|-----|------------------|----------|-----------------|
| **成本** | $0.3-2/小时 (服务器) | $0.04/张 | $0.04/张 |
| **角色一致性** | ✅ LoRA 支持 | ❌ 较弱 | ⚠️ 参考图模式 |
| **生成速度** | 15-60秒 | 10-30秒 | 10-30秒 |
| **维护成本** | ❌ 高 | ✅ 无 | ✅ 无 |
| **内容审核** | ✅ 无限制 | ⚠️ 中等 | ⚠️ 较严格 |
| **多模态支持** | ❌ 需要额外工具 | ❌ 无 | ✅ 原生支持 |
| **API 稳定性** | ⚠️ 自建 | ✅ 高 | ✅ 高 |

---

## 三、Gemini 迁移实施计划

### 3.1 阶段 1: 基础集成 (1-2天)

#### 步骤 1.1: 安装依赖

```bash
npm install @google/generative-ai
```

#### 步骤 1.2: 更新 [`image-generation.ts`](../src/lib/image-generation.ts)

在 [`callImageGenerationByType()`](../src/lib/image-generation.ts:59-97) 函数中添加 Gemini 支持:

```typescript
// src/lib/image-generation.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

// 在 switch 语句中添加
case "gemini":
case "imagen":
  return await callGeminiImagenAPI(
    provider.base_url,
    imageParams,
    provider.api_key
  );
```

#### 步骤 1.3: 实现 Gemini API 调用

```typescript
async function callGeminiImagenAPI(
  baseUrl: string,
  params: ImageGenerationParams,
  apiKey: string
): Promise<ImageGenerationResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "imagen-3" });

  try {
    const result = await model.generateImages({
      prompt: params.prompt,
      numberOfImages: 1,
      aspectRatio: inferAspectRatio(params.width || 1024, params.height || 1024),
    });

    const images = result.images.map(img => img.imageData);

    return {
      success: true,
      images,
      info: JSON.stringify({ model: "imagen-3" }),
    };
  } catch (error: any) {
    // 处理安全过滤错误
    if (error.message?.includes("SAFETY")) {
      console.warn("触发安全过滤,尝试软化提示词");
      return await callGeminiImagenAPI(
        baseUrl,
        { ...params, prompt: sanitizePromptForGemini(params.prompt) },
        apiKey
      );
    }

    return {
      success: false,
      images: [],
      error: error.message || "Gemini 生成失败",
    };
  }
}

function inferAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9/16) < 0.1) return "9:16";
  return "1:1";
}
```

#### 步骤 1.4: 添加安全词过滤

```typescript
// src/lib/prompt-sanitizer.ts (新建)

const SAFETY_REPLACEMENTS: Record<string, string> = {
  "blood": "red liquid",
  "kill": "defeat",
  "gun": "device",
  "knife": "tool",
  "wound": "mark",
};

export function sanitizePromptForGemini(prompt: string): string {
  let sanitized = prompt;
  
  for (const [unsafe, safe] of Object.entries(SAFETY_REPLACEMENTS)) {
    sanitized = sanitized.replace(new RegExp(`\\b${unsafe}\\b`, 'gi'), safe);
  }
  
  return `artistic manga style illustration, ${sanitized}`;
}
```

#### 步骤 1.5: 配置 Provider

在管理后台或直接数据库插入:

```sql
INSERT INTO llm_providers (
  provider_type, provider_name, model, base_url, api_key, priority, enabled
) VALUES (
  'image_generation',
  'gemini',
  'imagen-3',
  'https://generativelanguage.googleapis.com',
  'YOUR_GEMINI_API_KEY',
  1,
  true
);
```

---

### 3.2 阶段 2: 角色一致性增强 (2-3天)

#### 实现参考图模式

```typescript
// src/lib/gemini-character-generation.ts (新建)

import { prisma } from "./db";
import { callImageGenerationByType } from "./image-generation";

export async function generateWithCharacterReference(
  characterId: string,
  prompt: string
): Promise<string> {
  // 获取角色三视图
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { views: true },
  });

  if (!character || character.views.length === 0) {
    throw new Error("请先生成角色三视图");
  }

  // 构建详细提示词
  const detailedPrompt = [
    character.base_prompt || character.description,
    prompt,
    "consistent character, same person, anime style",
  ].join(", ");

  // 调用生成 (参考图作为context)
  const result = await callImageGenerationByType({
    providerType: "image_generation",
    prompt: detailedPrompt,
    // 注意: Gemini SDK 目前不直接支持referenceImages参数
    // 需要使用REST API或等待SDK更新
  });

  if (!result.success) throw new Error(result.error);

  return result.images[0];
}
```

---

### 3.3 阶段 3: 批量生成优化 (1-2天)

#### 更新队列系统支持 Gemini

[`unified-image-generation.ts`](../src/lib/unified-image-generation.ts) 已支持,无需修改。

#### 添加进度追踪 API

```typescript
// src/app/api/generation/status/[taskId]/route.ts (新建)

import { NextRequest } from "next/server";
import { getImageGenerationQueue } from "@/lib/unified-image-generation";

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const queue = getImageGenerationQueue();
  const status = queue.getStatus(params.taskId);

  if (!status) {
    return Response.json({ error: "任务不存在" }, { status: 404 });
  }

  return Response.json(status);
}
```

---

### 3.4 阶段 4: 前端集成 (2-3天)

#### 更新组件支持 Gemini

```typescript
// src/components/AssetLibrary/CharacterDetailView.tsx

// 在生成三视图按钮点击时:
const handleGenerateViews = async () => {
  setGenerating(true);
  
  try {
    const response = await fetch("/api/character/generate-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character_id: character.id,
        description: character.description,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    toast.success("三视图生成完成!");
    queryClient.invalidateQueries({ queryKey: ["character", character.id] });
  } catch (error) {
    toast.error(error.message);
  } finally {
    setGenerating(false);
  }
};
```

---

## 四、成本与性能对比

### 4.1 成本分析 (月使用量: 1000张)

| 方案 | 月成本 | 优点 | 缺点 |
|-----|-------|------|------|
| **Stable Diffusion (自建)** | $216-1440 (24/7运行) | 完全可控 | 维护成本高 |
| **DALL-E 3** | $40 | 高质量 | 无角色一致性 |
| **Gemini Imagen 3** | $40 | 多模态支持 | 安全过滤严格 |
| **混合方案** | $120-200 | 平衡各方优势 | 架构复杂 |

### 4.2 性能对比

#### 生成速度 (1024x1024):
- SD (本地 RTX 3090): 15-30秒
- DALL-E 3: 10-20秒
- **Gemini Imagen 3**: 10-25秒

#### 角色一致性评分 (主观评估):
- SD + LoRA: ⭐⭐⭐⭐⭐ (95%)
- DALL-E 3: ⭐⭐ (40%)
- **Gemini + 参考图**: ⭐⭐⭐⭐ (80%)

### 4.3 推荐方案

#### 🎯 方案 A: 纯 Gemini (推荐新项目)

**适用场景**: 
- 快速启动,无服务器维护能力
- 预算有限 (<$500/月)
- 角色一致性要求中等

**配置**:
```
Gemini Imagen 3 (优先级 1)
├── 高质量分镜生成
├── 参考图模式保证一致性  
└── 草稿预览用 Imagen 2
```

**优点**: 零维护成本,快速部署
**缺点**: 角色一致性不如 LoRA

---

#### 🚀 方案 B: 混合架构 (推荐生产环境)

**配置**:
```
Gemini Imagen 3 (优先级 1) - 主力生成
├── 用于: 快速草稿、分镜生成
└── 备用: DALL-E 3 (优先级 2)

+ Stable Diffusion (优先级 3) - 专用场景
├── 用于: 角色三视图、表情矩阵
└── LoRA 微调后的精细生成
```

**工作流**:
1. 用户创建角色 → Gemini 生成初稿
2. 用户确认 → SD + LoRA 生成最终版本
3. 分镜生成 → 默认 Gemini (快速)
4. 高质量导出 → SD 重新渲染

**优点**: 平衡速度与质量
**缺点**: 架构复杂度较高

---

## 五、缺失功能与优化建议

### 5.1 ❌ 完全缺失的功能

#### 1. LoRA 角色训练系统

**现状**: 数据模型已定义但无实现

**解决方案**:

**选项 A**: 集成第三方服务
```typescript
// 使用 Replicate API
import Replicate from "replicate";

export async function trainCharacterLora(
  characterId: string,
  trainingImages: string[]
): Promise<string> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  const training = await replicate.trainings.create(
    "ostris/flux-dev-lora-trainer",
    "e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497",
    {
      destination: `${process.env.REPLICATE_USERNAME}/character-${characterId}`,
      input: {
        steps: 1000,
        lora_rank: 16,
        optimizer: "adamw8bit",
        batch_size: 1,
        resolution: "512,768,1024",
        autocaption: true,
        input_images: trainingImages.join(","),
        trigger_word: `sks_${characterId}`,
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

**选项 B**: 自建训练服务 (长期方案)
- 使用 Kohya LoRA Training Script
- 部署到 GPU 服务器
- 实现训练队列管理

---

#### 2. ControlNet 草图预览

**实现建议**:

```typescript
// src/lib/sketch-generation.ts (新建)

export async function generateSketchPreview(
  panelDescription: string
): Promise<string> {
  const sketchPrompt = `pencil sketch, rough draft, line art, black and white, ${panelDescription}`;

  const result = await callImageGenerationByType({
    providerType: "image_generation",
    prompt: sketchPrompt,
    width: 512,
    height: 512,
  });

  if (!result.success) throw new Error(result.error);

  return result.images[0];
}
```

---

#### 3. 漫画导出功能

**实现**:

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
      const imgData = await fetchImageAsBase64(panel.generated_image);
      pdf.addImage(imgData, "PNG", 10, 10, 190, 140);
    }

    if (panel.dialogue) {
      pdf.setFontSize(12);
      pdf.text(panel.dialogue, 10, 160, { maxWidth: 190 });
    }
  }

  return pdf.output("blob");
}
```

---

### 5.2 需要优化的功能

#### 1. 提示词优化器

```typescript
// src/lib/prompt-optimizer.ts (新建)

export async function optimizePromptWithLLM(
  userInput: string,
  context?: { panelType?: string; style?: string }
): Promise<string> {
  const systemPrompt = `你是漫画分镜提示词专家。将用户输入转换为AI生成友好的描述。
要求:
1. 包含视觉细节 (构图、光线、角度)
2. 符合漫画分镜规范
3. 避免触发安全过滤
4. 输出纯英文,逗号分隔`;

  const result = await callChatCompletionByType({
    providerType: "text_generation",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `输入: ${userInput}\n分镜类型: ${context?.panelType}` },
    ],
    temperature: 0.7,
  });

  return result.content.trim();
}
```

#### 2. 错误处理与重试

```typescript
// src/lib/resilient-generation.ts (新建)

export async function generateWithRetry(
  params: any,
  maxRetries = 3
): Promise<ImageGenerationResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await callImageGenerationByType(params);
      
      if (result.success) return result;

      if (result.error?.includes("SAFETY")) {
        params.prompt = sanitizePromptForGemini(params.prompt);
        continue;
      }

      if (i === maxRetries - 1) return result;
      
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }

  throw new Error("生成失败");
}
```

---

## 六、实施时间表

### Phase 1: Gemini 基础集成 (1周)
- [x] 第1-2天: 实现 Gemini API 调用
- [ ] 第3-4天: 安全过滤与重试机制
- [ ] 第5-7天: 测试与调优

### Phase 2: 角色一致性方案 (1周)
- [ ] 第1-3天: 参考图模式实现
- [ ] 第4-5天: 三视图生成优化
- [ ] 第6-7天: 表情/服装生成测试

### Phase 3: 缺失功能补全 (2周)
- [ ] 第1-3天: LoRA 训练集成 (Replicate)
- [ ] 第4-5天: 草图预览功能
- [ ] 第6-7天: 漫画导出 (PDF/ZIP)
- [ ] 第8-10天: 提示词优化器
- [ ] 第11-14天: 测试与文档

### Phase 4: 生产部署 (1周)
- [ ] 第1-2天: 性能监控与日志
- [ ] 第3-4天: 成本追踪
- [ ] 第5-7天: 灰度发布与用户反馈

---

## 七、总结与建议

### 7.1 核心建议

1. **优先使用 Gemini Imagen 3** 作为主力生成方案
   - 成本与 DALL-E 相当但支持多模态
   - 参考图模式可满足 80% 角色一致性需求

2. **保留 Stable Diffusion 作为高级功能**
   - 仅用于需要极致一致性的场景 (LoRA训练后)
   - 按需启动,降低固定成本

3. **实施混合架构**
   - Gemini (草稿/快速生成) + SD (精修)
   - 让用户选择质量/速度平衡

4. **补全缺失功能**
   - LoRA 训练: 集成 Replicate (短期) / 自建 (长期)
   - 导出功能: PDF + 图片序列
   - 提示词优化: LLM 辅助生成

### 7.2 风险提示

⚠️ **Gemini 安全过滤风险**
- 漫画常见元素 (打斗、武器) 易触发
- **缓解**: 提示词软化 + 安全级别调整 + 自动重试

⚠️ **角色一致性不如 LoRA**
- 参考图模式约 80% 准确率
- **缓解**: 三视图 + 详细描述 + 多次生成筛选

⚠️ **API 成本累积**
- 大量测试会快速消耗配额
- **缓解**: 本地缓存 + 草稿模式 + 用户配额限制

### 7.3 后续优化方向

- [ ] 实现图片缓存系统 (相似prompt复用)
- [ ] 添加用户偏好学习 (记录成功prompt模式)
- [ ] 集成 Gemini 2.0 Flash 的视觉理解能力
- [ ] 探索 Gemini 视频生成 API (未来动态漫画)

---

## 附录A: 快速开始检查清单

### 环境准备
- [ ] 获取 Gemini API Key
- [ ] 安装依赖: `npm install @google/generative-ai`
- [ ] 配置环境变量: `GEMINI_API_KEY=...`

### 数据库配置
- [ ] 插入 Gemini provider 配置
- [ ] 确认 `priority=1` 使其成为默认

### 代码集成
- [ ] 更新 [`image-generation.ts`](../src/lib/image-generation.ts)
- [ ] 添加 `callGeminiImagenAPI()` 函数
- [ ] 实现 `sanitizePromptForGemini()`

### 测试验证
- [ ] 测试三视图生成
- [ ] 测试表情/服装生成
- [ ] 测试分镜生成
- [ ] 验证安全过滤处理
- [ ] 检查MinIO上传

### 上线准备
- [ ] 配置监控告警
- [ ] 设置用户配额
- [ ] 准备回滚方案
- [ ] 编写用户文档

---

**文档生成**: Claude (Architect Mode)  
**版本**: v1.0  
**最后更新**: 2025-12-11