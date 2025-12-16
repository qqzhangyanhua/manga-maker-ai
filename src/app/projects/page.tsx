"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowLeft, BookOpen, Grid3X3, Loader2, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Panel = {
  id: string;
  generated_image?: string | null;
  created_at?: string;
};

type Project = {
  id: string;
  title: string;
  description?: string | null;
  style?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  panels: Panel[];
};

export default function ProjectListPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/project");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "获取项目失败");
      }
      setProjects(data.projects || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "获取项目失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
      ),
    [projects]
  );

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

          <div className="max-w-7xl mx-auto relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Link>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                  分镜项目
                </h1>
                <p className="text-zinc-300 text-lg">管理已生成的分镜项目，继续编辑或导出</p>
              </div>
              <div className="flex gap-2">
                <Link href="/storyboard">
                  <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50">
                    <Sparkles className="w-4 h-4 mr-1" />
                    新建分镜
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchProjects}
                  disabled={loading}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                >
                  刷新
                </Button>
              </div>
            </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              加载中...
            </div>
          )}

          {!loading && sortedProjects.length === 0 && (
            <div className="relative text-center py-16 border border-zinc-700 rounded-2xl bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center ring-2 ring-orange-500/30 mb-4">
                  <Grid3X3 className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">暂无分镜项目</h3>
                <p className="text-zinc-400 mb-6">先去生成一个吧</p>
                <Link href="/storyboard">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
                    <Sparkles className="w-4 h-4 mr-2" />
                    新建分镜
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {!loading && sortedProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProjects.map((project) => {
                const generatedCount = project.panels.filter((p) => p.generated_image).length;
                const panelCount = project.panels.length;
                return (
                  <div key={project.id} className="group relative flex flex-col border-zinc-700 bg-zinc-900/60 backdrop-blur-md rounded-xl p-4 hover:border-orange-500/50 hover:bg-zinc-900/80 transition-all overflow-hidden shadow-lg hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 gap-3">
                    {/* 顶部高光 */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {/* Hover时的内部光晕 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:to-transparent transition-all duration-300" />

                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center ring-1 ring-orange-500/30">
                          <Grid3X3 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-white line-clamp-1">{project.title || "未命名项目"}</div>
                          <div className="text-xs text-zinc-400">
                            {project.style || "未设置风格"} ｜ {project.status || "draft"}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400">
                        {project.updated_at
                          ? format(new Date(project.updated_at), "MM-dd HH:mm", { locale: zhCN })
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-3 min-h-[48px] relative z-10">
                      {project.description || "无描述"}
                    </p>
                    <div className="text-xs text-zinc-400 flex items-center gap-3 relative z-10">
                      <span>分镜数：{panelCount}</span>
                      <span>已出图：{generatedCount}</span>
                    </div>
                    <div className="flex gap-2 relative z-10">
                      <Link href={`/storyboard/editor/${project.id}`} className="flex-1">
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20" size="sm">
                          <BookOpen className="w-4 h-4 mr-1" />
                          进入编辑
                        </Button>
                      </Link>
                      <Link href={`/api/project/${project.id}/export`} className="flex-1" target="_blank">
                        <Button variant="outline" className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50" size="sm">
                          导出 JSON
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
