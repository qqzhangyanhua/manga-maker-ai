/**
 * 小说项目导出 API
 * POST /api/novel/export/projects/[id]
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import EPubGenerator from "epub-gen-memory";

type ExportFormat = "txt" | "markdown" | "epub" | "docx" | "pdf";

interface ExportConfig {
  include_metadata: boolean;
  chapter_separator: boolean;
  font_size: number;
}

interface ChapterData {
  chapterNumber: number;
  title: string;
  content: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Request received", {
      endpoint: "/api/novel/export/projects/[id]",
      method: "POST",
      projectId,
    });

    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    userId = payload.userId;

    // 查询项目
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        title: true,
        description: true,
        genre: true,
        outlines: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证权限
    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    // 解析请求体
    const body = await req.json();
    const format: ExportFormat = body.format || "txt";
    const config: ExportConfig = body.config || {
      include_metadata: true,
      chapter_separator: true,
      font_size: 12,
    };

    logInfo("Starting export", {
      endpoint: "/api/novel/export/projects/[id]",
      userId,
      projectId,
      format,
    });

    // 准备章节数据 - 从 outlines JSON 字段获取
    let chapters: ChapterData[] = [];

    if (!project.outlines) {
      return NextResponse.json(
        { error: "项目中没有章节大纲，请先生成大纲" },
        { status: 400 }
      );
    }

    const outlinesValue = project.outlines as unknown;
    const outlines = Array.isArray(outlinesValue) ? outlinesValue : [];
    if (outlines.length === 0) {
      return NextResponse.json(
        { error: "项目中没有章节大纲，请先生成大纲" },
        { status: 400 }
      );
    }

    logInfo("Processing outlines", {
      endpoint: "/api/novel/export/projects/[id]",
      outlinesCount: outlines.length,
    });

    // 从 outlines 提取章节数据
    chapters = outlines.map((outline) => {
      const outlineData = outline as Record<string, unknown>;
      const content = typeof outlineData.content === "string" ? outlineData.content : "";
      const chapterNumber = typeof outlineData.chapterNumber === "number"
        ? outlineData.chapterNumber
        : typeof outlineData.chapter_number === "number"
          ? outlineData.chapter_number
          : 0;
      const title = typeof outlineData.title === "string" ? outlineData.title : "";

      logInfo("Processing chapter", {
        chapterNumber,
        title,
        contentLength: content.length,
      });

      return {
        chapterNumber,
        title,
        content,
      };
    });

    // 检查是否有任何内容
    const hasContent = chapters.some(
      (ch) => ch.content && ch.content.trim().length > 0
    );
    if (!hasContent) {
      logError("No content to export", new Error("Empty content"), {
        endpoint: "/api/novel/export/projects/[id]",
        userId,
        projectId,
        chapterCount: chapters.length,
      });

      return NextResponse.json(
        {
          error:
            "项目中没有可导出的章节内容。请先在章节编辑器中编写或生成章节内容。",
        },
        { status: 400 }
      );
    }

    // 根据格式导出
    let responseData: ArrayBuffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "txt":
        responseData = await exportToTxt(project, chapters, config);
        contentType = "text/plain; charset=utf-8";
        filename = `${sanitizeFilename(project.title)}.txt`;
        break;

      case "markdown":
        responseData = await exportToMarkdown(project, chapters, config);
        contentType = "text/markdown; charset=utf-8";
        filename = `${sanitizeFilename(project.title)}.md`;
        break;

      case "epub":
        responseData = await exportToEpub(project, chapters, config);
        contentType = "application/epub+zip";
        filename = `${sanitizeFilename(project.title)}.epub`;
        break;

      case "docx":
        return NextResponse.json(
          { error: "DOCX 格式暂不支持，请使用其他格式" },
          { status: 400 }
        );

      case "pdf":
        return NextResponse.json(
          { error: "PDF 格式暂不支持，请使用其他格式" },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { error: "不支持的导出格式" },
          { status: 400 }
        );
    }

    logInfo("Export completed", {
      endpoint: "/api/novel/export/projects/[id]",
      userId,
      projectId,
      format,
      durationMs: Date.now() - startedAt,
    });

    return new NextResponse(responseData, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    logError("Export failed", error, {
      endpoint: "/api/novel/export/projects/[id]",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** TextEncoder 的 buffer 类型是 ArrayBufferLike，复制成真正的 ArrayBuffer。 */
