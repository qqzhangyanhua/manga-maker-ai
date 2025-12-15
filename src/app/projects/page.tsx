"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowLeft, BookOpen, Grid3X3, Loader2, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-bold text-3xl text-white">分镜项目</h1>
              <p className="text-zinc-400">管理已生成的分镜项目，继续编辑或导出</p>
            </div>
            <div className="flex gap-2">
              <Link href="/storyboard">
                <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600">
                  <Sparkles className="w-4 h-4 mr-1" />
                  新建分镜
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={fetchProjects} disabled={loading} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600">
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
            <div className="border border-dashed border-zinc-800 rounded-lg p-10 text-center text-zinc-400">
              暂无分镜项目，先去生成一个吧
            </div>
          )}

          {!loading && sortedProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedProjects.map((project) => {
                const generatedCount = project.panels.filter((p) => p.generated_image).length;
                const panelCount = project.panels.length;
                return (
                  <div key={project.id} className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-all flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                          <Grid3X3 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-white line-clamp-1">{project.title || "未命名项目"}</div>
                          <div className="text-xs text-zinc-500">
                            {project.style || "未设置风格"} ｜ {project.status || "draft"}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {project.updated_at
                          ? format(new Date(project.updated_at), "MM-dd HH:mm", { locale: zhCN })
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-3 min-h-[48px]">
                      {project.description || "无描述"}
                    </p>
                    <div className="text-xs text-zinc-500 flex items-center gap-3">
                      <span>分镜数：{panelCount}</span>
                      <span>已出图：{generatedCount}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/storyboard/editor/${project.id}`} className="flex-1">
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" size="sm">
                          <BookOpen className="w-4 h-4 mr-1" />
                          进入编辑
                        </Button>
                      </Link>
                      <Link href={`/api/project/${project.id}/export`} className="flex-1" target="_blank">
                        <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600" size="sm">
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
      </main>
    </div>
  );
}
