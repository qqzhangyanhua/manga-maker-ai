/**
 * 统一错误处理 Hook
 * Unified Error Handler Hook
 */

import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface ErrorHandlerOptions {
  /**
   * 是否在控制台打印错误
   */
  logToConsole?: boolean;
  /**
   * 错误上报回调（可用于发送到监控服务）
   */
  onError?: (error: unknown, context: string) => void;
}

/**
 * 错误处理 Hook
 * 提供统一的错误处理和用户提示
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { toast } = useToast();
  const { logToConsole = true, onError } = options;

  /**
   * 处理错误并显示 Toast 提示
   */
  const handleError = useCallback(
    (error: unknown, context: string) => {
      // 提取错误信息
      const message = error instanceof Error ? error.message : "未知错误";
      const errorDetails = error instanceof Error ? error.stack : String(error);

      // 控制台日志
      if (logToConsole) {
        console.error(`[${context}] Error:`, {
          message,
          error,
          stack: errorDetails,
          timestamp: new Date().toISOString(),
        });
      }

      // 错误上报
      if (onError) {
        try {
          onError(error, context);
        } catch (reportError) {
          console.error("Error reporting failed:", reportError);
        }
      }

      // 用户提示
      toast({
        title: `${context}失败`,
        description: message,
        variant: "destructive",
      });
    },
    [toast, logToConsole, onError]
  );

  /**
   * 包装异步函数，自动处理错误
   */
  const withErrorHandler = useCallback(
    <T extends unknown[], R>(
      fn: (...args: T) => Promise<R>,
      context: string
    ): ((...args: T) => Promise<R | undefined>) => {
      return async (...args: T) => {
        try {
          return await fn(...args);
        } catch (error) {
          handleError(error, context);
          return undefined;
        }
      };
    },
    [handleError]
  );

  /**
   * 处理成功消息
   */
  const handleSuccess = useCallback(
    (message: string, description?: string) => {
      toast({
        title: message,
        description,
        variant: "default",
      });
    },
    [toast]
  );

  return {
    handleError,
    withErrorHandler,
    handleSuccess,
  };
}

/**
 * 格式化错误信息
 */
export function formatError(error: unknown): { title: string; description: string } {
  if (error instanceof Error) {
    // 处理特定错误类型
    if (error.message.includes("quota") || error.message.includes("额度")) {
      return {
        title: "额度不足",
        description: "您的使用额度已用完，请充值后继续使用",
      };
    }

    if (error.message.includes("unauthorized") || error.message.includes("未登录")) {
      return {
        title: "未登录",
        description: "请先登录后再进行操作",
      };
    }

    if (error.message.includes("network") || error.message.includes("网络")) {
      return {
        title: "网络错误",
        description: "请检查网络连接后重试",
      };
    }

    return {
      title: "操作失败",
      description: error.message,
    };
  }

  return {
    title: "未知错误",
    description: "操作失败，请稍后重试",
  };
}
