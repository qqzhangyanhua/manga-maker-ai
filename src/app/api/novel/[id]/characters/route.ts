import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import type { GetNovelCharactersResponse, NovelCharacter } from "@/app/scripts/[id]/types/novel-import";

/**
 * 获取小说项目的角色列表
 *
 * 从 NovelProject.characters (JSONB) 中解析角色信息
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const novelId = params.id;
    logInfo("Get novel characters request", { endpoint: "/api/novel/[id]/characters", novelId });

    // 认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    userId = payload.userId;
    logInfo("User authenticated", { endpoint: "/api/novel/[id]/characters", userId, novelId });

    // 获取小说项目
    const novel = await prisma.novelProject.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        title: true,
        user_id: true,
        characters: true, // JSONB 字段
      },
    });

    if (!novel) {
      return NextResponse.json({ error: "小说项目不存在" }, { status: 404 });
    }

    // 权限检查
    if (novel.user_id !== userId) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    // 解析 characters JSONB
    let characters: NovelCharacter[] = [];

    if (novel.characters && typeof novel.characters === "object") {
      // characters 格式：[{ name, role, description, traits, relationships }]
      const rawCharacters = Array.isArray(novel.characters)
        ? novel.characters
        : [];

      characters = rawCharacters.map((char: unknown, index: number) => {
        const c = char as Record<string, unknown>;
        return {
          name: typeof c.name === "string" ? c.name : `角色${index + 1}`,
          role: typeof c.role === "string" ? c.role : "supporting",
          description: typeof c.description === "string" ? c.description : "",
          traits: Array.isArray(c.traits) ? c.traits as string[] : undefined,
          relationships: typeof c.relationships === "object" && c.relationships !== null
            ? c.relationships as Record<string, string>
            : undefined,
          tempId: `novel-char-${index}`, // 临时ID，用于前端选择
        };
      });
    }

    logInfo("Novel characters retrieved", {
      endpoint: "/api/novel/[id]/characters",
      userId,
      novelId,
      characterCount: characters.length,
      durationMs: Date.now() - startedAt,
    });

    const response: GetNovelCharactersResponse = {
      novel_id: novel.id,
      novel_title: novel.title,
      characters,
    };

    return NextResponse.json(response);
  } catch (error) {
    logError("Get novel characters failed", error, {
      endpoint: "/api/novel/[id]/characters",
      userId: userId || "unknown",
      novelId: params.id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "获取小说角色失败，请稍后重试" },
      { status: 500 }
    );
  }
}
