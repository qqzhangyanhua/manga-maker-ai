/**
 * 质量评分卡片组件
 * 显示多维度质量评分和改进建议
 */
"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useState } from "react";
import type { QualityScore } from "../types/version";

interface QualityScoreCardProps {
  qualityScore: QualityScore;
  compact?: boolean;
}

export function QualityScoreCard({ qualityScore, compact = false }: QualityScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const dimensionLabels: Record<string, string> = {
    readability: "可读性",
    emotional_depth: "情感深度",
    pacing: "节奏把控",
    originality: "原创性",
    coherence: "逻辑连贯性",
  };

  const getDimensionColor = (score: number): string => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-orange-500";
    return "bg-red-500";
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "medium":
        return <Info className="h-4 w-4 text-orange-400" />;
      case "low":
        return <CheckCircle2 className="h-4 w-4 text-blue-400" />;
      default:
        return null;
    }
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case "high":
        return "高优先级";
      case "medium":
        return "中优先级";
      case "low":
        return "低优先级";
      default:
        return priority;
    }
  };

  return (
    <div className="space-y-4">
      {/* 维度评分 */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm text-zinc-400 hover:text-white transition-colors">
          <span>查看详细评分</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isExpanded ? "transform rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-3">
          {Object.entries(qualityScore.dimensions).map(([key, dimension]) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{dimensionLabels[key] || key}</span>
                <span className="text-white font-medium">{dimension.score} 分</span>
              </div>
              <Progress
                value={dimension.score}
                className={`h-2 bg-zinc-800 [&>div]:${getDimensionColor(dimension.score)}`}
              />
              <p className="text-xs text-zinc-500">{dimension.details}</p>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* 改进建议 */}
      {qualityScore.suggestions && qualityScore.suggestions.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <h4 className="text-sm font-medium text-white">改进建议</h4>
          <div className="space-y-2">
            {qualityScore.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800"
              >
                <div className="mt-0.5">{getPriorityIcon(suggestion.priority)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-zinc-700 text-zinc-400"
                    >
                      {dimensionLabels[suggestion.dimension] || suggestion.dimension}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {getPriorityLabel(suggestion.priority)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">{suggestion.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
