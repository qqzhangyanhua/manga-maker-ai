"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Workflow as WorkflowIcon, RotateCcw, XCircle, RefreshCw } from "lucide-react";
import { useAdminList } from "@/hooks/admin";
import {
  AdminPagination,
  AdminEmptyState,
} from "@/components/admin";
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
import type { Workflow, WorkflowWithUser, WorkflowFilter } from "./types";
import {
  WORKFLOW_TYPES,
  WORKFLOW_STATUS,
  getTypeLabel,
  getStatusStyle,
  getStepLabel,
} from "./types";
import type { UserBrief } from "@/types/admin";

/**
 * 工作流管理页面
 */
export default function WorkflowsPage() {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
  } = useAdminList<Workflow, WorkflowFilter>({
    endpoint: "/api/admin/workflows",
    initialFilter: {},
    initialPageSize: 20,
  });

  const allUsers = (extra.allUsers || []) as UserBrief[];

  const workflowsWithUser: WorkflowWithUser[] = useMemo(() => {
    const userMap = (extra.userMap || {}) as Record<string, UserBrief>;
    return items.map((workflow) => ({
      ...workflow,
      user: userMap[workflow.user_id],
    }));
  }, [items, extra.userMap]);

  // 执行工作流操作
  const handleAction = async (id: string, action: "cancel" | "retry") => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "操作失败");
      }

      toast({ title: result.message || "操作成功" });
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <WorkflowIcon className="w-12 h-12 text-primary drop-shadow-md" />
            工作流管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            监控和管理自动化工作流任务
          </p>
          <div className="absolute top-0 right-0 z-20 flex gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="bg-background">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回后台
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-5 comic-card bg-card space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
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
              <Label htmlFor="type" className="text-xs">类型</Label>
              <Select
                value={filter.type || "all"}
                onValueChange={(value) => setFilter({ ...filter, type: value === "all" ? undefined : value })}
                disabled={loading}
              >
                <SelectTrigger id="type" className="h-9">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {WORKFLOW_TYPES.map((t) => (
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
                  {WORKFLOW_STATUS.map((s) => (
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
        </div>

        <div className="p-5 comic-card bg-card overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : workflowsWithUser.length === 0 ? (
            <AdminEmptyState
              icon={<WorkflowIcon className="h-12 w-12" />}
              title="暂无工作流"
              description="当前筛选条件下没有找到任何工作流"
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">类型</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                    <TableHead className="w-[100px]">当前步骤</TableHead>
                    <TableHead className="w-[150px]">进度</TableHead>
                    <TableHead className="w-[150px]">用户</TableHead>
                    <TableHead className="w-[150px]">创建时间</TableHead>
                    <TableHead className="w-[200px]">错误信息</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflowsWithUser.map((workflow) => {
                    const statusStyle = getStatusStyle(workflow.status);
                    const canCancel = workflow.status === "pending" || workflow.status === "running";
                    const canRetry = workflow.status === "failed";

                    return (
                      <TableRow key={workflow.id}>
                        <TableCell>{getTypeLabel(workflow.type)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyle.color}`}>
                            {statusStyle.label}
                          </span>
                        </TableCell>
                        <TableCell>{getStepLabel(workflow.current_step)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={workflow.progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-8">
                              {workflow.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate">
                            {workflow.user?.name || workflow.user?.email || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(workflow.created_at).toLocaleString("zh-CN")}
                        </TableCell>
                        <TableCell>
                          {workflow.error ? (
                            <span className="text-xs text-red-600 truncate block max-w-[190px]" title={workflow.error}>
                              {workflow.error}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canCancel && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-600"
                                onClick={() => handleAction(workflow.id, "cancel")}
                                disabled={actionLoading === workflow.id}
                                title="取消"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {canRetry && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600"
                                onClick={() => handleAction(workflow.id, "retry")}
                                disabled={actionLoading === workflow.id}
                                title="重试"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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
      </div>
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
            <TableHead className="w-[100px]">当前步骤</TableHead>
            <TableHead className="w-[150px]">进度</TableHead>
            <TableHead className="w-[150px]">用户</TableHead>
            <TableHead className="w-[150px]">创建时间</TableHead>
            <TableHead className="w-[200px]">错误信息</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
              <TableCell><Skeleton className="h-2 w-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
              <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
