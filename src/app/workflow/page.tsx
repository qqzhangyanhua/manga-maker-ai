"use client";

import { useRef, useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { WorkflowDashboard } from "@/components/Workflow/WorkflowDashboard";
import { cn } from "@/lib/utils";

export default function WorkflowPage() {
    // Spotlight effect state
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

                    <div className="max-w-6xl mx-auto relative">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            返回首页
                        </Link>

                        <div className="mb-8">
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                                工作流管理
                            </h1>
                            <p className="text-zinc-300 text-lg">
                                一键生成完整漫画，自动化整个创作流程
                            </p>
                        </div>

                        <WorkflowDashboard />
                    </div>
                </div>
            </main>
        </div>
    );
}
