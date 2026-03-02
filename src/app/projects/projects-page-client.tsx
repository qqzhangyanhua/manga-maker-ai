"use client";

import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectHeader } from "@/components/projects/project-header";
import { Project } from "@/components/projects/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ProjectsPageClientProps {
  initialProjects: Project[];
}

export function ProjectsPageClient({ initialProjects }: ProjectsPageClientProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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

  const handleRenameProject = useCallback(
    (projectId: string, currentTitle: string) => {
      setRenameTarget({ id: projectId, title: currentTitle });
      setRenameTitle(currentTitle);
    },
    []
  );

  const handleRenameSubmit = useCallback(async () => {
    if (!renameTarget) return;
    const normalizedTitle = renameTitle.trim();
    if (!normalizedTitle || normalizedTitle === renameTarget.title) {
      setRenameTarget(null);
      return;
    }

    setRenameSubmitting(true);
    try {
      const res = await fetch(`/api/project/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: normalizedTitle }),
      });
      if (!res.ok) throw new Error("重命名失败");
      toast({ title: "重命名成功" });
      setRenameTarget(null);
      await fetchProjects();
    } catch (error) {
      toast({
        title: "重命名失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setRenameSubmitting(false);
    }
  }, [renameTarget, renameTitle, toast, fetchProjects]);

  const handleDeleteProject = useCallback((projectId: string) => {
    setDeleteTargetId(projectId);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTargetId) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/project/${deleteTargetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除失败");
      toast({ title: "删除成功" });
      setDeleteTargetId(null);
      await fetchProjects();
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteTargetId, toast, fetchProjects]);

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (project) =>
          project.title?.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query)
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
    );
  }, [projects, searchQuery]);

  return (
    <>
      <ProjectHeader
        onSearchChange={setSearchQuery}
        onRefresh={fetchProjects}
        isRefreshing={loading}
      />

      <ProjectList
        projects={filteredProjects}
        loading={loading}
        onRename={handleRenameProject}
        onDelete={handleDeleteProject}
      />

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open && !renameSubmitting) {
            setRenameTarget(null);
          }
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>重命名作品</DialogTitle>
            <DialogDescription className="text-zinc-400">
              输入新的作品名称，确认后立即生效。
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            placeholder="请输入新名称"
            disabled={renameSubmitting}
            className="bg-zinc-900 border-zinc-800 text-zinc-100"
            maxLength={200}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={renameSubmitting}
              className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleRenameSubmit}
              disabled={renameSubmitting || !renameTitle.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {renameSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open && !deleteSubmitting) {
            setDeleteTargetId(null);
          }
        }}
      >
        <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>删除作品</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              删除后无法恢复，相关分镜与内容会一并移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteSubmitting}
              className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSubmitting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
