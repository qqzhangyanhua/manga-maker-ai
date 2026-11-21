/**
 * Template Apply API
 *
 * POST /api/templates/[id]/apply - Apply template to project
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { ensureDefaultChapter, ensureStoryProject } from "@/lib/project";
import {
  keptPanelSelect,
  lockChapter,
  PANEL_WRITE_TX_OPTIONS,
  panels,
  planTemplateInsert,
  planTemplateReplace,
  readingOrder,
  templateShotInput,
  type KeptPanelRow,
  type TemplateApplyPlan,
} from "@/lib/project/chapter-panels";
import type { SuccessResponse } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

interface ApplyTemplateRequestBody {
  storyId: string | null;
  newStoryTitle?: string;
  insertAfterOrder?: number;
  mode: "insert" | "replace";
  targetPanelIds?: string[];
}

interface TemplatePanelConfig {
  panel_type: string | null;
  camera_angle: string | null;
  shot_size: string | null;
  importance: "high" | "medium" | "low" | null;
  relative_position: number;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: templateId } = params;

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ success: false, error: "无效的token" }, { status: 401 });
    }

    const body: ApplyTemplateRequestBody = await req.json();
    const { storyId, newStoryTitle, insertAfterOrder, mode, targetPanelIds } = body;

    if (storyId === null && !newStoryTitle) {
      return NextResponse.json({ success: false, error: "创建新剧本时必须提供标题" }, { status: 400 });
    }

    if (mode !== "insert" && mode !== "replace") {
      return NextResponse.json({ success: false, error: "模式必须是 insert 或 replace" }, { status: 400 });
    }

    if (mode === "replace" && (!targetPanelIds || targetPanelIds.length === 0)) {
      return NextResponse.json({ success: false, error: "替换模式需要指定目标分镜" }, { status: 400 });
    }

    let story;
    if (storyId) {
      story = await prisma.story.findUnique({
        where: { id: storyId },
        select: { id: true, title: true, user_id: true },
      });

      if (!story) {
        return NextResponse.json({ success: false, error: "剧本不存在" }, { status: 404 });
      }

      if (story.user_id !== payload.userId) {
        return NextResponse.json({ success: false, error: "无权操作此剧本" }, { status: 403 });
      }
    } else {
      story = await prisma.story.create({
        data: {
          user_id: payload.userId,
          title: newStoryTitle!,
          premise: "基于模板创建的剧本",
          genre: "daily",
          outline: {},
          status: "draft",
        },
        select: { id: true, title: true, user_id: true },
      });
    }

    const project = await ensureStoryProject(prisma, story.id);
    const projectId = project.id;

    const template = await prisma.panelTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        template_data: true,
        panel_count: true,
        usage_count: true,
        is_public: true,
        is_official: true,
        user_id: true,
      },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: "模板不存在" }, { status: 404 });
    }

    if (!template.is_public && !template.is_official && template.user_id !== payload.userId) {
      return NextResponse.json({ success: false, error: "无权访问此模板" }, { status: 403 });
    }

    const rawTemplate = template.template_data;
    const templatePanels = rawTemplate !== null
      && typeof rawTemplate === "object"
      && !Array.isArray(rawTemplate)
      && Array.isArray(rawTemplate.panels)
      ? rawTemplate.panels as unknown as TemplatePanelConfig[]
      : null;
    if (!templatePanels) {
      return NextResponse.json({ success: false, error: "模板数据格式错误" }, { status: 500 });
    }

    const shots = templatePanels.map((panelConfig, index) => templateShotInput(
      panelConfig,
      `从模板「${template.name}」生成的分镜 ${index + 1}`,
    ));

    const createdPanels = await prisma.$transaction(async (tx) => {
      const preview = await readingOrder(tx, projectId, { select: keptPanelSelect });
      const previewPlan = await planApply(tx, projectId, preview, mode, insertAfterOrder ?? -1, targetPanelIds ?? [], shots);
      // 锚点章节要读过才知道。锁住后再读，否则锁之前写进这一章的格子会被整章替换删掉。
      await lockChapter(tx, previewPlan.chapterId);
      const rows = await readingOrder(tx, projectId, { select: keptPanelSelect });
      // 章节锁已经拿着。空读再调 ensureDefaultChapter 会补拿项目锁，和空项目先项目锁再章节锁的顺序相反。
      const plan = mode === "insert" && rows.length === 0
        ? planTemplateInsert(rows, insertAfterOrder ?? -1, shots, previewPlan.chapterId)
        : await planApply(tx, projectId, rows, mode, insertAfterOrder ?? -1, targetPanelIds ?? [], shots);
      if (plan.chapterId !== previewPlan.chapterId) {
        throw new ApiError(409, "CONFLICT", "分镜刚被修改，请重试");
      }
      const replaced = await panels(projectId, { tx }).replaceChapter(plan.chapterId, plan.fields);
      await tx.panelTemplate.update({
        where: { id: templateId },
        data: { usage_count: { increment: 1 } },
      });
      return plan.templateIndexes.flatMap((index) => {
        const panel = replaced.panels[index];
        return panel ? [panel] : [];
      });
    }, PANEL_WRITE_TX_OPTIONS);

    const response: SuccessResponse<{
      panels: typeof createdPanels;
      template: { id: string; name: string };
      story: { id: string; title: string };
      projectId: string;
    }> = {
      success: true,
      data: {
        panels: createdPanels,
        template: { id: template.id, name: template.name },
        story: { id: story.id, title: story.title },
        projectId,
      },
      message: `成功将模板「${template.name}」应用到剧本「${story.title}」`,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/templates/[id]/apply error:", error);
    return NextResponse.json({ success: false, error: "应用模板失败" }, { status: 500 });
  }
}

async function planApply(
  tx: Prisma.TransactionClient,
  projectId: string,
  rows: KeptPanelRow[],
  mode: "insert" | "replace",
  insertAfterOrder: number,
  targetPanelIds: string[],
  shots: ReturnType<typeof templateShotInput>[],
): Promise<TemplateApplyPlan> {
  if (mode === "insert") {
    const defaultChapterId = rows.length === 0
      ? await ensureDefaultChapter(tx, projectId)
      : rows[0]?.chapter_id ?? await ensureDefaultChapter(tx, projectId);
    return planTemplateInsert(rows, insertAfterOrder, shots, defaultChapterId);
  }

  const targets = rows.filter((row) => targetPanelIds.includes(row.id));
  if (targets.length !== targetPanelIds.length) {
    throw new ApiError(404, "NOT_FOUND", "部分目标分镜不存在");
  }
  const chapterIds = new Set(targets.map((row) => row.chapter_id));
  if (chapterIds.size !== 1) {
    throw new ApiError(400, "BAD_REQUEST", "替换的分镜必须在同一章节");
  }
  const chapterId = targets[0]?.chapter_id ?? "";
  return planTemplateReplace(
    rows.filter((row) => row.chapter_id === chapterId),
    targetPanelIds,
    shots,
  );
}
