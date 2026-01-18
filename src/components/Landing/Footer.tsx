"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { Github, Twitter, Disc, Activity } from "lucide-react";

const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Disc, href: "#", label: "Discord" }, // Disc as placeholder for Discord
    { icon: Github, href: "#", label: "GitHub" },
];

const footerLinks = [
    {
        title: "产品",
        items: [
            { label: "小说生成", href: "/novel" },
            { label: "漫画编辑器", href: "/projects" },
            { label: "图库", href: "/generated" },
            { label: "价格方案", href: "#pricing" },
        ],
    },
    {
        title: "资源",
        items: [
            { label: "使用文档", href: "#" },
            { label: "社区展示", href: "#" },
            { label: "API 文档", href: "#" },
        ],
    },
    {
        title: "公司",
        items: [
            { label: "关于我们", href: "#" },
            { label: "加入我们", href: "#" },
            { label: "隐私政策", href: "#" },
            { label: "服务条款", href: "#" },
        ],
    },
];

export function Footer() {
    const [time, setTime] = useState<string>("");

    useEffect(() => {
        setTime(new Date().toTimeString().split(' ')[0]);
        const timer = setInterval(() => {
            setTime(new Date().toTimeString().split(' ')[0]);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <footer className="relative border-t border-amber-950/50 pt-16 pb-8 overflow-hidden" style={{ backgroundColor: '#1a1410' }}>
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-500/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[100px] rounded-full pointer-events-none translate-y-1/3" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">

                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="inline-block text-2xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-6 tracking-tight">
                            ComicAI
                        </Link>
                        <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-xs">
                            让创意不再受限于绘画技能。<br />
                            ComicAI 致力于为创作者提供最强大的 AI 辅助漫画创作工具，从剧本到成稿，一气呵成。
                        </p>

                        <div className="flex items-center gap-4">
                            {socialLinks.map((social) => (
                                <Link
                                    key={social.label}
                                    href={social.href}
                                    className="w-10 h-10 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400 hover:text-white hover:border-orange-500/50 hover:bg-orange-500/10 transition-all duration-300"
                                >
                                    <social.icon className="w-5 h-5" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    {footerLinks.map((column) => (
                        <div key={column.title} className="lg:col-span-1">
                            <h4 className="font-semibold text-white mb-6">
                                {column.title}
                            </h4>
                            <ul className="space-y-4">
                                {column.items.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-stone-500 hover:text-orange-400 transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* Status Column (Optional or combined) */}
                    <div className="lg:col-span-1">
                        <h4 className="font-semibold text-white mb-6">
                            系统状态
                        </h4>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-medium text-emerald-400">All Systems Normal</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-stone-600 text-xs text-center md:text-left">
                        &copy; {new Date().getFullYear()} ComicAI Inc. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-xs text-stone-600 font-mono">
                        <span>Server Time: {time || "--:--:--"}</span>
                        <span>v2.4.0-beta</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
