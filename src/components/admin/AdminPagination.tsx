"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { AdminPaginationProps } from "@/types/admin";
import { PAGE_SIZE_OPTIONS } from "@/types/admin";

/**
 * 管理后台通用分页控制组件
 *
 * 使用示例：
 * ```tsx
 * <AdminPagination
 *   page={page}
 *   pageSize={pageSize}
 *   total={total}
 *   totalPages={totalPages}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 * />
 * ```
 */
export function AdminPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [...PAGE_SIZE_OPTIONS],
}: AdminPaginationProps) {
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          显示 {startItem}-{endItem} / 共 {total} 条
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-2 ml-4">
            <span>每页</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>条</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground mr-2">
          第 {page} / {totalPages || 1} 页
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
