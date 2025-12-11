/**
 * Save Indicator Component
 * 保存状态指示器组件
 */

import { Check, Loader2, AlertCircle } from 'lucide-react';

interface SaveIndicatorProps {
    status: 'idle' | 'saving' | 'saved' | 'error';
    className?: string;
}

export function SaveIndicator({ status, className = '' }: SaveIndicatorProps) {
    if (status === 'idle') return null;

    return (
        <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
            {status === 'saving' && (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>保存中...</span>
                </>
            )}
            {status === 'saved' && (
                <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">已保存</span>
                </>
            )}
            {status === 'error' && (
                <>
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-destructive">保存失败</span>
                </>
            )}
        </div>
    );
}
