/**
 * Batch Generation Dialog Component
 * 批量生成进度对话框
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';

interface GenerationTask {
    panelId: string;
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    imageUrl?: string;
    error?: string;
}

interface BatchGenerationDialogProps {
    open: boolean;
    tasks: Map<string, GenerationTask>;
    onClose: () => void;
}

export function BatchGenerationDialog({ open, tasks, onClose }: BatchGenerationDialogProps) {
    const taskArray = Array.from(tasks.values());
    const completed = taskArray.filter((t) => t.status === 'completed').length;
    const failed = taskArray.filter((t) => t.status === 'failed').length;
    const total = taskArray.length;
    const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;
    const isComplete = completed + failed === total;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>批量生成进度</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* Overall Progress */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span>总进度</span>
                            <span>
                                {completed + failed} / {total}
                                {failed > 0 && <span className="text-destructive ml-2">({failed} 失败)</span>}
                            </span>
                        </div>
                        <Progress value={progress} />
                    </div>

                    {/* Task List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {taskArray.map((task, index) => (
                            <div
                                key={task.panelId}
                                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                            >
                                <span className="text-sm font-medium min-w-[3ch]">#{index + 1}</span>

                                {/* Status Icon */}
                                {task.status === 'pending' && (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                                )}
                                {task.status === 'processing' && (
                                    <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                                )}
                                {task.status === 'completed' && (
                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                                {task.status === 'failed' && (
                                    <X className="w-4 h-4 text-destructive flex-shrink-0" />
                                )}

                                {/* Status Text */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm truncate">
                                        {task.status === 'pending' && '等待中...'}
                                        {task.status === 'processing' && '生成中...'}
                                        {task.status === 'completed' && '已完成'}
                                        {task.status === 'failed' && (
                                            <span className="text-destructive">
                                                失败: {task.error || '未知错误'}
                                            </span>
                                        )}
                                    </div>
                                    {task.status === 'processing' && (
                                        <Progress value={task.progress} className="mt-1 h-1" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-2 border-t">
                        <Button onClick={onClose} disabled={!isComplete}>
                            {isComplete ? '关闭' : '生成中...'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
