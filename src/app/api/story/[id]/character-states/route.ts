import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

/**
 * GET /api/story/[id]/character-states
 * 获取故事的角色状态时间线
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const { id: storyId } = params;

    logInfo("Request received", {
      endpoint: `/api/story/${storyId}/character-states`,
      method: "GET",
    });

    // 1. 验证权限
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

    logInfo("User authenticated", {
      endpoint: `/api/story/${storyId}/character-states`,
      userId,
    });

    // 2. 检查故事权限
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { user_id: true },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 3. 获取所有章节和角色状态
    const chapters = await prisma.chapter.findMany({
      where: { story_id: storyId },
      orderBy: { chapter_order: "asc" },
      select: {
        id: true,
        title: true,
        chapter_order: true,
        character_states: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                reference_image: true,
              },
            },
          },
        },
      },
    });

    // 4. 获取故事中的所有角色
    const storyCharacters = await prisma.storyCharacter.findMany({
      where: { story_id: storyId },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            reference_image: true,
          },
        },
      },
    });

    // 5. 构建时间线数据结构
    const timeline = chapters.map((chapter) => ({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterOrder: chapter.chapter_order,
      characterStates: chapter.character_states.map((state) => ({
        characterId: state.character_id,
        characterName: state.character.name,
        characterImage: state.character.reference_image,
        location: state.location,
        physicalCondition: state.physical_condition,
        mentalState: state.mental_state,
        keyItems: state.key_items,
        relationshipChanges: state.relationship_changes,
        notes: state.notes,
        updatedAt: state.updated_at,
      })),
    }));

    // 6. 构建角色维度的时间线
    const characterTimelines = storyCharacters.map((sc) => {
      const states = chapters.map((chapter) => {
        const state = chapter.character_states.find(
          (s) => s.character_id === sc.character_id
        );

        if (!state) {
          return {
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            chapterOrder: chapter.chapter_order,
            hasState: false,
          };
        }

        return {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterOrder: chapter.chapter_order,
          hasState: true,
          location: state.location,
          physicalCondition: state.physical_condition,
          mentalState: state.mental_state,
          keyItems: state.key_items,
          relationshipChanges: state.relationship_changes,
          notes: state.notes,
        };
      });

      return {
        characterId: sc.character_id,
        characterName: sc.character.name,
        characterImage: sc.character.reference_image,
        role: sc.role,
        states,
      };
    });

    logInfo("Character states retrieved", {
      endpoint: `/api/story/${storyId}/character-states`,
      userId,
      chapterCount: chapters.length,
      characterCount: storyCharacters.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      timeline,
      characterTimelines,
      stats: {
        totalChapters: chapters.length,
        totalCharacters: storyCharacters.length,
        statesExtracted: chapters.reduce(
          (sum, ch) => sum + ch.character_states.length,
          0
        ),
      },
    });
  } catch (error) {
    logError("Get character states failed", error, {
      endpoint: `/api/story/${params.id}/character-states`,
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "获取角色状态失败",
      },
      { status: 500 }
    );
  }
}
