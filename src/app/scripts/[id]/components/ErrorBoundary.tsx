/**
 * 错误边界组件
 * 捕获子组件中的 JavaScript 错误,防止整个应用崩溃
 */

'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('错误边界捕获到错误:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // 调用外部错误处理器
    this.props.onError?.(error, errorInfo);
    
    // 可以在这里上报到错误监控服务
    // reportErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback,使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">页面出现错误</h2>
            <p className="text-muted-foreground max-w-md">
              {this.state.error?.message || '抱歉,页面遇到了一个问题'}
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="w-full max-w-2xl p-4 bg-muted rounded-lg">
              <summary className="cursor-pointer font-medium mb-2">
                错误详情 (仅开发环境可见)
              </summary>
              <pre className="text-xs overflow-auto whitespace-pre-wrap">
                {this.state.error?.stack}
                {'\n\n'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={this.handleReset}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
            <Button
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}