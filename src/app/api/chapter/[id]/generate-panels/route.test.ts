import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies, mockCookieGet } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookieGet });
  return { mockCookies, mockCookieGet };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/panel-generator", () => ({
  generatePanelsFromChapter: vi.fn(),
}));

vi.mock("@/lib/usage", () => ({
  assertAndIncrementUsage: vi.fn(),
}));

vi.mock("@/lib/generation-log", () => ({
  recordGenerationLog: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    chapter: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    panel: { deleteMany: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePanelsFromChapter } from "@/lib/panel-generator";
import { assertAndIncrementUsage } from "@/lib/usage";
import { POST } from "./route";

const userId = "user-1";
const chapterId = "chapter-1";

const mocked = prisma as unknown as {
  chapter: { findUnique: ReturnType<typeof vi.fn> };
  project: { findUnique: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function generate(body: Record<string, unknown>) {
  return POST(
    new Request(`http://localhost/api/chapter/${chapterId}/generate-panels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: chapterId }) }
  );
}

describe("POST /api/chapter/[id]/generate-panels 项目校验", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.project.findUnique.mockResolvedValue({ user_id: userId, story_id: "story-1" });
  });

  it("章节不属于传入的项目时返回 400，不消耗配额也不生成", async () => {
    // 第一次：路由读取章节；第二次：assertChapterInProject 读取章节归属
    mocked.chapter.findUnique
      .mockResolvedValueOnce({
        id: chapterId,
        story_id: "story-1",
        title: "第一章",
        summary: "梗概",
        story: { user_id: userId, title: "故事", genre: "daily" },
      })
      .mockResolvedValueOnce({ id: chapterId, project_id: "project-other", story_id: "story-1" });

    const response = await generate({ project_id: "project-1" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("CHAPTER_PROJECT_MISMATCH");
    expect(assertAndIncrementUsage).not.toHaveBeenCalled();
    expect(generatePanelsFromChapter).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
  });
});
