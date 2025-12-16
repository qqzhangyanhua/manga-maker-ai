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

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { StoryGenerator } from "@/components/Story/StoryGenerator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function StoryPage() {
    const { toast } = useToast();

    // Spotlight effect state
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // AI idea generation state
    const [generatingIdea, setGeneratingIdea] = useState(false);
    const [generatedIdea, setGeneratedIdea] = useState<string | null>(null);

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

    // Generate AI idea
    const handleGenerateIdea = useCallback(async () => {
        setGeneratingIdea(true);
        setGeneratedIdea(null);

        try {
            const res = await fetch("/api/story/generate-idea", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "生成失败");
            }

            setGeneratedIdea(data.idea);
            toast({
                title: "创意已生成",
                description: "已自动填入故事创意输入框",
            });
        } catch (error) {
            console.error("Generate idea error:", error);
            toast({
                title: "生成失败",
                description: error instanceof Error ? error.message : "生成创意失败",
                variant: "destructive",
            });
        } finally {
            setGeneratingIdea(false);
        }
    }, [toast]);

    return (
        <div className="min-h-screen bg-[#0f0f13]">
            <Navbar />

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
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            返回首页
                        </Link>

                        {/* 标题区 */}
                        <div className="text-center">
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                                故事创作
                            </h1>
                            <p className="text-zinc-300 text-lg">
                                使用AI生成完整的故事大纲，然后转换为漫画分镜
                            </p>
                        </div>

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
                                title="没有创意？AI生成"
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
                                        {generatingIdea ? "生成中..." : "没有创意？AI生成"}
                                        {/* Arrow */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                                            <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-zinc-700" />
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <StoryGenerator
                                initialPremise={generatedIdea || ""}
                                onStoryGenerated={(story) => {
                                    console.log("Story generated:", story);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
