/**
 * story/page.tsx - 完全参考首页设计
 *
 * 设计元素与首页保持100%一致：
 * - 背景：bg-[#0f0f13]
 * - 容器卡片：bg-zinc-900/60 backdrop-blur-md border-zinc-700
 * - 强调色：orange-500
 * - 文字：white 标题 + zinc-300/zinc-400 描述
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Lightbulb, Clock, Check, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { StoryGenerator } from "@/components/Story/StoryGenerator";
import { StoryHistory } from "@/components/Story/StoryHistory";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { autoSaveStory, type StoryHistoryItem } from "@/lib/story-history";

export default function StoryPage() {
    const { toast } = useToast();

    // Spotlight effect state
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // AI idea generation state
    const [generatingIdea, setGeneratingIdea] = useState(false);
    const [generatedIdea, setGeneratedIdea] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // History sidebar state
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Comic style state
    const [comicStyles, setComicStyles] = useState<Array<{
        id: string;
        style_key: string;
        name_zh: string;
        name_en: string;
        image_url: string;
        tag_color: string;
        description: string | null;
    }>>([]);
    const [selectedStyleKey, setSelectedStyleKey] = useState<string | null>(null);

    // Auto-save indicator state
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    // Track current story data for auto-save
    const [currentStoryData, setCurrentStoryData] = useState<{
        premise: string;
        genre?: string;
        title?: string;
        status: "draft" | "generating" | "completed";
        outline?: any;
    } | null>(null);

    // Fetch comic styles on mount
    useEffect(() => {
        async function fetchStyles() {
            try {
                const res = await fetch("/api/comic-styles");
                const data = await res.json();
                setComicStyles(data.data || []);
            } catch (error) {
                console.error("Failed to fetch comic styles:", error);
            }
        }
        fetchStyles();
    }, []);

    // Mouse tracking for spotlight effect
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    }, []);

    const handleMouseEnter = useCallback(() => {
        setIsHovering(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
        setMousePosition(null);
    }, []);

    // Generate AI idea with streaming
    const handleGenerateIdea = useCallback(async () => {
        setGeneratingIdea(true);
        setGeneratedIdea("");

        // Create abort controller for cancellation
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        let accumulatedContent = "";

        try {
            const response = await fetch("/api/story/generate-idea", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    styleKey: selectedStyleKey || undefined,
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

            let hasShownToast = false;

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
                            type: "theme" | "chunk" | "done" | "error";
                            theme?: string;
                            chunk?: string;
                            message?: string;
                        };

                        if (data.type === "theme") {
                            // Optional: could display the theme to user
                            console.log("Theme:", data.theme);
                        } else if (data.type === "chunk") {
                            // Accumulate content and update state
                            accumulatedContent += data.chunk || "";
                            setGeneratedIdea(accumulatedContent);

                            // Show toast on first chunk
                            if (!hasShownToast) {
                                hasShownToast = true;
                                const styleName = selectedStyleKey
                                    ? comicStyles.find(s => s.style_key === selectedStyleKey)?.name_zh
                                    : null;
                                toast({
                                    title: "AI 正在生成创意",
                                    description: styleName
                                        ? `将生成符合「${styleName}」风格的故事创意`
                                        : "内容将实时显示在输入框中",
                                });
                            }
                        } else if (data.type === "done") {
                            const styleName = selectedStyleKey
                                ? comicStyles.find(s => s.style_key === selectedStyleKey)?.name_zh
                                : null;
                            toast({
                                title: "创意已生成",
                                description: styleName
                                    ? `已生成符合「${styleName}」风格的创意`
                                    : "已自动填入故事创意输入框",
                            });
                        } else if (data.type === "error") {
                            throw new Error(data.message || "生成失败");
                        }
                    } catch (parseError) {
                        console.error("Failed to parse SSE message:", line, parseError);
                    }
                }
            }
        } catch (error) {
            // Check if error is due to abort
            if (error instanceof Error && error.name === "AbortError") {
                toast({
                    title: "已取消",
                    description: "创意生成已取消",
                });
            } else {
                console.error("Generate idea error:", error);
                toast({
                    title: "生成失败",
                    description: error instanceof Error ? error.message : "生成创意失败",
                    variant: "destructive",
                });
            }
        } finally {
            setGeneratingIdea(false);
            abortControllerRef.current = null;
        }
    }, [toast, selectedStyleKey, comicStyles]);

    // Auto-save effect with debounce
    useEffect(() => {
        // Skip auto-save if data is empty or AI is generating idea
        if (!currentStoryData || !currentStoryData.premise || generatingIdea) return;

        // Clear previous timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set saving status immediately
        setSaveStatus("saving");

        // Debounce save operation (2 seconds)
        saveTimeoutRef.current = setTimeout(() => {
            try {
                autoSaveStory(currentStoryData);
                setSaveStatus("saved");
                setLastSavedTime(Date.now());

                // Reset to idle after 3 seconds
                setTimeout(() => {
                    setSaveStatus("idle");
                }, 3000);
            } catch (error) {
                console.error("Auto-save failed:", error);
                setSaveStatus("error");
            }
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [currentStoryData, generatingIdea]);

    // Handle history item selection
    const handleHistorySelect = useCallback((item: StoryHistoryItem) => {
        setGeneratedIdea(item.premise);
        toast({
            title: "已恢复",
            description: "历史记录已加载到编辑器",
        });
    }, [toast]);

    // Handle draft changes - MUST use useCallback to prevent infinite loop
    const handleDraftChange = useCallback((data: { premise: string; genre?: string; title?: string }) => {
        setCurrentStoryData({
            premise: data.premise,
            genre: data.genre,
            title: data.title,
            status: "draft",
        });
    }, []);

    // Handle story generated - MUST use useCallback to prevent infinite loop
    const handleStoryGenerated = useCallback((story: any) => {
        console.log("Story generated:", story);
        // Auto-save completed story
        setCurrentStoryData({
            premise: story.premise || generatedIdea || "",
            genre: story.genre,
            title: story.title,
            status: "completed",
            outline: story,
        });
    }, [generatedIdea]);

    // Format save time
    const formatSaveTime = (timestamp: number | null) => {
        if (!timestamp) return "";
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        if (seconds < 10) return "刚刚";
        if (seconds < 60) return `${seconds}秒前`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}分钟前`;
        return new Date(timestamp).toLocaleTimeString();
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#1a1410' }}>
            <Navbar />

            {/* History Sidebar */}
            <StoryHistory
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSelect={handleHistorySelect}
            />

            <main className="pt-16">
                {/* 装饰性光晕 */}
                <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
                <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

                <div
                    ref={containerRef}
                    className="relative px-4 py-12"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Global Spotlight Overlay */}
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-0 z-30 transition-opacity duration-500",
                            isHovering ? "opacity-100" : "opacity-0"
                        )}
                        style={{
                            background: mousePosition
                                ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 115, 22, 0.08), transparent 40%)`
                                : "none",
                        }}
                    />

                    <div className="max-w-4xl mx-auto relative space-y-8">
                        {/* Top bar with back link and auto-save indicator */}
                        <div className="flex items-center justify-between mb-6">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                返回首页
                            </Link>

                            {/* Auto-save indicator */}
                            <div className="flex items-center gap-4">
                                {/* Save status */}
                                {saveStatus !== "idle" && (
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-all",
                                            saveStatus === "saving" && "bg-orange-500/10 text-orange-400",
                                            saveStatus === "saved" && "bg-green-500/10 text-green-400",
                                            saveStatus === "error" && "bg-red-500/10 text-red-400"
                                        )}
                                    >
                                        {saveStatus === "saving" && (
                                            <>
                                                <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                                <span>自动保存中...</span>
                                            </>
                                        )}
                                        {saveStatus === "saved" && (
                                            <>
                                                <Check className="w-4 h-4" />
                                                <span>已保存 {formatSaveTime(lastSavedTime)}</span>
                                            </>
                                        )}
                                        {saveStatus === "error" && (
                                            <>
                                                <AlertCircle className="w-4 h-4" />
                                                <span>保存失败</span>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* History button */}
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-orange-500/50 transition-all"
                                >
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">历史记录</span>
                                </button>
                            </div>
                        </div>

                        {/* 标题区 */}
                        <div className="text-center">
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                                故事创作
                            </h1>
                            <p className="text-zinc-300 text-lg">
                                使用AI生成完整的故事大纲，然后转换为漫画分镜
                            </p>
                        </div>

                        {/* 风格选择区 */}
                        {comicStyles.length > 0 && (
                            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-6 overflow-hidden shadow-lg">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">画面风格</h3>
                                    <p className="text-sm text-zinc-400">选择漫画风格，AI 将生成符合该风格特点的故事内容</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {comicStyles.map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => setSelectedStyleKey(
                                                selectedStyleKey === style.style_key ? null : style.style_key
                                            )}
                                            className={cn(
                                                "relative group overflow-hidden rounded-lg border-2 transition-all duration-300",
                                                "hover:scale-105 hover:shadow-lg",
                                                selectedStyleKey === style.style_key
                                                    ? "border-orange-500 ring-2 ring-orange-500/50"
                                                    : "border-zinc-700 hover:border-zinc-500"
                                            )}
                                        >
                                            {/* Preview Image */}
                                            <div className="aspect-[3/4] w-full overflow-hidden bg-zinc-800">
                                                <img
                                                    src={style.image_url}
                                                    alt={style.name_zh}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                />
                                            </div>

                                            {/* Style Info */}
                                            <div className="p-2 bg-gradient-to-t from-zinc-900 to-transparent absolute bottom-0 left-0 right-0">
                                                <div className="text-xs font-medium text-white text-center">
                                                    {style.name_zh}
                                                </div>
                                                <div className="text-[10px] text-zinc-400 text-center">
                                                    {style.name_en}
                                                </div>
                                            </div>

                                            {/* Selected Indicator */}
                                            {selectedStyleKey === style.style_key && (
                                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {selectedStyleKey && (
                                    <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                        <p className="text-sm text-orange-300">
                                            已选择: {comicStyles.find(s => s.style_key === selectedStyleKey)?.name_zh}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* StoryGenerator 容器 */}
                        <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-8 overflow-hidden shadow-lg">
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />

                            {/* AI Idea Generator Button */}
                            <button
                                onClick={handleGenerateIdea}
                                disabled={generatingIdea}
                                className={cn(
                                    "absolute bottom-4 right-4 z-10",
                                    "w-10 h-10 flex items-center justify-center",
                                    "rounded-full bg-orange-500/10 border border-orange-500/30",
                                    "hover:bg-orange-500/20 hover:border-orange-500/50",
                                    "transition-all duration-300",
                                    "group relative",
                                    generatingIdea && "animate-pulse cursor-not-allowed"
                                )}
                                title={
                                    generatingIdea
                                        ? "生成中..."
                                        : selectedStyleKey
                                            ? `AI生成${comicStyles.find(s => s.style_key === selectedStyleKey)?.name_zh}风格创意`
                                            : "没有创意？AI随机生成"
                                }
                            >
                                <Lightbulb
                                    className={cn(
                                        "w-5 h-5 text-orange-500",
                                        generatingIdea && "animate-spin"
                                    )}
                                />

                                {/* Tooltip */}
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                    <div className="bg-zinc-800 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg border border-zinc-700 relative">
                                        {generatingIdea
                                            ? "生成中..."
                                            : selectedStyleKey
                                                ? `AI生成${comicStyles.find(s => s.style_key === selectedStyleKey)?.name_zh}风格创意`
                                                : "没有创意？AI随机生成"}
                                        {/* Arrow */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                                            <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-zinc-700" />
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <StoryGenerator
                                initialPremise={generatedIdea || ""}
                                isGeneratingIdea={generatingIdea}
                                onStoryGenerated={handleStoryGenerated}
                                onDraftChange={handleDraftChange}
                                selectedStyleKey={selectedStyleKey}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
