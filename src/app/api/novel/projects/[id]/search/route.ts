/**
 * 小说项目搜索 API
 * POST /api/novel/projects/[id]/search
 *
 * 支持全文搜索、模糊匹配、高级筛选
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import {
  withErrorHandler,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  parseJsonBody,
} from "@/lib/api-error";

/**
 * 搜索请求体
 */
interface SearchRequest {
  query: string;
  scope?: "title" | "outline" | "content" | "all";
  filters?: {
    status?: "draft" | "completed";
    characterIds?: string[];
    dateRange?: {
      start: string; // ISO date string
      end: string; // ISO date string
    };
  };
}

/**
 * 搜索结果项
 */
interface SearchResultItem {
  chapterNumber: number;
  chapterId: string;
  title: string;
  matchType: "title" | "outline" | "content";
  matchedText: string;
  highlights: string[];
  status: "draft" | "completed";
  wordCount: number;
}

/**
 * 搜索响应
 */
interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  query: string;
  highlights: {
    [chapterId: string]: string[];
  };
}

/**
 * 计算文本相似度（用于模糊搜索）
 */
function calculateSimilarity(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // 精确匹配
  if (lowerText.includes(lowerQuery)) {
    return 1.0;
  }

  // 拼音首字母匹配（简单实现）
  const textInitials = lowerText.replace(/[^a-z]/g, "").substring(0, 3);
  const queryInitials = lowerQuery.replace(/[^a-z]/g, "").substring(0, 3);
  if (textInitials === queryInitials && queryInitials.length >= 2) {
    return 0.7;
  }

  // Levenshtein 距离（简化版）
  const distance = levenshteinDistance(lowerText, lowerQuery);
  const maxLen = Math.max(text.length, query.length);
  const similarity = 1 - distance / maxLen;

  return similarity > 0.5 ? similarity : 0;
}

/**
 * 计算 Levenshtein 距离
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 高亮匹配文本
 */
function highlightMatch(text: string, query: string): string {
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * 执行搜索
 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const startedAt = Date.now();
    const { id: projectId } = await params;

    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      throw new UnauthorizedError();
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      throw new UnauthorizedError();
    }

    const userId = payload.userId;

    logInfo("Search request received", {
      endpoint: "/api/novel/projects/[id]/search",
      userId,
      projectId,
    });

    // 验证项目归属
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: { user_id: true, outlines: true },
    });

    if (!project) {
      throw new NotFoundError("项目");
    }

    if (project.user_id !== userId) {
      throw new UnauthorizedError("无权访问此项目");
    }

    // 解析请求体
    const body = await parseJsonBody<SearchRequest>(request);
    const { query, scope = "all", filters = {} } = body;

    // 验证查询参数
    if (!query || query.trim().length === 0) {
      throw new BadRequestError("搜索关键词不能为空");
    }

    if (query.length > 100) {
      throw new BadRequestError("搜索关键词过长");
    }

    logInfo("Executing search", {
      endpoint: "/api/novel/projects/[id]/search",
      userId,
      projectId,
      query,
      scope,
      filters,
    });

    // 遍历所有章节进行搜索
    const outlines = project.outlines as Array<{
      chapter_number?: number;
      title?: string;
      outline?: string;
      content?: string;
      status?: string;
      word_count?: number;
      characters?: string[];
    }>;
    if (!Array.isArray(outlines) || outlines.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        query,
        highlights: {},
      });
    }

    const results: SearchResultItem[] = [];
    const highlights: Record<string, string[]> = {};
    const trimmedQuery = query.trim().toLowerCase();

    for (const chapter of outlines) {
      const chapterNumber = chapter.chapter_number || 0;
      const title = chapter.title || "";
      const outline = chapter.outline || "";
      const content = chapter.content || "";
      const status = (chapter.status || "draft") as "draft" | "completed";
      const wordCount = chapter.word_count || 0;

      // 应用状态筛选
      if (filters.status && status !== filters.status) {
        continue;
      }

      let matched = false;
      let matchType: "title" | "outline" | "content" = "title";
      let matchedText = "";
      const chapterHighlights: string[] = [];

      // 标题搜索
      if (scope === "all" || scope === "title") {
        const titleSimilarity = calculateSimilarity(title, trimmedQuery);
        if (titleSimilarity > 0.5) {
          matched = true;
          matchType = "title";
          matchedText = title;
          chapterHighlights.push(highlightMatch(title, query));
        }
      }

      // 大纲搜索
      if (!matched && (scope === "all" || scope === "outline")) {
        const outlineSimilarity = calculateSimilarity(outline, trimmedQuery);
        if (outlineSimilarity > 0.5) {
          matched = true;
          matchType = "outline";
          matchedText = outline.substring(0, 200) + (outline.length > 200 ? "..." : "");
          chapterHighlights.push(highlightMatch(outline, query));
        }
      }

      // 内容搜索
      if (!matched && (scope === "all" || scope === "content")) {
        const contentSimilarity = calculateSimilarity(content, trimmedQuery);
        if (contentSimilarity > 0.5) {
          matched = true;
          matchType = "content";

          // 提取匹配上下文
          const matchIndex = content.toLowerCase().indexOf(trimmedQuery);
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(content.length, matchIndex + query.length + 50);
          matchedText =
            (start > 0 ? "..." : "") +
            content.substring(start, end) +
            (end < content.length ? "..." : "");

          chapterHighlights.push(highlightMatch(matchedText, query));
        }
      }

      // 角色筛选
      if (matched && filters.characterIds && filters.characterIds.length > 0) {
        const chapterCharacters = chapter.characters || [];
        const hasMatchingCharacter = chapterCharacters.some((char: string) =>
          filters.characterIds!.includes(char)
        );
        if (!hasMatchingCharacter) {
          matched = false;
        }
      }

      if (matched) {
        results.push({
          chapterNumber,
          chapterId: `ch-${chapterNumber}`,
          title,
          matchType,
          matchedText,
          highlights: chapterHighlights,
          status,
          wordCount,
        });
        highlights[`ch-${chapterNumber}`] = chapterHighlights;
      }
    }

    // 按相关度排序
    results.sort((a, b) => {
      // 优先显示标题匹配
      if (a.matchType === "title" && b.matchType !== "title") return -1;
      if (b.matchType === "title" && a.matchType !== "title") return 1;

      // 然后按章节号排序
      return a.chapterNumber - b.chapterNumber;
    });

    const response: SearchResponse = {
      results,
      total: results.length,
      query,
      highlights,
    };

    logInfo("Search completed", {
      endpoint: "/api/novel/projects/[id]/search",
      userId,
      projectId,
      resultsCount: results.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
  }
);
