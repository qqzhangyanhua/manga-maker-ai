/**
 * Workflow API Schemas
 * Zod schemas for Workflow Orchestration related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const WorkflowStatusSchema = z
  .enum(["pending", "running", "completed", "failed", "paused"])
  .openapi({
    description: "工作流状态",
    example: "running",
  });

export const WorkflowTypeSchema = z
  .enum(["auto_generate", "manual", "template_based"])
  .openapi({
    description: "工作流类型",
    example: "auto_generate",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const ListWorkflowsQuerySchema = z.object({
  status: WorkflowStatusSchema.optional().openapi({
    description: "筛选工作流状态",
  }),
  limit: z.number().int().min(1).max(100).default(20).optional().openapi({
    description: "返回数量限制（1-100）",
    example: 20,
  }),
});

export const CreateAutoGenerateWorkflowRequestSchema = z.object({
  story_id: z.string().uuid().openapi({
    description: "故事 ID",
  }),
  target_chapters: z.number().int().min(1).max(20).optional().openapi({
    description: "目标章节数（1-20）",
    example: 5,
  }),
  auto_generate_panels: z.boolean().default(true).optional().openapi({
    description: "是否自动生成分镜",
    example: true,
  }),
  auto_generate_images: z.boolean().default(false).optional().openapi({
    description: "是否自动生成图片",
    example: false,
  }),
});

export const ResumeWorkflowRequestSchema = z.object({
  from_step: z.number().int().min(0).optional().openapi({
    description: "从哪一步恢复（可选）",
    example: 3,
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const WorkflowStepSchema = z.object({
  step: z.number().int(),
  name: z.string(),
  status: z.string(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  error: z.string().nullable(),
});

export const WorkflowResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  workflow_type: z.string(),
  status: z.string(),
  current_step: z.number().int().openapi({
    description: "当前执行到的步骤",
    example: 3,
  }),
  total_steps: z.number().int().openapi({
    description: "总步骤数",
    example: 10,
  }),
  config: z.record(z.unknown()).nullable().openapi({
    description: "工作流配置（JSON）",
  }),
  result: z.record(z.unknown()).nullable().openapi({
    description: "执行结果（JSON）",
  }),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
});

export const ListWorkflowsResponseSchema = z.object({
  success: z.boolean(),
  workflows: z.array(WorkflowResponseSchema),
  count: z.number().int(),
});

export const WorkflowDetailResponseSchema = z.object({
  success: z.boolean(),
  workflow: WorkflowResponseSchema,
  steps: z.array(WorkflowStepSchema).optional().openapi({
    description: "工作流步骤详情",
  }),
});

export const CreateWorkflowResponseSchema = z.object({
  success: z.boolean(),
  workflow: WorkflowResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "工作流创建成功",
  }),
});

export const WorkflowProgressResponseSchema = z.object({
  success: z.boolean(),
  progress: z.object({
    current_step: z.number().int(),
    total_steps: z.number().int(),
    percentage: z.number().min(0).max(100).openapi({
      description: "完成百分比",
      example: 45,
    }),
    status: WorkflowStatusSchema,
    message: z.string().nullable().openapi({
      description: "当前步骤描述",
      example: "正在生成第3章分镜...",
    }),
  }),
});

export const ResumeWorkflowResponseSchema = z.object({
  success: z.boolean(),
  workflow: WorkflowResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "工作流已恢复",
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;

export type ListWorkflowsQuery = z.infer<typeof ListWorkflowsQuerySchema>;
export type CreateAutoGenerateWorkflowRequest = z.infer<typeof CreateAutoGenerateWorkflowRequestSchema>;
export type ResumeWorkflowRequest = z.infer<typeof ResumeWorkflowRequestSchema>;

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowResponse = z.infer<typeof WorkflowResponseSchema>;
export type ListWorkflowsResponse = z.infer<typeof ListWorkflowsResponseSchema>;
export type WorkflowDetailResponse = z.infer<typeof WorkflowDetailResponseSchema>;
export type CreateWorkflowResponse = z.infer<typeof CreateWorkflowResponseSchema>;
export type WorkflowProgressResponse = z.infer<typeof WorkflowProgressResponseSchema>;
export type ResumeWorkflowResponse = z.infer<typeof ResumeWorkflowResponseSchema>;
