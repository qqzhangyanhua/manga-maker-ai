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

### Stories & Projects
故事大纲生成、分镜脚本、漫画项目管理。

### Panels & Storyboard
分镜面板管理、布局模板、镜头设计。

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
