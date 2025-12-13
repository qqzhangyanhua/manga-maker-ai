"use client";

import { useState, useMemo } from "react";
import { useAdminList } from "@/hooks/admin";
import { AdminPagination, AdminEmptyState } from "@/components/admin";
import { useToast } from "@/hooks/use-toast";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, XCircle, ListTodo } from "lucide-react";
import type { GenerationTask, GenerationTaskWithUser, GenerationTaskFilter } from "./types";
import { TASK_TYPES, TASK_STATUS, getTaskTypeLabel, getStatusStyle } from "./types";
import type { UserBrief } from "@/types/admin";

/**
 * 生成任务管理页面
 */
export default function GenerationTasksPage() {
  const { toast } = useToast();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

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
  } = useAdminList<GenerationTask, GenerationTaskFilter>({
    endpoint: "/api/admin/generation-tasks",
    initialFilter: {},
    initialPageSize: 20,
  });

  const allUsers = (extra.allUsers || []) as UserBrief[];

  const tasksWithUser: GenerationTaskWithUser[] = useMemo(() => {
    const userMap = (extra.userMap || {}) as Record<string, UserBrief>;
    return items.map((task) => ({
      ...task,
      user: userMap[task.user_id],
    }));
  }, [items, extra.userMap]);

  // 取消任务
  const handleCancel = async (id: string) => {
    setCancelingId(id);
    try {
      const response = await fetch(`/api/admin/generation-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "取消失败");
      }

      toast({ title: result.message || "任务已取消" });
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "取消失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">生成任务</h1>
        <p className="text-muted-foreground mt-1">
          监控批量图片生成任务队列
        </p>
      </div>

      {/* 过滤栏 */}
      <div className="grid gap-4 md:grid-cols-4 p-4 bg-muted/30 rounded-lg">
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
          <Label htmlFor="taskType" className="text-xs">类型</Label>
          <Select
            value={filter.taskType || "all"}
            onValueChange={(value) => setFilter({ ...filter, taskType: value === "all" ? undefined : value })}
            disabled={loading}
          >
            <SelectTrigger id="taskType" className="h-9">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {TASK_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
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
              {TASK_STATUS.map((s) => (
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
      ) : tasksWithUser.length === 0 ? (
        <AdminEmptyState
          icon={<ListTodo className="h-12 w-12" />}
          title="暂无生成任务"
          description="当前筛选条件下没有找到任何生成任务"
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">类型</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[80px]">面板数</TableHead>
                <TableHead className="w-[150px]">进度</TableHead>
                <TableHead className="w-[150px]">用户</TableHead>
                <TableHead className="w-[150px]">创建时间</TableHead>
                <TableHead className="w-[150px]">完成时间</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasksWithUser.map((task) => {
                const statusStyle = getStatusStyle(task.status);
                const canCancel = task.status === "pending" || task.status === "processing";

                return (
                  <TableRow key={task.id}>
                    <TableCell>{getTaskTypeLabel(task.task_type)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyle.color}`}>
                        {statusStyle.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {task.current_panel_index}/{task.panel_ids.length}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={task.progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">
                          {task.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate">
                        {task.user?.name || task.user?.email || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(task.created_at).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {task.completed_at
                        ? new Date(task.completed_at).toLocaleString("zh-CN")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-orange-600"
                          onClick={() => handleCancel(task.id)}
                          disabled={cancelingId === task.id}
                          title="取消"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
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
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">类型</TableHead>
            <TableHead className="w-[80px]">状态</TableHead>
            <TableHead className="w-[80px]">面板数</TableHead>
            <TableHead className="w-[150px]">进度</TableHead>
            <TableHead className="w-[150px]">用户</TableHead>
            <TableHead className="w-[150px]">创建时间</TableHead>
            <TableHead className="w-[150px]">完成时间</TableHead>
            <TableHead className="w-[80px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
              <TableCell><Skeleton className="h-2 w-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