function textToArrayBuffer(content: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(content);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * 导出为纯文本格式
 */
async function exportToTxt(
  project: { title: string; description: string | null; genre: string | null },
  chapters: ChapterData[],
  config: ExportConfig
): Promise<ArrayBuffer> {
  let content = "";

  // 添加元数据
  if (config.include_metadata) {
    content += `《${project.title}》\n`;
    if (project.description) {
      content += `\n简介：${project.description}\n`;
    }
    if (project.genre) {
      content += `分类：${project.genre}\n`;
    }
    content += `\n章节数：${chapters.length}\n`;
    content += `导出时间：${new Date().toLocaleString("zh-CN")}\n`;
    content += "\n" + "=".repeat(50) + "\n\n";
  }

  // 添加章节内容
  for (const chapter of chapters) {
    content += `第${chapter.chapterNumber}章 ${chapter.title}\n\n`;
    content += chapter.content.trim() + "\n";

    // 章节分隔
    if (config.chapter_separator) {
      content += "\n" + "-".repeat(50) + "\n\n";
    } else {
      content += "\n\n";
    }
  }

  return textToArrayBuffer(content);
}

/**
 * 导出为 Markdown 格式
 */
async function exportToMarkdown(
  project: { title: string; description: string | null; genre: string | null },
  chapters: ChapterData[],
  config: ExportConfig
): Promise<ArrayBuffer> {
  let content = "";

  if (config.include_metadata) {
    content += `# ${project.title}\n\n`;
    if (project.description) {
      content += `> ${project.description}\n\n`;
    }
    if (project.genre) {
      content += `**分类：** ${project.genre}\n\n`;
    }
    content += `**章节数：** ${chapters.length}\n\n`;
    content += `**导出时间：** ${new Date().toLocaleString("zh-CN")}\n\n`;
    content += "---\n\n";
  }

  for (const chapter of chapters) {
    content += `## 第${chapter.chapterNumber}章 ${chapter.title}\n\n`;
    content += chapter.content.trim() + "\n\n";

    if (config.chapter_separator) {
      content += "---\n\n";
    }
  }

  return textToArrayBuffer(content);
}

/**
 * 导出为 EPUB 格式
 */
async function exportToEpub(
  project: { title: string; description: string | null; genre: string | null },
  chapters: ChapterData[],
  config: ExportConfig
): Promise<ArrayBuffer> {
  try {
    // 准备章节数据 - 注意字段名是 content 而不是 data
    const epubChapters = chapters.map((chapter) => ({
      title: `第${chapter.chapterNumber}章 ${chapter.title}`,
      content: `<h1>第${chapter.chapterNumber}章 ${chapter.title}</h1>\n${chapter.content
        .split("\n")
        .filter((p) => p.trim())
        .map((p) => `<p>${p}</p>`)
        .join("\n")}`,
    }));

    const options: {
      title: string;
      author: string;
      description: string;
      publisher: string;
      tocTitle: string;
      appendChapterTitles: boolean;
      verbose: boolean;
    } = {
      title: project.title,
      author: "作者",
      description: project.description || "",
      publisher: "Generated by ComicAI",
      tocTitle: "目录",
      appendChapterTitles: false,
      verbose: false,
    };

    const buffer = await EPubGenerator(options, epubChapters);

    // 确保返回正确的 ArrayBuffer
    if (buffer instanceof Uint8Array) {
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      return arrayBuffer as ArrayBuffer;
    }

    return buffer as ArrayBuffer;
  } catch (error) {
    logError("EPUB generation failed", error, {
      projectTitle: project.title,
      chapterCount: chapters.length,
    });
    throw new Error(`EPUB 生成失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 清理文件名（移除非法字符）
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}
