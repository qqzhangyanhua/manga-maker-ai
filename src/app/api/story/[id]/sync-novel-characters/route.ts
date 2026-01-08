import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface SuggestedCharacter {
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "minor";
  description: string;
  appearance: string;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Sync novel characters request received", {
      endpoint: "/api/story/[id]/sync-novel-characters",
      storyId: params.id,
    });

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

    // 获取请求体
    const body = await req.json();
    const { character_names } = body as { character_names?: string[] };

    logInfo("Request validated", {
      endpoint: "/api/story/[id]/sync-novel-characters",
      userId,
      storyId: params.id,
      characterCount: character_names?.length,
    });

    // 验证 Story 是否存在且属于当前用户
    const story = await prisma.story.findUnique({
      where: { id: params.id },
    });

    if (!story) {
      return NextResponse.json({ error: "剧本不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    if (!story.source_novel_id) {
      return NextResponse.json(
        { error: "此剧本未关联小说项目" },
        { status: 400 }
      );
    }

    // 从 suggested_characters 中获取角色列表
    const suggestedCharacters = (story.suggested_characters as unknown as SuggestedCharacter[]) || [];

    if (suggestedCharacters.length === 0) {
      return NextResponse.json(
        { error: "未找到建议角色，请先执行角色分析" },
        { status: 400 }
      );
    }

    // 过滤需要同步的角色
    const charactersToSync = character_names
      ? suggestedCharacters.filter((char) => character_names.includes(char.name))
      : suggestedCharacters;

    if (charactersToSync.length === 0) {
      return NextResponse.json(
        { error: "未找到匹配的角色" },
        { status: 400 }
      );
    }

    logInfo("Starting character sync", {
      endpoint: "/api/story/[id]/sync-novel-characters",
      userId,
      storyId: params.id,
      totalCharacters: charactersToSync.length,
    });

    // 获取已存在的角色名称（避免重复）
    const existingStoryCharacters = await prisma.storyCharacter.findMany({
      where: { story_id: params.id },
      include: { character: true },
    });

    const existingNames = new Set(
      existingStoryCharacters.map((sc) => sc.character.name)
    );

    // 批量创建角色
    const createdCharacters = [];
    const skippedCharacters = [];

    for (const char of charactersToSync) {
      // 跳过已存在的角色
      if (existingNames.has(char.name)) {
        skippedCharacters.push(char.name);
        continue;
      }

      // 创建 Character
      const character = await prisma.character.create({
        data: {
          name: char.name,
          description: char.description,
          style_prompt: char.appearance,
          user_id: userId,
        },
      });

      // 关联到 Story
      await prisma.storyCharacter.create({
        data: {
          story_id: params.id,
          character_id: character.id,
          role: char.role,
        },
      });

      createdCharacters.push({
        id: character.id,
        name: character.name,
        role: char.role,
      });
    }

    logInfo("Character sync completed", {
      endpoint: "/api/story/[id]/sync-novel-characters",
      userId,
      storyId: params.id,
      createdCount: createdCharacters.length,
      skippedCount: skippedCharacters.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      synced_count: createdCharacters.length,
      skipped_count: skippedCharacters.length,
      characters: createdCharacters,
      skipped_characters: skippedCharacters,
    });
  } catch (error) {
    logError("Sync novel characters failed", error, {
      endpoint: "/api/story/[id]/sync-novel-characters",
      userId: userId || "unknown",
      storyId: params.id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "同步角色失败" },
      { status: 500 }
    );
  }
}
