/**
 * 组件级错误边界包装器
 *
 * 为特定组件提供定制化的错误处理
 */
"use client";

import React, { Component, ReactNode, ComponentType } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName: string;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 组件级错误边界
 */
export class ComponentErrorBoundary
  extends Component<ComponentErrorBoundaryProps, ComponentErrorBoundaryState>
{
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.componentName}] Error caught:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>组件加载出错</CardTitle>
            </div>
            <CardDescription>
              {this.props.componentName} 组件遇到了问题
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.state.error && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-mono text-muted-foreground">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                重试
              </Button>
              <Button onClick={() => (window.location.href = "/novel")} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC：为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WrappedWithErrorBoundary = (props: P) => (
    <ComponentErrorBoundary componentName={displayName}>
      <WrappedComponent {...props} />
    </ComponentErrorBoundary>
  );

  WrappedWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return WrappedWithErrorBoundary;
}

/**
 * 预设的错误回退 UI
 */
export function DefaultFallback({ componentName }: { componentName: string }) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle>组件加载出错</CardTitle>
        </div>
        <CardDescription>
          {componentName} 组件遇到了问题，请刷新页面重试
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => window.location.reload()} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新页面
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * 轻量级错误回退（用于次要组件）
 */
export function MinimalFallback({ message }: { message?: string }) {
  return (
    <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
      <p className="text-sm text-destructive">
        {message || '加载失败，请刷新重试'}
      </p>
    </div>
  );
}
