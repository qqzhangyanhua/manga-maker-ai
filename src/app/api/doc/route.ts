/**
 * OpenAPI Spec Generation API Route
 * 生成 Next.js API 的 OpenAPI 文档
 */
import { NextResponse } from "next/server";
import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  RegisterRequestSchema,
  RegisterResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  SendVerificationCodeRequestSchema,
  MessageResponseSchema,
  ErrorResponseSchema,
  UserResponseSchema
} from "@/lib/api-schemas/auth.schemas";
import {
  CreateCharacterRequestSchema,
  UpdateCharacterRequestSchema,
  CharacterResponseSchema,
  CharacterListResponseSchema
} from "@/lib/api-schemas/character.schemas";
import {
  GenerateStoryRequestSchema,
  CreateStoryRequestSchema,
  UpdateStoryRequestSchema,
  ExpandStoryActRequestSchema,
  GenerateIdeaRequestSchema,
  CreateChapterRequestSchema,
  StoryDetailResponseSchema,
  ListStoriesResponseSchema,
  GenerateStoryResponseSchema,
  CreateStoryResponseSchema,
  UpdateStoryResponseSchema,
  DeleteStoryResponseSchema,
  ExpandStoryActResponseSchema,
  GenerateIdeaResponseSchema,
  ListChaptersResponseSchema,
  CreateChapterResponseSchema
} from "@/lib/api-schemas/story.schemas";
import {
  UpdateChapterRequestSchema,
  GeneratePanelsRequestSchema,
  ExpandContentRequestSchema,
  PublishChapterRequestSchema,
  ChapterDetailResponseSchema,
  UpdateChapterResponseSchema,
  DeleteChapterResponseSchema,
  GeneratePanelsResponseSchema,
  ExpandContentResponseSchema,
  PublishChapterResponseSchema
} from "@/lib/api-schemas/chapter.schemas";
import {
  UpdatePanelRequestSchema,
  ReorderPanelsRequestSchema,
  BatchUpdatePanelsRequestSchema,
  BatchDeletePanelsRequestSchema,
  GenerateVariantsRequestSchema,
  UpdatePanelResponseSchema,
  ReorderPanelsResponseSchema,
  BatchUpdatePanelsResponseSchema,
  BatchDeletePanelsResponseSchema,
  GenerateVariantsResponseSchema
} from "@/lib/api-schemas/panel.schemas";
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  CreateProjectResponseSchema,
  UpdateProjectResponseSchema,
  DeleteProjectResponseSchema,
  ListProjectsResponseSchema
} from "@/lib/api-schemas/project.schemas";
import {
  GeneratePanelImageRequestSchema,
  BatchGenerateImagesRequestSchema,
  OptimizeImageRequestSchema,
  GeneratePanelImageResponseSchema,
  BatchGenerateImagesResponseSchema,
  TaskStatusResponseSchema,
  OptimizeImageResponseSchema
} from "@/lib/api-schemas/image.schemas";

// 创建 OpenAPI 注册表
const registry = new OpenAPIRegistry();

// 注册 Security Scheme
registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "comicai_session",
  description: "HTTP-only session cookie（通过 /api/auth/login 获取）"
});

