/**
 * 图像生成服务测试
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { callImageGenerationByType } from "./image-generation";

// Mock ensureLlmProvider
vi.mock("./llm-provider", () => ({
  ensureLlmProvider: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe("callImageGenerationByType - OpenAI支持", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该支持 OpenAI provider_name", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = {
      provider_name: "openai",
      model: "dall-e-3",
      base_url: "https://api.openai.com",
      api_key: "sk-test",
    };

    (ensureLlmProvider as any).mockResolvedValue(mockProvider);

    const mockResponse = {
      ok: true,
      json: async () => ({
        created: 1234567890,
        data: [{ b64_json: "base64imagedata" }],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

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
    const mockProvider = {
      provider_name: "dall-e",
      model: "dall-e-2",
      base_url: "https://api.openai.com",
      api_key: "sk-test",
    };

    (ensureLlmProvider as any).mockResolvedValue(mockProvider);

    const mockResponse = {
      ok: true,
      json: async () => ({
        created: 1234567890,
        data: [{ b64_json: "base64imagedata" }],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

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
    const mockProvider = {
      provider_name: "openai",
      model: "dall-e-3",
      base_url: "https://api.openai.com",
      api_key: undefined,
    };

    (ensureLlmProvider as any).mockResolvedValue(mockProvider);

    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("OpenAI API Key 未配置");
  });

  it("应该处理 API 错误响应", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = {
      provider_name: "openai",
      model: "dall-e-3",
      base_url: "https://api.openai.com",
      api_key: "sk-test",
    };

    (ensureLlmProvider as any).mockResolvedValue(mockProvider);

    const mockResponse = {
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: async () => ({ error: { message: "Rate limit exceeded" } }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("429");
  });

  it("应该使用 DALL-E 3 默认使用 hd quality", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = {
      provider_name: "openai",
      model: "dall-e-3",
      base_url: "https://api.openai.com",
      api_key: "sk-test",
    };

    (ensureLlmProvider as any).mockResolvedValue(mockProvider);

    const mockResponse = {
      ok: true,
      json: async () => ({
        created: 1234567890,
        data: [{ b64_json: "base64imagedata" }],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.quality).toBe("hd");
    expect(requestBody.model).toBe("dall-e-3");
  });

  it("应该对不支持的尺寸使用默认值", async () => {
    const { ensureLlmProvider } = await import("./llm-provider");
    const mockProvider = {
      provider_name: "openai",
      model: "dall-e-3",
      base_url: "https://api.openai.com",
      api_key: "sk-test",
    };

    (ensureLlmProvider as any).mockResolvedValue(mockProvider);

    const mockResponse = {
      ok: true,
      json: async () => ({
        created: 1234567890,
        data: [{ b64_json: "base64imagedata" }],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    await callImageGenerationByType({
      providerType: "image_generation",
      prompt: "test prompt",
      width: 800,
      height: 600,
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.size).toBe("1024x1024");
  });
});
