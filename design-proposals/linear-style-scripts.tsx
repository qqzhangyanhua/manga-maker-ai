/**
 * 方案 2: Linear 风格（现代极简 + 渐变美学）
 *
 * 配色策略：
 * - 背景：深色渐变 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e]
 * - 卡片：紫/蓝渐变边框 + 玻璃态模糊
 * - 强调色：紫色主题 (purple-400/500/600) + 蓝色辅助 (blue-400)
 * - 文字：高对比度白色 + 淡紫色次要文字
 *
 * 排版优化：
 * - 标题使用更大字号 (text-5xl) + 渐变文字
 * - 引入 font-medium/font-semibold 层级
 * - 卡片标题限制 2 行显示更多内容
 *
 * 留白调整：
 * - 超大容器留白 (px-8 py-16)
 * - 卡片内部松散间距 (space-y-6)
 * - 按钮组宽松间距 (gap-4)
 *
 * 视觉层级：
 * - 渐变边框 + 内发光效果
 * - hover 时边框颜色变化 + 轻微上浮
 * - 空状态使用大图标 + 渐变装饰
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { BookOpen, Plus, Loader2, Trash2, Edit, Sparkles } from "lucide-react";

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

export default function ScriptsPageLinear() {
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
        <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16162a] to-[#0f0f1e] relative overflow-hidden">
            {/* 背景装饰 - 径向渐变光晕 */}
            <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-8 py-16 space-y-12">
                <div className="flex items-center justify-between">
                    <div className="space-y-4">
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent tracking-tight">
                            剧本管理
                        </h1>
                        <p className="text-purple-200/80 text-lg leading-relaxed max-w-2xl">
                            查看和管理所有生成的剧本，点击卡片进入分镜编辑
                        </p>
                    </div>
                    <Link href="/story">
                        <Button
                            className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 hover:from-purple-500 hover:via-purple-400 hover:to-blue-400 text-white border-0 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 px-8 py-6 text-base font-medium rounded-xl"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            新建剧本
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                    </div>
                ) : error ? (
                    <div className="text-center py-24">
                        <p className="text-red-300 text-lg mb-8">{error}</p>
                        <Button
                            variant="outline"
                            className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:text-white hover:border-purple-400 rounded-xl px-6 py-3"
                            onClick={fetchStories}
                        >
                            重试
                        </Button>
                    </div>
                ) : stories.length === 0 ? (
                    <div className="text-center py-24 border border-purple-500/20 rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl relative overflow-hidden">
                        {/* 装饰性渐变 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-8">
                                <BookOpen className="w-10 h-10 text-purple-300" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-4">暂无剧本</h3>
                            <p className="text-purple-200/70 mb-10 text-lg max-w-md mx-auto leading-relaxed">
                                你还没有创建任何剧本，快去创建一个吧！
                            </p>
                            <Link href="/story">
                                <Button className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white border-0 shadow-lg shadow-purple-500/30 rounded-xl px-8 py-6">
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    去创建
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {stories.map((story) => (
                            <Card
                                key={story.id}
                                className="group flex flex-col border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-blue-900/10 backdrop-blur-xl hover:border-purple-400/40 hover:bg-gradient-to-br hover:from-purple-900/20 hover:to-blue-900/20 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-purple-500/20 relative overflow-hidden rounded-2xl"
                            >
                                {/* 内部渐变装饰 */}
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-blue-500/0 group-hover:from-purple-500/10 group-hover:to-blue-500/10 transition-all duration-700 pointer-events-none" />
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500" />

                                <CardHeader className="relative z-10 pb-6 space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <CardTitle className="text-xl font-semibold line-clamp-2 text-white leading-snug" title={story.title}>
                                            {story.title || "无标题剧本"}
                                        </CardTitle>
                                        <Badge
                                            variant="secondary"
                                            className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border-purple-500/30 shrink-0 font-medium px-3 py-1 rounded-lg"
                                        >
                                            {genreMap[story.genre] || story.genre || "未知"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-purple-200/60 text-sm">
                                        {format(new Date(story.created_at), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1 relative z-10 pb-6">
                                    <p className="text-sm text-purple-100/80 line-clamp-3 leading-relaxed">
                                        {story.premise}
                                    </p>
                                </CardContent>

                                <CardFooter className="flex gap-4 relative z-10 pt-6 border-t border-purple-500/20">
                                    <Link href={`/scripts/${story.id}`} className="flex-1">
                                        <Button
                                            variant="outline"
                                            className="w-full border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white hover:border-purple-400/50 transition-all rounded-xl py-5"
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
                                                className="text-purple-300/60 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded-xl"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border-purple-500/30 rounded-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-white text-xl">确认删除？</AlertDialogTitle>
                                                <AlertDialogDescription className="text-purple-200/70 leading-relaxed">
                                                    此操作无法撤销。这将永久删除该剧本及其所有关联的分镜和设置。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:text-white rounded-xl">
                                                    取消
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(story.id)}
                                                    className="bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 rounded-xl"
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
