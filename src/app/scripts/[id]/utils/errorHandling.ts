/**
 * 错误处理工具函数
 * 提供统一的错误识别、分类和提示生成
 */

export type ErrorType = 'network' | 'validation' | 'server' | 'auth' | 'unknown';

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  action?: string;
  canRetry: boolean;
}

/**
 * 从错误对象中提取错误信息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return '未知错误';
}

/**
 * 识别错误类型
 */
export function getErrorType(error: unknown): ErrorType {
  const message = getErrorMessage(error).toLowerCase();
  
  // 网络错误
  if (
    error instanceof TypeError && 
    (error.message.includes('fetch') || error.message.includes('network'))
  ) {
    return 'network';
  }
  
  if (
    message.includes('网络') ||
    message.includes('network') ||
    message.includes('连接') ||
    message.includes('timeout') ||
    message.includes('failed to fetch')
  ) {
    return 'network';
  }
  
  // 验证错误
  if (
    message.includes('验证') ||
    message.includes('validation') ||
    message.includes('格式') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'validation';
  }
  
  // 认证错误
  if (
    message.includes('认证') ||
    message.includes('授权') ||
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('403') ||
    message.includes('401')
  ) {
    return 'auth';
  }
  
  // 服务器错误
  if (
    message.includes('服务器') ||
    message.includes('server') ||
    message.includes('500') ||
    message.includes('503') ||
    message.includes('502')
  ) {
    return 'server';
  }
  
  return 'unknown';
}

/**
 * 获取详细的错误信息
 */
export function getErrorDetails(error: unknown): ErrorDetails {
  const type = getErrorType(error);
  const rawMessage = getErrorMessage(error);
  
  switch (type) {
    case 'network':
      return {
        type,
        message: '网络连接失败',
        action: '请检查网络连接后重试',
        canRetry: true,
      };
      
    case 'validation':
      return {
        type,
        message: rawMessage.includes('验证') || rawMessage.includes('validation')
          ? rawMessage
          : '输入格式不正确',
        action: '请检查输入内容',
        canRetry: false,
      };
      
    case 'auth':
      return {
        type,
        message: '认证失败',
        action: '请重新登录',
        canRetry: false,
      };
      
    case 'server':
      return {
        type,
        message: '服务器错误',
        action: '服务暂时不可用,请稍后重试',
        canRetry: true,
      };
      
    default:
      return {
        type: 'unknown',
        message: rawMessage || '操作失败',
        action: '请稍后重试',
        canRetry: true,
      };
  }
}

/**
 * 格式化错误信息用于 Toast 显示
 */
export function formatErrorForToast(error: unknown): {
  title: string;
  description: string;
} {
  const details = getErrorDetails(error);
  
  return {
    title: details.message,
    description: details.action || '',
  };
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  const details = getErrorDetails(error);
  return details.canRetry;
}

/**
 * 从 HTTP Response 中提取错误信息
 */
export async function extractErrorFromResponse(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data.error) return data.error;
    if (data.message) return data.message;
  } catch {
    // JSON 解析失败,使用状态文本
  }
  
  // 根据状态码返回默认错误信息
  switch (response.status) {
    case 400:
      return '请求参数错误';
    case 401:
      return '未授权,请重新登录';
    case 403:
      return '没有权限执行此操作';
    case 404:
      return '请求的资源不存在';
    case 500:
      return '服务器内部错误';
    case 503:
      return '服务暂时不可用';
    default:
      return `请求失败 (${response.status})`;
  }
}