import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PDFDocument, rgb } from "pdf-lib";
import JSZip from "jszip";
import { readProjectChapterSegments } from "@/lib/script-segment";
import { exportProjectJson } from "./export-json";

type RouteParams = {
  params: Promise<{ id: string }>;
};

interface LayoutSettings {
  pageWidth: number;
  pageHeight: number;
  panelsPerPage: number;
  panelGap: number;
  pageMargin: number;
  showDialogBubbles?: boolean;
}

/** 导出用气泡数据（与前端 SpeechBubble 结构一致） */
interface ExportBubble {
  id: string;
  panelId: string;
  type: string;
  text: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Record<string, unknown>;
  pointer?: { angle: number; length: number; position: string };
  zIndex?: number;
}

interface ExportPanel {
  id: string;
  panel_order: number;
  description: string;
  dialogue: string | null;
  panel_type: string;
  importance: string;
  camera_angle: string | null;
  shot_size: string | null;
  prompt_used: string | null;
  visual_prompt: string | null;
  generated_image: string | null;
  expression_type: string | null;
  character: { id: string; name: string } | null;
  outfit: { id: string; outfit_type: string } | null;
  scene: { id: string; name: string } | null;
}

interface ExportProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  style: string | null;
  status: string;
  cover_image: string | null;
  created_at: Date;
  updated_at: Date;
  Story: { id: string; title: string } | null;
  script: { content: string; segments: unknown } | null;
  panels: ExportPanel[];
}

