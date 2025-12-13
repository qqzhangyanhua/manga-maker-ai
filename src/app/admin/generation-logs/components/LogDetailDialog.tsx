"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LogDetailDialogProps } from "../types";
import {
  getActionLabel,
  getStatusStyle,
  getProviderTypeLabel,
  formatDuration,
} from "../types";

/**
 * 生成日志详情对话框组件
 */
export function LogDetailDialog({
  open,
  log,
  onOpenChange,
}: LogDetailDialogProps) {
  if (!log) return null;

  const statusStyle = getStatusStyle(log.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>日志详情</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoItem
              label="操作类型"
              value={getActionLabel(log.action)}
            />
            <InfoItem
              label="状态"
              value={
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyle.color}`}
                >
                  {statusStyle.label}
                </span>
              }
            />
            <InfoItem
              label="Provider"
              value={
                log.provider_type
                  ? getProviderTypeLabel(log.provider_type)
                  : "-"
              }
            />
            <InfoItem
              label="耗时"
              value={formatDuration(log.duration_ms)}
            />
            <InfoItem
              label="用户"
              value={log.user?.name || log.user?.email || "-"}
            />
            <InfoItem
              label="时间"
              value={new Date(log.created_at).toLocaleString("zh-CN")}
            />
            <InfoItem
              label="项目 ID"
              value={log.project_id || "-"}
              className="col-span-2"
            />
          </div>

          {/* 错误信息 */}
          {log.error_message && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-xs font-medium text-red-800 mb-1">
                错误信息
              </div>
              <div className="text-sm text-red-700 font-mono whitespace-pre-wrap">
                {log.error_message}
              </div>
            </div>
          )}

          {/* Payload 详情 */}
          <Tabs defaultValue="request" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="request">请求 Payload</TabsTrigger>
              <TabsTrigger value="response">响应 Payload</TabsTrigger>
            </TabsList>
            <TabsContent value="request" className="mt-2">
              <PayloadViewer data={log.request_payload} />
            </TabsContent>
            <TabsContent value="response" className="mt-2">
              <PayloadViewer data={log.response_payload} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 信息项组件
 */
interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

function InfoItem({ label, value, className = "" }: InfoItemProps) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

/**
 * Payload 查看器组件
 */
interface PayloadViewerProps {
  data: Record<string, unknown> | null;
}

function PayloadViewer({ data }: PayloadViewerProps) {
  if (!data) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-md">
        无数据
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] rounded-md border">
      <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </ScrollArea>
  );
}
