import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createStyleSchema = z.object({
  style_key: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/),
  name_zh: z.string().min(1).max(50),
  name_en: z.string().min(1).max(50),
  image_url: z.string().min(1),
  tag_color: z.string().default("bg-primary text-background"),
  description: z.string().optional(),
  prompt_prefix: z.string().optional(),
  sort_order: z.number().int().default(0),
  enabled: z.boolean().default(true),
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

// GET /api/admin/comic-styles - 管理员获取所有风格（包括禁用的）
export async function GET(req: NextRequest) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const styles = await prisma.comicStyle.findMany({
      orderBy: [
        { sort_order: "asc" },
        { created_at: "desc" },
      ],
    });

    return NextResponse.json({ data: styles, total: styles.length });
  } catch (error) {
    console.error("[GET /api/admin/comic-styles]", error);
    return NextResponse.json(
      { error: "获取风格列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/admin/comic-styles - 创建新风格
export async function POST(req: NextRequest) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createStyleSchema.parse(body);

    // 检查 style_key 是否已存在
    const existing = await prisma.comicStyle.findUnique({
      where: { style_key: validated.style_key },
    });

    if (existing) {
      return NextResponse.json(
        { error: "风格标识已存在，请使用其他标识" },
        { status: 400 }
      );
    }

    const style = await prisma.comicStyle.create({
      data: {
        style_key: validated.style_key,
        name_zh: validated.name_zh,
        name_en: validated.name_en,
        image_url: validated.image_url,
        tag_color: validated.tag_color,
        description: validated.description,
        prompt_prefix: validated.prompt_prefix,
        sort_order: validated.sort_order,
        enabled: validated.enabled,
      },
    });

    return NextResponse.json(style, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[POST /api/admin/comic-styles]", error);
    return NextResponse.json(
      { error: "创建风格失败" },
      { status: 500 }
    );
  }
}