// POST /api/project/[id]/export - Export project
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

    // 获取项目和分镜数据
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
    }) as ExportProject | null;

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const body = await req.json();
    const format = body.format || "json";
    const layout: LayoutSettings = body.layout || {
      pageWidth: 210,
      pageHeight: 297,
      panelsPerPage: 4,
      panelGap: 10,
      pageMargin: 15,
    };
    // 气泡数据（位置、文本、样式、尺寸），用于 PDF 等导出时渲染对话框
    const bubbles: ExportBubble[] = Array.isArray(body.bubbles) ? body.bubbles : [];

    // 筛选有图片的分镜
    const panelsWithImages = project.panels.filter(
      (p) => p.generated_image
    );

    if (panelsWithImages.length === 0) {
      return NextResponse.json(
        { error: "没有可导出的图片，请先生成分镜图片" },
        { status: 400 }
      );
    }

    const chapterSegments = format === "json"
      ? await readProjectChapterSegments(prisma, project.id)
      : [];

    // 根据格式导出
    switch (format) {
      case "pdf":
        return await exportToPDF(project, panelsWithImages, layout, bubbles);

      case "png":
        return await exportToPNG(project, panelsWithImages, layout, bubbles);

      case "zip":
        return await exportToZIP(project, panelsWithImages);

      case "json":
        return exportProjectJson(project, chapterSegments);

      default:
        return NextResponse.json(
          { error: "不支持的导出格式，支持：pdf, png, zip, json" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Export project error:", error);
    return NextResponse.json(
      {
        error: "导出项目失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

/**
 * 导出为 PDF 格式
 */
async function exportToPDF(
  project: ExportProject,
  panels: ExportPanel[],
  layout: LayoutSettings,
  bubbles: ExportBubble[]
) {
  // TODO: 气泡渲染待实现。当 layout.showDialogBubbles 为 true 时，需在每格分镜上按气泡的
  // position/size/style/text 绘制对话框。bubbles 已按 panelId 关联到对应分镜。
  if (layout.showDialogBubbles && bubbles.length > 0) {
    console.debug("[export] 收到气泡数据，待实现渲染:", bubbles.length, "个气泡");
  }
  const pdfDoc = await PDFDocument.create();

  // 转换 mm 到 points (1mm = 2.83465 points)
  const mmToPoints = (mm: number) => mm * 2.83465;

  const pageWidth = mmToPoints(layout.pageWidth);
  const pageHeight = mmToPoints(layout.pageHeight);
  const margin = mmToPoints(layout.pageMargin / 3.779527559); // px to mm approximation
  const gap = mmToPoints(layout.panelGap / 3.779527559);

  // 计算每页的分镜布局
  const panelsPerPage = layout.panelsPerPage;
  const cols = Math.ceil(Math.sqrt(panelsPerPage));
  const rows = Math.ceil(panelsPerPage / cols);

  const totalPages = Math.ceil(panels.length / panelsPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // 计算可用空间
    const availableWidth = pageWidth - 2 * margin - (cols - 1) * gap;
    const availableHeight = pageHeight - 2 * margin - (rows - 1) * gap;

    const panelWidth = availableWidth / cols;
    const panelHeight = availableHeight / rows;

    // 获取当前页的分镜
    const startIdx = pageIndex * panelsPerPage;
    const endIdx = Math.min(startIdx + panelsPerPage, panels.length);
    const currentPagePanels = panels.slice(startIdx, endIdx);

    // 绘制分镜
    for (let i = 0; i < currentPagePanels.length; i++) {
      const panel = currentPagePanels[i];
      const row = Math.floor(i / cols);
      const col = i % cols;

      const x = margin + col * (panelWidth + gap);
      // PDF 坐标系从底部开始，需要翻转 Y 轴
      const y = pageHeight - margin - (row + 1) * (panelHeight + gap) + gap;

      try {
        // 获取图片URL
        const imageUrl = panel.generated_image;
        if (!imageUrl) continue;

        // 下载图片
        const imageBytes = await fetch(imageUrl).then((res) =>
          res.arrayBuffer()
        );

        // 根据图片类型嵌入
        let image;
        if (imageUrl.toLowerCase().endsWith(".png")) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        // 计算缩放以适应面板
        const imageAspect = image.width / image.height;
        const panelAspect = panelWidth / panelHeight;

        let drawWidth = panelWidth;
        let drawHeight = panelHeight;

        if (imageAspect > panelAspect) {
          // 图片更宽，以宽度为准
          drawHeight = panelWidth / imageAspect;
        } else {
          // 图片更高，以高度为准
          drawWidth = panelHeight * imageAspect;
        }

        // 居中绘制
        const offsetX = (panelWidth - drawWidth) / 2;
        const offsetY = (panelHeight - drawHeight) / 2;

        page.drawImage(image, {
          x: x + offsetX,
          y: y + offsetY,
          width: drawWidth,
          height: drawHeight,
        });

        // 绘制边框
        page.drawRectangle({
          x,
          y,
          width: panelWidth,
          height: panelHeight,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });
      } catch (error) {
        console.error(`Failed to add panel ${i} to PDF:`, error);
        // 绘制占位符
        page.drawRectangle({
          x,
          y,
          width: panelWidth,
          height: panelHeight,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
          color: rgb(0.95, 0.95, 0.95),
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `${sanitizeFilename(project.title || "storyboard")}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

/**
 * 导出为 PNG（返回 ZIP 包含所有页）
 * 注意：服务端无法直接生成 PNG，这里返回一个说明或者改为返回 JSON 配置
 * 实际的 PNG 渲染应该在客户端使用 Canvas 完成
 */
async function exportToPNG(
  project: ExportProject,
  panels: ExportPanel[],
  layout: LayoutSettings,
  bubbles: ExportBubble[]
) {
  // TODO: 气泡渲染待实现。bubbles 数据已传入，供后续在 PNG 合成时绘制对话框使用。
  if (layout.showDialogBubbles && bubbles.length > 0) {
    console.debug("[export] PNG 导出收到气泡数据，待实现渲染:", bubbles.length, "个气泡");
  }
  // 方案：返回 ZIP 包含所有单张 PNG
  // 因为服务端合成 PNG 需要 Canvas，建议在客户端实现或使用其他方案

  // 临时方案：下载所有分镜图片打包为 ZIP
  const zip = new JSZip();
  const folder = zip.folder("panels");

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const imageUrl = panel.generated_image;

    if (!imageUrl) continue;

    try {
      const response = await fetch(imageUrl);
      const imageBlob = await response.arrayBuffer();

      const ext = imageUrl.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const filename = `panel-${String(i + 1).padStart(3, "0")}.${ext}`;

      folder?.file(filename, imageBlob);
    } catch (error) {
      console.error(`Failed to download panel ${i}:`, error);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `${sanitizeFilename(project.title || "storyboard")}-panels.zip`;

  return new NextResponse(Buffer.from(zipBlob), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

/**
 * 导出为 ZIP（包含所有分镜原图）
 */
async function exportToZIP(project: ExportProject, panels: ExportPanel[]) {
  const zip = new JSZip();

  // 添加项目元数据
  const metadata = {
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      exportedAt: new Date().toISOString(),
    },
    panels: panels.map((p, idx) => ({
      order: idx + 1,
      description: p.description,
      dialogue: p.dialogue,
      filename: `panel-${String(idx + 1).padStart(3, "0")}.${getImageExtension(p.generated_image || "")}`,
    })),
  };

  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  // 添加所有分镜图片
  const imagesFolder = zip.folder("images");

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const imageUrl = panel.generated_image;

    if (!imageUrl) continue;

    try {
      const response = await fetch(imageUrl);
      const imageBlob = await response.arrayBuffer();

      const ext = getImageExtension(imageUrl);
      const filename = `panel-${String(i + 1).padStart(3, "0")}.${ext}`;

      imagesFolder?.file(filename, imageBlob);
    } catch (error) {
      console.error(`Failed to download panel ${i}:`, error);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `${sanitizeFilename(project.title || "storyboard")}-complete.zip`;

  return new NextResponse(Buffer.from(zipBlob), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

/**
 * 工具函数：清理文件名
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_");
}

/**
 * 工具函数：获取图片扩展名
 */
function getImageExtension(url: string): string {
  if (url.toLowerCase().endsWith(".png")) return "png";
  if (url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg"))
    return "jpg";
  return "jpg"; // 默认
}
