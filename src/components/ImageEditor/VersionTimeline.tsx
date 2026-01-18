"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { CanvasSchema } from "@/components/ImageEditor/CanvasWorkspace";

export type EditorVersion = {
  id: string;
  label: string;
  sourceType: "original" | "optimize" | "layout" | "upload";
  status: "pending" | "completed" | "failed";
  thumbnail: string;
  createdAt: Date;
  taskId?: string | null;
  canvasSchema?: CanvasSchema | null;
};

type VersionTimelineProps = {
  versions: EditorVersion[];
  activeId: string | null;
  loadingId: string | null;
  onSelect: (version: EditorVersion) => void;
  statusFilter: "all" | "pending" | "completed" | "failed";
  sortOrder: "desc" | "asc";
  onStatusFilterChange: (status: "all" | "pending" | "completed" | "failed") => void;
  onSortOrderChange: (order: "desc" | "asc") => void;
};

const typeLabels: Record<EditorVersion["sourceType"], string> = {
  original: "原始生成",
  optimize: "AI 优化",
  layout: "分格编辑",
  upload: "手动上传",
};

const statusLabels: Record<EditorVersion["status"], string> = {
  pending: "处理中",
  completed: "已完成",
  failed: "失败",
};

const statusColor: Record<EditorVersion["status"], string> = {
  pending: "text-primary",
  completed: "text-green-500",
  failed: "text-destructive",
};

const VersionTimeline = ({
  versions,
  activeId,
  loadingId,
  onSelect,
  statusFilter,
  sortOrder,
  onStatusFilterChange,
  onSortOrderChange,
}: VersionTimelineProps) => {
  const filtered = versions.filter((version) => (statusFilter === "all" ? true : version.status === statusFilter));
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === "desc") {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return (
    <div className="border border-border rounded-xl p-4 bg-card/70 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">版本时间线</p>
          <p className="text-xs text-muted-foreground">记录每一次调整，可随时回退</p>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} 个版本</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            if (value === "all" || value === "pending" || value === "completed" || value === "failed") {
              onStatusFilterChange(value);
            }
          }}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">处理中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortOrder}
          onValueChange={(value) => {
            if (value === "desc" || value === "asc") {
              onSortOrderChange(value);
            }
          }}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">最新在前</SelectItem>
            <SelectItem value="asc">最早在前</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {sorted.map((version) => {
          const isLoading = loadingId === version.id || version.status === "pending";
          const isActive = activeId === version.id;
          return (
            <button
              key={version.id}
              onClick={() => onSelect(version)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg border px-2 py-2 text-left transition-all",
                isActive ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
                isLoading && "cursor-progress"
              )}
            >
              <div className="relative w-16 h-16 rounded-md overflow-hidden border border-border bg-muted">
                <Image src={version.thumbnail} alt={version.label} fill className="object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{version.label}</p>
                  <span className={cn("text-[11px] font-medium", statusColor[version.status])}>
                    {isLoading && version.status === "pending" ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        处理中
                      </span>
                    ) : (
                      statusLabels[version.status]
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{typeLabels[version.sourceType]}</p>
                <p className="text-[11px] text-muted-foreground/80">
                  {format(version.createdAt, "MM-dd HH:mm")}
                </p>
              </div>
              {isActive ? (
                <span className="text-xs text-primary font-medium">使用中</span>
              ) : (
                <Button variant="ghost" size="sm" className="text-xs" disabled={isLoading}>
                  设为当前
                </Button>
              )}
            </button>
          );
        })}
      </div>
      {versions.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6">暂无版本，先上传或生成一张图吧</div>
      )}
    </div>
  );
};

export default VersionTimeline;
