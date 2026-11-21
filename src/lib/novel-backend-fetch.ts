import { logInfo } from "@/lib/api-logger";

/**
 * 小说后端返回的失败。statusCode 保留上游 HTTP 状态，供路由区分登录失效。
 */
export class NovelBackendError extends Error {
  constructor(
    message: string,
    public readonly originalError?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "NovelBackendError";
  }
}

interface FetchConfig {
  timeout: number;
  maxRetries: number;
}

/**
 * 带超时和指数退避的小说后端请求。401/403 不重试。
 */
export async function fetchNovelBackend<T>(
  url: string,
  options: RequestInit,
  config: FetchConfig,
  retryCount = 0
): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new NovelBackendError(
        `HTTP ${response.status}: ${errorText || response.statusText}`,
        errorText || response.statusText,
        response.status
      );
    }

    const data: unknown = await response.json();
    return data as T;
  } catch (error) {
    const shouldRetry =
      retryCount < config.maxRetries &&
      isRetryableError(error as Error);

    if (shouldRetry) {
      const delay = retryDelay(retryCount);
      logInfo(`重试请求 (${retryCount + 1}/${config.maxRetries})`, {
        url,
        delayMs: delay,
      });

      await sleep(delay);
      return fetchNovelBackend<T>(url, options, config, retryCount + 1);
    }

    throw error;
  }
}

function isRetryableError(error: Error): boolean {
  if (error.name === "AbortError" || error.name === "TypeError") {
    return true;
  }

  const message = error.message;
  return (
    message.includes("HTTP 500") ||
    message.includes("HTTP 502") ||
    message.includes("HTTP 503") ||
    message.includes("HTTP 504")
  );
}

function retryDelay(retryCount: number): number {
  return Math.pow(2, retryCount) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
