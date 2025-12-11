import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildPanelPrompt } from "@/lib/prompt-builder";

/**
 * POST /api/panel/build-prompt
 * 根据分镜、角色与风格信息组装“三明治”提示词
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body = await req.json();
    const { panel_id, character_id, style_key, soften = true, aspect_ratio } = body;

    if (!panel_id) {
      return NextResponse.json({ error: "缺少 panel_id" }, { status: 400 });
    }

    // 读取分镜与所属项目
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: { project: true },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (!panel.project || panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限访问该分镜" }, { status: 403 });
    }

    // 可选角色（用于锁脸）
    const character = character_id
      ? await prisma.character.findFirst({
          where: { id: character_id, user_id: payload.userId },
          include: {
            views: true,
            expressions: true,
            outfits: true,
          },
        })
      : null;

    if (character_id && !character) {
      return NextResponse.json({ error: "角色不存在或无权限" }, { status: 404 });
    }

    // 读取风格模板
    const styleKey = style_key || panel.project.style || null;
    const style = styleKey
      ? await prisma.comicStyle.findFirst({
          where: { style_key: styleKey },
        })
      : null;

    const promptResult = buildPanelPrompt({
      panel,
      character,
      style,
      soften,
      aspectRatio: aspect_ratio,
    });

    const updatedPanel = await prisma.panel.update({
      where: { id: panel_id },
      data: { prompt_used: promptResult.prompt },
    });

    return NextResponse.json({
      success: true,
      prompt: promptResult.prompt,
      negative_prompt: promptResult.negativePrompt,
      replacements: promptResult.replacements,
      blocks: promptResult.blocks,
      panel: updatedPanel,
      message: "提示词已生成并写入分镜",
    });
  } catch (error) {
    console.error("Build prompt error:", error);
    const message = error instanceof Error ? error.message : "生成提示词失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
