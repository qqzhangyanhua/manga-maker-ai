import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

// Use vi.hoisted to ensure mocks are available before module imports
const { mockCookiesGet, mockCookies } = vi.hoisted(() => {
  const mockCookiesGet = vi.fn();
  const mockCookies = vi.fn();
  return { mockCookiesGet, mockCookies };
});

// Mock dependencies
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
  },
}));

describe("POST /api/storyboard", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock cookies - default to authenticated
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockCookies.mockResolvedValue({
      get: mockCookiesGet,
    });

    // Mock auth verification
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: mockUserId,
    });

    // Mock usage assertion
    (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 1,
      limit: 10,
    });

    // 事务直接在同一个 mock 客户端上执行；项目已有"第一章"
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    );
    (prisma.chapter.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "chapter-1" });
    (prisma.project.update as ReturnType<typeof vi.fn>).mockImplementation(
      ({ where }: { where: { id: string } }) => Promise.resolve({ id: where.id, panels: [] })
    );
  });

  const panelsWritten = () =>
    (prisma.project.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data.panels.create;

  it("should handle missing panel_type by inferring from context", async () => {
    // Mock LLM response with undefined panel_type
    const mockLLMResponse = {
      project_title: "测试项目",
      style: "日式漫画",
      total_panels: 2,
      script_segments: [
        { id: "seg_1", text: "场景1", start: 0, end: 3 },
      ],
      panels: [
        {
          panel_order: 1,
          panel_type: undefined, // Missing panel_type
          importance: "high",
          description: "测试描述",
          dialogue: "你好",
          shot_size: "特写",
          english_prompt: "test prompt",
        },
        {
          panel_order: 2,
          panel_type: "invalid_type", // Invalid panel_type
          importance: "medium",
          description: "测试描述2",
          shot_size: "中景",
          english_prompt: "test prompt 2",
        },
      ],
    };

    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(mockLLMResponse),
      creditsCost: 10,
    });

    const mockCreatedProject = {
      id: "project-123",
      user_id: mockUserId,
      title: "测试项目",
      panels: [],
    };

    (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCreatedProject
    );

    const request = new Request("http://localhost/api/storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story: "测试故事描述",
        saveToDb: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify that prisma.project.create was called
    expect(prisma.project.create).toHaveBeenCalled();

    const panels = panelsWritten();

    // Panel 1: undefined panel_type + dialogue should become "dialogue"
    expect(panels[0].panel_type).toBe("dialogue");

    // Panel 2: invalid panel_type should become "medium" (default)
    expect(panels[1].panel_type).toBe("medium");
  });

  it("should handle panel_type inference based on shot_size", async () => {
    const mockLLMResponse = {
      project_title: "测试项目",
      style: "日式漫画",
      total_panels: 1,
      script_segments: [{ id: "seg_1", text: "场景1", start: 0, end: 3 }],
      panels: [
        {
          panel_order: 1,
          panel_type: undefined,
          importance: "high",
          description: "特写镜头",
          shot_size: "特写",
          english_prompt: "close-up shot",
        },
      ],
    };

    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(mockLLMResponse),
      creditsCost: 10,
    });

    const mockCreatedProject = {
      id: "project-123",
      user_id: mockUserId,
      title: "测试项目",
      panels: [],
    };

    (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCreatedProject
    );

    const request = new Request("http://localhost/api/storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story: "特写镜头测试",
        saveToDb: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    const panels = panelsWritten();

    // Should infer "closeup" from shot_size "特写"
    expect(panels[0].panel_type).toBe("closeup");
  });

  it("should use 'wide' for first panel when panel_type is missing", async () => {
    const mockLLMResponse = {
      project_title: "测试项目",
      style: "日式漫画",
      total_panels: 1,
      script_segments: [{ id: "seg_1", text: "场景1", start: 0, end: 3 }],
      panels: [
        {
          panel_order: 1,
          panel_type: undefined,
          importance: "high",
          description: "开场镜头",
          shot_size: "远景",
          english_prompt: "opening shot",
        },
      ],
    };

    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(mockLLMResponse),
      creditsCost: 10,
    });

    const mockCreatedProject = {
      id: "project-123",
      user_id: mockUserId,
      title: "测试项目",
      panels: [],
    };

    (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCreatedProject
    );

    const request = new Request("http://localhost/api/storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story: "开场测试",
        saveToDb: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const panels = panelsWritten();

    // First panel (index 0) should default to "wide"
    expect(panels[0].panel_type).toBe("wide");
  });

  it("should handle missing importance field", async () => {
    const mockLLMResponse = {
      project_title: "测试项目",
      style: "日式漫画",
      total_panels: 1,
      script_segments: [{ id: "seg_1", text: "场景1", start: 0, end: 3 }],
      panels: [
        {
          panel_order: 1,
          panel_type: "action",
          importance: undefined, // Missing importance
          description: "动作场景",
          english_prompt: "action scene",
        },
      ],
    };

    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(mockLLMResponse),
      creditsCost: 10,
    });

    const mockCreatedProject = {
      id: "project-123",
      user_id: mockUserId,
      title: "测试项目",
      panels: [],
    };

    (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCreatedProject
    );

    const request = new Request("http://localhost/api/storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story: "动作测试",
        saveToDb: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const panels = panelsWritten();

    // Should default to "medium" importance
    expect(panels[0].importance).toBe("medium");
  });

  it("should return 401 when not authenticated", async () => {
    mockCookiesGet.mockReturnValue(undefined);

    const request = new Request("http://localhost/api/storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story: "测试故事",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  describe("关联故事", () => {
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
      expect(updateCall.data.panels.create).toHaveLength(1);
      expect(updateCall.data.script.create.content).toBe("故事正文");
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

  it("LLM 给出的角色 ID 只保留当前用户的，并加入项目角色", async () => {
    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({
        project_title: "测试项目",
        panels: [
          { panel_order: 1, description: "a", character_id: "my-character" },
          { panel_order: 2, description: "b", character_id: "hallucinated" },
        ],
      }),
    });
    (prisma.character.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "my-character" }]);
    (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "project-123", panels: [] });

    const response = await POST(
      new Request("http://localhost/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: "故事", saveToDb: true }),
      })
    );

    expect(response.status).toBe(200);
    const panels = panelsWritten();
    expect(panels[0].character_id).toBe("my-character");
    expect(panels[1].character_id).toBeNull();
    expect(prisma.projectCharacter.createMany).toHaveBeenCalledWith({
      data: [{ project_id: "project-123", character_id: "my-character", role: "minor" }],
      skipDuplicates: true,
    });
  });

  it("分镜挂在项目的第一个章节上，没有章节时建\"第一章\"", async () => {
    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ project_title: "测试项目", panels: [{ panel_order: 1, description: "a" }] }),
    });
    (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "project-123", panels: [] });
    (prisma.chapter.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ story_id: null });
    (prisma.chapter.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-chapter" });

    const response = await POST(
      new Request("http://localhost/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: "故事", saveToDb: true }),
      })
    );

    expect(response.status).toBe(200);
    expect(prisma.chapter.create).toHaveBeenCalledWith({
      data: { project_id: "project-123", story_id: null, title: "第一章", chapter_order: 1 },
      select: { id: true },
    });
    expect(panelsWritten()[0].chapter_id).toBe("new-chapter");
  });

  it("should return 400 when story is missing", async () => {
    const request = new Request("http://localhost/api/storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("缺少故事描述");
  });
});
