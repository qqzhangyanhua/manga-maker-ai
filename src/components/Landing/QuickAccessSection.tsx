"use client";

import Link from "next/link";
import { BarChart3, BookOpen, FileText, Images, PenLine, Layers, ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
    {
        title: "生成小说",
        description: "从一个灵感开始，AI 辅助生成完整小说章节与剧本大纲。",
        href: "/novel",
        icon: PenLine,
        span: "md:col-span-2",
        theme: "purple", // 对应 NovelSection 的紫色
        bgGradient: "from-purple-500/10 via-purple-500/5 to-transparent",
        borderHover: "group-hover:border-purple-500/50",
        iconColor: "text-purple-400",
        iconBg: "bg-purple-500/10",
    },
    {
        title: "分镜项目",
        description: "进入编辑器，调整分镜布局与画面细节。",
        href: "/projects",
        icon: BookOpen,
        span: "md:col-span-1",
        theme: "orange", // 对应 HeroSection 的橙色
        bgGradient: "from-orange-500/10 via-orange-500/5 to-transparent",
        borderHover: "group-hover:border-orange-500/50",
        iconColor: "text-orange-400",
        iconBg: "bg-orange-500/10",
    },
    {
        title: "剧本记录",
        description: "查看历史剧本，继续派生。",
        href: "/scripts",
        icon: FileText,
        span: "md:col-span-1",
        theme: "blue",
        bgGradient: "from-blue-500/10 via-blue-500/5 to-transparent",
        borderHover: "group-hover:border-blue-500/50",
        iconColor: "text-blue-400",
        iconBg: "bg-blue-500/10",
    },
    {
        title: "生成图库",
        description: "回溯所有 AI 生成的画作。",
        href: "/generated",
        icon: Images,
        span: "md:col-span-1",
        theme: "pink", // 对应 ShowcaseSection 的一些色彩
        bgGradient: "from-pink-500/10 via-pink-500/5 to-transparent",
        borderHover: "group-hover:border-pink-500/50",
        iconColor: "text-pink-400",
        iconBg: "bg-pink-500/10",
    },
    {
        title: "示例项目",
        description: "学习优秀的漫画分镜结构。",
        href: "/samples",
        icon: Layers,
        span: "md:col-span-1",
        theme: "emerald",
        bgGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
        borderHover: "group-hover:border-emerald-500/50",
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-500/10",
    },
];

// 最后一个 "用量与日志" 作为一个更紧凑的一行，或者放在 Bento 的最后
const adminItem = {
    title: "控制台 & 用量",
    description: "审计生成配额与其消耗日志",
    href: "/admin/usage",
    icon: BarChart3,
    theme: "zinc",
    iconColor: "text-zinc-400",
};

export function QuickAccessSection() {
    return (
        <section className="px-4 py-24 bg-gradient-to-b from-zinc-900/30 to-zinc-900/50 relative overflow-hidden">
            {/* 装饰性背景 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-zinc-900/0 radial-gradient-mask" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-orange-500" />
                            快速入口
                        </h2>
                        <p className="text-zinc-400">
                            您的创作工作台，直达核心功能
                        </p>
                    </div>

                    {/* Admin Link - Compact Style */}
                    <Link
                        href={adminItem.href}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-colors text-sm text-zinc-500 hover:text-zinc-300"
                    >
                        <adminItem.icon className="w-4 h-4" />
                        <span>{adminItem.title}</span>
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                className={cn(
                                    "group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm transition-all duration-300",
                                    "hover:-translate-y-1 hover:shadow-xl",
                                    item.span,
                                    item.borderHover
                                )}
                            >
                                {/* 内部渐变背景 - Hover时增强 */}
                                <div className={cn(
                                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                    item.bgGradient
                                )} />

                                {/* 内容容器 */}
                                <div className="relative z-10 p-6 h-full flex flex-col">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                                            item.iconBg,
                                            item.iconColor
                                        )}>
                                            <Icon className="w-6 h-6" />
                                        </div>

                                        {/* Corner Decoration */}
                                        <div className={cn(
                                            "opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0",
                                            item.iconColor
                                        )}>
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <h3 className={cn(
                                            "text-xl font-bold mb-2 text-zinc-100 group-hover:text-white transition-colors",
                                            // 如果是 theme color 可以稍微带点色相，但保持白色为主更有质感
                                        )}>
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-zinc-400 leading-relaxed max-w-[90%]">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>

                                {/* 装饰性光斑 */}
                                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:from-white/10 transition-colors" />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
