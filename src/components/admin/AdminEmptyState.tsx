"use client";

import { Inbox } from "lucide-react";
import type { AdminEmptyStateProps } from "@/types/admin";

/**
 * 管理后台通用空状态组件
 *
 * 使用示例：
 * ```tsx
 * <AdminEmptyState
 *   title="暂无数据"
 *   description="当前没有任何记录"
 *   action={<Button onClick={handleCreate}>创建第一个</Button>}
 * />
 * ```
 */
export function AdminEmptyState({
  icon,
  title,
  description,
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-muted-foreground">
        {icon || <Inbox className="h-12 w-12" />}
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
