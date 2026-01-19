/**
 * 世界观记忆库 - 错误边界组件
 * 捕获子组件错误并显示友好的错误界面
 */
"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  title?: string;
  description?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 世界观模块错误边界
 * 用于捕获渲染过程中的错误，防止整个页面崩溃
 */
export class WorldErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("WorldErrorBoundary caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {this.props.title || "加载出错"}
            </CardTitle>
            <CardDescription>
              {this.props.description || "组件加载时发生错误，请稍后重试"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-muted rounded-md text-sm font-mono text-muted-foreground overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
              <Button variant="outline" onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

interface AsyncBoundaryProps {
  children: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
}

/**
 * 简化的异步边界包装器
 * 用于包装可能抛出错误的异步组件
 */
export function AsyncBoundary({ children, error }: AsyncBoundaryProps): ReactNode {
  return (
    <WorldErrorBoundary fallback={error}>
      {children}
    </WorldErrorBoundary>
  );
}

/**
 * 错误卡片组件
 * 用于显示内联错误信息
 */
export function ErrorCard({
  title = "加载失败",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
      <p className="font-medium">{title}</p>
      {message && <p className="text-sm mt-1">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          重试
        </Button>
      )}
    </div>
  );
}
