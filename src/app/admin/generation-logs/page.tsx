"use client";

import { useState, useMemo } from "react";
import { useAdminList } from "@/hooks/admin";
import { AdminPagination } from "@/components/admin";
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
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">生成日志</h1>
        <p className="text-muted-foreground mt-1">
          查看和监控所有 AI 生成调用的日志记录
        </p>
      </div>

      {/* 过滤栏 */}
      <LogFilterBar
        filter={filter}
        onFilterChange={setFilter}
        users={allUsers}
        loading={loading}
      />

      {/* 日志表格 */}
      <LogTable
        logs={logsWithUser}
        loading={loading}
        onViewDetail={handleViewDetail}
      />

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

      {/* 详情对话框 */}
      <LogDetailDialog
        open={detailDialogOpen}
        log={selectedLog}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
