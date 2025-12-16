"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Sparkles, BookOpen, Users, Edit, List, Save, AlertCircle } from "lucide-react";
import { StoryTemplateSelector } from "./StoryTemplateSelector";
import { EditableStoryForm } from "./EditableStoryForm";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface StoryGeneratorProps {
    onStoryGenerated?: (story: any) => void;
    initialPremise?: string;
}

export function StoryGenerator({ onStoryGenerated, initialPremise }: StoryGeneratorProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState<"input" | "template" | "generating" | "result">("input");
    const [premise, setPremise] = useState(initialPremise || "");
    const [genre, setGenre] = useState("auto");
    const [characterCount, setCharacterCount] = useState("3");
    const [length, setLength] = useState<"short" | "medium" | "long">("medium");
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [generating, setGenerating] = useState(false);
    const [generatedStory, setGeneratedStory] = useState<any>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Update premise when initialPremise changes
    React.useEffect(() => {
        if (initialPremise) {
            setPremise(initialPremise);
        }
    }, [initialPremise]);

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
                    saveToDb: false, // 草稿模式：不自动保存
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "生成失败");
            }

            // Normalize data structure: outline or story object
            // - outline: { title, genre, logline, setting, acts, characters, themes }
            // - story: { id, title, premise, genre, outline: {...}, characters: [...] }
            const generatedData = data.outline || data.story;

            setGeneratedStory(generatedData);
            setIsSaved(!!generatedData.id); // Has id = saved to database
            setStep("result");

            toast({
                title: "✅ 故事生成成功",
                description: "请预览并决定是否保存",
            });

            if (onStoryGenerated) {
                onStoryGenerated(data.outline || data.story);
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
        setEditMode(false);
        setIsSaved(false);
        setSaving(false);
    }

    async function handleSaveStory() {
        if (!generatedStory) {
            toast({
                title: "错误",
                description: "没有可保存的故事",
                variant: "destructive",
            });
            return;
        }

        try {
            setSaving(true);

            const res = await fetch("/api/story", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: generatedStory.title || "未命名故事",
                    premise: premise,
                    genre: genre === "auto" ? "suspense" : genre,
                    outline: generatedStory,
                    characters: generatedStory.characters || [],
                    status: "draft",
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "保存失败");
            }

            const data = await res.json();

            // 更新为已保存的story（带id）
            setGeneratedStory(data.story);
            setIsSaved(true);

            toast({
                title: "✅ 故事已保存",
                description: "可以在「剧本管理」中查看和管理",
                action: (
                    <ToastAction altText="查看列表" onClick={() => router.push("/scripts")}>
                        查看列表
                    </ToastAction>
                ),
            });

            if (onStoryGenerated) {
                onStoryGenerated(data.story);
            }
        } catch (error: any) {
            console.error("Save story error:", error);
            toast({
                title: "保存失败",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    function handleSaveEdits(updatedStory: any) {
        setGeneratedStory(updatedStory);
        setEditMode(false);
        toast({
            title: "保存成功",
            description: "故事已更新",
        });
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
                <>
                    {editMode ? (
                        <EditableStoryForm
                            story={generatedStory}
                            onSave={handleSaveEdits}
                            onCancel={() => setEditMode(false)}
                        />
                    ) : (
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
                                        {generatedStory.title}
                                        {isSaved && (
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
                                                已保存
                                            </span>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        故事类型: {generatedStory.genre}
                                        {generatedStory.created_at && (
                                            <> | 创建时间: {new Date(generatedStory.created_at).toLocaleString()}</>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Story outline preview */}
                                    {generatedStory && (
                                        <div className="space-y-4">
                                            {/* Helper: get field from both outline and story structures */}
                                            {(() => {
                                                const isStoryObj = "outline" in generatedStory;
                                                const logline = isStoryObj ? generatedStory.outline?.logline : generatedStory.logline;
                                                const setting = isStoryObj ? generatedStory.outline?.setting : generatedStory.setting;
                                                const acts = isStoryObj ? generatedStory.outline?.acts : generatedStory.acts;
                                                const characters = isStoryObj ? generatedStory.outline?.characters || generatedStory.characters : generatedStory.characters;
                                                const themes = isStoryObj ? generatedStory.outline?.themes : generatedStory.themes;

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
                                                                    {acts.map((act: any, idx: number) => (
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
                                                                    {characters.map((char: any, idx: number) => (
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
                                                                    {themes.map((theme: string, idx: number) => (
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
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        {!isSaved ? (
                                            <>
                                                {/* Unsaved State Buttons */}
                                                <Button variant="outline" onClick={resetForm}>
                                                    放弃
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setEditMode(true)}
                                                >
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    编辑内容
                                                </Button>
                                                <Button
                                                    onClick={handleSaveStory}
                                                    disabled={saving}
                                                    className="flex-1"
                                                >
                                                    <Save className="w-4 h-4 mr-2" />
                                                    {saving ? "保存中..." : "保存故事"}
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                {/* Saved State Buttons */}
                                                <Button variant="outline" onClick={resetForm}>
                                                    创建新故事
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setEditMode(true)}
                                                >
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    编辑内容
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => router.push("/scripts")}
                                                >
                                                    <List className="w-4 h-4 mr-2" />
                                                    查看我的故事
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        router.push(`/storyboard?story_id=${generatedStory.id}`);
                                                    }}
                                                    className="flex-1"
                                                >
                                                    生成分镜脚本
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
