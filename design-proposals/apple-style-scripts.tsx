/**
 * 方案 3: Apple 风格（极简主义 + 高端质感）
 *
 * 配色策略：
 * - 背景：纯白 bg-white + 极浅灰 bg-gray-50
 * - 卡片：白色 bg-white + 浅灰边框 border-gray-200
 * - 强调色：Apple 蓝 (blue-500/600) + 极简黑色文字
 * - 文字：黑色主文 (text-gray-900) + 灰色次要 (text-gray-500)
 *
 * 排版优化：
 * - San Francisco 风格字体层级（粗细对比明显）
 * - 标题使用 text-4xl font-semibold tracking-tight
 * - 大量使用 font-light 和 font-medium 对比
 *
 * 留白调整：
 * - 超大留白 (px-12 py-20)
 * - 卡片间距加大 (gap-10)
 * - 卡片内部宽松 (p-8)
 *
 * 视觉层级：
 * - 微妙阴影 (shadow-sm/shadow-md)
 * - hover 时轻微上浮 + 阴影加深
 * - 极简图标 + 纤细线条
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
import { Story } from "@/app/scripts/[id]/types/script-editor.types";

export default function ScriptsPageApple() {
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
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-12 py-20 space-y-16">
                <div className="flex items-center justify-between">
                    <div className="space-y-3">
                        <h1 className="text-5xl font-semibold text-gray-900 tracking-tight">
                            剧本
                        </h1>
                        <p className="text-gray-500 text-lg font-light leading-relaxed">
                            查看和管理所有生成的剧本
                        </p>
                    </div>
                    <Link href="/story">
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 px-7 py-6 text-base font-medium rounded-xl"
                        >
                            <Plus className="w-5 h-5 mr-2 stroke-[2.5]" />
                            新建剧本
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-32">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    </div>
                ) : error ? (
                    <div className="text-center py-32">
                        <p className="text-red-500 text-base font-medium mb-8">{error}</p>
                        <Button
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl px-6 py-3"
                            onClick={fetchStories}
                        >
                            重试
                        </Button>
                    </div>
                ) : stories.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-3xl shadow-sm border border-gray-200/50">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-8">
                            <BookOpen className="w-9 h-9 text-gray-400 stroke-[1.5]" />
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">暂无剧本</h3>
                        <p className="text-gray-500 font-light mb-12 text-lg max-w-md mx-auto leading-relaxed">
                            你还没有创建任何剧本，快去创建一个吧
                        </p>
                        <Link href="/story">
                            <Button className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm rounded-xl px-7 py-6">
                                去创建
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {stories.map((story) => (
                            <Card
                                key={story.id}
                                className="group flex flex-col border-gray-200/70 bg-white hover:border-gray-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-3xl overflow-hidden"
                            >
                                <CardHeader className="pb-5 pt-8 px-8">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <CardTitle
                                            className="text-xl font-semibold line-clamp-2 text-gray-900 leading-tight tracking-tight"
                                            title={story.title}
                                        >
                                            {story.title || "无标题剧本"}
                                        </CardTitle>
                                        <Badge
                                            variant="secondary"
                                            className="bg-blue-50 text-blue-600 border-0 shrink-0 font-medium px-3 py-1.5 rounded-full text-xs"
                                        >
                                            {genreMap[story.genre] || story.genre || "未知"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-gray-400 text-sm font-light">
                                        {format(new Date(story.created_at), "yyyy年M月d日", { locale: zhCN })}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1 px-8 pb-5">
                                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed font-light">
                                        {story.premise}
                                    </p>
                                </CardContent>

                                <CardFooter className="flex gap-3 px-8 pb-8 pt-5 border-t border-gray-100">
                                    <Link href={`/scripts/${story.id}`} className="flex-1">
                                        <Button
                                            variant="outline"
                                            className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all rounded-xl py-5 font-medium"
                                        >
                                            <Edit className="w-4 h-4 mr-2 stroke-[2]" />
                                            管理分镜
                                        </Button>
                                    </Link>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl"
                                            >
                                                <Trash2 className="w-4 h-4 stroke-[2]" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-white border-gray-200 rounded-3xl shadow-2xl max-w-md">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-gray-900 text-xl font-semibold">
                                                    确认删除？
                                                </AlertDialogTitle>
                                                <AlertDialogDescription className="text-gray-500 font-light leading-relaxed pt-2">
                                                    此操作无法撤销。这将永久删除该剧本及其所有关联的分镜和设置。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="gap-3 mt-6">
                                                <AlertDialogCancel className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl px-6 py-3 font-medium">
                                                    取消
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(story.id)}
                                                    className="bg-red-500 text-white hover:bg-red-600 rounded-xl px-6 py-3 font-medium"
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
