/**
 * 画布镜头编辑 API
 * PATCH /api/canvas/shot-design/[id] - 更新画布镜头（id 为项目分镜 ID）
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCanvasShotForUser, updateCanvasShot } from "@/lib/canvas";
import type { CanvasShotPatch, PanelCastWrite } from "@/lib/canvas";
import { ApiError } from "@/lib/api-helpers";
import { canvasErrorResponse } from "@/lib/canvas/route-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 空字符串视为不修改（与原接口一致）
const nonEmpty = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));
const stringList = z.array(z.string()).optional();
const castMember = z.object({
  project_character_id: z.string().uuid(),
  outfit_id: z.string().uuid().nullable().optional(),
  expression: z.string().nullable().optional(),
});

const ShotPatchSchema = z.object({
  camera_angle: nonEmpty,
  shot_size: nonEmpty,
  panel_type: nonEmpty,
  description: nonEmpty,
  composition_hint: nonEmpty,
  location_key: z.string().optional(),
  prompt: nonEmpty,
  negative_prompt: z.string().nullable().optional(),
  scene_id: z.string().nullable().optional(),
  /** 传了就整体替换出场角色。只接受项目角色。 */
  characters: z.array(castMember).optional(),
  character_prompt_template_ids: stringList,
  character_prompt_status: nonEmpty,
  final_prompt_status: nonEmpty,
  nine_grid_status: nonEmpty,
  selection_status: nonEmpty,
});

export async function PATCH(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body: unknown = await req.json();
    const parsed = ShotPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求参数验证失败", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const context = await getCanvasShotForUser(prisma, id, payload.userId);
    const data = parsed.data;
    const characters: PanelCastWrite[] | undefined = data.characters?.map((row) => {
      if (!row.project_character_id) {
        throw new ApiError("出场角色必须是项目角色", 400, "PROJECT_CHARACTER_REQUIRED");
      }
      return {
        project_character_id: row.project_character_id,
        outfit_id: row.outfit_id ?? null,
        expression: row.expression ?? null,
      };
    });
    const patch: CanvasShotPatch = { ...data, characters };
    await updateCanvasShot(prisma, context, payload.userId, patch);
    const { shot } = await getCanvasShotForUser(prisma, id, payload.userId);

    return NextResponse.json({ success: true, shot });
  } catch (error) {
    return canvasErrorResponse(error, "更新失败");
  }
}
