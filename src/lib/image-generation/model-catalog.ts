/**
 * 图像生成模型能力目录
 * 用于前端展示、参数校验与算力预估
 */

export interface ModelInfo {
  id: string;
  name: string;
  supportedSizes: Array<{ width: number; height: number; label: string }>;
  maxBatchSize: number;
  supportsSeed: boolean;
  supportsNegativePrompt: boolean;
  supportsReferenceImage: boolean;
  defaultSteps: number;
  defaultCfgScale: number;
  creditsCost: number;
  tags: string[];
}

export interface ModelCapability {
  providerId: string;
  providerName: string;
  models: ModelInfo[];
}

export const MODEL_CATALOG: ModelCapability[] = [
  {
    providerId: "sd",
    providerName: "Stable Diffusion",
    models: [
      {
        id: "sdxl",
        name: "SDXL 1.0",
        supportedSizes: [
          { width: 1024, height: 1024, label: "1:1" },
          { width: 1024, height: 768, label: "4:3" },
          { width: 768, height: 1024, label: "3:4" },
          { width: 1216, height: 832, label: "3:2" },
          { width: 832, height: 1216, label: "2:3" },
        ],
        maxBatchSize: 4,
        supportsSeed: true,
        supportsNegativePrompt: true,
        supportsReferenceImage: false,
        defaultSteps: 30,
        defaultCfgScale: 7.5,
        creditsCost: 10,
        tags: ["高质量", "多风格"],
      },
    ],
  },
  {
    providerId: "openai",
    providerName: "OpenAI DALL-E",
    models: [
      {
        id: "dall-e-3",
        name: "DALL-E 3",
        supportedSizes: [
          { width: 1024, height: 1024, label: "1:1" },
          { width: 1024, height: 1792, label: "9:16" },
          { width: 1792, height: 1024, label: "16:9" },
        ],
        maxBatchSize: 1,
        supportsSeed: false,
        supportsNegativePrompt: false,
        supportsReferenceImage: true,
        defaultSteps: 0,
        defaultCfgScale: 0,
        creditsCost: 20,
        tags: ["高质量", "文字理解强"],
      },
    ],
  },
  {
    providerId: "fal",
    providerName: "FAL AI",
    models: [
      {
        id: "flux/schnell",
        name: "Flux Schnell",
        supportedSizes: [
          { width: 1024, height: 1024, label: "1:1" },
          { width: 1024, height: 768, label: "4:3" },
          { width: 768, height: 1024, label: "3:4" },
        ],
        maxBatchSize: 4,
        supportsSeed: true,
        supportsNegativePrompt: true,
        supportsReferenceImage: true,
        defaultSteps: 28,
        defaultCfgScale: 7.5,
        creditsCost: 8,
        tags: ["极速", "性价比"],
      },
      {
        id: "flux-pro",
        name: "Flux Pro",
        supportedSizes: [
          { width: 1024, height: 1024, label: "1:1" },
          { width: 1024, height: 768, label: "4:3" },
          { width: 768, height: 1024, label: "3:4" },
          { width: 1536, height: 1024, label: "3:2" },
        ],
        maxBatchSize: 4,
        supportsSeed: true,
        supportsNegativePrompt: true,
        supportsReferenceImage: true,
        defaultSteps: 50,
        defaultCfgScale: 7.5,
        creditsCost: 15,
        tags: ["高质量", "商业级"],
      },
    ],
  },
  {
    providerId: "google-imagen",
    providerName: "Google Imagen",
    models: [
      {
        id: "imagen-3.0-generate-002",
        name: "Imagen 3",
        supportedSizes: [
          { width: 1024, height: 1024, label: "1:1" },
          { width: 1024, height: 768, label: "4:3" },
          { width: 768, height: 1024, label: "3:4" },
          { width: 1280, height: 720, label: "16:9" },
          { width: 720, height: 1280, label: "9:16" },
        ],
        maxBatchSize: 4,
        supportsSeed: true,
        supportsNegativePrompt: true,
        supportsReferenceImage: false,
        defaultSteps: 0,
        defaultCfgScale: 0,
        creditsCost: 15,
        tags: ["高质量", "自然风格"],
      },
    ],
  },
  {
    providerId: "seedream",
    providerName: "火山引擎 Seedream",
    models: [
      {
        id: "seedream-3.0",
        name: "Seedream 3.0",
        supportedSizes: [
          { width: 1024, height: 1024, label: "1:1" },
          { width: 1024, height: 768, label: "4:3" },
          { width: 768, height: 1024, label: "3:4" },
        ],
        maxBatchSize: 4,
        supportsSeed: true,
        supportsNegativePrompt: true,
        supportsReferenceImage: false,
        defaultSteps: 30,
        defaultCfgScale: 7.0,
        creditsCost: 8,
        tags: ["中文优化", "性价比"],
      },
    ],
  },
];

/**
 * 根据提供商 ID 和模型 ID 获取模型能力
 */
export function getModelCapabilities(
  providerId: string,
  modelId: string
): ModelInfo | undefined {
  const provider = MODEL_CATALOG.find((p) => p.providerId === providerId);
  return provider?.models.find((m) => m.id === modelId);
}

/**
 * 获取指定提供商下的所有模型
 */
export function getProviderModels(providerId: string): ModelInfo[] {
  const provider = MODEL_CATALOG.find((p) => p.providerId === providerId);
  return provider?.models || [];
}

/**
 * 获取所有提供商列表
 */
export function getAllProviders(): Array<{ id: string; name: string }> {
  return MODEL_CATALOG.map((p) => ({
    id: p.providerId,
    name: p.providerName,
  }));
}
