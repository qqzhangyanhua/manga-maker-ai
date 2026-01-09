/**
 * 批量应用角色到分镜
 * POST /api/panel/batch-apply-character
 */

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
  notFoundResponse,
  rateLimitResponse,
  errorResponse,
} from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 验证身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return unauthorizedResponse();
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return unauthorizedResponse("无效的token");
    }

    // 速率限制：每分钟最多 10 次批量操作
    const rateLimitResult = await rateLimit({
      key: `batch-apply-character:${payload.userId}`,
      limit: 10,
      window: 60000, // 60秒
    });

    if (!rateLimitResult.success) {
      return rateLimitResponse();
    }

    // 解析请求体
    const body = await req.json();
    const { panel_ids, character_id } = body;

    // 验证输入
    if (!panel_ids || !Array.isArray(panel_ids) || panel_ids.length === 0) {
      return validationErrorResponse("请选择要应用角色的分镜");
    }

    if (!character_id) {
      return validationErrorResponse("请选择角色");
    }

    if (panel_ids.length > 50) {
      return validationErrorResponse("一次最多应用到50个分镜");
    }

    // 验证角色存在且属于当前用户
    const character = await prisma.character.findFirst({
      where: {
        id: character_id,
        project: {
          user_id: payload.userId,
        },
      },
    });

    if (!character) {
      return notFoundResponse("角色不存在或无权限访问");
    }

    // 获取所有分镜并验证权限
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panel_ids },
      },
      include: {
        project: {
          select: {
            id: true,
            user_id: true,
          },
        },
      },
    });

    if (panels.length === 0) {
      return notFoundResponse("未找到要更新的分镜");
    }

    // 验证所有分镜属于当前用户
    const unauthorizedPanels = panels.filter(
      (p) => p.project.user_id !== payload.userId
    );
    if (unauthorizedPanels.length > 0) {
      return forbiddenResponse("存在无权限的分镜");
    }

    // 批量更新分镜
    const result = await prisma.panel.updateMany({
      where: {
        id: { in: panel_ids },
      },
      data: {
        character_id: character_id,
      },
    });

    return successResponse(
      {
        updated: result.count,
        message: `成功将角色应用到 ${result.count} 个分镜`,
      },
      {
        total: panel_ids.length,
        succeeded: result.count,
      }
    );
  } catch (error) {
    console.error("Batch apply character error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return errorResponse(`批量应用角色失败: ${message}`);
  }
}
