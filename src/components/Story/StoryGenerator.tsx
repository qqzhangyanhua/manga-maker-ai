"use client";

import React, { useState, useRef } from "react";
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
import { Loader2, Sparkles, BookOpen, Users, Edit, List, Save, AlertCircle, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { StoryTemplateSelector } from "./StoryTemplateSelector";
import { EditableStoryForm } from "./EditableStoryForm";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

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

interface StoryGeneratorProps {
    onStoryGenerated?: (story: any) => void;
    onDraftChange?: (data: { premise: string; genre?: string; title?: string }) => void;
    initialPremise?: string;
    isGeneratingIdea?: boolean;
    selectedStyleKey?: string | null;
}

export function StoryGenerator({ onStoryGenerated, onDraftChange, initialPremise, isGeneratingIdea, selectedStyleKey }: StoryGeneratorProps) {
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
    const [llmContent, setLlmContent] = useState<string>("");
    const [partialStory, setPartialStory] = useState<any>(null);
    const [generationPhase, setGenerationPhase] = useState<string>("开始生成");
    const abortControllerRef = useRef<AbortController | null>(null);

    // Update premise when initialPremise changes
    React.useEffect(() => {
        if (initialPremise) {
            setPremise(initialPremise);
        }
    }, [initialPremise]);

    // Call onDraftChange when form data changes (debounced)
    const draftDataRef = useRef<{ premise: string; genre?: string; title?: string } | null>(null);

    React.useEffect(() => {
        if (!onDraftChange || !premise) return;

        const newDraftData = {
            premise,
            genre: genre === "auto" ? undefined : genre,
            title: generatedStory?.title,
        };

        // Only call if data actually changed
        if (
            draftDataRef.current?.premise !== newDraftData.premise ||
            draftDataRef.current?.genre !== newDraftData.genre ||
            draftDataRef.current?.title !== newDraftData.title
        ) {
            draftDataRef.current = newDraftData;
            onDraftChange(newDraftData);
        }
    }, [premise, genre, generatedStory?.title, onDraftChange]);

    // Incremental JSON parser - try to extract completed fields
    const tryParsePartialJSON = React.useCallback((jsonStr: string) => {
        const partial: any = {};

        // Try to extract title
        const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
        if (titleMatch) {
            partial.title = titleMatch[1];
            setGenerationPhase("标题已生成");
        }

        // Try to extract genre
        const genreMatch = jsonStr.match(/"genre"\s*:\s*"([^"]+)"/);
        if (genreMatch) {
            partial.genre = genreMatch[1];
            setGenerationPhase("类型已确定");
        }

        // Try to extract logline
        const loglineMatch = jsonStr.match(/"logline"\s*:\s*"([^"]+)"/);
        if (loglineMatch) {
            partial.logline = loglineMatch[1];
            setGenerationPhase("故事概念已生成");
        }

        // Try to extract setting
        const settingMatch = jsonStr.match(/"setting"\s*:\s*"([^"]+)"/);
        if (settingMatch) {
            partial.setting = settingMatch[1];
            setGenerationPhase("背景设定已生成");
        }

        // Try to count characters being generated
        const characterMatches = jsonStr.match(/"name"\s*:\s*"([^"]+)"/g);
        if (characterMatches && characterMatches.length > 0) {
            partial.characterCount = characterMatches.length;
            setGenerationPhase(`正在设计角色 (${characterMatches.length} 个)`);
        }

        // Try to count acts
        const actMatches = jsonStr.match(/"actNumber"\s*:\s*(\d+)/g);
        if (actMatches && actMatches.length > 0) {
            partial.actCount = actMatches.length;
            setGenerationPhase(`正在构建故事结构 (${actMatches.length} 幕)`);
        }

        // Check if JSON looks complete
        if (jsonStr.includes('"themes"') && jsonStr.trim().endsWith('}')) {
            setGenerationPhase("正在完成最后细节");
        }

        return partial;
    }, []);

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
        setLlmContent("");
        setPartialStory(null);
        setGenerationPhase("初始化...");

        // Create abort controller for cancellation
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch("/api/story/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    premise,
                    genre: genre === "auto" ? undefined : genre,
                    characterCount: parseInt(characterCount) || undefined,
                    length,
                    templateId: selectedTemplate?.id,
                    styleKey: selectedStyleKey || undefined,
                    saveToDb: false, // 草稿模式：不自动保存
                }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let accumulatedContent = "";
            let generatedData: any = null;

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                // Decode chunk and split by lines
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));

                for (const line of lines) {
                    try {
                        // Extract JSON after "data: " prefix
                        const jsonStr = line.substring(line.indexOf("{"));
                        const data = JSON.parse(jsonStr) as {
                            type: "validating" | "generating" | "saving" | "done" | "error" | "chunk";
                            message: string;
                            chunk?: string;
                            outline?: any;
                            story?: any;
                        };

                        if (data.type === "validating") {
                            setGenerationPhase(data.message);
                        } else if (data.type === "chunk" && data.chunk) {
                            // Accumulate content
                            accumulatedContent += data.chunk;
                            setLlmContent(accumulatedContent);

                            // Try to parse partial JSON and update UI
                            const partial = tryParsePartialJSON(accumulatedContent);
                            if (Object.keys(partial).length > 0) {
                                setPartialStory(partial);
                            }
                        } else if (data.type === "saving") {
                            setGenerationPhase(data.message);
                        } else if (data.type === "done") {
                            // Generation complete
                            generatedData = data.outline || data.story;
                            setGenerationPhase("生成完成！");
                        } else if (data.type === "error") {
                            throw new Error(data.message || "生成失败");
                        }
                    } catch (parseError) {
                        console.error("Failed to parse SSE message:", line, parseError);
                    }
                }
            }

            if (!generatedData) {
                throw new Error("未收到生成结果");
            }

            setGeneratedStory(generatedData);
            setIsSaved(!!generatedData.id); // Has id = saved to database
            setStep("result");

            toast({
                title: "✅ 故事生成成功",
                description: "请预览并决定是否保存",
            });

            if (onStoryGenerated) {
                onStoryGenerated(generatedData);
            }
        } catch (error: any) {
            // Check if error is due to abort
            if (error.name === "AbortError") {
                toast({
                    title: "已取消",
                    description: "故事生成已取消",
                });
            } else {
                console.error("Story generation error:", error);
                toast({
                    title: "生成失败",
                    description: error.message,
                    variant: "destructive",
                });
            }
            setStep("input");
        } finally {
            setGenerating(false);
            abortControllerRef.current = null;
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
        setLlmContent("");
        setPartialStory(null);
        setGenerationPhase("开始生成");
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
            {/* Inject shimmer animation styles */}
            <style>{shimmerStyles}</style>

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
                            <div className="relative">
                                <Textarea
                                    id="premise"
                                    placeholder="例如: 一个失忆的侦探醒来发现自己成了案件的嫌疑人..."
                                    value={premise}
                                    onChange={(e) => setPremise(e.target.value)}
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

            {/* Step 3: Generating - Redesigned UI */}
            {step === "generating" && (
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

                                    {/* Action Buttons with Clear CTA */}
                                    <div className="flex flex-col gap-3">
                                        {!isSaved ? (
                                            <>
                                                {/* Primary CTA - Generate Storyboard */}
                                                <Button
                                                    onClick={handleSaveStory}
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
                                                        onClick={() => setEditMode(true)}
                                                        className="flex-1"
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        编辑内容
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={resetForm}
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
                                                    onClick={() => {
                                                        router.push(`/storyboard?story_id=${generatedStory.id}`);
                                                    }}
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
                                                        onClick={() => setEditMode(true)}
                                                        className="flex-1"
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        编辑内容
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => router.push("/scripts")}
                                                        className="flex-1"
                                                    >
                                                        <List className="w-4 h-4 mr-2" />
                                                        查看我的故事
                                                    </Button>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    onClick={resetForm}
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
                    )}
                </>
            )}
        </div>
    );
}
