import { useToast } from "@/hooks/use-toast";
import { formatErrorForToast, isRetryableError } from "../utils/errorHandling";

type OperationOptions = {
  successMessage?: string;
  errorTitle?: string;
  enableRetry?: boolean;
};

/**
 * 统一的操作执行器，处理错误和 Toast 提示
 */
export function useStoryOperation() {
  const { toast } = useToast();

  /**
   * 执行带统一错误处理的操作
   */
  async function execute<T extends unknown[]>(
    operation: (...args: T) => Promise<void>,
    options: OperationOptions = {}
  ): Promise<(...args: T) => Promise<void>> {
    return async (...args: T) => {
      try {
        await operation(...args);

        if (options.successMessage) {
          toast({ title: options.successMessage });
        }
      } catch (error) {
        const errorInfo = formatErrorForToast(error);

        toast({
          title: options.errorTitle || errorInfo.title,
          description: errorInfo.description,
          variant: "destructive",
        });

        throw error;
      }
    };
  }

  /**
   * 简化版：直接执行并处理错误
   */
  async function run<T extends unknown[]>(
    operation: (...args: T) => Promise<void>,
    args: T,
    options: OperationOptions = {}
  ): Promise<void> {
    const wrappedOp = await execute(operation, options);
    await wrappedOp(...args);
  }

  return { execute, run };
}
