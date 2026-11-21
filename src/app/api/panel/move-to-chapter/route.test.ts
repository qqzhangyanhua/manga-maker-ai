import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies, mockCookieGet, mockPlace, mockPanels } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookieGet });
  const mockPlace = vi.fn();
  const mockPanels = vi.fn(() => ({ place: mockPlace }));
  return { mockCookies, mockCookieGet, mockPlace, mockPanels };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    chapter: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/project/chapter-panels", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/project/chapter-panels")>();
  return {
    ...actual,
    panels: mockPanels,
  };
});

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const userId = "user-1";

const sourcePanel = {
  id: "panel-1",
  project_id: "project-1",
  chapter_id: "chapter-a",
  panel_order: 1,
  project: { user_id: userId },
  chapter: { story_id: "story-1" },
};

const mocked = prisma as unknown as {
  panel: { findUnique: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  chapter: { findUnique: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function move(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/panel/move-to-chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/panel/move-to-chapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.panel.findUnique.mockResolvedValue(sourcePanel);
    mocked.$transaction.mockResolvedValue(undefined);
  });

  it("目标章节属于其他项目时返回 400，且不移动分镜", async () => {
    mocked.chapter.findUnique.mockResolvedValue({ id: "chapter-b", project_id: "project-2", story_id: "story-1" });

    const response = await move({ panel_id: "panel-1", target_chapter_id: "chapter-b" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("CHAPTER_PROJECT_MISMATCH");
    expect(mocked.$transaction).not.toHaveBeenCalled();
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it("目标章节不存在时返回 404", async () => {
    mocked.chapter.findUnique.mockResolvedValue(null);

    const response = await move({ panel_id: "panel-1", target_chapter_id: "missing" });

    expect(response.status).toBe(404);
    expect(mocked.$transaction).not.toHaveBeenCalled();
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it("目标章节属于同一项目时移动到末尾", async () => {
    mocked.chapter.findUnique.mockResolvedValue({ id: "chapter-b", project_id: "project-1", story_id: "story-1" });
    mockPlace.mockResolvedValue([{ id: "panel-1", chapterId: "chapter-b", panelOrder: 4 }]);

    const response = await move({ panel_id: "panel-1", target_chapter_id: "chapter-b" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("分镜已移动");
    expect(data.data.new_order).toBe(4);
    expect(mockPanels).toHaveBeenCalledWith("project-1");
    expect(mockPlace).toHaveBeenCalledWith(["panel-1"], { chapter: "chapter-b" });
    expect(mocked.panel.updateMany).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
  });

  it("分镜已在目标章节时直接返回", async () => {
    mocked.chapter.findUnique.mockResolvedValue({ id: "chapter-a", project_id: "project-1", story_id: "story-1" });

    const response = await move({ panel_id: "panel-1", target_chapter_id: "chapter-a", index: 0 });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("分镜已在目标章节中");
    expect(mockPlace).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
  });

  it("before 锚点不在目标章节时返回 400", async () => {
    mocked.chapter.findUnique.mockResolvedValue({ id: "chapter-b", project_id: "project-1", story_id: "story-1" });
    mocked.panel.findUnique
      .mockResolvedValueOnce(sourcePanel)
      .mockResolvedValueOnce({ id: "anchor-1", chapter_id: "chapter-a", project_id: "project-1" });

    const response = await move({
      panel_id: "panel-1",
      target_chapter_id: "chapter-b",
      before: "anchor-1",
    });

    expect(response.status).toBe(400);
    expect(mockPlace).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
  });

  it("before 锚点在目标章节时按锚点放置", async () => {
    mocked.chapter.findUnique.mockResolvedValue({ id: "chapter-b", project_id: "project-1", story_id: "story-1" });
    mocked.panel.findUnique
      .mockResolvedValueOnce(sourcePanel)
      .mockResolvedValueOnce({ id: "anchor-1", chapter_id: "chapter-b", project_id: "project-1" });
    mockPlace.mockResolvedValue([{ id: "panel-1", chapterId: "chapter-b", panelOrder: 2 }]);

    const response = await move({
      panel_id: "panel-1",
      target_chapter_id: "chapter-b",
      before: "anchor-1",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.new_order).toBe(2);
    expect(mockPlace).toHaveBeenCalledWith(["panel-1"], { before: "anchor-1" });
    expect(mocked.panel.updateMany).not.toHaveBeenCalled();
  });
});
