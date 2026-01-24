/**
 * Canvas 页面错误状态组件
 * 提供重试和返回功能
 */

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  /**
   * 错误标题
   */
  title?: string;

  /**
   * 错误详细信息
   */
  message?: string;

  /**
   * 重试回调
   */
  onRetry?: () => void;

  /**
   * 返回回调
   */
  onGoBack?: () => void;

  /**
   * 是否显示重试按钮
   * @default true
   */
  showRetry?: boolean;

  /**
   * 是否显示返回按钮
   * @default true
   */
  showGoBack?: boolean;
}

export function ErrorState({
  title = "出错了",
  message = "加载失败，请稍后重试",
  onRetry,
  onGoBack,
  showRetry = true,
  showGoBack = true,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0f0f13] text-white space-y-4 novel-theme-scope">
      {/* 错误图标 */}
      <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center border border-red-900/50 shadow-lg shadow-red-900/10">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>

      {/* 错误信息 */}
      <div className="text-center max-w-md px-4">
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-red-400 text-sm leading-relaxed">{message}</p>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 transition-all duration-200"
          >
            重试
          </Button>
        )}

        {showGoBack && onGoBack && (
          <Button
            onClick={onGoBack}
            variant="outline"
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all duration-200"
          >
            返回上一页
          </Button>
        )}
      </div>

      {/* 提示文本 */}
      {showRetry && onRetry && (
        <p className="text-xs text-zinc-500 mt-2">
          如果问题持续存在，请联系技术支持
        </p>
      )}
    </div>
  );
}
