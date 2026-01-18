"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Clock, FileText, Sparkles, ImageIcon, Wand2, Trash2, Loader2, Layers } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { InspirationModeDialog } from "./components/InspirationModeDialog";
import { cn } from "@/lib/utils";
import { novelTheme } from "./theme";
import "./novel-theme.css";

interface NovelProject {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  status: string;
  total_words: number;
  chapter_count: number;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

export default function NovelDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser();
  const [projects, setProjects] = useState<NovelProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inspirationDialogOpen, setInspirationDialogOpen] = useState(false);
  const [generatingCover, setGeneratingCover] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<NovelProject | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePosition(null);
  }, []);

  useEffect(() => {
    // 检查用户登录状态
    if (userError) {
      // 用户未登录，跳转到登录页面
      router.push("/auth/login");
      return;
    }

    // 用户已登录，获取项目列表
    if (user) {
      fetchProjects();
    }
  }, [user, userError, router]);

  async function fetchProjects() {
    try {
      setLoading(true);
      const response = await fetch("/api/novel/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("获取项目列表失败:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleProjectClick(projectId: string) {
    router.push(`/novel/${projectId}`);
  }

  async function handleGenerateCover(projectId: string, event: React.MouseEvent) {
    event.stopPropagation();
    try {
      setGeneratingCover(projectId);
      const response = await fetch(`/api/novel/projects/${projectId}/generate-cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成封面失败");
      }

      const data = await response.json();
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, cover_image: data.cover_url } : p))
      );
    } catch (error) {
      console.error("生成封面失败:", error);
      toast({
        title: "生成封面失败",
        description: error instanceof Error ? error.message : "生成封面失败",
        variant: "destructive",
      });
    } finally {
      setGeneratingCover(null);
    }
  }

  function handleDeleteClick(project: NovelProject, event: React.MouseEvent) {
    event.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  }

  async function handleOpenCanvas(project: NovelProject, event: React.MouseEvent) {
    event.stopPropagation();
    try {
      // 创建或获取现有时间线
      const response = await fetch("/api/canvas/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_project_id: project.id,
          title: `${project.title} - 无限画布`,
        }),
      });

      if (!response.ok) {
        throw new Error("创建时间线失败");
      }

      const data = await response.json();
      router.push(`/novel/canvas/${data.timeline.id}`);
    } catch (error) {
      console.error("打开画布失败:", error);
      toast({
        title: "打开画布失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  }

  async function handleConfirmDelete() {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      const response = await fetch(`/api/novel/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除失败");
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      toast({ title: "删除成功", description: `已删除小说「${projectToDelete.title}」` });
    } catch (error) {
      console.error("删除项目失败:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除项目失败",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: "草稿", className: novelTheme.badge.draft },
      writing: { label: "创作中", className: novelTheme.badge.writing },
      completed: { label: "已完成", className: novelTheme.badge.completed },
    };
    const config = statusMap[status] || statusMap.draft;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  }

  return (
    <div className={cn(novelTheme.layout.background, "novel-theme-scope")}>
      {/* 用户登录状态检查 */}
      {userLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className={cn("h-8 w-8 animate-spin", novelTheme.primary.text)} />
            <p className="text-zinc-400">正在验证登录状态...</p>
          </div>
        </div>
      )}

      {/* 如果用户未登录，不渲染页面内容 */}
      {userError && null}

      {/* 用户已登录时显示页面内容 */}
      {user && (
        <>
          {/* 装饰性光晕 */}
          <div className={novelTheme.layout.glowPrimary} />
          <div className={novelTheme.layout.glowSecondary} />

          <div
            ref={containerRef}
            className="container mx-auto py-12 px-4 max-w-7xl relative"
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
                  ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(192, 132, 252, 0.2), transparent 40%)`
                  : "none",
              }}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-white mb-2">我的小说 <span className={novelTheme.primary.text}>.</span></h1>
                <p className="text-zinc-300 text-lg">
                  使用 AI 辅助创作，让灵感变成精彩故事
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setInspirationDialogOpen(true)}
                  size="lg"
                  variant="outline"
                  className={novelTheme.button.outline}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  灵感模式
                </Button>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  size="lg"
                  className={novelTheme.button.primary}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新建项目
                </Button>
              </div>
            </div>

            {/* Project List */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {[1, 2, 3].map((i) => (
                  <GlassCard key={i} className={cn(novelTheme.card.skeleton, "h-[320px]")}>
                    <div className="h-48 bg-zinc-800/50 w-full mb-4" />
                    <div className="p-4 space-y-3">
                      <div className="h-6 bg-zinc-800 rounded w-3/4" />
                      <div className="h-4 bg-zinc-800 rounded w-1/2" />
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <GlassCard className={novelTheme.empty.container}>
                <div className={novelTheme.empty.iconWrapper}>
                  <BookOpen className={novelTheme.empty.icon} />
                </div>
                <h3 className={novelTheme.empty.title}>还没有项目</h3>
                <p className={novelTheme.empty.description}>
                  创建你的第一个小说项目，开始创作之旅
                </p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className={novelTheme.button.primary}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新建项目
                </Button>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {projects.map((project) => (
                  <GlassCard
                    key={project.id}
                    className={cn(
                      "group p-0 overflow-hidden",
                      novelTheme.card.highlight,
                      novelTheme.interaction.cardHover
                    )}
                    onClick={() => handleProjectClick(project.id)}
                  >
                    {/* Cover Area */}
                    <div className="relative w-full h-48 bg-zinc-900 overflow-hidden">
                      {project.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.cover_image}
                          alt={project.title}
                          className={cn("w-full h-full object-cover", novelTheme.interaction.imageScale)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-700 bg-zinc-900/50">
                          <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                          <span className="text-xs">暂无封面</span>
                        </div>
                      )}

                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60" />

                      {/* Actions */}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10"
                        onClick={(e) => handleGenerateCover(project.id, e)}
                        disabled={generatingCover === project.id}
                      >
                        {generatingCover === project.id ? (
                          <>
                            <div className="animate-spin mr-2 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-3 w-3" />
                            {project.cover_image ? "重新生成" : "生成封面"}
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0 shadow-lg"
                        onClick={(e) => handleDeleteClick(project, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className={novelTheme.text.cardTitle}>
                          {project.title}
                        </h3>
                        {getStatusBadge(project.status)}
                      </div>

                      {project.genre && (
                        <Badge variant="outline" className="mb-3 bg-zinc-800/50 text-zinc-400 border-zinc-700">
                          {project.genre}
                        </Badge>
                      )}

                      <p className="text-sm text-zinc-300 line-clamp-2 mb-4 min-h-[2.5em]">
                        {project.description || "暂无描述..."}
                      </p>

                      <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800 pt-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{project.chapter_count} 章</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>{project.total_words.toLocaleString()} 字</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Canvas Entry Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("w-full mt-3", novelTheme.button.secondary)}
                        onClick={(e) => handleOpenCanvas(project, e)}
                      >
                        <Layers className="mr-2 h-3.5 w-3.5" />
                        无限画布
                      </Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {/* Dialogs */}
            <CreateProjectDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onSuccess={() => {
                setCreateDialogOpen(false);
                fetchProjects();
              }}
            />

            <InspirationModeDialog
              isOpen={inspirationDialogOpen}
              onClose={() => setInspirationDialogOpen(false)}
              onProjectCreated={(projectId) => {
                router.push(`/novel/${projectId}`);
              }}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">确认删除项目?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    确定要删除小说 <span className="text-white font-medium">「{projectToDelete?.title}」</span> 吗？
                    <br />此操作将删除所有章节内容，且无法恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700 text-white border-0"
                  >
                    {deleting ? "删除中..." : "确认删除"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  );
}
