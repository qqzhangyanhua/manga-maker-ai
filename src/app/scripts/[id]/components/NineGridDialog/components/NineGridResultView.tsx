/**
 * Nine-grid generation result view
 */

"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    CheckCircle2,
    RefreshCw,
    Download,
    Eye,
} from "lucide-react";

interface NineGridResultViewProps {
    imageUrl: string;
    panels?: Array<{
        panel_order: number;
        description: string;
        visual_prompt: string;
    }>;
    onRegenerate: () => void;
    onClose: () => void;
}

export function NineGridResultView({
    imageUrl,
    panels,
    onRegenerate,
    onClose,
}: NineGridResultViewProps) {
    const handleDownload = () => {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `nine-grid-${Date.now()}.png`;
        a.click();
    };

    const handleViewLarge = () => {
        window.open(imageUrl, "_blank");
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    九宫格生成成功
                </DialogTitle>
                <DialogDescription>
                    图片已保存到素材库，你可以重新生成或关闭窗口
                </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                    {/* Success Alert */}
                    <Alert className="border-green-500 bg-green-50/50 dark:bg-green-950/20">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription>
                            九宫格图片已成功生成并保存到素材库！
                        </AlertDescription>
                    </Alert>

                    {/* Image Preview */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">生成的九宫格图片</h3>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleViewLarge}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            查看大图
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDownload}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            下载
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                                    <img
                                        src={imageUrl}
                                        alt="生成的九宫格图片"
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Generated Panels (if from-plot mode) */}
                    {panels && panels.length > 0 && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-4">生成的分镜提示词</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {panels.map((panel, index) => (
                                        <div
                                            key={index}
                                            className="p-3 rounded-lg border bg-muted/30"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold text-sm">
                                                    {panel.panel_order}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-muted-foreground mb-1">
                                                        {panel.description}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground/70">
                                                        {panel.visual_prompt}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
                <Button
                    variant="outline"
                    onClick={onRegenerate}
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新生成
                </Button>
                <Button onClick={onClose}>
                    关闭
                </Button>
            </DialogFooter>
        </>
    );
}
