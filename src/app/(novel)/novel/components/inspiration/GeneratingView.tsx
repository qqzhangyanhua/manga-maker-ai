/**
 * 灵感模式 - 生成中界面
 */
"use client";

import { Loader2 } from "lucide-react";

export function GeneratingView() {
  return (
    <div className="py-12 text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
      <p className="text-muted-foreground">AI 正在生成故事雏形，请稍候...</p>
      <p className="text-sm text-muted-foreground">预计需要 30-60 秒</p>
    </div>
  );
}
