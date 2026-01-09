import { cn } from "@/lib/utils";
import { BatchOperationBarProps } from "./types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Trash2, Loader2 } from "lucide-react";

export function BatchOperationBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBatchGenerate,
  onBatchDelete,
  isGenerating = false,
  generatingProgress,
  className,
}: BatchOperationBarProps) {
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isSomeSelected = selectedCount > 0 && selectedCount < totalCount;

  return (
    <div
      className={cn(
        "bg-[#1a1a1f]/90 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4",
        "flex items-center justify-between gap-4",
        "sticky top-20 z-10",
        className
      )}
    >
      {/* 左侧：选择控制 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            indeterminate={isSomeSelected}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectAll();
              } else {
                onDeselectAll();
              }
            }}
          />
          <span className="text-sm text-gray-400">
            {selectedCount > 0 ? (
              <>
                已选 <span className="text-white font-medium">{selectedCount}</span> / {totalCount}
              </>
            ) : (
              <>全选 ({totalCount})</>
            )}
          </span>
        </div>

        {selectedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="text-gray-400 hover:text-white h-8"
          >
            取消选择
          </Button>
        )}
      </div>

      {/* 右侧：批量操作 */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          {/* 生成进度 */}
          {isGenerating && generatingProgress && (
            <div className="flex items-center gap-2 text-sm text-orange-400 mr-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                正在生成 {generatingProgress.current}/{generatingProgress.total}
              </span>
            </div>
          )}

          {/* 批量生成按钮 */}
          {onBatchGenerate && (
            <Button
              size="sm"
              onClick={onBatchGenerate}
              disabled={isGenerating}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  批量生成 ({selectedCount})
                </>
              )}
            </Button>
          )}

          {/* 批量删除按钮 */}
          {onBatchDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBatchDelete}
              disabled={isGenerating}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除 ({selectedCount})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
