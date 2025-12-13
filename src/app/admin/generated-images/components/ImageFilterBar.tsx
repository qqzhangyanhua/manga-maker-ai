"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";
import type { ImageFilterBarProps, GeneratedImageFilter } from "../types";
import { SOURCE_TYPES, STYLE_OPTIONS } from "../types";

/**
 * 图片过滤栏组件
 */
export function ImageFilterBar({
  filter,
  onFilterChange,
  users,
  loading,
  selectedCount,
  onBatchDelete,
}: ImageFilterBarProps) {
  const handleChange = (key: keyof GeneratedImageFilter, value: string) => {
    onFilterChange({
      ...filter,
      [key]: value || undefined,
    });
  };

  const handleReset = () => {
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 p-4 bg-muted/30 rounded-lg">
        {/* 用户筛选 */}
        <div className="space-y-2">
          <Label htmlFor="userId" className="text-xs">
            用户
          </Label>
          <Select
            value={filter.userId || "all"}
            onValueChange={(value) => handleChange("userId", value === "all" ? "" : value)}
            disabled={loading}
          >
            <SelectTrigger id="userId" className="h-9">
              <SelectValue placeholder="全部用户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 来源类型筛选 */}
        <div className="space-y-2">
          <Label htmlFor="sourceType" className="text-xs">
            来源类型
          </Label>
          <Select
            value={filter.sourceType || "all"}
            onValueChange={(value) => handleChange("sourceType", value === "all" ? "" : value)}
            disabled={loading}
          >
            <SelectTrigger id="sourceType" className="h-9">
              <SelectValue placeholder="全部来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              {SOURCE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 风格筛选 */}
        <div className="space-y-2">
          <Label htmlFor="style" className="text-xs">
            风格
          </Label>
          <Select
            value={filter.style || "all"}
            onValueChange={(value) => handleChange("style", value === "all" ? "" : value)}
            disabled={loading}
          >
            <SelectTrigger id="style" className="h-9">
              <SelectValue placeholder="全部风格" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部风格</SelectItem>
              {STYLE_OPTIONS.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 开始日期 */}
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-xs">
            开始日期
          </Label>
          <Input
            id="startDate"
            type="date"
            value={filter.startDate || ""}
            onChange={(e) => handleChange("startDate", e.target.value)}
            disabled={loading}
            className="h-9"
          />
        </div>

        {/* 结束日期 */}
        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-xs">
            结束日期
          </Label>
          <Input
            id="endDate"
            type="date"
            value={filter.endDate || ""}
            onChange={(e) => handleChange("endDate", e.target.value)}
            disabled={loading}
            className="h-9"
          />
        </div>

        {/* 操作按钮 */}
        <div className="space-y-2">
          <Label className="text-xs invisible">操作</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleReset}
              disabled={loading}
              title="重置筛选"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            {selectedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-9"
                onClick={onBatchDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除 ({selectedCount})
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
