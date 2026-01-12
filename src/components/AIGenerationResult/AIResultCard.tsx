/**
 * AI 生成结果展示组件 - 透明化版本
 *
 * 显示 AI 生成内容的同时，展示推理过程、参考依据等
 */
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  Wand2,
  Sparkles,
  Eye,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AIGenerationResult,
  AIReasoning,
} from "./types";

interface AIResultCardProps {
  result: AIGenerationResult;
  onAccept?: () => void;
  onReject?: () => void;
  onRegenerate?: () => void;
  onSelectAlternative?: (alternativeId: string) => void;
  showReasoning?: boolean;
  compact?: boolean;
}

export function AIResultCard({
  result,
  onAccept,
  onReject,
  onRegenerate,
  onSelectAlternative,
  showReasoning = true,
  compact = false,
}: AIResultCardProps) {
  const [reasoningOpen, setReasoningOpen] = useState(!compact);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);

  const hasReasoning = result.reasoning && (
    result.reasoning.references?.length ||
    result.reasoning.considerations?.length ||
    result.reasoning.techniques?.length
  );

  const confidence = result.confidence ?? 0.8;
  const confidenceLevel = confidence >= 0.8 ? "高" : confidence >= 0.5 ? "中" : "低";

  return (
    <Card className="overflow-hidden border-orange-200 dark:border-orange-900">
      {/* 生成内容 */}
      <CardContent className="p-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {result.content}
        </div>

        {/* 置信度指示 */}
        {result.confidence !== undefined && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">AI 置信度:</span>
            <Badge
              variant={confidence >= 0.8 ? "default" : confidence >= 0.5 ? "secondary" : "outline"}
              className={
                confidence >= 0.8
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : confidence >= 0.5
                  ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  : "bg-red-500/10 text-red-600 border-red-500/20"
              }
            >
              {confidenceLevel} ({Math.round(confidence * 100)}%)
            </Badge>
          </div>
        )}
      </CardContent>

      {/* AI 推理过程 */}
      {showReasoning && hasReasoning && (
        <Collapsible open={reasoningOpen} onOpenChange={setReasoningOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-orange-500" />
              AI 创作思路
            </div>
            {reasoningOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent className="border-t">
            <div className="p-4 space-y-4 bg-background">
              {result.reasoning?.references && result.reasoning.references.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    参考作品
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.reasoning.references.map((ref, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {ref}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.reasoning?.considerations && result.reasoning.considerations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-purple-500" />
                    创作考量
                  </h4>
                  <ul className="space-y-1">
                    {result.reasoning.considerations.map((consideration, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span>{consideration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.reasoning?.techniques && result.reasoning.techniques.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    写作技巧
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.reasoning.techniques.map((technique, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {technique}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.reasoning?.principles && result.reasoning.principles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">遵循原则</h4>
                  <ul className="space-y-1">
                    {result.reasoning.principles.map((principle, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{principle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 替代方案 */}
      {result.alternatives && result.alternatives.length > 0 && (
        <div className="border-t p-4 bg-muted/30">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            其他创作方向 ({result.alternatives.length})
          </h4>
          <div className="space-y-2">
            {result.alternatives.map((alt) => (
              <div
                key={alt.id}
                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedAlternative(alt.id);
                  onSelectAlternative?.(alt.id);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{alt.title}</span>
                  <Badge variant="outline" className="text-xs">
                    预览
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {alt.preview}
                </p>
                {alt.reasoning && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {alt.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {(onAccept || onReject || onRegenerate) && (
        <div className="border-t p-4 flex gap-2 bg-background">
          {onAccept && (
            <Button onClick={onAccept} size="sm" className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              采用
            </Button>
          )}
          {onRegenerate && (
            <Button onClick={onRegenerate} size="sm" variant="outline" className="flex-1">
              <Sparkles className="h-4 w-4 mr-2" />
              重新生成
            </Button>
          )}
          {onReject && (
            <Button onClick={onReject} size="sm" variant="ghost" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              拒绝
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * 加载骨架屏
 */
export function AIResultCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-full" />
          <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
        </div>
        <div className="h-20 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

/**
 * 空状态
 */
export function AIResultCardEmpty({
  message = "暂无生成结果",
}: {
  message?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
