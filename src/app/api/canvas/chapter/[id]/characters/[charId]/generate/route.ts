/**
 * Canvas Chapter Character Generate API
 * POST /api/canvas/chapter/[id]/characters/[charId]/generate - 为指定角色生成资产
 *
 * 支持生成的资产类型：
 * - base_image: 基础图片
 * - views: 三视图
 * - expressions: 表情矩阵
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string; charId: string }>;
}

const generateRequestSchema = z.object({
  type: z.enum(["base_image", "views", "expressions"]),
  options: z.object({
    force_regenerate: z.boolean().optional().default(false),
  }).optional().default({}),
});

/**
 * POST /api/canvas/chapter/[id]/characters/[charId]/generate
 * 为章节中的角色生成资产
 */
export async function POST(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: chapterId, charId: characterId } = await params;

  try {
    const body = await req.json();
    const validated = generateRequestSchema.parse(body);

    // 1. 验证章节存在且属于当前用户
    const chapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: { select: { user_id: true } },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // 2. 验证角色存在且属于当前用户
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        views: { select: { id: true } },
        expressions: { select: { id: true } },
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    if (character.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作此角色" }, { status: 403 });
    }

    // 3. 验证角色确实在此章节中使用
    const shotWithCharacter = await prisma.shotDesign.findFirst({
      where: {
        script_segment: {
          timeline_chapter_id: chapterId,
        },
        character_ids: {
          has: characterId,
        },
      },
    });

    if (!shotWithCharacter) {
      return NextResponse.json(
        { error: "该角色未在此章节中使用" },
        { status: 400 }
      );
    }

    // 4. 根据类型转发到对应的生成 API
    const baseUrl = new URL(req.url).origin;

    switch (validated.type) {
      case "base_image": {
        // 检查是否已有基础图片
        if (character.base_image_url && !validated.options.force_regenerate) {
          return NextResponse.json({
            success: true,
            message: "角色已有基础图片",
            data: {
              type: "base_image",
              url: character.base_image_url,
              already_exists: true,
            },
          });
        }

        // 调用角色图像重新生成 API
        const regenerateResponse = await fetch(
          `${baseUrl}/api/character/${characterId}/regenerate-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `${AUTH_COOKIE_NAME}=${token}`,
            },
            body: JSON.stringify({}),
          }
        );

        if (!regenerateResponse.ok) {
          const error = await regenerateResponse.json();
          return NextResponse.json(
            { error: error.error || "生成基础图片失败" },
            { status: regenerateResponse.status }
          );
        }

        const regenerateResult = await regenerateResponse.json();
        return NextResponse.json({
          success: true,
          message: "基础图片生成已启动",
          data: {
            type: "base_image",
            ...regenerateResult,
          },
        });
      }

      case "views": {
        // 检查是否已有足够的三视图
        if (character.views.length >= 3 && !validated.options.force_regenerate) {
          return NextResponse.json({
            success: true,
            message: "角色已有三视图",
            data: {
              type: "views",
              count: character.views.length,
              already_exists: true,
            },
          });
        }

        // 调用三视图生成 API
        const viewsResponse = await fetch(
          `${baseUrl}/api/character/generate-views`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `${AUTH_COOKIE_NAME}=${token}`,
            },
            body: JSON.stringify({
              characterId,
            }),
          }
        );

        if (!viewsResponse.ok) {
          const error = await viewsResponse.json();
          return NextResponse.json(
            { error: error.error || "生成三视图失败" },
            { status: viewsResponse.status }
          );
        }

        const viewsResult = await viewsResponse.json();
        return NextResponse.json({
          success: true,
          message: "三视图生成已启动",
          data: {
            type: "views",
            ...viewsResult,
          },
        });
      }

      case "expressions": {
        // 检查是否已有足够的表情
        if (character.expressions.length >= 6 && !validated.options.force_regenerate) {
          return NextResponse.json({
            success: true,
            message: "角色已有表情矩阵",
            data: {
              type: "expressions",
              count: character.expressions.length,
              already_exists: true,
            },
          });
        }

        // 调用表情生成 API
        const expressionsResponse = await fetch(
          `${baseUrl}/api/character/generate-expressions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `${AUTH_COOKIE_NAME}=${token}`,
            },
            body: JSON.stringify({
              characterId,
            }),
          }
        );

        if (!expressionsResponse.ok) {
          const error = await expressionsResponse.json();
          return NextResponse.json(
            { error: error.error || "生成表情矩阵失败" },
            { status: expressionsResponse.status }
          );
        }

        const expressionsResult = await expressionsResponse.json();
        return NextResponse.json({
          success: true,
          message: "表情矩阵生成已启动",
          data: {
            type: "expressions",
            ...expressionsResult,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "不支持的生成类型" },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[POST /api/canvas/chapter/[id]/characters/[charId]/generate]", error);
    return NextResponse.json(
      { error: "生成失败" },
      { status: 500 }
    );
  }
}
