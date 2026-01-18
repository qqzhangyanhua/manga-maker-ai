/**
 * 图像生成服务测试
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LlmProvider } from "@prisma/client";
import { callImageGenerationByType } from "./image-generation";

// Mock ensureLlmProvider
vi.mock("./llm-provider", () => ({
  ensureLlmProvider: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn() as unknown as typeof fetch;
const fetchMock = vi.mocked(global.fetch);

const buildProvider = (overrides: Partial<LlmProvider>): LlmProvider => ({
  id: 1,
  provider_type: "image_generation",
  provider_name: "openai",
  model: "dall-e-3",
  base_url: "https://api.openai.com",
  api_key: "sk-test",
  priority: 1,
  enabled: true,
  desc: null,
  credits_cost: 0,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockJsonResponse = <T>(payload: T, overrides?: Partial<Response>): Response => ({
  ok: true,
  json: async () => payload,
  ...overrides,
}) as Response;

describe("callImageGenerationByType - OpenAI支持", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该支持 OpenAI provider_name", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = buildProvider({});

    vi.mocked(ensureLlmProvider).mockResolvedValue(mockProvider);

    const mockResponse = mockJsonResponse({
      created: 1234567890,
      data: [{ b64_json: "base64imagedata" }],
    });

    fetchMock.mockResolvedValue(mockResponse);

    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "a beautiful cat",
      width: 1024,
      height: 1024,
    });

    expect(result.success).toBe(true);
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toBe("base64imagedata");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "Authorization": "Bearer sk-test",
        }),
      })
    );
  });

  it("应该支持 dall-e 别名", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = buildProvider({
      provider_name: "dall-e",
      model: "dall-e-2",
    });


    vi.mocked(ensureLlmProvider).mockResolvedValue(mockProvider);

    const mockResponse = mockJsonResponse({
      created: 1234567890,
      data: [{ b64_json: "base64imagedata" }],
    });

    fetchMock.mockResolvedValue(mockResponse);

    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
      width: 512,
      height: 512,
    });

    expect(result.success).toBe(true);
  });

  it("应该在 API Key 未配置时抛出错误", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = buildProvider({ api_key: "" });

    vi.mocked(ensureLlmProvider).mockResolvedValue(mockProvider);

    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("OpenAI API Key 未配置");
  });

  it("应该处理 API 错误响应", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = buildProvider({});

    vi.mocked(ensureLlmProvider).mockResolvedValue(mockProvider);

    const mockResponse = mockJsonResponse(
      { error: { message: "Rate limit exceeded" } },
      { ok: false, status: 429, statusText: "Too Many Requests" }
    );

    fetchMock.mockResolvedValue(mockResponse);

    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("429");
  });

  it("应该使用 DALL-E 3 默认使用 hd quality", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = buildProvider({});

    vi.mocked(ensureLlmProvider).mockResolvedValue(mockProvider);

    const mockResponse = mockJsonResponse({
      created: 1234567890,
      data: [{ b64_json: "base64imagedata" }],
    });

    fetchMock.mockResolvedValue(mockResponse);

    await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
    });

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(
      typeof fetchCall[1]?.body === "string" ? fetchCall[1].body : "{}"
    );

    expect(requestBody.quality).toBe("hd");
    expect(requestBody.model).toBe("dall-e-3");
  });

  it("应该对不支持的尺寸使用默认值", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = buildProvider({});

    vi.mocked(ensureLlmProvider).mockResolvedValue(mockProvider);

    const mockResponse = mockJsonResponse({
      created: 1234567890,
      data: [{ b64_json: "base64imagedata" }],
    });

    fetchMock.mockResolvedValue(mockResponse);

    await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
      width: 800,
      height: 600,
    });

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(
      typeof fetchCall[1]?.body === "string" ? fetchCall[1].body : "{}"
    );

    expect(requestBody.size).toBe("1024x1024");
  });
});
