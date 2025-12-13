"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, AlertCircle } from "lucide-react";
import { AdminEmptyState } from "@/components/admin";
import type { LogTableProps } from "../types";
import {
  getActionLabel,
  getStatusStyle,
  getProviderTypeLabel,
  formatDuration,
} from "../types";

/**
 * 生成日志表格组件
 */
export function LogTable({ logs, loading, onViewDetail }: LogTableProps) {
  if (loading) {
    return <LogTableSkeleton />;
  }

  if (logs.length === 0) {
    return (
      <AdminEmptyState
        icon={<AlertCircle className="h-12 w-12" />}
        title="暂无日志数据"
        description="当前筛选条件下没有找到任何生成日志"
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">时间</TableHead>
            <TableHead className="w-[150px]">用户</TableHead>
            <TableHead className="w-[140px]">操作类型</TableHead>
            <TableHead className="w-[120px]">Provider</TableHead>
            <TableHead className="w-[80px]">状态</TableHead>
            <TableHead className="w-[80px]">耗时</TableHead>
            <TableHead className="w-[200px]">错误信息</TableHead>
            <TableHead className="w-[80px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const statusStyle = getStatusStyle(log.status);
            return (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">
                  {new Date(log.created_at).toLocaleString("zh-CN")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm truncate max-w-[140px]">
                      {log.user?.name || log.user?.email || "-"}
                    </span>
                    {log.user?.name && (
                      <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {log.user.email}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{getActionLabel(log.action)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {log.provider_type
                      ? getProviderTypeLabel(log.provider_type)
                      : "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyle.color}`}
                  >
                    {statusStyle.label}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatDuration(log.duration_ms)}
                </TableCell>
                <TableCell>
                  {log.error_message ? (
                    <span
                      className="text-xs text-red-600 truncate block max-w-[190px]"
                      title={log.error_message}
                    >
                      {log.error_message}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onViewDetail(log)}
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * 表格骨架屏
 */
function LogTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">时间</TableHead>
            <TableHead className="w-[150px]">用户</TableHead>
            <TableHead className="w-[140px]">操作类型</TableHead>
            <TableHead className="w-[120px]">Provider</TableHead>
            <TableHead className="w-[80px]">状态</TableHead>
            <TableHead className="w-[80px]">耗时</TableHead>
            <TableHead className="w-[200px]">错误信息</TableHead>
            <TableHead className="w-[80px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-[160px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-[120px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-[100px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-[80px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-[50px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-[50px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-[150px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
