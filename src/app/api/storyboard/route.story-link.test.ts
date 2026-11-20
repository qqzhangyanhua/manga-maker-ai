import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { assertAndIncrementUsage } from "@/lib/usage";

const { mockCookiesGet, mockCookies } = vi.hoisted(() => {
  const mockCookiesGet = vi.fn();
  const mockCookies = vi.fn();
  return { mockCookiesGet, mockCookies };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "test_cookie",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/llm-provider", () => ({
  callChatCompletionByType: vi.fn(),
}));

vi.mock("@/lib/usage", () => ({
  assertAndIncrementUsage: vi.fn(),
}));

vi.mock("@/lib/generation-log", () => ({
  recordGenerationLog: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    chapter: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    story: {
      findUnique: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
    projectCharacter: {
      createMany: vi.fn(),
    },
    scriptSegment: {
      create: vi.fn(),
    },
    panel: {
      create: vi.fn(),
    },
    timelineChapter: {
      findUnique: vi.fn(),
    },
  },
}));

describe("POST /api/storyboard 关联故事", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockCookies.mockResolvedValue({
      get: mockCookiesGet,
    });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: mockUserId,
    });
    (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 1,
      limit: 10,
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    );
    (prisma.chapter.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "chapter-1" });
    (prisma.project.update as ReturnType<typeof vi.fn>).mockImplementation(
      ({ where }: { where: { id: string } }) => Promise.resolve({ id: where.id, panels: [] })
    );
    (prisma.scriptSegment.create as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ data }: { data: { segment_order: number; chapter_id: string | null; content: string; source_text_start: number; source_text_end: number; timeline_chapter_id: string | null } }) => ({
        id: `segment-${data.segment_order}`,
        ...data,
      })
    );
    (prisma.panel.create as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ data }: { data: { panel_order: number } }) => ({
        id: `panel-${data.panel_order}`,
        ...data,
      })
    );
  });

  const panelsWritten = () =>
    (prisma.panel.create as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0].data);

  const storyId = "story-1";
  const storyProject = {
    id: "story-project",
    story_id: storyId,
    user_id: mockUserId,
    description: null,
    style: null,
  };
  const llmResponse = {
    project_title: "生成标题",
    style: "日式漫画",
    script_segments: [{ id: "seg_1", text: "场景1", start: 0, end: 3 }],
    panels: [{ panel_order: 1, panel_type: "wide", importance: "high", description: "开场" }],
  };
  const buildRequest = () =>
    new Request("http://localhost/api/storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story: "故事正文", saveToDb: true, storyId }),
    });

  beforeEach(() => {
    (prisma.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ user_id: mockUserId });
    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(llmResponse),
    });
    (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "standalone", panels: [] });
  });

  it("主项目还是空的时，分镜写入主项目", async () => {
    (prisma.project.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(storyProject)
      .mockResolvedValueOnce({ id: storyProject.id });

    const response = await POST(buildRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.project.id).toBe(storyProject.id);
    expect(prisma.project.create).not.toHaveBeenCalled();
    const updateCall = (prisma.project.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: storyProject.id });
    expect(updateCall.data.description).toBe("故事正文");
    expect(panelsWritten()).toHaveLength(1);
    expect(updateCall.data.script.create.content).toBe("故事正文");
    expect(updateCall.data.script.create.segments).toEqual([]);
  });

  it("主项目已有分镜时，新建不关联故事的独立项目", async () => {
    (prisma.project.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(storyProject)
      .mockResolvedValueOnce(null);

    const response = await POST(buildRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.project.id).toBe("standalone");
    const createCall = (prisma.project.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createCall.data.story_id).toBeNull();
    expect(createCall.data.title).toBe("生成标题");
    const updateCall = (prisma.project.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "standalone" });
    expect(updateCall.data.description).toBeUndefined();
  });

  it("故事还没有主项目时，新项目关联故事", async () => {
    (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    const createCall = (prisma.project.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createCall.data.story_id).toBe(storyId);
  });

  it("关联其他用户的故事时返回 403，且不消耗配额", async () => {
    (prisma.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ user_id: "other-user" });

    const response = await POST(buildRequest());

    expect(response.status).toBe(403);
    expect(assertAndIncrementUsage).not.toHaveBeenCalled();
    expect(prisma.project.create).not.toHaveBeenCalled();
  });
});
