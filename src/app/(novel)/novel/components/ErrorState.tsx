/**
 * 错误状态展示组件
 */
"use client";

import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorStateProps {
  error: Error;
  title?: string;
  description?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export function ErrorState({
  error,
  title = "加载失败",
  description = "抱歉，数据加载遇到问题。请稍后重试或联系技术支持。",
  onRetry,
  showHomeButton = true,
}: ErrorStateProps) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-mono text-muted-foreground">
              {error.message || "未知错误"}
            </p>
          </div>
          <div className="flex gap-3">
            {onRetry && (
              <Button onClick={onRetry} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                重试
              </Button>
            )}
            {showHomeButton && (
              <Button onClick={() => window.location.href = "/novel"} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
