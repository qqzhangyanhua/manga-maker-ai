import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import type {
  ImportNovelCharactersRequest,
  ImportNovelCharactersResponse,
  ImportedCharacterResult,
  NovelCharacter,
} from "@/app/scripts/[id]/types/novel-import";
import type { CharacterRole } from "@/components/character/RoleSelector";

/**
 * 导入小说角色到剧本
 *
 * 核心逻辑：
 * 1. 基于角色名称去重（检查 Character 表 + StoryCharacter 关联）
 * 2. 为新角色创建 Character 记录
 * 3. 创建 StoryCharacter 关联
 * 4. 使用事务保证数据一致性
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const storyId = params.id;
    logInfo("Import novel characters request", { endpoint: "/api/story/[id]/import-novel-characters", storyId });

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
    logInfo("User authenticated", { endpoint: "/api/story/[id]/import-novel-characters", userId, storyId });

    // 解析请求体
    const body: ImportNovelCharactersRequest = await req.json();
    const { novel_id, characters } = body;

    if (!novel_id || !characters || !Array.isArray(characters)) {
      return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
    }

    logInfo("Request validated", {
      endpoint: "/api/story/[id]/import-novel-characters",
      userId,
      storyId,
      novelId: novel_id,
      characterCount: characters.length,
    });

    // 获取剧本信息
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        user_id: true,
        source_novel_id: true,
        story_characters: {
          include: {
            character: true,
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "剧本不存在" }, { status: 404 });
    }

    // 权限检查
    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    // 验证小说关联
    if (story.source_novel_id !== novel_id) {
      return NextResponse.json(
        { error: "剧本未关联到此小说项目" },
        { status: 400 }
      );
    }

    // 获取已存在的角色名称（用于去重）
    const existingCharacterNames = story.story_characters.map(
      (sc) => sc.character.name.toLowerCase().trim()
    );

    logInfo("Existing characters checked", {
      endpoint: "/api/story/[id]/import-novel-characters",
      userId,
      storyId,
      existingCount: existingCharacterNames.length,
    });

    // 分类角色：新建 vs 跳过
    const toImport: NovelCharacter[] = [];
    const skipped: ImportedCharacterResult[] = [];

    characters.forEach((char) => {
      const normalizedName = char.name.toLowerCase().trim();

      if (existingCharacterNames.includes(normalizedName)) {
        // 已存在，跳过
        skipped.push({
          novel_character_name: char.name,
          character_id: "",
          character_name: char.name,
          role: mapRole(char.role),
          status: "skipped",
          reason: "角色已存在于剧本中",
        });
      } else {
        toImport.push(char);
      }
    });

    logInfo("Characters categorized", {
      endpoint: "/api/story/[id]/import-novel-characters",
      userId,
      storyId,
      toImportCount: toImport.length,
      skippedCount: skipped.length,
    });

    // 批量导入（事务）
    const imported: ImportedCharacterResult[] = [];
    const failed: Array<{ novel_character_name: string; reason: string }> = [];

    if (toImport.length > 0) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const novelChar of toImport) {
            try {
              // 1. 创建 Character
              const character = await tx.character.create({
                data: {
                  user_id: userId!,
                  name: novelChar.name,
                  description: novelChar.description || null,
                  base_prompt: novelChar.description || null,
                  reference_image: null, // 小说角色暂无图片
                  style_prompt: null,
                  training_status: "pending",
                },
              });

              // 2. 创建 StoryCharacter 关联
              await tx.storyCharacter.create({
                data: {
                  story_id: storyId,
                  character_id: character.id,
                  role: mapRole(novelChar.role),
                  character_arc: null,
                },
              });

              imported.push({
                novel_character_name: novelChar.name,
                character_id: character.id,
                character_name: character.name,
                role: mapRole(novelChar.role),
                status: "created",
              });

              logInfo("Character imported", {
                endpoint: "/api/story/[id]/import-novel-characters",
                userId,
                storyId,
                characterId: character.id,
                characterName: character.name,
              });
            } catch (charError) {
              logError("Character import failed", charError, {
                endpoint: "/api/story/[id]/import-novel-characters",
                userId,
                storyId,
                characterName: novelChar.name,
              });

              failed.push({
                novel_character_name: novelChar.name,
                reason: charError instanceof Error ? charError.message : "创建失败",
              });
            }
          }
        });
      } catch (txError) {
        logError("Transaction failed", txError, {
          endpoint: "/api/story/[id]/import-novel-characters",
          userId,
          storyId,
        });

        return NextResponse.json(
          { error: "批量导入失败，请稍后重试" },
          { status: 500 }
        );
      }
    }

    const response: ImportNovelCharactersResponse = {
      imported,
      skipped,
      failed,
      summary: {
        total: characters.length,
        imported_count: imported.length,
        skipped_count: skipped.length,
        failed_count: failed.length,
      },
    };

    logInfo("Import completed", {
      endpoint: "/api/story/[id]/import-novel-characters",
      userId,
      storyId,
      summary: response.summary,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
  } catch (error) {
    logError("Import novel characters failed", error, {
      endpoint: "/api/story/[id]/import-novel-characters",
      userId: userId || "unknown",
      storyId: params.id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "导入角色失败，请稍后重试" },
      { status: 500 }
    );
  }
}

/**
 * 映射小说角色类型到剧本角色类型
 */
function mapRole(novelRole: string): CharacterRole {
  const normalizedRole = novelRole.toLowerCase();

  switch (normalizedRole) {
    case "protagonist":
    case "主角":
      return "protagonist";
    case "antagonist":
    case "反派":
      return "antagonist";
    case "supporting":
    case "配角":
      return "supporting";
    case "minor":
    case "龙套":
      return "minor";
    default:
      return "supporting"; // 默认配角
  }
}
