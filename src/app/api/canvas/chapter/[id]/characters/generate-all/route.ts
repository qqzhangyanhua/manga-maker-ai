/**
 * Canvas Chapter Characters Batch Generate API
 * POST /api/canvas/chapter/[id]/characters/generate-all - 为章节中所有角色批量生成缺失资产
 *
 * 智能检测每个角色缺失的资产，并逐个生成
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { z } from "zod";
import { ApiError } from "@/lib/api-helpers";
import { countChapterCharacters, getCanvasChapter } from "@/lib/canvas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const batchGenerateSchema = z.object({
  types: z.array(z.enum(["base_image", "views", "expressions"])).optional(),
  character_ids: z.array(z.string().uuid()).optional(),
});

interface GenerationTask {
  characterId: string;
  characterName: string;
  type: "base_image" | "views" | "expressions";
  status: "pending" | "success" | "error" | "skipped";
  message?: string;
}

/**
 * POST /api/canvas/chapter/[id]/characters/generate-all
 */
export async function POST(req: Request, { params }: RouteParams) {
  const startedAt = Date.now();
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
    const body = await req.json().catch(() => ({}));
    const validated = batchGenerateSchema.parse(body);

    // 默认生成所有类型的资产
    const typesToGenerate = validated.types || ["base_image", "views", "expressions"];

    // 1. 验证章节，2. 收集镜头里出现的已入库角色
    await getCanvasChapter(prisma, chapterId, payload.userId);
    const allCharacterIds = new Set((await countChapterCharacters(prisma, chapterId)).keys());

    // 如果指定了特定角色，则过滤
    let targetCharacterIds = Array.from(allCharacterIds);
    if (validated.character_ids && validated.character_ids.length > 0) {
      targetCharacterIds = targetCharacterIds.filter(id =>
        validated.character_ids!.includes(id)
      );
    }

    if (targetCharacterIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "没有需要生成的角色",
        tasks: [],
        summary: {
          total: 0,
          success: 0,
          error: 0,
          skipped: 0,
        },
      });
    }

    // 3. 获取角色详情
    const characters = await prisma.character.findMany({
      where: {
        id: { in: targetCharacterIds },
        user_id: payload.userId,
      },
      include: {
        views: { select: { id: true } },
        expressions: { select: { id: true } },
      },
    });

    // 4. 构建生成任务列表
    const tasks: GenerationTask[] = [];
    const baseUrl = new URL(req.url).origin;

    for (const char of characters) {
      // 检查每种资产类型
      if (typesToGenerate.includes("base_image")) {
        if (!char.base_image_url && !char.reference_image) {
          tasks.push({
            characterId: char.id,
            characterName: char.name,
            type: "base_image",
            status: "pending",
          });
        }
      }

      if (typesToGenerate.includes("views")) {
        if (char.views.length < 3) {
          tasks.push({
            characterId: char.id,
            characterName: char.name,
            type: "views",
            status: "pending",
          });
        }
      }

      if (typesToGenerate.includes("expressions")) {
        if (char.expressions.length < 6) {
          tasks.push({
            characterId: char.id,
            characterName: char.name,
            type: "expressions",
            status: "pending",
          });
        }
      }
    }

    logInfo("开始批量生成角色资产", {
      chapterId,
      userId: payload.userId,
      characterCount: characters.length,
      taskCount: tasks.length,
    });

    // 5. 执行生成任务
    for (const task of tasks) {
      try {
        const response = await fetch(
          `${baseUrl}/api/canvas/chapter/${chapterId}/characters/${task.characterId}/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `${AUTH_COOKIE_NAME}=${token}`,
            },
            body: JSON.stringify({
              type: task.type,
              options: { force_regenerate: false },
            }),
          }
        );

        const result = await response.json();

        if (response.ok) {
          if (result.data?.already_exists) {
            task.status = "skipped";
            task.message = "资产已存在";
          } else {
            task.status = "success";
            task.message = result.message;
          }
        } else {
          task.status = "error";
          task.message = result.error || "生成失败";
        }
      } catch (error) {
        task.status = "error";
        task.message = error instanceof Error ? error.message : "未知错误";
        logError("生成任务失败", error, {
          characterId: task.characterId,
          type: task.type,
        });
      }
    }

    const durationMs = Date.now() - startedAt;

    const summary = {
      total: tasks.length,
      success: tasks.filter(t => t.status === "success").length,
      error: tasks.filter(t => t.status === "error").length,
      skipped: tasks.filter(t => t.status === "skipped").length,
    };

    logInfo("批量生成完成", {
      chapterId,
      userId: payload.userId,
      summary,
      durationMs,
    });

    return NextResponse.json({
      success: summary.error === 0,
      message: `生成完成: ${summary.success} 成功, ${summary.error} 失败, ${summary.skipped} 跳过`,
      tasks,
      summary,
      duration_ms: durationMs,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }

    const durationMs = Date.now() - startedAt;
    logError("批量生成角色资产失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    return NextResponse.json(
      { error: "批量生成失败" },
      { status: 500 }
    );
  }
}
