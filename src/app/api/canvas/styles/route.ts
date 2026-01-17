/**
 * Canvas Styles API
 * GET /api/canvas/styles - 获取可用的漫画风格列表（公开接口，仅返回启用的风格）
 *
 * 用于 Canvas 页面的风格选择器
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * 风格列表响应类型
 */
interface ComicStyleResponse {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string;
  tag_color: string;
  description: string | null;
  prompt_prefix: string | null;
}

/**
 * GET /api/canvas/styles - 获取启用的漫画风格列表
 *
 * 无需管理员权限，但需要登录
 * 仅返回 enabled=true 的风格
 */
export async function GET() {
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
    const styles = await prisma.comicStyle.findMany({
      where: { enabled: true },
      select: {
        id: true,
        style_key: true,
        name_zh: true,
        name_en: true,
        image_url: true,
        tag_color: true,
        description: true,
        prompt_prefix: true,
      },
      orderBy: [
        { sort_order: "asc" },
        { created_at: "desc" },
      ],
    });

    const response: ComicStyleResponse[] = styles.map(style => ({
      id: style.id,
      style_key: style.style_key,
      name_zh: style.name_zh,
      name_en: style.name_en,
      image_url: style.image_url,
      tag_color: style.tag_color,
      description: style.description,
      prompt_prefix: style.prompt_prefix,
    }));

    return NextResponse.json({
      data: response,
      total: response.length,
    });
  } catch (error) {
    console.error("[GET /api/canvas/styles]", error);
    return NextResponse.json(
      { error: "获取风格列表失败" },
      { status: 500 }
    );
  }
}
