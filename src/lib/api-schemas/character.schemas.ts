/**
 * Character API Schemas - Zod 定义
 * 用于生成 OpenAPI 文档和运行时验证
 */
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============ Request Schemas ============

export const CreateCharacterRequestSchema = z.object({
  name: z.string().min(1).max(100).openapi({
    description: "角色名称",
    example: "林枫"
  }),
  description: z.string().max(2000).optional().openapi({
    description: "角色描述（性格、背景等）",
    example: "废柴少年，意外获得远古传承，开启修仙之路"
  }),
  referenceImageUrl: z.string().url().optional().openapi({
    description: "参考图片 URL（用于生成角色外观）",
    example: "https://example.com/images/character-ref.jpg"
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "角色标签（如：主角、反派、导师等）",
    example: ["主角", "男性", "修仙者"]
  })
});

export const UpdateCharacterRequestSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({
    description: "角色名称",
    example: "林枫"
  }),
  description: z.string().max(2000).optional().openapi({
    description: "角色描述",
    example: "废柴少年，意外获得远古传承..."
  }),
  referenceImageUrl: z.string().url().optional().openapi({
    description: "参考图片 URL",
    example: "https://example.com/images/character-ref.jpg"
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "角色标签",
    example: ["主角", "男性"]
  })
});

export const GenerateCharacterImageRequestSchema = z.object({
  prompt: z.string().min(10).max(1000).openapi({
    description: "生成图片的 Prompt 描述",
    example: "年轻男子，黑色长发，白色道袍，玄幻风格"
  }),
  style: z.enum(["realistic", "anime", "cartoon", "fantasy"]).optional().openapi({
    description: "图片风格",
    example: "fantasy"
  }),
  negativePrompt: z.string().max(500).optional().openapi({
    description: "负面 Prompt（不希望出现的元素）",
    example: "blurry, low quality, distorted"
  })
});

export const GenerateExpressionsRequestSchema = z.object({
  characterId: z.string().uuid().openapi({
    description: "角色 ID",
    example: "123e4567-e89b-12d3-a456-426614174000"
  }),
  expressions: z.array(
    z.enum(["happy", "sad", "angry", "surprised", "neutral", "thinking", "excited", "worried", "determined"])
  ).openapi({
    description: "要生成的表情列表",
    example: ["happy", "angry", "neutral"]
  })
});

// ============ Response Schemas ============

export const CharacterResponseSchema = z.object({
  id: z.string().uuid().openapi({
    description: "角色 ID (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174000"
  }),
  userId: z.string().uuid().openapi({
    description: "所属用户 ID",
    example: "987fcdeb-51a2-43d7-8f9e-0123456789ab"
  }),
  name: z.string().openapi({
    description: "角色名称",
    example: "林枫"
  }),
  description: z.string().nullable().openapi({
    description: "角色描述",
    example: "废柴少年，意外获得远古传承..."
  }),
  referenceImageUrl: z.string().url().nullable().openapi({
    description: "参考图片 URL",
    example: "https://example.com/images/character.jpg"
  }),
  generatedImageUrl: z.string().url().nullable().openapi({
    description: "AI 生成的角色图片 URL",
    example: "https://example.com/generated/character-001.jpg"
  }),
  tags: z.array(z.string()).nullable().openapi({
    description: "角色标签",
    example: ["主角", "男性", "修仙者"]
  }),
  trainingStatus: z.enum(["pending", "training", "completed", "failed"]).openapi({
    description: "LoRA 训练状态",
    example: "pending"
  }),
  loraModelPath: z.string().nullable().openapi({
    description: "LoRA 模型路径",
    example: null
  }),
  createdAt: z.string().datetime().openapi({
    description: "创建时间",
    example: "2025-01-15T08:00:00.000Z"
  }),
  updatedAt: z.string().datetime().openapi({
    description: "更新时间",
    example: "2025-01-15T14:30:00.000Z"
  })
});

export const CharacterListResponseSchema = z.array(CharacterResponseSchema);

export const OutfitResponseSchema = z.object({
  id: z.string().uuid().openapi({
    description: "服装 ID",
    example: "550e8400-e29b-41d4-a716-446655440000"
  }),
  characterId: z.string().uuid().openapi({
    description: "角色 ID",
    example: "123e4567-e89b-12d3-a456-426614174000"
  }),
  name: z.string().openapi({
    description: "服装名称",
    example: "白色道袍"
  }),
  description: z.string().nullable().openapi({
    description: "服装描述",
    example: "修仙者常见的白色道袍，绣有金色纹路"
  }),
  imageUrl: z.string().url().nullable().openapi({
    description: "服装图片 URL",
    example: "https://example.com/outfits/white-robe.jpg"
  }),
  isDefault: z.boolean().openapi({
    description: "是否为默认服装",
    example: true
  }),
  createdAt: z.string().datetime().openapi({
    description: "创建时间",
    example: "2025-01-15T08:00:00.000Z"
  })
});

export const ExpressionResponseSchema = z.object({
  id: z.string().uuid().openapi({
    description: "表情 ID",
    example: "660f9511-f39c-52e5-b827-557766551111"
  }),
  characterId: z.string().uuid().openapi({
    description: "角色 ID",
    example: "123e4567-e89b-12d3-a456-426614174000"
  }),
  emotion: z.string().openapi({
    description: "情绪类型",
    example: "happy"
  }),
  imageUrl: z.string().url().nullable().openapi({
    description: "表情图片 URL",
    example: "https://example.com/expressions/happy.jpg"
  }),
  createdAt: z.string().datetime().openapi({
    description: "创建时间",
    example: "2025-01-15T08:00:00.000Z"
  })
});

// ============ TypeScript Types ============

export type CreateCharacterRequest = z.infer<typeof CreateCharacterRequestSchema>;
export type UpdateCharacterRequest = z.infer<typeof UpdateCharacterRequestSchema>;
export type GenerateCharacterImageRequest = z.infer<typeof GenerateCharacterImageRequestSchema>;
export type GenerateExpressionsRequest = z.infer<typeof GenerateExpressionsRequestSchema>;
export type CharacterResponse = z.infer<typeof CharacterResponseSchema>;
export type CharacterListResponse = z.infer<typeof CharacterListResponseSchema>;
export type OutfitResponse = z.infer<typeof OutfitResponseSchema>;
export type ExpressionResponse = z.infer<typeof ExpressionResponseSchema>;
