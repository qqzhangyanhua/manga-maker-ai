/**
 * Story API Schemas
 * Zod schemas for Story related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const StoryGenreSchema = z
  .enum(["suspense", "romance", "adventure", "scifi", "daily", "fantasy"])
  .openapi({
    description: "故事类型",
    example: "adventure",
  });

export const StoryLengthSchema = z
  .enum(["short", "medium", "long"])
  .openapi({
    description: "故事长度",
    example: "medium",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const GenerateStoryRequestSchema = z.object({
  premise: z.string().min(10).max(500).openapi({
    description: "故事前提/创意",
    example: "一个程序员穿越到修仙世界，用编程思维修炼成仙",
  }),
  genre: StoryGenreSchema.optional(),
  characterCount: z.number().int().min(1).max(10).optional().openapi({
    description: "期望的角色数量（1-10）",
    example: 3,
  }),
  length: StoryLengthSchema.optional(),
  templateId: z.string().uuid().optional().openapi({
    description: "故事模板 ID",
  }),
  styleKey: z.string().optional().openapi({
    description: "漫画风格 key",
  }),
  saveToDb: z.boolean().optional().default(true).openapi({
    description: "是否保存到数据库",
    example: true,
  }),
});

export const CreateStoryRequestSchema = z.object({
  title: z.string().min(1).max(200).openapi({
    description: "故事标题",
    example: "修仙程序员传奇",
  }),
  outline: z.string().min(10).openapi({
    description: "故事大纲",
  }),
  genre: StoryGenreSchema.optional(),
  tags: z.array(z.string()).optional().openapi({
    description: "标签列表",
    example: ["修仙", "程序员", "穿越"],
  }),
});

export const UpdateStoryRequestSchema = z.object({
  title: z.string().min(1).max(200).optional().openapi({
    description: "故事标题",
  }),
  outline: z.string().optional().openapi({
    description: "故事大纲",
  }),
  genre: StoryGenreSchema.optional(),
  tags: z.array(z.string()).optional().openapi({
    description: "标签列表",
  }),
  three_act_structure: z.record(z.unknown()).nullable().optional().openapi({
    description: "三幕结构（JSON 对象）",
  }),
});

export const ExpandStoryActRequestSchema = z.object({
  act_number: z.number().int().min(1).max(3).openapi({
    description: "幕次（1-3）",
    example: 1,
  }),
  focus_elements: z.array(z.string()).optional().openapi({
    description: "重点扩展的元素",
    example: ["角色关系", "世界观设定"],
  }),
});

export const GenerateIdeaRequestSchema = z.object({
  theme: z.string().min(1).max(100).optional().openapi({
    description: "主题关键词",
    example: "科幻冒险",
  }),
  count: z.number().int().min(1).max(5).default(3).openapi({
    description: "生成的创意数量（1-5）",
    example: 3,
  }),
});

export const CreateChapterRequestSchema = z.object({
  story_id: z.string().uuid().openapi({
    description: "故事 ID",
  }),
  title: z.string().min(1).max(200).openapi({
    description: "章节标题",
    example: "第一章：穿越之始",
  }),
  summary: z.string().max(5000).optional().openapi({
    description: "章节摘要",
  }),
  content: z.string().optional().openapi({
    description: "章节内容",
  }),
  chapter_order: z.number().int().min(1).openapi({
    description: "章节顺序",
    example: 1,
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const StoryResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  outline: z.string(),
  genre: z.string().nullable(),
  tags: z.array(z.string()),
  three_act_structure: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ChapterSummarySchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(),
  title: z.string(),
  summary: z.string().nullable(),
  chapter_order: z.number().int(),
  publish_status: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const StoryDetailResponseSchema = z.object({
  story: StoryResponseSchema,
  chapters: z.array(ChapterSummarySchema).optional(),
});

export const ListStoriesResponseSchema = z.object({
  stories: z.array(StoryResponseSchema),
  pagination: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const GenerateStoryResponseSchema = z.object({
  outline: z.string().openapi({
    description: "生成的故事大纲",
  }),
  story: StoryResponseSchema.optional(),
  message: z.string().openapi({
    description: "提示消息",
    example: "故事大纲生成成功",
  }),
});

export const CreateStoryResponseSchema = z.object({
  story: StoryResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "故事创建成功",
  }),
});

export const UpdateStoryResponseSchema = z.object({
  story: StoryResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "故事更新成功",
  }),
});

export const DeleteStoryResponseSchema = z.object({
  message: z.string().openapi({
    description: "提示消息",
    example: "故事删除成功",
  }),
});

export const ExpandStoryActResponseSchema = z.object({
  act_number: z.number().int(),
  expanded_content: z.string().openapi({
    description: "扩展后的幕内容",
  }),
  message: z.string(),
});

export const IdeaSchema = z.object({
  title: z.string().openapi({
    description: "创意标题",
    example: "时空旅行者的困境",
  }),
  premise: z.string().openapi({
    description: "创意前提",
    example: "一位科学家发现时间旅行的秘密，但每次穿越都会失去一段记忆",
  }),
  hook: z.string().openapi({
    description: "故事钩子",
    example: "主角必须在失去所有记忆之前阻止一场灾难",
  }),
});

export const GenerateIdeaResponseSchema = z.object({
  ideas: z.array(IdeaSchema),
  message: z.string(),
});

export const ListChaptersResponseSchema = z.object({
  chapters: z.array(ChapterSummarySchema),
});

export const CreateChapterResponseSchema = z.object({
  chapter: ChapterSummarySchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "章节创建成功",
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type StoryGenre = z.infer<typeof StoryGenreSchema>;
export type StoryLength = z.infer<typeof StoryLengthSchema>;

export type GenerateStoryRequest = z.infer<typeof GenerateStoryRequestSchema>;
export type CreateStoryRequest = z.infer<typeof CreateStoryRequestSchema>;
export type UpdateStoryRequest = z.infer<typeof UpdateStoryRequestSchema>;
export type ExpandStoryActRequest = z.infer<typeof ExpandStoryActRequestSchema>;
export type GenerateIdeaRequest = z.infer<typeof GenerateIdeaRequestSchema>;
export type CreateChapterRequest = z.infer<typeof CreateChapterRequestSchema>;

export type StoryResponse = z.infer<typeof StoryResponseSchema>;
export type ChapterSummary = z.infer<typeof ChapterSummarySchema>;
export type StoryDetailResponse = z.infer<typeof StoryDetailResponseSchema>;
export type ListStoriesResponse = z.infer<typeof ListStoriesResponseSchema>;
export type GenerateStoryResponse = z.infer<typeof GenerateStoryResponseSchema>;
export type CreateStoryResponse = z.infer<typeof CreateStoryResponseSchema>;
export type UpdateStoryResponse = z.infer<typeof UpdateStoryResponseSchema>;
export type DeleteStoryResponse = z.infer<typeof DeleteStoryResponseSchema>;
export type ExpandStoryActResponse = z.infer<typeof ExpandStoryActResponseSchema>;
export type Idea = z.infer<typeof IdeaSchema>;
export type GenerateIdeaResponse = z.infer<typeof GenerateIdeaResponseSchema>;
export type ListChaptersResponse = z.infer<typeof ListChaptersResponseSchema>;
export type CreateChapterResponse = z.infer<typeof CreateChapterResponseSchema>;
