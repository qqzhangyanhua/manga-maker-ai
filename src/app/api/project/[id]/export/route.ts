import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/project/[id]/export
 * Export project to PNG/PDF/ZIP
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();
    const { format = "png", quality = "high" } = body;

    // Validate format
    if (!["png", "pdf", "zip"].includes(format)) {
      return NextResponse.json(
        { error: "不支持的导出格式" },
        { status: 400 }
      );
    }

    // Get project with panels
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // Check if all panels have images
    const panelsWithoutImages = project.panels.filter(
      (p) => !p.generated_image && !p.image_url
    );

    if (panelsWithoutImages.length > 0) {
      return NextResponse.json(
        {
          error: "部分分镜未生成图片",
          missing_count: panelsWithoutImages.length,
        },
        { status: 400 }
      );
    }

    // Create export job (simplified - in production, use a queue)
    const exportJob = {
      id: \`export_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
      project_id: projectId,
      format,
      quality,
      status: "processing",
      created_at: new Date().toISOString(),
    };

    // In production, this would be handled by a background job
    // For now, return job ID immediately
    return NextResponse.json({
      success: true,
      job_id: exportJob.id,
      status: "processing",
      message: "导出任务已创建",
    });
  } catch (error) {
    console.error("Export project error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
