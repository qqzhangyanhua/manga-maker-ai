"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Landing";
import { useToast } from "@/hooks/use-toast";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectHeader } from "@/components/projects/project-header";
import { Project } from "@/components/projects/types";

export default function ProjectListPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title?.toLowerCase().includes(query) || 
        p.description?.toLowerCase().includes(query)
      );
    }
    
    // 排序：最新更新在前
    return result.sort((a, b) =>
      new Date(b.updated_at || b.created_at || 0).getTime() -
      new Date(a.updated_at || a.created_at || 0).getTime()
    );
  }, [projects, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <Navbar />
      
      {/* 装饰性背景 */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-orange-500/5 blur-[120px] pointer-events-none select-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] pointer-events-none select-none" />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <ProjectHeader 
            onSearchChange={setSearchQuery} 
            onRefresh={fetchProjects}
            isRefreshing={loading}
          />
          
          <ProjectList 
            projects={filteredProjects} 
            loading={loading} 
          />
        </div>
      </main>
    </div>
  );
}
