"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FileClock, RefreshCw } from "lucide-react";
import { useAdminList } from "@/hooks/admin";
import { AdminPagination } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { LogFilterBar, LogTable, LogDetailDialog } from "./components";
import type {
  GenerationLog,
  GenerationLogWithUser,
  GenerationLogFilter,
} from "./types";
import type { UserBrief } from "@/types/admin";

/**
 * 生成日志管理页面
 *
 * 功能：
 * - 查看所有 AI 生成调用日志
 * - 按用户、操作类型、状态、时间过滤
 * - 查看请求/响应 payload 详情
 * - 错误日志高亮显示
 */
export default function GenerationLogsPage() {
  // 详情对话框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<GenerationLogWithUser | null>(null);

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
    extra,
    refetch,
  } = useAdminList<GenerationLog, GenerationLogFilter>({
    endpoint: "/api/admin/generation-logs",
    initialFilter: {},
    initialPageSize: 20,
  });

  // 从 extra 中获取用户列表
  const allUsers = (extra.allUsers || []) as UserBrief[];

  // 将日志数据与用户信息合并
  const logsWithUser: GenerationLogWithUser[] = useMemo(() => {
    const userMap = (extra.userMap || {}) as Record<string, UserBrief>;
    return items.map((log) => ({
      ...log,
      user: userMap[log.user_id],
    }));
  }, [items, extra.userMap]);

  // 查看详情
  const handleViewDetail = (log: GenerationLogWithUser) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <FileClock className="w-12 h-12 text-primary drop-shadow-md" />
            生成日志
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            查看和监控所有 AI 生成调用的日志记录
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
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              刷新列表
            </Button>
          </div>

          <LogFilterBar
            filter={filter}
            onFilterChange={setFilter}
            users={allUsers}
            loading={loading}
          />

          <div className="border border-border rounded-lg overflow-hidden">
            <LogTable
              logs={logsWithUser}
              loading={loading}
              onViewDetail={handleViewDetail}
            />
          </div>

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

        {/* 详情对话框 */}
        <LogDetailDialog
          open={detailDialogOpen}
          log={selectedLog}
          onOpenChange={setDetailDialogOpen}
        />
      </div>
    </div>
  );
}
