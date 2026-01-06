import type { LlmProvider } from "@prisma/client";
import { prisma } from "./db";
import { consumeCredits, checkCredits, InsufficientCreditsError } from "./credits";
import https from "https";
import { logger } from "./logger";

/**
 * Extended fetch options for Node.js environment
 * Node.js fetch supports additional options like 'agent' that are not in the standard Web API
 */
interface NodeFetchOptions extends RequestInit {
  agent?: https.Agent;
}

type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/**
 * LLM Call Options - 使用 discriminated union 强制类型安全
 *
 * 两种模式：
 * 1. skipCreditsCheck: true - 跳过算力检查（试用/免费功能）
 * 2. skipCreditsCheck: false - 需要提供 userId（付费功能）
 */
export type LlmCallOptions =
  | { skipCreditsCheck: true; userId?: never }
  | { skipCreditsCheck?: false; userId: string };

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "");

/**
 * 创建 HTTPS Agent，仅在开发环境且显式设置环境变量时禁用证书验证
 *
 * 安全说明：
 * - 生产环境必须验证 SSL 证书
 * - 开发环境如需使用自签名证书，设置 ALLOW_SELF_SIGNED_CERT=true
 *
 * @security Critical - 禁用证书验证会导致中间人攻击风险
 */
function createHttpsAgent(): https.Agent {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowSelfSigned = process.env.ALLOW_SELF_SIGNED_CERT === 'true';

  // 生产环境始终验证证书
  if (!isDevelopment) {
    return new https.Agent({
      rejectUnauthorized: true,
    });
  }

  // 开发环境：仅在显式设置时允许自签名证书
  if (allowSelfSigned) {
    logger.warn(
      "[Security Warning] SSL certificate validation is disabled. " +
      "This should NEVER be used in production!"
    );
    return new https.Agent({
      rejectUnauthorized: false,
    });
  }

  // 默认：始终验证证书
  return new https.Agent({
    rejectUnauthorized: true,
  });
}

const httpsAgent = createHttpsAgent();

export const findLlmProviderByType = async (providerType: string): Promise<LlmProvider | null> => {
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
  options?: LlmCallOptions;
}) => {
  const { providerType, messages, temperature = 0.6, maxTokens = 1500, options } = params;
  const provider = await ensureLlmProvider(providerType);

  // 算力检查与扣除
  const creditsCost = provider.credits_cost ?? 0;
  if (creditsCost > 0 && !options?.skipCreditsCheck) {
    if (!options?.userId) {
      throw new Error("需要消耗算力的操作必须提供 userId");
    }

    // 先检查余额是否足够
    const hasEnough = await checkCredits(options.userId, creditsCost);
    if (!hasEnough) {
      throw new InsufficientCreditsError(creditsCost, 0);
    }

    // 扣除算力
    await consumeCredits({
      userId: options.userId,
      amount: creditsCost,
      description: `${providerType} - ${provider.model}`,
      refType: "generation_log",
    });
  }

  const endpoint = `${normalizeBaseUrl(provider.base_url)}/v1/chat/completions`;

  // 记录 LLM API 调用信息
  logger.debug("LLM API call", {
    providerType,
    providerName: provider.provider_name,
    model: provider.model,
    creditsCost,
    userId: options?.userId,
  });

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
    agent: endpoint.startsWith("https") ? httpsAgent : undefined,
  } as NodeFetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`模型调用失败：${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";

  return { content, raw: data, provider, creditsCost };
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
  options?: LlmCallOptions;
}): AsyncGenerator<string, void, unknown> {
  const { providerType, messages, temperature = 0.6, maxTokens = 1500, options } = params;
  const provider = await ensureLlmProvider(providerType);

  // 算力检查与扣除（流式调用前先扣除）
  const creditsCost = provider.credits_cost ?? 0;
  if (creditsCost > 0 && !options?.skipCreditsCheck) {
    if (!options?.userId) {
      throw new Error("需要消耗算力的操作必须提供 userId");
    }

    const hasEnough = await checkCredits(options.userId, creditsCost);
    if (!hasEnough) {
      throw new InsufficientCreditsError(creditsCost, 0);
    }

    await consumeCredits({
      userId: options.userId,
      amount: creditsCost,
      description: `${providerType} - ${provider.model} (stream)`,
      refType: "generation_log",
    });
  }

  const endpoint = `${normalizeBaseUrl(provider.base_url)}/v1/chat/completions`;

  // 记录流式 LLM API 调用信息
  logger.debug("LLM API call (stream)", {
    providerType,
    providerName: provider.provider_name,
    model: provider.model,
    creditsCost,
    userId: options?.userId,
  });

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
    agent: endpoint.startsWith("https") ? httpsAgent : undefined,
  } as NodeFetchOptions);

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
          logger.warn("Failed to parse SSE chunk", { data });
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
