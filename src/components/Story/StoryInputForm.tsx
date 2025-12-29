"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sparkles, BookOpen } from "lucide-react";
import type { StoryLength, StoryTemplate } from "./types";

// Shimmer animation styles
const shimmerStyles = `
@keyframes shimmer {
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(100%);
    }
}

.shimmer-effect {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(249, 115, 22, 0.1) 25%,
        rgba(249, 115, 22, 0.2) 50%,
        rgba(249, 115, 22, 0.1) 75%,
        transparent 100%
    );
    animation: shimmer 2s infinite;
}
`;

interface StoryInputFormProps {
    premise: string;
    genre: string;
    characterCount: string;
    length: StoryLength;
    selectedTemplate: StoryTemplate | null;
    isGeneratingIdea?: boolean;
    onPremiseChange: (value: string) => void;
    onGenreChange: (value: string) => void;
    onCharacterCountChange: (value: string) => void;
    onLengthChange: (value: StoryLength) => void;
    onTemplateClick: () => void;
    onGenerateClick: () => void;
}

export function StoryInputForm({
    premise,
    genre,
    characterCount,
    length,
    selectedTemplate,
    isGeneratingIdea,
    onPremiseChange,
    onGenreChange,
    onCharacterCountChange,
    onLengthChange,
    onTemplateClick,
    onGenerateClick,
}: StoryInputFormProps) {
    return (
        <>
            {/* Inject shimmer animation styles */}
            <style>{shimmerStyles}</style>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        创建故事
                    </CardTitle>
                    <CardDescription>
                        输入你的创意,AI将帮你生成完整的故事大纲
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="premise">故事创意 *</Label>
                        <div className="relative">
                            <Textarea
                                id="premise"
                                placeholder="例如: 一个失忆的侦探醒来发现自己成了案件的嫌疑人..."
                                value={premise}
                                onChange={(e) => onPremiseChange(e.target.value)}
                                rows={4}
                                className="resize-none"
                                disabled={isGeneratingIdea}
                            />
                            {/* Shimmer Animation Overlay */}
                            {isGeneratingIdea && (
                                <div className="absolute inset-0 pointer-events-none rounded-md overflow-hidden">
                                    <div className="shimmer-effect" />
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            描述你的故事核心创意,可以包括主角、冲突、背景等
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="genre">故事类型</Label>
                            <Select value={genre || "auto"} onValueChange={(v) => onGenreChange(v === "auto" ? "" : v)}>
                                <SelectTrigger id="genre">
                                    <SelectValue placeholder="自动判断" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">自动判断</SelectItem>
                                    <SelectItem value="suspense">悬疑推理</SelectItem>
                                    <SelectItem value="romance">浪漫爱情</SelectItem>
                                    <SelectItem value="adventure">冒险</SelectItem>
                                    <SelectItem value="scifi">科幻</SelectItem>
                                    <SelectItem value="daily">日常</SelectItem>
                                    <SelectItem value="fantasy">奇幻</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="characterCount">主要角色数量</Label>
                            <Input
                                id="characterCount"
                                type="number"
                                min="1"
                                max="10"
                                value={characterCount}
                                onChange={(e) => onCharacterCountChange(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="length">故事长度</Label>
                            <Select value={length} onValueChange={(v) => onLengthChange(v as StoryLength)}>
                                <SelectTrigger id="length">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="short">短篇 (3幕)</SelectItem>
                                    <SelectItem value="medium">中篇 (3-4幕)</SelectItem>
                                    <SelectItem value="long">长篇 (5幕)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={onTemplateClick}
                            variant="outline"
                            className="flex-1"
                        >
                            <BookOpen className="w-4 h-4 mr-2" />
                            选择模板
                        </Button>
                        <Button
                            onClick={onGenerateClick}
                            disabled={!premise.trim()}
                            className="flex-1"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            生成故事大纲
                        </Button>
                    </div>

                    {selectedTemplate && (
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium">
                                已选择模板: {selectedTemplate.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {selectedTemplate.description}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
