"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { StoryInputForm } from "./StoryInputForm";
import { StoryTemplateStep } from "./StoryTemplateStep";
import { StoryGeneratingProgress } from "./StoryGeneratingProgress";
import { StoryResultDisplay } from "./StoryResultDisplay";
import { EditableStoryForm } from "./EditableStoryForm";
import type {
    StoryGeneratorProps,
    StoryStep,
    StoryLength,
    StoryTemplate,
    GeneratedStory,
    PartialStory,
    StreamEventData,
} from "./types";

export function StoryGenerator({
    onStoryGenerated,
    onDraftChange,
    initialPremise,
    isGeneratingIdea,
    selectedStyleKey
}: StoryGeneratorProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState<StoryStep>("input");
    const [premise, setPremise] = useState(initialPremise || "");
    const [genre, setGenre] = useState("auto");
    const [characterCount, setCharacterCount] = useState("3");
    const [length, setLength] = useState<StoryLength>("medium");
    const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generatedStory, setGeneratedStory] = useState<GeneratedStory | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [llmContent, setLlmContent] = useState<string>("");
    const [partialStory, setPartialStory] = useState<PartialStory | null>(null);
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
    const tryParsePartialJSON = React.useCallback((jsonStr: string): PartialStory => {
        const partial: PartialStory = {};

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
            let generatedData: GeneratedStory | null = null;

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
                        const data = JSON.parse(jsonStr) as StreamEventData;

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
                            generatedData = data.outline || data.story || null;
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
        } catch (error: unknown) {
            // Check if error is due to abort
            if (error instanceof Error && error.name === "AbortError") {
                toast({
                    title: "已取消",
                    description: "故事生成已取消",
                });
            } else {
                console.error("Story generation error:", error);
                toast({
                    title: "生成失败",
                    description: error instanceof Error ? error.message : "未知错误",
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
        } catch (error: unknown) {
            console.error("Save story error:", error);
            toast({
                title: "保存失败",
                description: error instanceof Error ? error.message : "未知错误",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    function handleSaveEdits(updatedStory: GeneratedStory) {
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
                <StoryInputForm
                    premise={premise}
                    genre={genre}
                    characterCount={characterCount}
                    length={length}
                    selectedTemplate={selectedTemplate}
                    isGeneratingIdea={isGeneratingIdea}
                    onPremiseChange={setPremise}
                    onGenreChange={setGenre}
                    onCharacterCountChange={setCharacterCount}
                    onLengthChange={setLength}
                    onTemplateClick={() => setStep("template")}
                    onGenerateClick={handleGenerate}
                />
            )}

            {/* Step 2: Template Selection */}
            {step === "template" && (
                <StoryTemplateStep
                    selectedTemplate={selectedTemplate}
                    onTemplateSelect={setSelectedTemplate}
                    onBack={() => setStep("input")}
                    onContinue={() => setStep("input")}
                />
            )}

            {/* Step 3: Generating */}
            {step === "generating" && (
                <StoryGeneratingProgress
                    generationPhase={generationPhase}
                    llmContent={llmContent}
                    partialStory={partialStory}
                />
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
                        <StoryResultDisplay
                            story={generatedStory}
                            isSaved={isSaved}
                            saving={saving}
                            onEdit={() => setEditMode(true)}
                            onSave={handleSaveStory}
                            onReset={resetForm}
                            onNavigateToStoryboard={() => {
                                router.push(`/storyboard?story_id=${generatedStory.id}`);
                            }}
                            onNavigateToScripts={() => router.push("/scripts")}
                        />
                    )}
                </>
            )}
        </div>
    );
}
