/**
 * POST /api/canvas/chapter/[id]/characters/upgrade
 * 将小说角色升级为完整的 Character 记录
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { generateCharacterBaseImage } from "./image-generation";
import type {
  UpgradeNovelCharacterRequest,
  UpgradeNovelCharacterResponse,
  NovelSourceReference,
  NovelCharacterInput,
} from "./types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const startedAt = Date.now();

  try {
    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { id: chapterId } = await params;

    // 2. 解析请求体
    const body = (await req.json()) as UpgradeNovelCharacterRequest;
    const { novelCharacter, generateImage = false, comicStyleId } = body;

    // 验证必需字段
    if (!novelCharacter?.name || !novelCharacter?.description || !novelCharacter?.tempId) {
      return NextResponse.json(
        { error: "缺少必需字段：name, description, tempId" },
        { status: 400 }
      );
    }

    logInfo("开始升级小说角色", {
      endpoint: "/api/canvas/chapter/[id]/characters/upgrade",
      chapterId,
      userId: payload.userId,
      characterName: novelCharacter.name,
      generateImage,
    });

    // 3. 验证章节所有权
    const chapter = await prisma.timelineChapter.findFirst({
      where: { id: chapterId },
      include: {
        timeline: {
          select: {
            user_id: true,
            novel_project_id: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作此章节" }, { status: 403 });
    }

    // 4. 检查是否已存在同名角色（选项A：自动关联）
    const existingCharacter = await prisma.character.findFirst({
      where: {
        user_id: payload.userId,
        name: novelCharacter.name,
      },
      select: {
        id: true,
        name: true,
        description: true,
        base_image_url: true,
        source_type: true,
        source_reference: true,
      },
    });

    if (existingCharacter) {
      logInfo("发现已有同名角色，自动关联", {
        characterId: existingCharacter.id,
        characterName: existingCharacter.name,
      });

      // 关联到章节（避免重复添加）
      const currentCharacterIds = chapter.character_ids || [];
      if (!currentCharacterIds.includes(existingCharacter.id)) {
        await prisma.timelineChapter.update({
          where: { id: chapterId },
          data: {
            character_ids: [...currentCharacterIds, existingCharacter.id],
          },
        });
      }

      const response: UpgradeNovelCharacterResponse = {
        success: true,
        character: {
          id: existingCharacter.id,
          name: existingCharacter.name,
          description: existingCharacter.description,
          base_image_url: existingCharacter.base_image_url,
          source_type: (existingCharacter.source_type as "manual" | "novel" | "story_ai" | "imported") || "manual",
          source_reference: existingCharacter.source_reference as NovelSourceReference,
        },
        isNew: false,
        message: `已关联现有角色「${existingCharacter.name}」`,
      };

      return NextResponse.json(response);
    }

    // 5. 创建新 Character 记录
    const sourceReference: NovelSourceReference = {
      novelProjectId: chapter.timeline.novel_project_id,
      timelineId: chapter.timeline_id,
      chapterId,
      tempId: novelCharacter.tempId,
      originalName: novelCharacter.name,
    };

    const newCharacter = await prisma.character.create({
      data: {
        user_id: payload.userId,
        name: novelCharacter.name,
        description: novelCharacter.description,
        base_prompt: buildBasePrompt(novelCharacter),
        comic_style_id: comicStyleId || null,
        training_status: "pending",
        source_type: "novel",
        source_reference: sourceReference,
      },
    });

    logInfo("创建新角色成功", {
      characterId: newCharacter.id,
      characterName: newCharacter.name,
    });

    // 6. 创建默认服装
    await prisma.characterOutfit.create({
      data: {
        character_id: newCharacter.id,
        outfit_name: "默认装",
        outfit_type: "default",
        is_default: true,
      },
    });

    // 7. 关联到章节
    const currentCharacterIds = chapter.character_ids || [];
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        character_ids: [...currentCharacterIds, newCharacter.id],
      },
    });

    // 8. 可选：生成基础图片
    let imageGenerated = false;
    let finalImageUrl = newCharacter.base_image_url;

    if (generateImage) {
      try {
        logInfo("开始生成角色基础图片", {
          characterId: newCharacter.id,
        });

        const imageUrl = await generateCharacterBaseImage({
          userId: payload.userId,
          characterId: newCharacter.id,
          comicStyleId,
        });

        // 更新角色的 base_image_url
        await prisma.character.update({
          where: { id: newCharacter.id },
          data: { base_image_url: imageUrl },
        });

        finalImageUrl = imageUrl;
        imageGenerated = true;

        logInfo("角色基础图片生成成功", {
          characterId: newCharacter.id,
          imageUrl,
        });
      } catch (imageError) {
        logError("生成角色图片失败（角色已创建）", imageError, {
          characterId: newCharacter.id,
        });
        // 不中断流程，角色已创建，图片可以后续补充
      }
    }

    // 9. 返回响应
    const response: UpgradeNovelCharacterResponse = {
      success: true,
      character: {
        id: newCharacter.id,
        name: newCharacter.name,
        description: newCharacter.description,
        base_image_url: finalImageUrl,
        source_type: "novel",
        source_reference: sourceReference,
      },
      isNew: true,
      imageGenerated,
      message: imageGenerated
        ? `成功创建角色「${newCharacter.name}」并生成基础图片`
        : `成功创建角色「${newCharacter.name}」`,
    };

    logInfo("升级小说角色成功", {
      characterId: newCharacter.id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
  } catch (error) {
    logError("升级小说角色失败", error, {
      chapterId: (await params).id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "升级角色失败，请稍后重试" },
      { status: 500 }
    );
  }
}

/**
 * 根据小说角色信息构建 base_prompt
 */
function buildBasePrompt(novelCharacter: NovelCharacterInput): string {
  const parts: string[] = [novelCharacter.description];

  if (novelCharacter.role) {
    parts.push(`${novelCharacter.role} character`);
  }

  if (novelCharacter.traits && novelCharacter.traits.length > 0) {
    parts.push(novelCharacter.traits.join(", "));
  }

  return parts.join(", ");
}
