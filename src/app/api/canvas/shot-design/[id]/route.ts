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

function charactersField(body: unknown): unknown {
  if (!body || typeof body !== "object" || !("characters" in body)) return undefined;
  return body.characters;
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
}).strict();
const CastListSchema = z.array(castMember).optional();

/** Zod 在这里把必填的项目角色 id 推成可选，收窄回写入类型。校验不过的请求到不了这里。 */
function toPanelCast(
  rows: { project_character_id?: string; outfit_id?: string | null; expression?: string | null }[] | undefined
): PanelCastWrite[] | undefined {
  if (!rows) return undefined;
  return rows.map((row) => {
    if (!row.project_character_id) {
      throw new ApiError("出场角色必须是项目角色", 400, "PROJECT_CHARACTER_REQUIRED");
    }
    return {
      project_character_id: row.project_character_id,
      outfit_id: row.outfit_id ?? null,
      expression: row.expression ?? null,
    };
  });
}

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
    const castParsed = CastListSchema.safeParse(charactersField(body));
    if (!parsed.success || !castParsed.success) {
      return NextResponse.json(
        {
          error: "请求参数验证失败",
          details: parsed.success ? castParsed.error.flatten().fieldErrors : parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const context = await getCanvasShotForUser(prisma, id, payload.userId);
    const patch: CanvasShotPatch = { ...parsed.data, characters: toPanelCast(castParsed.data) };
    await updateCanvasShot(prisma, context, payload.userId, patch);
    const { shot } = await getCanvasShotForUser(prisma, id, payload.userId);

    return NextResponse.json({ success: true, shot });
  } catch (error) {
    return canvasErrorResponse(error, "更新失败");
  }
}
