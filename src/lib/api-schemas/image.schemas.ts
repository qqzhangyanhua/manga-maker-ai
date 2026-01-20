/**
 * Image Generation API Schemas
 * Zod schemas for Image Generation related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const OptimizeModeSchema = z
  .enum(["enhance", "lighting", "color", "cleanup"])
  .openapi({
    description: "图片优化模式",
    example: "enhance",
  });

export const TaskStatusSchema = z
  .enum(["pending", "processing", "completed", "failed"])
  .openapi({
    description: "任务状态",
    example: "completed",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const GeneratePanelImageRequestSchema = z.object({
  panel_id: z.string().uuid().openapi({
    description: "分镜 ID",
  }),
  prompt: z.string().min(1).openapi({
    description: "图片生成提示词",
    example: "一个程序员在修仙世界打坐修炼，漫画风格",
  }),
  style: z.string().optional().openapi({
    description: "风格提示词",
    example: "manga style, high quality",
  }),
  wait: z.boolean().optional().openapi({
    description: "是否等待生成完成（同步模式）",
    example: false,
  }),
  reference_image_urls: z.array(z.string().url()).optional().openapi({
    description: "参考图 URL 列表",
  }),
  negative_prompt: z.string().optional().openapi({
    description: "负面提示词（避免生成的内容）",
    example: "blurry, low quality, distorted",
  }),
  model_name: z.string().optional().openapi({
    description: "模型名称",
  }),
  aspect_ratio: z
    .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
    .optional()
    .openapi({
      description: "宽高比",
      example: "4:3",
    }),
  num_inference_steps: z.number().int().min(1).max(100).optional().openapi({
    description: "推理步数（1-100）",
    example: 30,
  }),
  guidance_scale: z.number().min(1).max(20).optional().openapi({
    description: "引导强度（1-20）",
    example: 7.5,
  }),
});

export const BatchGenerateImagesRequestSchema = z.object({
  project_id: z.string().uuid().openapi({
    description: "项目 ID",
  }),
});

export const OptimizeImageRequestSchema = z.object({
  prompt: z.string().min(10).openapi({
    description: "优化方向描述（至少 10 个字）",
    example: "增强光影效果，提高细节清晰度",
  }),
  style: z.string().optional().openapi({
    description: "目标风格",
    example: "realistic, cinematic lighting",
  }),
  mode: OptimizeModeSchema.default("enhance"),
  strength: z.number().int().min(10).max(100).default(60).openapi({
    description: "优化强度（10-100）",
    example: 60,
  }),
  imageUrl: z.string().url().optional().openapi({
    description: "原始图片 URL",
  }),
  projectId: z.string().uuid().optional().openapi({
    description: "关联的项目 ID",
  }),
  versionId: z.string().optional().openapi({
    description: "版本 ID（用于追踪优化历史）",
  }),
  width: z.number().int().min(512).max(2048).optional().openapi({
    description: "图片宽度（512-2048）",
    example: 1024,
  }),
  height: z.number().int().min(512).max(2048).optional().openapi({
    description: "图片高度（512-2048）",
    example: 768,
  }),
  canvasSchema: z.record(z.unknown()).optional().openapi({
    description: "画布布局配置（JSON 对象）",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const ImageTaskSchema = z.object({
  task_id: z.string().uuid().openapi({
    description: "任务 ID",
  }),
  status: TaskStatusSchema,
  progress: z.number().int().min(0).max(100).optional().openapi({
    description: "进度百分比（0-100）",
    example: 75,
  }),
  image_url: z.string().url().nullable().openapi({
    description: "生成的图片 URL（完成后可用）",
  }),
  error: z.string().nullable().openapi({
    description: "错误信息（失败时）",
  }),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const GeneratePanelImageResponseSchema = z.object({
  success: z.boolean(),
  image_url: z.string().url().optional().openapi({
    description: "生成的图片 URL（同步模式）",
  }),
  task_id: z.string().uuid().optional().openapi({
    description: "任务 ID（异步模式）",
  }),
  usage: z
    .object({
      count: z.number().int().openapi({
        description: "已使用配额",
        example: 15,
      }),
      limit: z.number().int().openapi({
        description: "配额限制",
        example: 50,
      }),
    })
    .optional(),
  message: z.string().openapi({
    description: "提示消息",
    example: "图片生成完成",
  }),
});

export const BatchGenerateImagesResponseSchema = z.object({
  success: z.boolean(),
  task_ids: z.array(z.string().uuid()).openapi({
    description: "生成任务 ID 列表",
  }),
  panel_count: z.number().int().openapi({
    description: "提交的分镜数量",
    example: 12,
  }),
  usage: z
    .object({
      count: z.number().int(),
      limit: z.number().int(),
    })
    .optional(),
  message: z.string().openapi({
    description: "提示消息",
    example: "已提交12个分镜的生成任务",
  }),
});

export const TaskStatusResponseSchema = z.object({
  success: z.boolean(),
  task: ImageTaskSchema.optional(),
  status: TaskStatusSchema.optional(),
  progress: z.number().int().optional(),
  image_url: z.string().url().nullable().optional(),
  error: z.string().nullable().optional(),
});

export const ImageVersionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().openapi({
    description: "版本标签",
    example: "AI 优化-默认",
  }),
  source_type: z.string().openapi({
    description: "来源类型",
    example: "optimize",
  }),
  status: z.string(),
  image_url: z.string().url().nullable(),
  task_id: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  project_id: z.string().uuid().nullable(),
  canvas_schema: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const OptimizeImageResponseSchema = z.object({
  success: z.boolean(),
  taskId: z.string().uuid(),
  status: ImageTaskSchema.optional(),
  version: ImageVersionSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type OptimizeMode = z.infer<typeof OptimizeModeSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export type GeneratePanelImageRequest = z.infer<typeof GeneratePanelImageRequestSchema>;
export type BatchGenerateImagesRequest = z.infer<typeof BatchGenerateImagesRequestSchema>;
export type OptimizeImageRequest = z.infer<typeof OptimizeImageRequestSchema>;

export type ImageTask = z.infer<typeof ImageTaskSchema>;
export type GeneratePanelImageResponse = z.infer<typeof GeneratePanelImageResponseSchema>;
export type BatchGenerateImagesResponse = z.infer<typeof BatchGenerateImagesResponseSchema>;
export type TaskStatusResponse = z.infer<typeof TaskStatusResponseSchema>;
export type ImageVersion = z.infer<typeof ImageVersionSchema>;
export type OptimizeImageResponse = z.infer<typeof OptimizeImageResponseSchema>;
