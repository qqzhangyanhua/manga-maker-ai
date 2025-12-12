import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/project/[id]/export - Export project to JSON
export async function POST(req: Request, { params }: RouteParams) {
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

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
          include: {
            character: {
              select: {
                id: true,
                name: true,
              },
            },
            outfit: {
              select: {
                id: true,
                outfit_type: true,
              },
            },
            scene: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        script: true,
        Story: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const body = await req.json();
    const format = body.format || "json";

    // For now, we only support JSON export
    // Future: PDF, PNG grid, ZIP with individual images
    if (format !== "json") {
      return NextResponse.json(
        { error: "暂不支持该导出格式，当前仅支持 JSON" },
        { status: 400 }
      );
    }

    // Prepare export data
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        style: project.style,
        status: project.status,
        coverImage: project.cover_image,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      },
      story: project.Story
        ? {
            id: project.Story.id,
            title: project.Story.title,
          }
        : null,
      script: project.script
        ? {
            originalText: project.script.content,
            segmentedData: project.script.segments,
          }
        : null,
      panels: project.panels.map((panel) => ({
        id: panel.id,
        order: panel.panel_order,
        description: panel.description,
        dialogue: panel.dialogue,
        panelType: panel.panel_type,
        importance: panel.importance,
        cameraAngle: panel.camera_angle,
        shotSize: panel.shot_size,
        promptUsed: panel.prompt_used,
        visualPrompt: panel.visual_prompt,
        generatedImage: panel.generated_image,
        character: panel.character
          ? {
              id: panel.character.id,
              name: panel.character.name,
            }
          : null,
        expressionType: panel.expression_type,
        outfit: panel.outfit
          ? {
              id: panel.outfit.id,
              type: panel.outfit.outfit_type,
            }
          : null,
        scene: panel.scene
          ? {
              id: panel.scene.id,
              name: panel.scene.name,
            }
          : null,
      })),
    };

    // Return JSON as downloadable file
    const filename = `storyboard-${project.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("Export project error:", error);
    return NextResponse.json({ error: "导出项目失败" }, { status: 500 });
  }
}
