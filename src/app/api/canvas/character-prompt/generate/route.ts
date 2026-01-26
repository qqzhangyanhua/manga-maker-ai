/**
 * 角色身份证 Prompt 生成 API
 * POST /api/canvas/character-prompt/generate - AI 生成角色身份证 Prompt
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GenerateCharacterPromptRequestSchema } from "@/lib/api-schemas/canvas.schemas";
import { generateCharacterPrompt, buildFullPrompt } from "@/lib/character-prompt-generator";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 验证请求参数
    const validation = GenerateCharacterPromptRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "请求参数验证失败",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { character_id, version, variant_name, user_guidance } = validation.data;

    // 检查是否已存在相同版本的模板
    const existingTemplate = await prisma.characterPromptTemplate.findFirst({
      where: {
        character_id,
        user_id: payload.userId,
        version,
        variant_name: version === "variant" ? variant_name : null,
      },
    });

    if (existingTemplate) {
      return NextResponse.json(
        {
          error: version === "base" 
            ? "该角色已存在基础版 Prompt 模板" 
            : `该角色已存在「${variant_name}」变体版本`,
        },
        { status: 409 }
      );
    }

    // 尝试从 NovelProject 的 characters JSON 字段获取角色信息
    // 或者从 Character 表获取
    let characterInfo: {
      name: string;
      age?: number | null;
      gender?: string | null;
      appearance?: string | null;
      personality?: string | null;
      description?: string | null;
      background?: string | null;
    } | null = null;

    // 首先尝试从 NovelProject.characters JSON 字段查找
    const novelProjects = await prisma.novelProject.findMany({
      where: {
        user_id: payload.userId,
      },
      select: {
        characters: true,
      },
    });

    for (const project of novelProjects) {
      if (project.characters && Array.isArray(project.characters)) {
        const found = (project.characters as Array<{
          id?: string;
          name: string;
          age?: number;
          gender?: string;
          appearance?: string;
          personality?: string;
          description?: string;
          background?: string;
        }>).find((c) => c.id === character_id);
        if (found) {
          characterInfo = {
            name: found.name,
            age: found.age,
            gender: found.gender,
            appearance: found.appearance,
            personality: found.personality,
            description: found.description,
            background: found.background,
          };
          break;
        }
      }
    }

    // 如果没找到，尝试从 Character 表查找
    if (!characterInfo) {
      const character = await prisma.character.findFirst({
        where: {
          id: character_id,
          user_id: payload.userId,
        },
      });

      if (character) {
        characterInfo = {
          name: character.name,
          description: character.description,
          // Character 表没有 age, gender, appearance 等字段，从 description 中提取
        };
      }
    }

    if (!characterInfo) {
      return NextResponse.json(
        { error: "未找到指定的角色" },
        { status: 404 }
      );
    }

    // 如果是变体版本，检查是否存在基础版
    if (version === "variant") {
      const baseTemplate = await prisma.characterPromptTemplate.findFirst({
        where: {
          character_id,
          user_id: payload.userId,
          version: "base",
        },
      });

      if (!baseTemplate) {
        return NextResponse.json(
          { error: "请先生成基础版 Prompt 模板" },
          { status: 400 }
        );
      }
    }

    // 调用 LLM 生成 Prompt
    const generatedPrompt = await generateCharacterPrompt(
      characterInfo,
      version,
      variant_name,
      user_guidance
    );

    // 保存到数据库
    const template = await prisma.characterPromptTemplate.create({
      data: {
        character_id,
        user_id: payload.userId,
        version,
        variant_name: version === "variant" ? variant_name : null,
        appearance_prompt: generatedPrompt.appearance_prompt,
        clothing_prompt: generatedPrompt.clothing_prompt,
        style_prompt: generatedPrompt.style_prompt,
        characteristic_prompt: generatedPrompt.characteristic_prompt || null,
        full_prompt: generatedPrompt.full_prompt,
        negative_prompt: generatedPrompt.negative_prompt,
        is_active: true,
        usage_count: 0,
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        created_at: template.created_at.toISOString(),
        updated_at: template.updated_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("生成角色身份证失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成角色身份证失败" },
      { status: 500 }
    );
  }
}