// ============ 注册 Auth 相关的 API Paths ============

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags: ["Authentication"],
  summary: "用户注册",
  description: `
注册新用户账户。

**功能**：
- 创建新用户账户
- 发送邮箱验证码
- 返回用户信息（无需登录即可注册）

**后续操作**：
- 用户需要通过 \`/api/auth/verify-email\` 验证邮箱
- 验证后可使用 \`/api/auth/login\` 登录
`,
  request: {
    body: {
      content: {
        "application/json": {
          schema: RegisterRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: "注册成功",
      content: {
        "application/json": {
          schema: RegisterResponseSchema
        }
      }
    },
    400: {
      description: "请求参数无效或邮箱已存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Authentication"],
  summary: "用户登录",
  description: `
用户登录并创建会话。

**功能**：
- 验证邮箱和密码
- 创建 HTTP-only cookie (\`comicai_session\`)
- 返回用户信息

**Cookie 说明**：
- Cookie 名称: \`comicai_session\`
- 有效期: 7 天
- HttpOnly: true（无法通过 JavaScript 访问）
- SameSite: lax
`,
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "登录成功",
      content: {
        "application/json": {
          schema: LoginResponseSchema
        }
      }
    },
    401: {
      description: "邮箱或密码错误",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/auth/send-code",
  tags: ["Authentication"],
  summary: "发送验证码",
  description: `
发送邮箱验证码。

**用途**：
- 用户注册时验证邮箱
- 重置密码时验证身份

**限制**：
- 同一邮箱 60 秒内只能发送一次
- 验证码有效期 5 分钟
`,
  request: {
    body: {
      content: {
        "application/json": {
          schema: SendVerificationCodeRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "验证码发送成功",
      content: {
        "application/json": {
          schema: MessageResponseSchema
        }
      }
    },
    429: {
      description: "发送过于频繁，请稍后再试",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Authentication"],
  summary: "获取当前用户信息",
  description: `
获取当前登录用户的详细信息。

**认证要求**：需要有效的 session cookie

**返回信息**：
- 用户基本信息
- 积分余额
- 账户状态
`,
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "成功获取用户信息",
      content: {
        "application/json": {
          schema: UserResponseSchema
        }
      }
    },
    401: {
      description: "未登录",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Authentication"],
  summary: "用户登出",
  description: "清除用户的 session cookie",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "登出成功",
      content: {
        "application/json": {
          schema: MessageResponseSchema
        }
      }
    }
  }
});

// ============ 注册 Character 相关的 API Paths ============

registry.registerPath({
  method: "post",
  path: "/api/character",
  tags: ["Characters"],
  summary: "创建角色",
  description: `
创建新的漫画角色。

**功能**：
- 创建角色基础信息
- 自动创建默认服装
- 可选上传参考图片

**后续操作**：
- 使用 \`/api/character/{id}/regenerate-image\` 生成角色外观
- 使用 \`/api/character/generate-expressions\` 生成表情矩阵
`,
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateCharacterRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: "角色创建成功",
      content: {
        "application/json": {
          schema: CharacterResponseSchema
        }
      }
    },
    400: {
      description: "请求参数无效",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    401: {
      description: "未授权",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/character",
  tags: ["Characters"],
  summary: "列出角色",
  description: `
列出当前用户的所有角色。

**查询参数**：
- \`page\`: 页码（默认 1）
- \`limit\`: 每页数量（默认 20）
- \`search\`: 搜索关键词（可选）
`,
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "角色列表",
      content: {
        "application/json": {
          schema: CharacterListResponseSchema
        }
      }
    },
    401: {
      description: "未授权",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/character/{id}",
  tags: ["Characters"],
  summary: "获取角色详情",
  description: "获取指定角色的详细信息",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "角色 ID",
        example: "123e4567-e89b-12d3-a456-426614174000"
      })
    })
  },
  responses: {
    200: {
      description: "角色详情",
      content: {
        "application/json": {
          schema: CharacterResponseSchema
        }
      }
    },
    404: {
      description: "角色不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    401: {
      description: "未授权",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "put",
  path: "/api/character/{id}",
  tags: ["Characters"],
  summary: "更新角色",
  description: "更新角色的基础信息",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "角色 ID",
        example: "123e4567-e89b-12d3-a456-426614174000"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateCharacterRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "更新成功",
      content: {
        "application/json": {
          schema: CharacterResponseSchema
        }
      }
    },
    404: {
      description: "角色不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    401: {
      description: "未授权",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/character/{id}",
  tags: ["Characters"],
  summary: "删除角色",
  description: "删除指定的角色及其关联数据（服装、表情等）",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "角色 ID",
        example: "123e4567-e89b-12d3-a456-426614174000"
      })
    })
  },
  responses: {
    204: {
      description: "删除成功"
    },
    404: {
      description: "角色不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    401: {
      description: "未授权",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

// ============ 注册 Story 相关的 API Paths ============

registry.registerPath({
  method: "post",
  path: "/api/story/generate",
  tags: ["Stories"],
  summary: "AI 生成故事大纲（流式）",
  description: `
AI 生成故事大纲，支持 Server-Sent Events (SSE) 流式返回。

**功能**：
- 根据创意前提生成完整故事大纲
- 流式返回生成过程
- 可选保存到数据库
- 支持三幕结构

**流式事件**：
- \`validating\`: 验证权限
- \`generating\`: AI 正在生成
- \`chunk\`: 生成片段
- \`saving\`: 保存到数据库
- \`done\`: 生成完成
- \`error\`: 错误
`,
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: GenerateStoryRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "流式响应（Server-Sent Events）",
      content: {
        "text/event-stream": {
          schema: z.object({
            type: z.string(),
            message: z.string(),
            chunk: z.string().optional(),
            story: z.any().optional()
          })
        }
      }
    },
    401: {
      description: "未授权",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    429: {
      description: "配额已用尽",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/story",
  tags: ["Stories"],
  summary: "列出故事",
  description: "列出当前用户的所有故事，支持分页和状态筛选",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "故事列表",
      content: {
        "application/json": {
          schema: ListStoriesResponseSchema
        }
      }
    },
    401: {
      description: "未授权",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/story",
  tags: ["Stories"],
  summary: "创建故事",
  description: "手动创建新故事（用于草稿模式）",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateStoryRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "故事创建成功",
      content: {
        "application/json": {
          schema: CreateStoryResponseSchema
        }
      }
    },
    400: {
      description: "请求参数无效",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    401: {
      description: "未授权",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/story/{id}",
  tags: ["Stories"],
  summary: "获取故事详情",
  description: "获取故事的完整信息，包括角色、章节、项目引用等",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "故事 ID"
      })
    })
  },
  responses: {
    200: {
      description: "故事详情",
      content: {
        "application/json": {
          schema: StoryDetailResponseSchema
        }
      }
    },
    404: {
      description: "故事不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    403: {
      description: "无权访问",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "patch",
  path: "/api/story/{id}",
  tags: ["Stories"],
  summary: "更新故事",
  description: "更新故事的基础信息或大纲",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "故事 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateStoryRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "更新成功",
      content: {
        "application/json": {
          schema: UpdateStoryResponseSchema
        }
      }
    },
    404: {
      description: "故事不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/story/{id}",
  tags: ["Stories"],
  summary: "删除故事",
  description: "删除故事及其关联的章节、分镜等数据",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "故事 ID"
      })
    })
  },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: DeleteStoryResponseSchema
        }
      }
    },
    404: {
      description: "故事不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/story/expand",
  tags: ["Stories"],
  summary: "扩展故事幕次（流式）",
  description: `
将故事的某一幕次扩展为详细场景列表。

**用途**：
- 从三幕结构生成详细场景
- 准备用于分镜生成
`,
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ExpandStoryActRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "流式响应",
      content: {
        "text/event-stream": {
          schema: z.object({
            type: z.string(),
            scenes: z.any().optional()
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/story/generate-idea",
  tags: ["Stories"],
  summary: "生成故事创意",
  description: "基于关键词或类型生成故事创意建议",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: GenerateIdeaRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "创意生成成功",
      content: {
        "application/json": {
          schema: GenerateIdeaResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/story/{id}/chapters",
  tags: ["Stories"],
  summary: "获取故事的所有章节",
  description: "获取指定故事下的所有章节列表",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "故事 ID"
      })
    })
  },
  responses: {
    200: {
      description: "章节列表",
      content: {
        "application/json": {
          schema: ListChaptersResponseSchema
        }
      }
    },
    404: {
      description: "故事不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/story/{id}/chapters",
  tags: ["Stories"],
  summary: "创建新章节",
  description: "在指定故事下创建新章节",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "故事 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: CreateChapterRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "章节创建成功",
      content: {
        "application/json": {
          schema: CreateChapterResponseSchema
        }
      }
    },
    404: {
      description: "故事不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

// ============ 注册 Chapter 相关的 API Paths ============

registry.registerPath({
  method: "get",
  path: "/api/chapter/{id}",
  tags: ["Chapters"],
  summary: "获取章节详情",
  description: "获取章节详情，包含所有分镜信息",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "章节 ID"
      })
    })
  },
  responses: {
    200: {
      description: "章节详情",
      content: {
        "application/json": {
          schema: ChapterDetailResponseSchema
        }
      }
    },
    404: {
      description: "章节不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "patch",
  path: "/api/chapter/{id}",
  tags: ["Chapters"],
  summary: "更新章节",
  description: "更新章节的标题、摘要或内容",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "章节 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateChapterRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "更新成功",
      content: {
        "application/json": {
          schema: UpdateChapterResponseSchema
        }
      }
    },
    404: {
      description: "章节不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/chapter/{id}",
  tags: ["Chapters"],
  summary: "删除章节",
  description: "删除章节及其所有分镜",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "章节 ID"
      })
    })
  },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: DeleteChapterResponseSchema
        }
      }
    },
    404: {
      description: "章节不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/chapter/{id}/generate-panels",
  tags: ["Chapters"],
  summary: "AI 生成分镜",
  description: `
为章节自动生成分镜脚本。

**功能**：
- 根据章节摘要生成分镜
- 自动分配镜头角度
- 识别出场角色
- 生成视觉描述

**前置条件**：
- 章节必须有 summary（摘要）
- 必须关联到项目
`,
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "章节 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: GeneratePanelsRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "分镜生成成功",
      content: {
        "application/json": {
          schema: GeneratePanelsResponseSchema
        }
      }
    },
    400: {
      description: "章节缺少摘要或其他前置条件",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    429: {
      description: "配额已用尽",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/chapter/{id}/expand-content",
  tags: ["Chapters"],
  summary: "扩展章节内容",
  description: "使用 AI 扩展章节的文字内容至目标字数",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "章节 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: ExpandContentRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "内容扩展成功",
      content: {
        "application/json": {
          schema: ExpandContentResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/chapter/{id}/publish",
  tags: ["Chapters"],
  summary: "发布/取消发布章节",
  description: "设置章节的发布状态",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "章节 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: PublishChapterRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "发布状态更新成功",
      content: {
        "application/json": {
          schema: PublishChapterResponseSchema
        }
      }
    }
  }
});

