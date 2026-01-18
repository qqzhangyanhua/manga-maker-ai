/**
 * 版本过滤器组件
 * 提供版本搜索和多条件过滤功能
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { novelTheme } from "../../theme";
import { cn } from "@/lib/utils";

export interface VersionFilterOptions {
  searchQuery: string;
  minScore: number | null;
  maxScore: number | null;
  startDate: Date | null;
  endDate: Date | null;
  sortBy: "created_desc" | "created_asc" | "score_desc" | "score_asc" | "version_desc" | "version_asc";
}

interface VersionFilterProps {
  filters: VersionFilterOptions;
  onFilterChange: (filters: VersionFilterOptions) => void;
  totalCount: number;
  filteredCount: number;
}

export function VersionFilter({
  filters,
  onFilterChange,
  totalCount,
  filteredCount,
}: VersionFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (updates: Partial<VersionFilterOptions>) => {
    onFilterChange({ ...filters, ...updates });
  };

  const resetFilters = () => {
    onFilterChange({
      searchQuery: "",
      minScore: null,
      maxScore: null,
      startDate: null,
      endDate: null,
      sortBy: "created_desc",
    });
    setIsExpanded(false);
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.minScore !== null ||
    filters.maxScore !== null ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.sortBy !== "created_desc";

  return (
    <GlassCard className="p-4 space-y-4">
      {/* 基础搜索栏 */}
      <div className="flex items-center gap-3">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="搜索版本号或备注..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter({ searchQuery: e.target.value })}
            className={cn("pl-10", novelTheme.input.base)}
          />
        </div>

        {/* 排序选择 */}
        <Select
          value={filters.sortBy}
          onValueChange={(value) =>
            updateFilter({ sortBy: value as VersionFilterOptions["sortBy"] })
          }
        >
          <SelectTrigger className={cn("w-[180px]", novelTheme.input.base)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">最新创建</SelectItem>
            <SelectItem value="created_asc">最早创建</SelectItem>
            <SelectItem value="score_desc">评分最高</SelectItem>
            <SelectItem value="score_asc">评分最低</SelectItem>
            <SelectItem value="version_desc">版本号降序</SelectItem>
            <SelectItem value="version_asc">版本号升序</SelectItem>
          </SelectContent>
        </Select>

        {/* 高级筛选按钮 */}
        <Button
          variant={isExpanded ? "default" : "outline"}
          size="default"
          onClick={() => setIsExpanded(!isExpanded)}
          className={
            isExpanded
              ? `${novelTheme.primary.base} ${novelTheme.primary.hover}`
              : hasActiveFilters
                ? `border-purple-600 ${novelTheme.primary.text} hover:bg-purple-900/20`
                : "border-purple-500/20 text-zinc-400 hover:bg-purple-500/10 hover:text-purple-300"
          }
        >
          <Filter className="h-4 w-4 mr-2" />
          高级筛选
          {hasActiveFilters && (
            <span className={`ml-2 px-1.5 py-0.5 text-xs ${novelTheme.primary.base} rounded-full`}>
              !
            </span>
          )}
        </Button>

        {/* 重置按钮 */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={resetFilters}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 高级筛选面板 */}
      {isExpanded && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
          {/* 评分范围 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              评分范围
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="最低分"
                min={0}
                max={100}
                value={filters.minScore ?? ""}
                onChange={(e) =>
                  updateFilter({
                    minScore: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className={novelTheme.input.base}
              />
              <span className="text-zinc-500">~</span>
              <Input
                type="number"
                placeholder="最高分"
                min={0}
                max={100}
                value={filters.maxScore ?? ""}
                onChange={(e) =>
                  updateFilter({
                    maxScore: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className={novelTheme.input.base}
              />
            </div>
          </div>

          {/* 日期范围 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              创建日期
            </label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("flex-1 justify-start text-left font-normal hover:bg-purple-500/10", novelTheme.input.base)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-zinc-500" />
                    {filters.startDate ? (
                      format(filters.startDate, "PPP", { locale: zhCN })
                    ) : (
                      <span className="text-zinc-500">开始日期</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate ?? undefined}
                    onSelect={(date) => updateFilter({ startDate: date ?? null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-zinc-500">~</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("flex-1 justify-start text-left font-normal hover:bg-purple-500/10", novelTheme.input.base)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-zinc-500" />
                    {filters.endDate ? (
                      format(filters.endDate, "PPP", { locale: zhCN })
                    ) : (
                      <span className="text-zinc-500">结束日期</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate ?? undefined}
                    onSelect={(date) => updateFilter({ endDate: date ?? null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="flex items-center justify-between text-sm text-zinc-400 pt-2 border-t border-zinc-800">
        <span>
          显示 {filteredCount} / {totalCount} 个版本
        </span>
        {hasActiveFilters && (
          <Button
            variant="link"
            size="sm"
            onClick={resetFilters}
            className="text-blue-400 hover:text-blue-300 h-auto p-0"
          >
            清除所有筛选
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
