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
import { RotateCcw } from "lucide-react";
import type { LogFilterBarProps, GenerationLogFilter } from "../types";
import { LOG_ACTIONS, LOG_STATUS, PROVIDER_TYPES } from "../types";

/**
 * 生成日志过滤栏组件
 */
export function LogFilterBar({
  filter,
  onFilterChange,
  users,
  loading,
}: LogFilterBarProps) {
  const handleChange = (key: keyof GenerationLogFilter, value: string) => {
    onFilterChange({
      ...filter,
      [key]: value || undefined,
    });
  };

  const handleReset = () => {
    onFilterChange({});
  };

  return (
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

      {/* 操作类型筛选 */}
      <div className="space-y-2">
        <Label htmlFor="action" className="text-xs">
          操作类型
        </Label>
        <Select
          value={filter.action || "all"}
          onValueChange={(value) => handleChange("action", value === "all" ? "" : value)}
          disabled={loading}
        >
          <SelectTrigger id="action" className="h-9">
            <SelectValue placeholder="全部操作" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部操作</SelectItem>
            {LOG_ACTIONS.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 状态筛选 */}
      <div className="space-y-2">
        <Label htmlFor="status" className="text-xs">
          状态
        </Label>
        <Select
          value={filter.status || "all"}
          onValueChange={(value) => handleChange("status", value === "all" ? "" : value)}
          disabled={loading}
        >
          <SelectTrigger id="status" className="h-9">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {LOG_STATUS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Provider 类型筛选 */}
      <div className="space-y-2">
        <Label htmlFor="providerType" className="text-xs">
          Provider 类型
        </Label>
        <Select
          value={filter.providerType || "all"}
          onValueChange={(value) => handleChange("providerType", value === "all" ? "" : value)}
          disabled={loading}
        >
          <SelectTrigger id="providerType" className="h-9">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {PROVIDER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
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

      {/* 结束日期 + 重置按钮 */}
      <div className="space-y-2">
        <Label htmlFor="endDate" className="text-xs">
          结束日期
        </Label>
        <div className="flex gap-2">
          <Input
            id="endDate"
            type="date"
            value={filter.endDate || ""}
            onChange={(e) => handleChange("endDate", e.target.value)}
            disabled={loading}
            className="h-9 flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleReset}
            disabled={loading}
            title="重置筛选"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
