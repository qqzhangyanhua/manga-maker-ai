/**
 * Canvas Chapter Characters API
 * GET /api/canvas/chapter/[id]/characters - 获取章节相关的角色列表
 *
 * 从章节的所有镜头中提取 character_ids，返回角色详情和资产状态
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo } from "@/lib/api-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 角色资产状态
 */
interface CharacterAssetStatus {
  has_reference: boolean;      // 有主参考图
  has_base_image: boolean;     // 有基础图片
  has_views: boolean;          // 有三视图 (>=3)
  has_expressions: boolean;    // 有表情矩阵 (>=6)
  has_outfits: boolean;        // 有服装 (>=1)
  ready_for_generation: boolean; // 可用于生成
  missing_assets: string[];    // 缺失的资产列表
}

/**
 * 章节角色响应
 */
interface ChapterCharacterResponse {
  id: string;
  name: string;
  description: string | null;
  base_prompt: string;
  base_image_url: string | null;
  reference_image: string | null;
  style_prompt: string | null;
  usage_count: number;
  views_count: number;
  expressions_count: number;
  outfits_count: number;
  asset_status: CharacterAssetStatus;
  shot_count: number; // 在本章节中出现的镜头数
}

/**
 * 计算角色资产状态
 */
function calculateAssetStatus(character: {
  reference_image: string | null;
  base_image_url: string | null;
  views: { id: string }[];
  expressions: { id: string }[];
  outfits: { id: string }[];
}): CharacterAssetStatus {
  const missing: string[] = [];

  const has_reference = !!character.reference_image;
  const has_base_image = !!character.base_image_url;
  const has_views = character.views.length >= 3;
  const has_expressions = character.expressions.length >= 6;
  const has_outfits = character.outfits.length >= 1;

  // 生成需要至少有参考图或基础图片
  const ready_for_generation = has_reference || has_base_image;

  if (!has_reference && !has_base_image) {
    missing.push("参考图片");
  }
  if (!has_views) {
    missing.push(`三视图 (${character.views.length}/3)`);
  }
  if (!has_expressions) {
    missing.push(`表情矩阵 (${character.expressions.length}/6)`);
  }
  if (!has_outfits) {
    missing.push("服装");
  }

  return {
    has_reference,
    has_base_image,
    has_views,
    has_expressions,
    has_outfits,
    ready_for_generation,
    missing_assets: missing,
  };
}

/**
 * GET /api/canvas/chapter/[id]/characters - 获取章节角色列表
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

  const { id: chapterId } = await params;

  try {
    // 1. 获取章节和所有镜头的 character_ids
    const chapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: { select: { user_id: true } },
        script_segments: {
          include: {
            shot_designs: {
              select: { id: true, character_ids: true },
            },
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // 2. 提取所有 character_ids 并统计出现次数
    const characterShotCount = new Map<string, number>();

    for (const segment of chapter.script_segments) {
      for (const shot of segment.shot_designs) {
        for (const charId of shot.character_ids) {
          characterShotCount.set(
            charId,
            (characterShotCount.get(charId) || 0) + 1
          );
        }
      }
    }

    const characterIds = Array.from(characterShotCount.keys());

    if (characterIds.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        summary: {
          total_characters: 0,
          ready_count: 0,
          needs_generation_count: 0,
        },
      });
    }

    // 3. 获取角色详情
    const characters = await prisma.character.findMany({
      where: {
        id: { in: characterIds },
        user_id: payload.userId, // 只能看自己的角色
      },
      include: {
        views: { select: { id: true } },
        expressions: { select: { id: true } },
        outfits: { select: { id: true } },
      },
    });

    // 4. 构建响应
    const response: ChapterCharacterResponse[] = characters.map(char => ({
      id: char.id,
      name: char.name,
      description: char.description,
      base_prompt: char.base_prompt,
      base_image_url: char.base_image_url,
      reference_image: char.reference_image,
      style_prompt: char.style_prompt,
      usage_count: char.usage_count,
      views_count: char.views.length,
      expressions_count: char.expressions.length,
      outfits_count: char.outfits.length,
      asset_status: calculateAssetStatus(char),
      shot_count: characterShotCount.get(char.id) || 0,
    }));

    // 按出现次数排序（出现最多的在前）
    response.sort((a, b) => b.shot_count - a.shot_count);

    const readyCount = response.filter(c => c.asset_status.ready_for_generation).length;

    logInfo("获取章节角色列表", {
      chapterId,
      totalCharacters: response.length,
      readyCount,
    });

    return NextResponse.json({
      data: response,
      total: response.length,
      summary: {
        total_characters: response.length,
        ready_count: readyCount,
        needs_generation_count: response.length - readyCount,
      },
    });
  } catch (error) {
    console.error("[GET /api/canvas/chapter/[id]/characters]", error);
    return NextResponse.json(
      { error: "获取角色列表失败" },
      { status: 500 }
    );
  }
}
