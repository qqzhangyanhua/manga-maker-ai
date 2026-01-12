/**
 * 错误处理工具函数
 * 统一处理 FastAPI 和其他 API 的错误响应
 */

/**
 * FastAPI 验证错误详情
 */
interface FastAPIValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/**
 * FastAPI 错误响应
 */
interface FastAPIErrorResponse {
  detail: string | FastAPIValidationError[];
}

/**
 * 解析 FastAPI 错误响应
 *
 * @param error - 错误对象（可能是 Response 或 JSON 对象）
 * @param defaultMessage - 默认错误消息
 * @returns 格式化的错误消息
 */
export function parseFastAPIError(
  error: unknown,
  defaultMessage = "操作失败"
): string {
  // 如果是字符串，直接返回
  if (typeof error === "string") {
    return error;
  }

  // 如果是 Error 对象
  if (error instanceof Error) {
    return error.message;
  }

  // 如果是对象且包含 detail 字段
  if (typeof error === "object" && error !== null && "detail" in error) {
    const errorResponse = error as FastAPIErrorResponse;
    const detail = errorResponse.detail;

    // detail 是数组（验证错误）
    if (Array.isArray(detail)) {
      return detail
        .map((e) => {
          if (typeof e === "object" && e !== null && "msg" in e) {
            const validationError = e as FastAPIValidationError;
            const location = validationError.loc.join(" → ");
            return `${location}: ${validationError.msg}`;
          }
          return String(e);
        })
        .join("; ");
    }

    // detail 是字符串
    if (typeof detail === "string") {
      return detail;
    }
  }

  // 无法解析，返回默认消息
  return defaultMessage;
}

/**
 * 从 Response 对象解析错误
 *
 * @param response - Fetch Response 对象
 * @param defaultMessage - 默认错误消息
 * @returns 格式化的错误消息
 */
export async function parseErrorFromResponse(
  response: Response,
  defaultMessage = "操作失败"
): Promise<string> {
  try {
    const data = await response.json();
    return parseFastAPIError(data, defaultMessage);
  } catch {
    // JSON 解析失败，尝试读取文本
    try {
      const text = await response.text();
      return text || defaultMessage;
    } catch {
      return defaultMessage;
    }
  }
}

/**
 * 验证字符串长度
 *
 * @param value - 要验证的字符串
 * @param minLength - 最小长度
 * @param maxLength - 最大长度
 * @returns 错误消息，如果验证通过则返回 null
 */
export function validateStringLength(
  value: string,
  minLength: number,
  maxLength: number
): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return "内容不能为空";
  }

  if (trimmed.length < minLength) {
    return `内容至少需要 ${minLength} 个字符`;
  }

  if (trimmed.length > maxLength) {
    return `内容不能超过 ${maxLength} 个字符`;
  }

  return null;
}

/**
 * 创建带超时的 fetch 请求
 *
 * @param url - 请求 URL
 * @param options - Fetch 选项（支持传入外部 signal）
 * @param timeoutMs - 超时时间（毫秒）
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  // 合并外部 signal 和超时 signal
  const externalSignal = options.signal;

  // 如果外部 signal 已经被取消，直接抛出
  if (externalSignal?.aborted) {
    clearTimeout(timeoutId);
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  // 监听外部取消事件
  const abortHandler = () => {
    timeoutController.abort();
  };
  externalSignal?.addEventListener("abort", abortHandler);

  try {
    const response = await fetch(url, {
      ...options,
      signal: timeoutController.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // 判断是外部取消还是超时
    if (error instanceof Error && error.name === "AbortError") {
      if (externalSignal?.aborted) {
        // 外部主动取消，保持原始 AbortError
        throw error;
      }
      // 超时导致的取消
      throw new Error("请求超时，请稍后重试");
    }
    throw error;
  } finally {
    externalSignal?.removeEventListener("abort", abortHandler);
  }
}
