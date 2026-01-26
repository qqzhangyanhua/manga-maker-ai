/**
 * 角色身份证 Prompt 管理 API
 * GET /api/canvas/character-prompt/[id] - 获取单个角色身份证详情
 * PUT /api/canvas/character-prompt/[id] - 更新角色身份证
 * DELETE /api/canvas/character-prompt/[id] - 删除角色身份证
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateCharacterPromptRequestSchema } from "@/lib/api-schemas/canvas.schemas";
import { buildFullPrompt } from "@/lib/character-prompt-generator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - 获取单个角色身份证详情
 */
export async function GET(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const template = await prisma.characterPromptTemplate.findFirst({
      where: {
        id,
        user_id: payload.userId,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "角色身份证不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        created_at: template.created_at.toISOString(),
        updated_at: template.updated_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("获取角色身份证失败:", error);
    return NextResponse.json(
      { error: "获取角色身份证失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT - 更新角色身份证
 */
export async function PUT(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    // 验证请求参数
    const validation = UpdateCharacterPromptRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "请求参数验证失败",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      appearance_prompt,
      clothing_prompt,
      style_prompt,
      characteristic_prompt,
      negative_prompt,
      reference_image_url,
      is_active,
    } = validation.data;

    // 检查模板是否存在且属于当前用户
    const existingTemplate = await prisma.characterPromptTemplate.findFirst({
      where: {
        id,
        user_id: payload.userId,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "角色身份证不存在" },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: {
      appearance_prompt?: string;
      clothing_prompt?: string;
      style_prompt?: string;
      characteristic_prompt?: string | null;
      negative_prompt?: string;
      reference_image_url?: string | null;
      is_active?: boolean;
      full_prompt?: string;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (appearance_prompt !== undefined) {
      updateData.appearance_prompt = appearance_prompt;
    }
    if (clothing_prompt !== undefined) {
      updateData.clothing_prompt = clothing_prompt;
    }
    if (style_prompt !== undefined) {
      updateData.style_prompt = style_prompt;
    }
    if (characteristic_prompt !== undefined) {
      updateData.characteristic_prompt = characteristic_prompt || null;
    }
    if (negative_prompt !== undefined) {
      updateData.negative_prompt = negative_prompt;
    }
    if (reference_image_url !== undefined) {
      updateData.reference_image_url = reference_image_url || null;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    // 如果 Prompt 部分有更新，重新生成 full_prompt
    if (
      appearance_prompt !== undefined ||
      clothing_prompt !== undefined ||
      style_prompt !== undefined ||
      characteristic_prompt !== undefined
    ) {
      const newParts = {
        appearance_prompt: appearance_prompt ?? existingTemplate.appearance_prompt,
        clothing_prompt: clothing_prompt ?? existingTemplate.clothing_prompt,
        style_prompt: style_prompt ?? existingTemplate.style_prompt,
        characteristic_prompt: characteristic_prompt ?? existingTemplate.characteristic_prompt ?? "",
        negative_prompt: negative_prompt ?? existingTemplate.negative_prompt,
      };
      updateData.full_prompt = buildFullPrompt(newParts);
    }

    // 更新数据库
    const updatedTemplate = await prisma.characterPromptTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      template: {
        ...updatedTemplate,
        created_at: updatedTemplate.created_at.toISOString(),
        updated_at: updatedTemplate.updated_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("更新角色身份证失败:", error);
    return NextResponse.json(
      { error: "更新角色身份证失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 删除角色身份证
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 检查模板是否存在且属于当前用户
    const existingTemplate = await prisma.characterPromptTemplate.findFirst({
      where: {
        id,
        user_id: payload.userId,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "角色身份证不存在" },
        { status: 404 }
      );
    }

    // 不允许删除基础版（如果存在变体版本）
    if (existingTemplate.version === "base") {
      const hasVariants = await prisma.characterPromptTemplate.count({
        where: {
          character_id: existingTemplate.character_id,
          user_id: payload.userId,
          version: "variant",
        },
      });

      if (hasVariants > 0) {
        return NextResponse.json(
          { error: "该角色存在变体版本，请先删除所有变体后再删除基础版" },
          { status: 400 }
        );
      }
    }

    // 删除模板
    await prisma.characterPromptTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "角色身份证已删除",
    });
  } catch (error) {
    console.error("删除角色身份证失败:", error);
    return NextResponse.json(
      { error: "删除角色身份证失败" },
      { status: 500 }
    );
  }
}
