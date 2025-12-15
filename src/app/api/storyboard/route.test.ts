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
    project: {
      create: vi.fn(),
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
  });

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

    const createCall = (prisma.project.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const panels = createCall.data.panels.create;

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

    const createCall = (prisma.project.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const panels = createCall.data.panels.create;

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

    const createCall = (prisma.project.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const panels = createCall.data.panels.create;

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

    const createCall = (prisma.project.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const panels = createCall.data.panels.create;

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
