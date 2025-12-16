import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { callChatCompletionByType } from "@/lib/llm-provider";

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

vi.mock("@/lib/api-logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

describe("POST /api/story/generate-idea", () => {
  const mockGeneratedIdea = "一个能看见他人寿命倒计时的少年，某天发现自己最好的朋友头顶显示的数字只剩下7天。为了改变命运，他开始追查死因，却发现真正的凶手竟然是自己未来的模样。";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock cookies - no authentication required for this endpoint
    mockCookiesGet.mockReturnValue(undefined);
    mockCookies.mockResolvedValue({
      get: mockCookiesGet,
    });

    // Mock LLM provider response
    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: mockGeneratedIdea,
      raw: {},
      provider: {},
      creditsCost: 0,
    });
  });

  it("should successfully generate a random story idea", async () => {
    const request = new Request("http://localhost/api/story/generate-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.idea).toBe(mockGeneratedIdea);
    expect(data.theme).toBeDefined();
    expect(typeof data.theme).toBe("string");

    // Verify LLM was called with correct parameters
    expect(callChatCompletionByType).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: "story_generator",
        temperature: 0.9,
        maxTokens: 300,
        options: { skipCreditsCheck: true },
      })
    );
  });

  it("should generate idea with specific theme hint", async () => {
    const themeHint = "科幻";

    const request = new Request("http://localhost/api/story/generate-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeHint }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.idea).toBe(mockGeneratedIdea);
    expect(data.theme).toBe(themeHint);

    // Verify LLM was called with the specific theme
    expect(callChatCompletionByType).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(themeHint),
          }),
        ]),
      })
    );
  });

  it("should handle empty request body", async () => {
    const request = new Request("http://localhost/api/story/generate-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.idea).toBe(mockGeneratedIdea);
  });

  it("should return error when LLM provider fails", async () => {
    const errorMessage = "模型调用失败";
    (callChatCompletionByType as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error(errorMessage)
    );

    const request = new Request("http://localhost/api/story/generate-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(errorMessage);
  });

  it("should work without authentication (free feature)", async () => {
    const request = new Request("http://localhost/api/story/generate-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify skipCreditsCheck is true (free feature)
    expect(callChatCompletionByType).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { skipCreditsCheck: true },
      })
    );
  });
});
