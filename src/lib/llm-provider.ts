import type { LlmProvider } from "@prisma/client";
import { prisma, ensureDb } from "./db";

type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "");

export const findLlmProviderByType = async (providerType: string): Promise<LlmProvider | null> => {
  await ensureDb();
  return prisma.llmProvider.findFirst({
    where: { provider_type: providerType, enabled: true },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
  });
};

/**
 * 根据 provider_type 获取已启用的模型配置，未配置时抛出明确的中文错误
 */
export const ensureLlmProvider = async (providerType: string): Promise<LlmProvider> => {
  const provider = await findLlmProviderByType(providerType);
  if (!provider) {
    throw new Error(
      `未找到可用的模型配置（type=${providerType}），请先在 /admin/llm-providers 新增并启用对应记录`
    );
  }
  return provider;
};

export const callChatCompletionByType = async (params: {
  providerType: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) => {
  const { providerType, messages, temperature = 0.6, maxTokens = 1500 } = params;
  const provider = await ensureLlmProvider(providerType);

  const endpoint = `${normalizeBaseUrl(provider.base_url)}/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.api_key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`模型调用失败：${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";

  return { content, raw: data, provider };
};

/**
 * 流式调用 LLM（支持 SSE）
 * @returns AsyncGenerator 逐块返回生成的文本片段
 */
export async function* callChatCompletionStreamByType(params: {
  providerType: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): AsyncGenerator<string, void, unknown> {
  const { providerType, messages, temperature = 0.6, maxTokens = 1500 } = params;
  const provider = await ensureLlmProvider(providerType);

  const endpoint = `${normalizeBaseUrl(provider.base_url)}/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.api_key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true, // 启用流式返回
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`模型调用失败：${response.status} ${response.statusText} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // 解码并添加到缓冲区
      buffer += decoder.decode(value, { stream: true });

      // 按行分割
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 保留最后一个不完整的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) {
          continue;
        }

        const data = trimmed.substring(5).trim(); // 移除 "data:" 前缀

        // 检查是否结束
        if (data === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;

          if (delta) {
            yield delta; // 返回文本片段
          }
        } catch (parseError) {
          console.warn("Failed to parse SSE chunk:", data);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
