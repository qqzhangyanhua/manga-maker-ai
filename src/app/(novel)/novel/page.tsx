/**
 * 小说项目列表页面
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Clock, FileText, Sparkles, ImageIcon, Wand2 } from "lucide-react";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { InspirationModeDialog } from "./components/InspirationModeDialog";

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
  const [projects, setProjects] = useState<NovelProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inspirationDialogOpen, setInspirationDialogOpen] = useState(false);
  const [generatingCover, setGeneratingCover] = useState<string | null>(null); // 正在生成封面的项目ID

  useEffect(() => {
    fetchProjects();
  }, []);

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
    event.stopPropagation(); // 防止触发项目点击

    try {
      setGeneratingCover(projectId);

      const response = await fetch(`/api/novel/projects/${projectId}/generate-cover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成封面失败");
      }

      const data = await response.json();

      // 更新本地项目列表中的封面
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, cover_image: data.cover_url } : p
        )
      );
    } catch (error) {
      console.error("生成封面失败:", error);
      alert(error instanceof Error ? error.message : "生成封面失败");
    } finally {
      setGeneratingCover(null);
    }
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      draft: { label: "草稿", variant: "outline" },
      writing: { label: "创作中", variant: "default" },
      completed: { label: "已完成", variant: "secondary" },
    };

    const config = statusMap[status] || statusMap.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的小说</h1>
          <p className="text-muted-foreground mt-2">
            使用 AI 辅助创作，让灵感变成精彩故事
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setInspirationDialogOpen(true)}
            size="lg"
            variant="outline"
            className="border-purple-200 hover:border-purple-300 hover:bg-purple-50"
          >
            <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
            灵感模式
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </Button>
        </div>
      </div>

      {/* 项目列表 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">还没有项目</h3>
            <p className="text-muted-foreground mb-6">
              创建你的第一个小说项目，开始创作之旅
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建项目
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              onClick={() => handleProjectClick(project.id)}
            >
              {/* 封面区域 */}
              <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                {project.cover_image ? (
                  <img
                    src={project.cover_image}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-2" />
                    <span className="text-sm">暂无封面</span>
                  </div>
                )}

                {/* 生成封面按钮 */}
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
              </div>

              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl line-clamp-1">
                    {project.title}
                  </CardTitle>
                  {getStatusBadge(project.status)}
                </div>
                {project.genre && (
                  <Badge variant="outline" className="w-fit">
                    {project.genre}
                  </Badge>
                )}
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {project.description || "暂无描述"}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{project.chapter_count} 章</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{project.total_words.toLocaleString()} 字</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                更新于 {new Date(project.updated_at).toLocaleDateString()}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* 创建项目对话框 */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchProjects();
        }}
      />

      {/* 灵感模式对话框 */}
      <InspirationModeDialog
        isOpen={inspirationDialogOpen}
        onClose={() => setInspirationDialogOpen(false)}
        onProjectCreated={(projectId) => {
          router.push(`/novel/${projectId}`);
        }}
      />
    </div>
  );
}
