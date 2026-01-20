/**
 * Upload API Schemas
 * Zod schemas for File Upload related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const UploadTypeSchema = z
  .enum(["base", "reference", "view", "expression"])
  .openapi({
    description: "上传类型",
    example: "reference",
  });

// ============================================================================
// Request Schemas
// ============================================================================

// Note: FormData requests cannot be fully validated by Zod in OpenAPI
// These schemas document the expected FormData fields
export const UploadImageRequestSchema = z.object({
  file: z.any().openapi({
    description: "图片文件（FormData）",
    type: "string",
    format: "binary",
  }),
  characterId: z.string().uuid().openapi({
    description: "角色 ID",
  }),
  type: UploadTypeSchema.optional().default("reference"),
});

export const UploadBase64RequestSchema = z.object({
  base64: z.string().min(1).openapi({
    description: "Base64 编码的图片数据",
  }),
  characterId: z.string().uuid().openapi({
    description: "角色 ID",
  }),
  type: UploadTypeSchema.optional().default("reference"),
  filename: z.string().optional().openapi({
    description: "文件名（可选）",
    example: "character.png",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const UploadSuccessResponseSchema = z.object({
  success: z.boolean(),
  url: z.string().url().openapi({
    description: "上传后的图片 URL",
    example: "https://storage.example.com/characters/abc123/image.png",
  }),
  message: z.string().openapi({
    description: "提示消息",
    example: "上传成功",
  }),
});

export const UploadErrorResponseSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.string().openapi({
    description: "错误信息",
    example: "文件大小超过限制",
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type UploadType = z.infer<typeof UploadTypeSchema>;

export type UploadImageRequest = z.infer<typeof UploadImageRequestSchema>;
export type UploadBase64Request = z.infer<typeof UploadBase64RequestSchema>;

export type UploadSuccessResponse = z.infer<typeof UploadSuccessResponseSchema>;
export type UploadErrorResponse = z.infer<typeof UploadErrorResponseSchema>;
