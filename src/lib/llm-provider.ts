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
