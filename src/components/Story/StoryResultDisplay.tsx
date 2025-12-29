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
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Loader2, BookOpen, Users, Edit, List, Save, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import type { GeneratedStory } from "./types";

interface StoryResultDisplayProps {
    story: GeneratedStory;
    isSaved: boolean;
    saving: boolean;
    onEdit: () => void;
    onSave: () => void;
    onReset: () => void;
    onNavigateToStoryboard: () => void;
    onNavigateToScripts: () => void;
}

export function StoryResultDisplay({
    story,
    isSaved,
    saving,
    onEdit,
    onSave,
    onReset,
    onNavigateToStoryboard,
    onNavigateToScripts,
}: StoryResultDisplayProps) {
    return (
        <>
            {/* Unsaved Status Alert */}
            {!isSaved && (
                <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>未保存</AlertTitle>
                    <AlertDescription>
                        当前故事仅为预览状态，请点击"保存故事"按钮保存到故事库。
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        {story.title}
                        {isSaved && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
                                已保存
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        故事类型: {story.genre}
                        {story.created_at && (
                            <> | 创建时间: {new Date(story.created_at).toLocaleString()}</>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Story outline preview */}
                    <div className="space-y-4">
                        {/* Helper: get field from both outline and story structures */}
                        {(() => {
                            const isStoryObj = "outline" in story;
                            const logline = isStoryObj ? story.outline?.logline : story.logline;
                            const setting = isStoryObj ? story.outline?.setting : story.setting;
                            const acts = isStoryObj ? story.outline?.acts : story.acts;
                            const characters = isStoryObj ? story.outline?.characters || story.characters : story.characters;
                            const themes = isStoryObj ? story.outline?.themes : story.themes;

                            return (
                                <>
                                    {logline && (
                                        <div>
                                            <h4 className="font-semibold mb-2">故事梗概</h4>
                                            <p className="text-sm text-muted-foreground">{logline}</p>
                                        </div>
                                    )}

                                    {setting && (
                                        <div>
                                            <h4 className="font-semibold mb-2">故事背景</h4>
                                            <p className="text-sm text-muted-foreground">{setting}</p>
                                        </div>
                                    )}

                                    {acts && acts.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <BookOpen className="w-4 h-4" />
                                                故事结构 ({acts.length} 幕)
                                            </h4>
                                            <div className="space-y-2">
                                                {acts.map((act, idx) => (
                                                    <div key={idx} className="p-3 bg-muted rounded-md">
                                                        <p className="font-medium text-sm">{act.name}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {act.summary}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {characters && characters.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                主要角色 ({characters.length})
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {characters.map((char, idx) => (
                                                    <div key={idx} className="p-3 bg-muted rounded-md">
                                                        <p className="font-medium text-sm">
                                                            {char.name} ({char.role})
                                                        </p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {char.description}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {themes && themes.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-2">故事主题</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {themes.map((theme, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                                                    >
                                                        {theme}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    {/* Action Buttons with Clear CTA */}
                    <div className="flex flex-col gap-3">
                        {!isSaved ? (
                            <>
                                {/* Primary CTA - Generate Storyboard */}
                                <Button
                                    onClick={onSave}
                                    disabled={saving}
                                    size="lg"
                                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 group"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            保存中...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 mr-2" />
                                            保存并生成分镜
                                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>

                                {/* Secondary Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={onEdit}
                                        className="flex-1"
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        编辑内容
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={onReset}
                                        className="flex-1"
                                    >
                                        重新生成
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Saved State - Primary CTA to Storyboard */}
                                <Button
                                    onClick={onNavigateToStoryboard}
                                    size="lg"
                                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 group"
                                >
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    立即生成分镜脚本
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>

                                {/* Secondary Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={onEdit}
                                        className="flex-1"
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        编辑内容
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={onNavigateToScripts}
                                        className="flex-1"
                                    >
                                        <List className="w-4 h-4 mr-2" />
                                        查看我的故事
                                    </Button>
                                </div>

                                <Button
                                    variant="ghost"
                                    onClick={onReset}
                                    className="w-full"
                                >
                                    创建新故事
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
