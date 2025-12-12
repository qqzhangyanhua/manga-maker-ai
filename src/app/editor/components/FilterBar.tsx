import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterBarProps } from "../types";

export const FilterBar = ({
  projectId,
  taskId,
  page,
  totalPages,
  total,
  pageSize,
  listLoading,
  onProjectIdChange,
  onTaskIdChange,
  onApply,
  onReset,
  onRefresh,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
}: FilterBarProps) => {
  return (
    <div className="border border-border rounded-xl p-4 bg-card/70 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">过滤与分页</p>
        <span className="text-xs text-muted-foreground">更精确地定位版本</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="项目 ID（可选）"
          value={projectId}
          onChange={(e) => onProjectIdChange(e.target.value)}
        />
        <Input
          placeholder="任务 ID（可选）"
          value={taskId}
          onChange={(e) => onTaskIdChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onApply}>
          应用筛选
        </Button>
        <Button size="sm" variant="outline" onClick={onReset}>
          重置
        </Button>
        <Button size="sm" variant="ghost" onClick={onRefresh} disabled={listLoading}>
          {listLoading ? "刷新中..." : "刷新列表"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          共 {total} 个版本
          {listLoading && <span> · 加载中</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onPrevPage} disabled={page <= 1}>
            上一页
          </Button>
          <span className="text-xs text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          <Button size="sm" variant="outline" onClick={onNextPage} disabled={page >= totalPages}>
            下一页
          </Button>
          <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="每页条数" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  每页 {size} 条
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