// ============ 注册 Panel 相关的 API Paths ============

registry.registerPath({
  method: "patch",
  path: "/api/panel/{id}",
  tags: ["Panels"],
  summary: "更新分镜",
  description: "更新分镜的类型、内容、镜头角度等属性",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "分镜 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdatePanelRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "更新成功",
      content: {
        "application/json": {
          schema: UpdatePanelResponseSchema
        }
      }
    },
    404: {
      description: "分镜不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/panel/reorder",
  tags: ["Panels"],
  summary: "调整分镜顺序",
  description: "批量调整分镜的显示顺序",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ReorderPanelsRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "顺序调整成功",
      content: {
        "application/json": {
          schema: ReorderPanelsResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/panel/batch-update",
  tags: ["Panels"],
  summary: "批量更新分镜",
  description: "一次性更新多个分镜的属性",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: BatchUpdatePanelsRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "批量更新成功",
      content: {
        "application/json": {
          schema: BatchUpdatePanelsResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/panel/batch-delete",
  tags: ["Panels"],
  summary: "批量删除分镜",
  description: "一次性删除多个分镜",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: BatchDeletePanelsRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "批量删除成功",
      content: {
        "application/json": {
          schema: BatchDeletePanelsResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/panel/{id}/variants",
  tags: ["Panels"],
  summary: "生成分镜变体",
  description: `
为分镜生成多个图片变体。

**功能**：
- 生成 1-4 个不同的视觉呈现
- 保持分镜内容不变
- 用户可选择最佳变体
`,
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "分镜 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: GenerateVariantsRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "变体生成任务已创建",
      content: {
        "application/json": {
          schema: GenerateVariantsResponseSchema
        }
      }
    },
    429: {
      description: "配额已用尽",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

// ============ 注册 Project 相关的 API Paths ============

registry.registerPath({
  method: "post",
  path: "/api/project",
  tags: ["Projects"],
  summary: "创建漫画项目",
  description: "基于故事创建新的漫画项目",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateProjectRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: "项目创建成功",
      content: {
        "application/json": {
          schema: CreateProjectResponseSchema
        }
      }
    },
    400: {
      description: "请求参数无效",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/project",
  tags: ["Projects"],
  summary: "列出项目",
  description: "列出当前用户的所有漫画项目",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "项目列表",
      content: {
        "application/json": {
          schema: ListProjectsResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "patch",
  path: "/api/project/{id}",
  tags: ["Projects"],
  summary: "更新项目",
  description: "更新项目的基础信息",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "项目 ID"
      })
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateProjectRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "更新成功",
      content: {
        "application/json": {
          schema: UpdateProjectResponseSchema
        }
      }
    },
    404: {
      description: "项目不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/project/{id}",
  tags: ["Projects"],
  summary: "删除项目",
  description: "删除漫画项目",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "项目 ID"
      })
    })
  },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: DeleteProjectResponseSchema
        }
      }
    }
  }
});

