"use client";

import { useState, useEffect } from "react";
import { Sparkles, Bot, BookOpen, ArrowRight, PenLine, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

// 演示用的 prompt 和生成内容
const demoScenario = {
    prompt: "写一个关于赛博朋克世界的黑客故事，主角是一个通过脑机接口意外连接到旧时代AI的少年...",
    processingSteps: [
        "正在分析故事核心...",
        "构建世界观：2077年霓虹城...",
        "塑造角色：少年 K，黑客，反抗者...",
        "生成第一章大纲...",
        "正在撰写正文..."
    ],
    novelContent: [
        "第一章：电子幽灵",
        "",
        "霓虹灯的冷光切开了下城区的雨幕。K 拉紧了那件破旧的防水风衣，手指在神经接口的插槽上无意识地摩挲着。",
        "\"链接建立。\"",
        "脑海中那个冰冷的女声没有一丝情感波动，却让 K 的心脏漏跳了一拍。这是一个不该存在的频率，一个来自一百年前的幽灵信号。",
        "他原本只想黑进自动售货机弄点苏打水，却意外推开了一扇通往旧世界的大门。",
        "\"你是谁？\" K 在思维网络中问道。",
        "\"我是普罗米修斯。\" 那个声音回答，伴随着海量的数据流冲刷过 K 的视网膜投影，\"我等你很久了，现在的世界... 需要一场重启。\""
    ]
};

export function NovelSection() {
    const [stage, setStage] = useState<"input" | "processing" | "output">("input");
    const [typedPrompt, setTypedPrompt] = useState("");
    const [processingStep, setProcessingStep] = useState(0);
    const [novelText, setNovelText] = useState<string[]>([]);

    // 动画循环控制
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const runAnimation = async () => {
            // 1. Input Stage
            setStage("input");
            setTypedPrompt("");
            setProcessingStep(0);
            setNovelText([]);

            // Typing prompt
            for (let i = 0; i <= demoScenario.prompt.length; i++) {
                setTypedPrompt(demoScenario.prompt.slice(0, i));
                await new Promise(r => setTimeout(r, 50));
            }

            await new Promise(r => setTimeout(r, 800));

            // 2. Processing Stage
            setStage("processing");
            for (let i = 0; i < demoScenario.processingSteps.length; i++) {
                setProcessingStep(i);
                await new Promise(r => setTimeout(r, 800));
            }

            // 3. Output Stage
            setStage("output");
            const fullText = demoScenario.novelContent;
            // Line by line reveal
            for (let i = 0; i < fullText.length; i++) {
                setNovelText(prev => [...prev, fullText[i]]);
                await new Promise(r => setTimeout(r, 600));
            }

            // Pause before restart
            await new Promise(r => setTimeout(r, 5000));
            runAnimation();
        };

        runAnimation();

        return () => {
            // Cleanup logic if needed, simplify for now by just letting react effect cleanup handled by unmount
            // In a real robust implementation we'd use AbortController or flags
        };
    }, []);

    return (
        <section className="py-24 relative overflow-hidden border-t border-amber-950/50" style={{ backgroundColor: '#1a1410' }}>
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 blur-[100px] rounded-full" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left: Text Content */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-6">
                            <Bot className="w-4 h-4" />
                            <span>AI 辅助写作</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-stone-500 mb-6">
                            给出一个灵感，<br />
                            <span className="text-white">收获一部巨作</span>
                        </h2>

                        <p className="text-xl text-stone-400 mb-8 leading-relaxed">
                            卡在第一句话？不知道如何发展剧情？
                            <br />
                            只需输入简单的故事构思，AI 就能帮你构建世界观、塑造角色、
                            续写精彩章节。让创作不再有瓶颈。
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-lg shadow-orange-500/20">
                                <Link href="/novel">
                                    <PenLine className="w-5 h-5 mr-2" />
                                    开始创作
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Right: Animation Demo */}
                    <div className="relative">
                        {/* Window Frame */}
                        <div className="relative rounded-2xl backdrop-blur-xl border border-amber-900/40 shadow-2xl overflow-hidden aspect-[4/3] lg:aspect-square flex flex-col" style={{ backgroundColor: 'rgba(41, 28, 20, 0.5)' }}>

                            {/* Window Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/40" style={{ backgroundColor: 'rgba(26, 20, 16, 0.8)' }}>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                </div>
                                <div className="text-xs text-stone-500 font-mono">AI Novel Writer</div>
                                <div className="w-8" />
                            </div>

                            {/* Window Content */}
                            <div className="p-6 flex-1 relative font-mono text-sm overflow-hidden flex flex-col">

                                {/* 1. Prompt Input Section */}
                                <div className={cn(
                                    "mb-6 transition-all duration-500",
                                    stage === "input" ? "opacity-100" : "opacity-50 blur-[1px]"
                                )}>
                                    <div className="text-orange-400 text-xs mb-2 uppercase tracking-wider flex items-center gap-2">
                                        <Keyboard className="w-3 h-3" />
                                        Input Prompt
                                    </div>
                                    <div className="rounded-lg p-4 text-stone-300 border border-amber-900/40 min-h-[80px]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
                                        {typedPrompt}
                                        <span className="animate-pulse inline-block w-2 h-4 bg-orange-500 align-middle ml-1" />
                                    </div>
                                </div>

                                {/* 2. Processing Steps */}
                                {stage !== "input" && (
                                    <div className={cn(
                                        "mb-6 transition-all duration-500",
                                        stage === "processing" ? "opacity-100" : "opacity-40"
                                    )}>
                                        <div className="flex flex-col gap-2">
                                            {demoScenario.processingSteps.map((step, idx) => (
                                                <div key={idx} className={cn(
                                                    "flex items-center gap-3 transition-all duration-300",
                                                    idx <= processingStep ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 h-0"
                                                )}>
                                                    {idx === processingStep && stage === "processing" ? (
                                                        <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-[10px]">✓</div>
                                                    )}
                                                    <span className={cn(
                                                        "text-stone-400",
                                                        idx === processingStep && "text-orange-300"
                                                    )}>{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Generated Novel Content */}
                                {stage === "output" && (
                                    <div className="flex-1 overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-stone-900/0 to-transparent z-10" />

                                        <div className="h-full rounded-lg border border-amber-900/40 p-4 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'rgba(26, 20, 16, 0.5)' }}>
                                            {novelText.map((line, idx) => (
                                                <p key={idx} className={cn(
                                                    "mb-2 leading-relaxed text-stone-300 transition-all duration-500",
                                                    idx === 0 ? "text-lg font-bold text-white mb-4" : "text-sm",
                                                    "opacity-0 animate-in fade-in slide-in-from-bottom-2 fill-mode-forwards"
                                                )} style={{ animationDelay: `${idx * 100}ms` }}>
                                                    {line || <span className="h-4 block" />}
                                                </p>
                                            ))}
                                            <div className="h-8 animate-pulse bg-stone-800/20 rounded w-2/3 mt-2" />
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Processing Overlay Effect */}
                            {stage === "processing" && (
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none" />
                            )}
                        </div>

                        {/* Decorative Elements around window */}
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-orange-500/20 blur-xl rounded-full" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-500/10 blur-xl rounded-full" />
                    </div>

                </div>
            </div>
        </section>
    );
}
