"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useAdminList } from "@/hooks/admin";
import {
  AdminPagination,
  AdminDeleteDialog,
  AdminEmptyState,
} from "@/components/admin";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, Trash2, FolderKanban, ImageIcon } from "lucide-react";
import type { Project, ProjectWithUser, ProjectFilter } from "./types";
import { PROJECT_STATUS, getStatusStyle } from "./types";
import type { UserBrief } from "@/types/admin";

/**
 * 项目管理页面
 */
export default function ProjectsPage() {
  const { toast } = useToast();

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<ProjectWithUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 使用通用列表 hook
  const {
    items,
    loading,
    total,
    page,
    pageSize,
    totalPages,
    filter,
    setFilter,
    setPage,
    setPageSize,
    refetch,
    extra,
  } = useAdminList<Project, ProjectFilter>({
    endpoint: "/api/admin/projects",
    initialFilter: {},
    initialPageSize: 20,
  });

  const userMap = (extra.userMap || {}) as Record<string, UserBrief>;
  const allUsers = (extra.allUsers || []) as UserBrief[];

  const projectsWithUser: ProjectWithUser[] = useMemo(() => {
    return items.map((project) => ({
      ...project,
      user: userMap[project.user_id],
    }));
  }, [items, userMap]);

  // 删除操作
  const handleDelete = async () => {
    if (!deletingProject) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/projects/${deletingProject.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除失败");
      }

      toast({ title: result.message || "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingProject(null);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">项目管理</h1>
        <p className="text-muted-foreground mt-1">
          查看和管理所有用户的漫画项目
        </p>
      </div>

      {/* 过滤栏 */}
      <div className="grid gap-4 md:grid-cols-4 p-4 bg-muted/30 rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="keyword" className="text-xs">关键词</Label>
          <Input
            id="keyword"
            placeholder="搜索标题或描述"
            value={filter.keyword || ""}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value || undefined })}
            disabled={loading}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="userId" className="text-xs">用户</Label>
          <Select
            value={filter.userId || "all"}
            onValueChange={(value) => setFilter({ ...filter, userId: value === "all" ? undefined : value })}
            disabled={loading}
          >
            <SelectTrigger id="userId" className="h-9">
              <SelectValue placeholder="全部用户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户</SelectItem>
              {allUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status" className="text-xs">状态</Label>
          <Select
            value={filter.status || "all"}
            onValueChange={(value) => setFilter({ ...filter, status: value === "all" ? undefined : value })}
            disabled={loading}
          >
            <SelectTrigger id="status" className="h-9">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {PROJECT_STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs invisible">操作</Label>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setFilter({})}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 表格 */}
      {loading ? (
        <TableSkeleton />
      ) : projectsWithUser.length === 0 ? (
        <AdminEmptyState
          icon={<FolderKanban className="h-12 w-12" />}
          title="暂无项目"
          description="当前筛选条件下没有找到任何项目"
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">封面</TableHead>
                <TableHead>标题</TableHead>
                <TableHead className="w-[100px]">风格</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[150px]">用户</TableHead>
                <TableHead className="w-[80px]">面板数</TableHead>
                <TableHead className="w-[150px]">创建时间</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsWithUser.map((project) => {
                const statusStyle = getStatusStyle(project.status);
                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                        {project.cover_image ? (
                          <Image
                            src={project.cover_image}
                            alt={project.title}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{project.title}</div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{project.style || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyle.color}`}>
                        {statusStyle.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate">
                        {project.user?.name || project.user?.email || "-"}
                      </span>
                    </TableCell>
                    <TableCell>{project._count?.panels || 0}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(project.created_at).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setDeletingProject(project);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 分页 */}
      {total > 0 && (
        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* 删除确认 */}
      <AdminDeleteDialog
        open={deleteDialogOpen}
        title="删除确认"
        description={
          <>
            确定要删除项目 <strong>{deletingProject?.title}</strong> 吗？
            {deletingProject?._count?.panels ? (
              <span className="text-orange-600 block mt-2">
                警告：该项目包含 {deletingProject._count.panels} 个面板，将一并删除。
              </span>
            ) : null}
            <span className="block mt-2">此操作不可撤销。</span>
          </>
        }
        loading={deleting}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">封面</TableHead>
            <TableHead>标题</TableHead>
            <TableHead className="w-[100px]">风格</TableHead>
            <TableHead className="w-[80px]">状态</TableHead>
            <TableHead className="w-[150px]">用户</TableHead>
            <TableHead className="w-[80px]">面板数</TableHead>
            <TableHead className="w-[150px]">创建时间</TableHead>
            <TableHead className="w-[80px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="w-12 h-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
