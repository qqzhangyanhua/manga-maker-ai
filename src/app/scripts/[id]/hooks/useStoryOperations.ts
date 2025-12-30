import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatErrorForToast } from "../utils/errorHandling";

type OperationOptions = {
  successMessage?: string;
  errorTitle?: string;
  /** 是否在失败时静默（不抛出错误） */
  silent?: boolean;
};

/**
 * 统一的操作执行器，处理错误和 Toast 提示
 */
export function useStoryOperation() {
  const { toast } = useToast();

  /**
   * 直接执行操作并统一处理错误和成功提示
   * @param operation - 要执行的异步操作
   * @param options - 配置选项
   * @returns 操作是否成功
   */
  const execute = useCallback(
    async (
      operation: () => Promise<void>,
      options: OperationOptions = {}
    ): Promise<boolean> => {
      try {
        await operation();

        if (options.successMessage) {
          toast({ title: options.successMessage });
        }
        return true;
      } catch (error) {
        const errorInfo = formatErrorForToast(error);

        toast({
          title: options.errorTitle || errorInfo.title,
          description: errorInfo.description,
          variant: "destructive",
        });

        if (!options.silent) {
          throw error;
        }
        return false;
      }
    },
    [toast]
  );

  return { execute };
}
