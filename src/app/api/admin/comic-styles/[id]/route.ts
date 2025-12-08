import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateStyleSchema = z.object({
  style_key: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/).optional(),
  name_zh: z.string().min(1).max(50).optional(),
  name_en: z.string().min(1).max(50).optional(),
  image_url: z.string().min(1).optional(),
  tag_color: z.string().optional(),
  description: z.string().optional(),
  prompt_prefix: z.string().optional(),
  sort_order: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

// 验证管理员权限
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authorized: false, error: "未登录" };
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return { authorized: false, error: "无效的 token" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { authorized: false, error: "权限不足，需要管理员权限" };
  }

  return { authorized: true };
}

// PATCH /api/admin/comic-styles/:id - 更新风格
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const validated = updateStyleSchema.parse(body);

    // 检查风格是否存在
    const existing = await prisma.comicStyle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "风格不存在" },
        { status: 404 }
      );
    }

    // 如果更新 style_key，检查是否与其他记录冲突
    if (validated.style_key && validated.style_key !== existing.style_key) {
      const conflict = await prisma.comicStyle.findUnique({
        where: { style_key: validated.style_key },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "风格标识已被使用" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.comicStyle.update({
      where: { id },
      data: {
        ...validated,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/admin/comic-styles/:id]", error);
    return NextResponse.json(
      { error: "更新风格失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/comic-styles/:id - 删除风格
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    // 检查风格是否存在
    const existing = await prisma.comicStyle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "风格不存在" },
        { status: 404 }
      );
    }

    await prisma.comicStyle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("[DELETE /api/admin/comic-styles/:id]", error);
    return NextResponse.json(
      { error: "删除风格失败" },
      { status: 500 }
    );
  }
}
