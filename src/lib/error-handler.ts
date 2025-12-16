/**
 * 错误处理工具函数
 * 提供统一的错误处理和 toast 显示逻辑
 */

type ToastFunction = (props: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

/**
 * 显示错误 toast 并记录到控制台
 * @param toast - useToast hook 返回的 toast 函数
 * @param title - 错误标题
 * @param error - 错误对象（Error 或其他）
 * @param defaultMessage - 当 error 不是 Error 实例时的默认消息
 */
export const showErrorToast = (
  toast: ToastFunction,
  title: string,
  error: unknown,
  defaultMessage = "请稍后再试"
): void => {
  console.error(`${title}:`, error);

  const description = error instanceof Error ? error.message : defaultMessage;

  toast({
    title,
    description,
    variant: "destructive",
  });
};

/**
 * 显示成功 toast
 * @param toast - useToast hook 返回的 toast 函数
 * @param title - 成功标题
 * @param description - 成功描述（可选）
 */
export const showSuccessToast = (
  toast: ToastFunction,
  title: string,
  description?: string
): void => {
  toast({
    title,
    description,
  });
};
