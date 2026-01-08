/**
 * scripts/page.tsx - 完全参考首页设计
 *
 * 设计元素与首页保持100%一致：
 * - 背景：bg-[#0f0f13]
 * - 卡片：bg-zinc-900/50 backdrop-blur-sm border-zinc-800
 * - 强调色：orange-500
 * - hover：border-orange-500/50 bg-zinc-900
 * - 圆角：rounded-xl/2xl
 * - 文字：white 标题 + zinc-400 描述
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { BookOpen, Plus, Loader2, Trash2, Edit, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Story } from "./[id]/types/script-editor.types";

export default function ScriptsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    useEffect(() => {
        fetchStories();
    }, []);

    async function fetchStories() {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/story");
            if (!res.ok) {
                throw new Error("Failed to fetch stories");
            }
            const data = await res.json();
            setStories(data.stories || []);
        } catch (err) {
            console.error(err);
            setError("获取剧本列表失败，请稍后重试");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        try {
            setDeletingId(id);
            const res = await fetch(`/api/story/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "删除失败");
            }

            toast({
                title: "删除成功",
                description: "剧本已成功删除",
            });

            setStories((prev) => prev.filter((s) => s.id !== id));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "删除失败";
            toast({
                title: "删除失败",
                description: message,
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    }

    const genreMap: Record<string, string> = {
        suspense: "悬疑",
        romance: "爱情",
        adventure: "冒险",
        scifi: "科幻",
        daily: "日常",
        fantasy: "奇幻",
        auto: "自动",
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#1a1410' }}>
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

                    <div className="max-w-7xl mx-auto relative space-y-8">
                        {/* 返回首页链接 */}
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            返回首页
                        </Link>
                        {/* 标题区 */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                                    剧本管理
                                </h1>
                                <p className="text-zinc-300 text-lg">
                                    查看和管理所有生成的剧本，点击卡片进入分镜编辑
                                </p>
                            </div>
                            <Link href="/story">
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
                                    <Plus className="w-4 h-4 mr-2" />
                                    新建剧本
                                </Button>
                            </Link>
                        </div>

                        {/* 加载状态 */}
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            </div>
                        ) : error ? (
                            /* 错误状态 */
                            <div className="text-center py-12 text-red-400">
                                {error}
                                <Button
                                    variant="outline"
                                    className="ml-4 border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                    onClick={fetchStories}
                                >
                                    重试
                                </Button>
                            </div>
                        ) : stories.length === 0 ? (
                            /* 空状态 */
                            <div className="relative text-center py-16 border border-zinc-700 rounded-2xl bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
                                <div className="relative">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center ring-2 ring-orange-500/30 mb-4">
                                        <BookOpen className="w-8 h-8 text-orange-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">暂无剧本</h3>
                                    <p className="text-zinc-400 mb-6">你还没有创建任何剧本，快去创建一个吧！</p>
                                    <Link href="/story">
                                        <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
                                            去创建
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            /* 剧本列表 */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {stories.map((story) => (
                                    <Card
                                        key={story.id}
                                        className="group relative flex flex-col border-zinc-700 bg-zinc-900/60 backdrop-blur-md hover:border-orange-500/50 hover:bg-zinc-900/80 transition-all overflow-hidden shadow-lg hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1"
                                    >
                                        {/* 顶部高光 */}
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {/* Hover时的内部光晕 */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:to-transparent transition-all duration-300" />
                                        <CardHeader className="relative z-10">
                                            <div className="flex items-start justify-between">
                                                <CardTitle
                                                    className="text-xl line-clamp-1 text-white font-semibold"
                                                    title={story.title}
                                                >
                                                    {story.title || "无标题剧本"}
                                                </CardTitle>
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                                >
                                                    {genreMap[story.genre] || story.genre || "未知"}
                                                </Badge>
                                            </div>
                                            <CardDescription className="text-zinc-400 text-sm">
                                                {format(new Date(story.created_at), "yyyy-MM-dd HH:mm", {
                                                    locale: zhCN,
                                                })}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 relative z-10">
                                            <p className="text-sm text-zinc-300 line-clamp-3">
                                                {story.premise}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="flex gap-2 relative z-10">
                                            <Link href={`/scripts/${story.id}`} className="flex-1">
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                                                >
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    管理分镜
                                                </Button>
                                            </Link>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-white">
                                                            确认删除？
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription className="text-zinc-400">
                                                            此操作无法撤销。这将永久删除该剧本及其所有关联的分镜和设置。
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                                                            取消
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(story.id)}
                                                            className="bg-red-600 text-white hover:bg-red-700"
                                                        >
                                                            删除
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
