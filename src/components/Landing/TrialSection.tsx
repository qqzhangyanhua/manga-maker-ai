"use client";

import { useState, useEffect } from "react";
import { Play, Sparkles, ArrowRight, Wand2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrialSectionProps {
    onOpenTrial: () => void;
}

const examplePrompts = [
    "一只赛博朋克风格的猫咪，霓虹灯背景...",
    "中世纪骑士在雨中决斗，水墨画风格...",
    "未来城市的空中花园，阳光明媚...",
];

export function TrialSection({ onOpenTrial }: TrialSectionProps) {
    const [promptIndex, setPromptIndex] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const [isTyping, setIsTyping] = useState(true);

    // Typing effect
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const currentPrompt = examplePrompts[promptIndex];

        if (isTyping) {
            if (displayText.length < currentPrompt.length) {
                timeout = setTimeout(() => {
                    setDisplayText(currentPrompt.slice(0, displayText.length + 1));
                }, 50);
            } else {
                timeout = setTimeout(() => setIsTyping(false), 2000);
            }
        } else {
            if (displayText.length > 0) {
                timeout = setTimeout(() => {
                    setDisplayText(currentPrompt.slice(0, displayText.length - 1));
                }, 30);
            } else {
                setPromptIndex((prev) => (prev + 1) % examplePrompts.length);
                setIsTyping(true);
            }
        }

        return () => clearTimeout(timeout);
    }, [displayText, isTyping, promptIndex]);

    return (
        <section className="px-4 py-24 relative overflow-hidden" style={{ 
          background: 'linear-gradient(to bottom, rgba(41, 28, 20, 0.4), transparent)' 
        }}>
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="group relative bg-black/40 backdrop-blur-md border border-stone-800 rounded-3xl p-1 overflow-hidden transition-all duration-500 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10">

                    {/* Animated Border Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-stone-700/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                    {/* Inner Content Container */}
                    <div className="relative rounded-[22px] p-8 md:p-12 text-center overflow-hidden" style={{ backgroundColor: 'rgba(41, 28, 20, 0.8)' }}>
                        {/* Holographic Glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/10 blur-[100px] rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-500" />

                        {/* Icon */}
                        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-stone-800 to-black border border-stone-700 mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500">
                            <div className="absolute inset-0 bg-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Play className="w-8 h-8 text-orange-500 fill-orange-500/20" />
                        </div>

                        <h2 className="relative text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                            30 秒，
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
                                脑洞具象化
                            </span>
                        </h2>

                        <p className="relative text-stone-400 mb-10 max-w-xl mx-auto text-lg">
                            无需注册，立即体验。见证文字如何瞬间转化为分镜。
                        </p>

                        {/* Fake Console Input */}
                        <div
                            className="relative max-w-2xl mx-auto group/input cursor-text"
                            onClick={onOpenTrial}
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl blur opacity-20 group-hover/input:opacity-50 transition duration-500" />
                            <div className="relative flex items-center bg-black rounded-xl border border-stone-700 p-2 pl-4 shadow-2xl">
                                <Wand2 className="w-5 h-5 text-stone-500 mr-3" />

                                {/* Simulated Input Text */}
                                <div className="flex-1 text-left font-mono text-stone-300 h-6 overflow-hidden flex items-center">
                                    {displayText}
                                    <span className="inline-block w-2 H-5 bg-orange-500 animate-pulse ml-1" />
                                </div>

                                <Button
                                    size="lg"
                                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 ml-2"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    生成
                                </Button>
                            </div>

                            {/* Tooltip hint */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-stone-500 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                点击试用 console
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
