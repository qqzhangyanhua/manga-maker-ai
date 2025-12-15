/**
 * 方案 1: Vercel 风格深色主题
 *
 * 配色策略：
 * - 背景：从 #09090b 改为 #0a0a0a (稍亮) + 渐变叠加
 * - 卡片：使用 border-gradient 和 backdrop-blur 效果
 * - 强调色：orange-500 → orange-400 (降低饱和度) + 渐变光晕
 * - 文字：zinc-400 → zinc-300/zinc-100 (提高对比度)
 *
 * 排版优化：
 * - 标题字号增大到 text-4xl，font-weight 700 → 800
 * - 副标题使用 text-zinc-400 且 tracking-wide
 * - 卡片内文字增加 leading-relaxed
 *
 * 留白调整：
 * - 容器从 max-w-7xl 改为 max-w-7xl mx-auto px-6 py-12
 * - 卡片内部 padding 统一增加 20%
 * - 按钮组间距从 gap-2 → gap-3
 *
 * 视觉层级：
 * - 卡片使用渐变边框 + 内阴影
 * - hover 时添加 scale-[1.02] 和 shadow-2xl
 * - 空状态添加背景网格纹理
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { BookOpen, Plus, Loader2, Trash2, Edit } from "lucide-react";

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

export default function ScriptsPageVercel() {
    const router = useRouter();
    const { toast } = useToast();
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
            {/* 背景渐变装饰 */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-6 py-12 space-y-10">
                <div className="flex items-center justify-between">
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold text-white tracking-tight">
                            剧本管理
                        </h1>
                        <p className="text-zinc-300 text-lg leading-relaxed tracking-wide">
                            查看和管理所有生成的剧本，点击卡片进入分镜编辑
                        </p>
                    </div>
                    <Link href="/story">
                        <Button
                            className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white border-0 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200 px-6 py-3 text-base"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            新建剧本
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 text-lg mb-6">{error}</p>
                        <Button
                            variant="outline"
                            className="border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white hover:border-zinc-500"
                            onClick={fetchStories}
                        >
                            重试
                        </Button>
                    </div>
                ) : stories.length === 0 ? (
                    <div className="text-center py-20 border border-zinc-800/50 rounded-xl bg-zinc-900/30 backdrop-blur-sm relative overflow-hidden">
                        {/* 网格背景 */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

                        <div className="relative z-10">
                            <BookOpen className="w-16 h-16 mx-auto text-zinc-400 mb-6" />
                            <h3 className="text-2xl font-semibold text-white mb-3">暂无剧本</h3>
                            <p className="text-zinc-300 mb-8 text-lg leading-relaxed">
                                你还没有创建任何剧本，快去创建一个吧！
                            </p>
                            <Link href="/story">
                                <Button className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white border-0 shadow-lg shadow-orange-500/25">
                                    去创建
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stories.map((story) => (
                            <Card
                                key={story.id}
                                className="group flex flex-col border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm hover:border-zinc-700 hover:bg-zinc-900/60 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/10 relative overflow-hidden"
                            >
                                {/* 卡片内部渐变光晕 */}
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-transparent to-purple-500/0 group-hover:from-orange-500/5 group-hover:to-purple-500/5 transition-all duration-500 pointer-events-none" />

                                <CardHeader className="relative z-10 pb-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="text-xl font-semibold line-clamp-2 text-white leading-tight" title={story.title}>
                                            {story.title || "无标题剧本"}
                                        </CardTitle>
                                        <Badge variant="secondary" className="bg-orange-500/15 text-orange-400 border-0 shrink-0 font-medium">
                                            {genreMap[story.genre] || story.genre || "未知"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-zinc-400 text-sm mt-2">
                                        {format(new Date(story.created_at), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1 relative z-10 pb-4">
                                    <p className="text-sm text-zinc-300 line-clamp-3 leading-relaxed">
                                        {story.premise}
                                    </p>
                                </CardContent>

                                <CardFooter className="flex gap-3 relative z-10 pt-4 border-t border-zinc-800/50">
                                    <Link href={`/scripts/${story.id}`} className="flex-1">
                                        <Button
                                            variant="outline"
                                            className="w-full border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 transition-all"
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
                                                className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-white">确认删除？</AlertDialogTitle>
                                                <AlertDialogDescription className="text-zinc-400">
                                                    此操作无法撤销。这将永久删除该剧本及其所有关联的分镜和设置。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
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
    );
}
