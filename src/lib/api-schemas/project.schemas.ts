/**
 * Project API Schemas
 * Zod schemas for Project (Comic Project) related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const ProjectStatusSchema = z
  .enum(["draft", "in_progress", "completed", "archived"])
  .openapi({
    description: "项目状态",
    example: "in_progress",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateProjectRequestSchema = z.object({
  story_id: z.string().uuid().openapi({
    description: "故事 ID",
  }),
  title: z.string().min(1).max(200).openapi({
    description: "项目标题",
    example: "修仙程序员传奇 - 漫画版",
  }),
  description: z.string().max(2000).optional().openapi({
    description: "项目描述",
  }),
  comic_style_id: z.string().uuid().optional().openapi({
    description: "漫画风格 ID",
  }),
});

export const UpdateProjectRequestSchema = z.object({
  title: z.string().min(1).max(200).optional().openapi({
    description: "项目标题",
  }),
  description: z.string().max(2000).optional().openapi({
    description: "项目描述",
  }),
  status: ProjectStatusSchema.optional(),
  comic_style_id: z.string().uuid().nullable().optional().openapi({
    description: "漫画风格 ID",
  }),
  cover_image: z.string().nullable().optional().openapi({
    description: "封面图路径",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const ProjectResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  story_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  comic_style_id: z.string().uuid().nullable(),
  cover_image: z.string().nullable(),
  total_panels: z.number().int().openapi({
    description: "总分镜数",
    example: 120,
  }),
  completed_panels: z.number().int().openapi({
    description: "已完成分镜数",
    example: 80,
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateProjectResponseSchema = z.object({
  project: ProjectResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "项目创建成功",
  }),
});

export const UpdateProjectResponseSchema = z.object({
  project: ProjectResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "项目更新成功",
  }),
});

export const DeleteProjectResponseSchema = z.object({
  message: z.string().openapi({
    description: "提示消息",
    example: "项目删除成功",
  }),
});

export const ListProjectsResponseSchema = z.object({
  projects: z.array(ProjectResponseSchema),
  pagination: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
export type UpdateProjectResponse = z.infer<typeof UpdateProjectResponseSchema>;
export type DeleteProjectResponse = z.infer<typeof DeleteProjectResponseSchema>;
export type ListProjectsResponse = z.infer<typeof ListProjectsResponseSchema>;
