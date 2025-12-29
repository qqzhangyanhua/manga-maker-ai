"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, Clock, Users, BookOpen } from "lucide-react";
import type { PartialStory } from "./types";

interface StoryGeneratingProgressProps {
    generationPhase: string;
    llmContent: string;
    partialStory: PartialStory | null;
}

export function StoryGeneratingProgress({
    generationPhase,
    llmContent,
    partialStory,
}: StoryGeneratingProgressProps) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                {/* Header with progress */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <div>
                            <h3 className="text-lg font-semibold">AI 正在创作故事</h3>
                            <p className="text-sm text-orange-100 mt-1">{generationPhase}</p>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-orange-400/30 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-500 ease-out"
                            style={{
                                width: `${Math.min(100, (llmContent.length / 3000) * 100)}%`
                            }}
                        />
                    </div>
                </div>

                {/* Content area with real-time updates */}
                <div className="p-6 space-y-4">
                    {/* Title card - appears when title is detected */}
                    {partialStory?.title && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg border border-orange-200">
                                <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-orange-600 mb-1">故事标题</p>
                                    <h4 className="text-lg font-bold text-gray-900 break-words">{partialStory.title}</h4>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Genre badge - appears when genre is detected */}
                    {partialStory?.genre && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg border border-purple-200">
                                <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-medium text-purple-600 mb-1">故事类型</p>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-600 text-white">
                                        {partialStory.genre}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Logline card - appears when logline is detected */}
                    {partialStory?.logline && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200">
                                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-blue-600 mb-1">故事概念</p>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words">{partialStory.logline}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Setting card - appears when setting is detected */}
                    {partialStory?.setting && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg border border-green-200">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-green-600 mb-1">背景设定</p>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words">{partialStory.setting}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Character count indicator */}
                    {partialStory?.characterCount && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-lg border border-pink-200">
                                <Users className="w-5 h-5 text-pink-600 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-medium text-pink-600 mb-1">角色设计</p>
                                    <p className="text-sm text-gray-700">
                                        正在创建 <span className="font-bold text-pink-600">{partialStory.characterCount}</span> 个角色
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Act count indicator */}
                    {partialStory?.actCount && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg border border-amber-200">
                                <BookOpen className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-medium text-amber-600 mb-1">故事结构</p>
                                    <p className="text-sm text-gray-700">
                                        构建 <span className="font-bold text-amber-600">{partialStory.actCount}</span> 幕剧情
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Skeleton loaders for pending content */}
                    {(!partialStory || Object.keys(partialStory).length < 3) && (
                        <div className="space-y-4 mt-4">
                            {!partialStory?.title && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
                                    <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                    </div>
                                </div>
                            )}
                            {!partialStory?.logline && (
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
                                    <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                                        <div className="h-3 bg-gray-300 rounded w-full mb-1"></div>
                                        <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Time indicator */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
                        <Clock className="w-4 h-4" />
                        <span>预计生成时间: 20-40 秒</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
