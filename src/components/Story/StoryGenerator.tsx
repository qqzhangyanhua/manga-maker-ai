"use client";

import { useState } from "react";
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
import { Loader2, Sparkles, BookOpen, Users } from "lucide-react";
import { StoryTemplateSelector } from "./StoryTemplateSelector";
import { useToast } from "@/hooks/use-toast";

interface StoryGeneratorProps {
    onStoryGenerated?: (story: any) => void;
}

export function StoryGenerator({ onStoryGenerated }: StoryGeneratorProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<"input" | "template" | "generating" | "result">("input");
    const [premise, setPremise] = useState("");
    const [genre, setGenre] = useState("auto");
    const [characterCount, setCharacterCount] = useState("3");
    const [length, setLength] = useState<"short" | "medium" | "long">("medium");
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [generating, setGenerating] = useState(false);
    const [generatedStory, setGeneratedStory] = useState<any>(null);

    async function handleGenerate() {
        if (!premise.trim()) {
            toast({
                title: "错误",
                description: "请输入故事创意",
                variant: "destructive",
            });
            return;
        }

        setGenerating(true);
        setStep("generating");

        try {
            const res = await fetch("/api/story/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    premise,
                    genre: genre === "auto" ? undefined : genre,
                    characterCount: parseInt(characterCount) || undefined,
                    length,
                    templateId: selectedTemplate?.id,
                    saveToDb: true,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "生成失败");
            }

            setGeneratedStory(data.story);
            setStep("result");

            toast({
                title: "成功",
                description: data.message,
            });

            if (onStoryGenerated) {
                onStoryGenerated(data.story);
            }
        } catch (error: any) {
            console.error("Story generation error:", error);
            toast({
                title: "生成失败",
                description: error.message,
                variant: "destructive",
            });
            setStep("input");
        } finally {
            setGenerating(false);
        }
    }

    function resetForm() {
        setStep("input");
        setPremise("");
        setGenre("auto");
        setCharacterCount("3");
        setLength("medium");
        setSelectedTemplate(null);
        setGeneratedStory(null);
    }

    return (
        <div className="space-y-6">
            {/* Step 1: Input */}
            {step === "input" && (
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
                            <Textarea
                                id="premise"
                                placeholder="例如: 一个失忆的侦探醒来发现自己成了案件的嫌疑人..."
                                value={premise}
                                onChange={(e) => setPremise(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                            <p className="text-sm text-muted-foreground">
                                描述你的故事核心创意,可以包括主角、冲突、背景等
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="genre">故事类型</Label>
                                <Select value={genre || "auto"} onValueChange={(v) => setGenre(v === "auto" ? "" : v)}>
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
                                    onChange={(e) => setCharacterCount(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="length">故事长度</Label>
                                <Select value={length} onValueChange={(v: any) => setLength(v)}>
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
                                onClick={() => setStep("template")}
                                variant="outline"
                                className="flex-1"
                            >
                                <BookOpen className="w-4 h-4 mr-2" />
                                选择模板
                            </Button>
                            <Button
                                onClick={handleGenerate}
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
            )}

            {/* Step 2: Template Selection */}
            {step === "template" && (
                <Card>
                    <CardHeader>
                        <CardTitle>选择故事模板</CardTitle>
                        <CardDescription>
                            使用预设模板可以帮助AI生成更符合特定类型的故事结构
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StoryTemplateSelector
                            selected={selectedTemplate}
                            onSelect={setSelectedTemplate}
                        />
                        <div className="flex gap-2 mt-6">
                            <Button variant="outline" onClick={() => setStep("input")}>
                                返回
                            </Button>
                            <Button onClick={() => setStep("input")} className="flex-1">
                                继续
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Generating */}
            {step === "generating" && (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                            <div>
                                <h3 className="text-lg font-semibold">AI正在创作故事...</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    这可能需要10-30秒,请稍候
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Result */}
            {step === "result" && generatedStory && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            {generatedStory.title}
                        </CardTitle>
                        <CardDescription>
                            故事类型: {generatedStory.genre} | 创建时间:{" "}
                            {new Date(generatedStory.created_at).toLocaleString()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Story outline preview */}
                        {generatedStory.outline && (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">故事梗概</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {generatedStory.outline.logline}
                                    </p>
                                </div>

                                {generatedStory.outline.acts && (
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            故事结构 ({generatedStory.outline.acts.length} 幕)
                                        </h4>
                                        <div className="space-y-2">
                                            {generatedStory.outline.acts.map((act: any, idx: number) => (
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

                                {generatedStory.outline.characters && (
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            主要角色 ({generatedStory.outline.characters.length})
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {generatedStory.outline.characters.map((char: any, idx: number) => (
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
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={resetForm}>
                                创建新故事
                            </Button>
                            <Button
                                onClick={() => {
                                    // Navigate to storyboard generation
                                    window.location.href = `/storyboard?story_id=${generatedStory.id}`;
                                }}
                                className="flex-1"
                            >
                                生成分镜脚本
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
