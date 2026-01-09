"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS } from "@/app/scripts/[id]/constants/characterRoles";
import { Sparkles } from "lucide-react";
import type { CharacterRecommendation } from "@/app/scripts/[id]/types/ai-recommendation";

export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "minor";

interface RoleSelectorProps {
  value: CharacterRole;
  onChange: (role: CharacterRole) => void;
  className?: string;
  disabled?: boolean;

  // Phase 2.1: AI 推荐支持
  recommendations?: CharacterRecommendation[];
  onRecommendationClick?: (recommendation: CharacterRecommendation) => void;
}

// 角色选项配置
const ROLE_OPTIONS = [
  {
    value: "protagonist" as CharacterRole,
    label: "主角",
    icon: "⭐",
    description: "故事的核心人物",
    colorClass: "from-orange-500 to-yellow-500",
    hoverClass: "hover:border-orange-500",
    activeClass: "border-orange-500 bg-orange-500/10",
  },
  {
    value: "antagonist" as CharacterRole,
    label: "反派",
    icon: "💀",
    description: "对抗主角的角色",
    colorClass: "from-red-500 to-pink-500",
    hoverClass: "hover:border-red-500",
    activeClass: "border-red-500 bg-red-500/10",
  },
  {
    value: "supporting" as CharacterRole,
    label: "配角",
    icon: "👥",
    description: "辅助剧情的角色",
    colorClass: "from-blue-500 to-cyan-500",
    hoverClass: "hover:border-blue-500",
    activeClass: "border-blue-500 bg-blue-500/10",
  },
  {
    value: "minor" as CharacterRole,
    label: "龙套",
    icon: "👤",
    description: "次要背景角色",
    colorClass: "from-gray-500 to-gray-600",
    hoverClass: "hover:border-gray-500",
    activeClass: "border-gray-500 bg-gray-500/10",
  },
];

/**
 * 角色类型选择器组件
 *
 * 用于在创建角色时选择角色类型（主角、反派、配角、龙套）
 * 提供视觉化的选择界面，避免用户创建后二次修改
 *
 * Phase 2.1: 支持 AI 推荐高亮显示
 */
export const RoleSelector = memo(function RoleSelector({
  value,
  onChange,
  className,
  disabled = false,
  recommendations = [],
  onRecommendationClick,
}: RoleSelectorProps) {
  // 获取角色的推荐信息
  const getRecommendation = (role: CharacterRole): CharacterRecommendation | undefined => {
    return recommendations.find((rec) => rec.role === role);
  };

  // 获取推荐优先级对应的样式
  const getRecommendationStyle = (priority: string): string => {
    switch (priority) {
      case "high":
        return "ring-2 ring-yellow-500 ring-offset-2 ring-offset-background animate-pulse";
      case "medium":
        return "ring-2 ring-blue-500 ring-offset-1 ring-offset-background";
      case "low":
        return "ring-1 ring-green-500";
      default:
        return "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-foreground">
        角色类型
      </label>

      <div className="grid grid-cols-2 gap-3">
        {ROLE_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const recommendation = getRecommendation(option.value);
          const isRecommended = !!recommendation;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (disabled) return;

                // 如果点击了推荐的角色，触发推荐回调
                if (isRecommended && onRecommendationClick) {
                  onRecommendationClick(recommendation);
                }

                onChange(option.value);
              }}
              disabled={disabled}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all",
                "flex flex-col items-center gap-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? option.activeClass
                  : "border-gray-700 bg-transparent",
                !disabled && !isSelected && option.hoverClass,
                // Phase 2.1: 推荐高亮
                isRecommended && getRecommendationStyle(recommendation.priority)
              )}
            >
              {/* 图标 */}
              <span className="text-3xl">{option.icon}</span>

              {/* 标签 */}
              <span className={cn(
                "font-semibold text-sm",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>

              {/* 描述 */}
              <span className="text-xs text-muted-foreground text-center">
                {option.description}
              </span>

              {/* 选中指示器 */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    "bg-gradient-to-r",
                    option.colorClass
                  )} />
                </div>
              )}

              {/* Phase 2.1: AI 推荐标识 */}
              {isRecommended && (
                <div className="absolute top-2 left-2">
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    recommendation.priority === "high" && "bg-yellow-500/20 text-yellow-500",
                    recommendation.priority === "medium" && "bg-blue-500/20 text-blue-500",
                    recommendation.priority === "low" && "bg-green-500/20 text-green-500"
                  )}>
                    <Sparkles className="w-3 h-3" />
                    <span>AI推荐</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Phase 2.1: 显示推荐理由 */}
      {recommendations.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-medium text-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-500" />
            AI 推荐理由
          </p>
          {recommendations.map((rec) => (
            <div
              key={rec.role}
              className={cn(
                "text-xs p-2 rounded-lg",
                rec.priority === "high" && "bg-yellow-500/10 text-yellow-500",
                rec.priority === "medium" && "bg-blue-500/10 text-blue-500",
                rec.priority === "low" && "bg-green-500/10 text-green-500"
              )}
            >
              <span className="font-medium">{getRoleLabel(rec.role)}</span>: {rec.reason}
            </div>
          ))}
        </div>
      )}

      {/* 提示文字 */}
      <p className="text-xs text-muted-foreground">
        💡 提示：角色类型会影响剧情权重和展示顺序，创建后仍可修改
      </p>
    </div>
  );
});

/**
 * 获取角色类型标签
 */
function getRoleLabel(role: CharacterRole): string {
  const labels: Record<CharacterRole, string> = {
    protagonist: "主角",
    antagonist: "反派",
    supporting: "配角",
    minor: "龙套",
  };
  return labels[role];
}

export default RoleSelector;