// ============ 注册 Image 相关的 API Paths ============

registry.registerPath({
  method: "post",
  path: "/api/panel/generate-image",
  tags: ["Image Generation"],
  summary: "为单个分镜生成图像",
  description: `
为指定分镜生成图片（同步或异步）。

**功能**：
- 基于分镜 prompt 生成图片
- 自动绑定角色、服装、场景等资产参考图
- 智能查找最佳参考图（reference_image → base_image → expressions → views）
- 支持自定义参数（模型、宽高比、步数、引导强度等）

**参考图优先级**：
1. 用户手动选择的 reference_image_urls
2. 角色 reference_image
3. 角色 base_image_url
4. 角色 neutral 表情
5. 角色任意表情
6. 角色正面三视图

**生成模式**：
- wait=true: 同步等待生成完成，直接返回图片 URL
- wait=false: 异步生成，返回 task_id，需通过 /api/image/task/{id} 查询进度
`,
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: GeneratePanelImageRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "图片生成成功（同步模式）或任务已创建（异步模式）",
      content: {
        "application/json": {
          schema: GeneratePanelImageResponseSchema
        }
      }
    },
    401: {
      description: "未登录",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    403: {
      description: "无权限访问该分镜",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    404: {
      description: "分镜不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    429: {
      description: "配额已用尽",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "put",
  path: "/api/panel/generate-image",
  tags: ["Image Generation"],
  summary: "批量生成项目所有分镜图像",
  description: `
批量为项目的所有分镜生成图片（异步任务队列）。

**功能**：
- 筛选所有有 prompt_used 的分镜
- 批量提交图片生成任务
- 返回所有任务 ID 列表

**使用场景**：
- 完成分镜脚本后，一键生成所有分镜图片
- 适合大批量生成（10+ 分镜）

**注意事项**：
- 每个分镜计入配额
- 如果配额不足会返回 429 错误
`,
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: BatchGenerateImagesRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "批量生成任务已创建",
      content: {
        "application/json": {
          schema: BatchGenerateImagesResponseSchema
        }
      }
    },
    400: {
      description: "项目不存在或没有可生成的分镜",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    403: {
      description: "无权限访问该项目",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    429: {
      description: "配额不足",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/image/task/{id}",
  tags: ["Image Generation"],
  summary: "查询图片生成任务状态",
  description: `
查询指定任务的生成状态和结果。

**任务状态**：
- pending: 等待处理
- processing: 正在生成
- completed: 生成完成
- failed: 生成失败

**轮询建议**：
- 每 2-5 秒查询一次
- completed/failed 后停止轮询
`,
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: "任务 ID",
        example: "550e8400-e29b-41d4-a716-446655440000"
      })
    })
  },
  responses: {
    200: {
      description: "任务状态",
      content: {
        "application/json": {
          schema: TaskStatusResponseSchema
        }
      }
    },
    404: {
      description: "任务不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/image/task-status",
  tags: ["Image Generation"],
  summary: "查询任务状态（URL参数版）",
  description: `
通过 URL 参数查询任务状态（与 GET /api/image/task/{id} 功能相同）。

**使用方式**：
\`\`\`
GET /api/image/task-status?task_id=550e8400-e29b-41d4-a716-446655440000
\`\`\`
`,
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      task_id: z.string().uuid().openapi({
        description: "任务 ID",
        example: "550e8400-e29b-41d4-a716-446655440000"
      })
    })
  },
  responses: {
    200: {
      description: "任务状态",
      content: {
        "application/json": {
          schema: TaskStatusResponseSchema
        }
      }
    },
    400: {
      description: "缺少 task_id 参数",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/image/optimize",
  tags: ["Image Generation"],
  summary: "图片优化与再生成",
  description: `
对已有图片进行优化或风格转换。

**优化模式**：
- enhance: 整体增强（细节、清晰度、质量）
- lighting: 光影优化
- color: 色彩调整
- cleanup: 去噪清理

**功能特性**：
- 支持保留原图构图和角色
- 可指定目标风格
- 调整优化强度（10-100）
- 保留画布布局配置（canvasSchema）

**版本管理**：
- 每次优化创建新版本记录
- 可追踪优化历史（通过 versionId）
- 关联到项目（projectId）
`,
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: OptimizeImageRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "优化任务已创建",
      content: {
        "application/json": {
          schema: OptimizeImageResponseSchema
        }
      }
    },
    400: {
      description: "参数错误",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    429: {
      description: "配额已用尽",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

// ============ 生成 OpenAPI 文档 ============

const generator = new OpenApiGeneratorV31(registry.definitions);

const openApiDocument = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "Manga Maker AI - Comic Creation APIs",
    version: "1.0.0",
    description: `
# 漫画创作平台 API 文档

本文档涵盖 Manga Maker AI 的所有 Next.js API endpoints。

## 认证方式

本服务使用 **HTTP-only Cookie** 认证：

1. 用户通过 \`POST /api/auth/login\` 登录
2. 服务器返回 HTTP-only cookie (\`comicai_session\`)
3. 后续请求自动携带 cookie 完成认证

**Cookie 详情**：
- Cookie 名称: \`comicai_session\`
- 有效期: 7 天
- HttpOnly: true（前端 JavaScript 无法访问）
- SameSite: lax

## API 模块

### Authentication
用户注册、登录、邮箱验证、密码重置等功能。

### Characters
数字演员（角色）管理，包括创建、编辑、生成外观、表情矩阵等。

### Stories
故事大纲生成、三幕结构、场景扩展、创意生成等功能。

### Chapters
章节管理、内容扩展、分镜生成、发布管理等。

### Panels
分镜面板管理、布局设计、镜头调整、变体生成、批量操作等。

### Projects
漫画项目管理、进度跟踪、风格配置等。

### Image Generation
AI 图片生成、任务管理、变体生成、图片库管理等。

## 开发环境

- **Base URL**: http://localhost:3000
- **Novel Backend Proxy**: \`/api/novel/*\` → http://localhost:8000

## 生产环境

- **Base URL**: https://your-domain.com
- **Novel Backend**: 通过 Next.js 代理访问
`,
    contact: {
      name: "Manga Maker AI Support",
      email: "support@manga-maker-ai.com"
    }
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "开发环境"
    },
    {
      url: "https://your-domain.com",
      description: "生产环境"
    }
  ]
});

export async function GET() {
  return NextResponse.json(openApiDocument);
}
