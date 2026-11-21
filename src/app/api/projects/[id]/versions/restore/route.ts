/**
 * Project Version Restore API
 *
 * POST /api/projects/[id]/versions/restore - Restore version
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { Prisma, prisma } from "@/lib/db";
import { ensureDefaultChapter, panelReadingOrderBy } from "@/lib/project";
import {
  lockChapter,
  lockChapters,
  PANEL_WRITE_TX_OPTIONS,
  panels,
  planChapterRestores,
  snapshotPanelField,
} from "@/lib/project/chapter-panels";
import {
  readMigratedPanelSegmentIds,
  readProjectChapterSegments,
  readSnapshotSegments,
  restoreProjectChapterSegments,
  withMigratedSegmentIds,
} from "@/lib/script-segment";
import type { SuccessResponse, RestoreVersionInput } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/projects/[id]/versions/restore
 *
 * Restore project to a specific version
 *
 * Body:
 * - versionId: string (required)
 * - createBackup?: boolean (default: true)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = params;

    // Require authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "无效的token" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: RestoreVersionInput = await req.json();
    const { versionId, createBackup = true } = body;

    if (!versionId) {
      return NextResponse.json(
        { success: false, error: "版本ID不能为空" },
        { status: 400 }
      );
    }

    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, user_id: true, title: true }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权操作此项目" },
        { status: 403 }
      );
    }

    // Fetch version to restore
    const version = await prisma.projectVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        project_id: true,
        version_number: true,
        version_data: true,
        label: true
      }
    });

    if (!version) {
      return NextResponse.json(
        { success: false, error: "版本不存在" },
        { status: 404 }
      );
    }

    if (version.project_id !== projectId) {
      return NextResponse.json(
        { success: false, error: "版本不属于此项目" },
        { status: 400 }
      );
    }

    const versionData = version.version_data as Record<string, unknown>;
    const projectData = typeof versionData.project === "object" && versionData.project !== null && !Array.isArray(versionData.project)
      ? (versionData.project as Record<string, unknown>)
      : {};
    const projectTitle = typeof projectData.title === "string" ? projectData.title : "未命名项目";
    const projectDescription = typeof projectData.description === "string" ? projectData.description : null;
    const projectStyle = typeof projectData.style === "string" ? projectData.style : null;
    const panelsData = Array.isArray(versionData.panels) ? versionData.panels : [];
    const panelItems = panelsData.filter((panel): panel is Record<string, unknown> => typeof panel === "object" && panel !== null);
    const scriptData = typeof versionData.script === "object" && versionData.script !== null && !Array.isArray(versionData.script)
      ? (versionData.script as Record<string, unknown>)
      : null;

    // Create backup of current state if requested
    let backupVersion = null;
    if (createBackup) {
      const currentProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          panels: {
            orderBy: panelReadingOrderBy,
            select: {
              id: true,
              chapter_id: true,
              panel_order: true,
              description: true,
              panel_type: true,
              importance: true,
              camera_angle: true,
              shot_size: true,
              dialogue: true,
              character_name: true,
              emotion: true,
              generated_image: true,
              prompt_used: true,
              segment_id: true
            }
          },
          script: true
        }
      });

      if (currentProject) {
        const maxVersionNumber = await prisma.projectVersion.findFirst({
          where: { project_id: projectId },
          orderBy: { version_number: "desc" },
          select: { version_number: true }
        });

        const chapterSegments = await readProjectChapterSegments(prisma, projectId);
        const backupPanels = withMigratedSegmentIds(
          currentProject.panels,
          await readMigratedPanelSegmentIds(prisma, projectId),
        );
        const backupData = {
          project: {
            title: currentProject.title,
            description: currentProject.description,
            style: currentProject.style
          },
          panels: backupPanels.map(p => ({
            id: p.id,
            chapter_id: p.chapter_id,
            segment_id: p.segment_id,
            panel_order: p.panel_order,
            description: p.description,
            panel_type: p.panel_type,
            importance: p.importance,
            camera_angle: p.camera_angle,
            shot_size: p.shot_size,
            dialogue: p.dialogue,
            character_name: p.character_name,
            emotion: p.emotion,
            generated_image: p.generated_image,
            prompt_used: p.prompt_used
          })),
          script: currentProject.script || chapterSegments.length > 0 ? {
            content: currentProject.script?.content ?? "",
            segments: chapterSegments
          } : undefined
        };

        backupVersion = await prisma.projectVersion.create({
          data: {
            project_id: projectId,
            version_number: (maxVersionNumber?.version_number || 0) + 1,
            label: `恢复前备份 (版本 ${version.version_number})`,
            version_data: backupData as unknown as Prisma.InputJsonValue,
            change_summary: `恢复到版本 ${version.version_number} 前的自动备份`,
            is_auto: false,
            is_pinned: true,
            created_by_action: "restore_backup"
          }
        });
      }
    }

    // 项目元数据、剧本片段和各章分镜在同一个事务里替换。任一章失败则全部回滚。
    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          title: projectTitle,
          description: projectDescription,
          style: projectStyle
        }
      });

      const listChapters = () => tx.chapter.findMany({
        where: { project_id: projectId },
        orderBy: [{ chapter_order: "asc" }, { created_at: "asc" }, { id: "asc" }],
        select: { id: true },
      });

      // 先按章节 id 排序加锁，再清掉各章旧分镜。和 place/remove 同一把锁、同一顺序，避免交叉死锁。
      // 片段删除会级联删分镜，清空必须发生在恢复片段之前。
      const chaptersBefore = await listChapters();
      await lockChapters(tx, chaptersBefore.map((chapter) => chapter.id));
      const writer = panels(projectId, { tx });
      for (const chapter of chaptersBefore) {
        await writer.replaceChapter(chapter.id, []);
      }

      const restoredSegments = scriptData
        ? await restoreProjectChapterSegments(tx, projectId, readSnapshotSegments(scriptData.segments))
        : [];
      const restoredSegmentIds = new Set(restoredSegments.map((segment) => segment.id));

      if (panelItems.length > 0) {
        const chapters = await listChapters();
        let fallbackChapterId = chapters[0]?.id ?? null;
        if (!fallbackChapterId) {
          fallbackChapterId = await ensureDefaultChapter(tx, projectId);
          await lockChapter(tx, fallbackChapterId);
        }
        const sources = panelItems.map((panel, index) => ({
          index,
          chapterId: typeof panel.chapter_id === "string" ? panel.chapter_id : null,
          panelOrder: typeof panel.panel_order === "number" ? panel.panel_order : null,
          field: snapshotPanelField(panel, restoredSegmentIds),
        }));
        const plans = planChapterRestores(
          sources,
          chapters.map((chapter) => chapter.id),
          fallbackChapterId,
        );
        for (const plan of plans) {
          if (plan.fields.length === 0) continue;
          await writer.replaceChapter(plan.chapterId, plan.fields);
        }
      }

      // 片段行已经恢复。正文在剧本表上，和片段不是同一处，所以这里只改 content。
      if (scriptData) {
        const scriptContent = typeof scriptData.content === "string" ? scriptData.content : "";
        const existingScript = await tx.storyScript.findUnique({
          where: { project_id: projectId }
        });

        if (existingScript) {
          await tx.storyScript.update({
            where: { project_id: projectId },
            data: { content: scriptContent }
          });
        } else if (scriptContent.length > 0) {
          await tx.storyScript.create({
            data: {
              project_id: projectId,
              content: scriptContent,
              segments: []
            }
          });
        }
      }
    }, PANEL_WRITE_TX_OPTIONS);

    const response: SuccessResponse<{
      version: typeof version;
      backupVersion: typeof backupVersion;
    }> = {
      success: true,
      data: {
        version,
        backupVersion
      },
      message: `成功恢复到版本 ${version.version_number}${backupVersion ? "，已自动创建恢复前备份" : ""}`
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/projects/[id]/versions/restore error:", error);
    return NextResponse.json(
      { success: false, error: "恢复版本失败" },
      { status: 500 }
    );
  }
}
