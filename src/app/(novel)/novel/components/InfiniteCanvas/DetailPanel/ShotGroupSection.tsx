"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, AlertCircle } from "lucide-react";
import type { ShotGroup } from "./types";
import type { ShotDesign } from "@prisma/client";
import { generatePlaceholders } from "../utils/shot-grouping";

interface ShotGroupSectionProps {
  group: ShotGroup;
  onGenerate: (group: ShotGroup) => void;
  onShotClick?: (shot: ShotDesign | { id: string; shot_order: number; generated_image_url?: string | null; shot_description: string; created_at: Date | string; [key: string]: unknown }) => void;
}

export function ShotGroupSection({
  group,
  onGenerate,
  onShotClick,
}: ShotGroupSectionProps) {
  const { groupIndex, startOrder, endOrder, shots, isComplete, placeholderCount } = group;

  return (
    <div className="space-y-4">
      {/* 分组标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">
            第 {groupIndex + 1} 组
          </h3>
          <Badge variant="outline" className="text-xs">
            镜头 {startOrder}-{endOrder}
          </Badge>
          {!isComplete && (
            <Badge variant="secondary" className="text-xs">
              不足9个 (缺{placeholderCount}个)
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          disabled={!isComplete}
          onClick={() => onGenerate(group)}
          className="gap-2"
        >
          <Grid3x3 className="h-4 w-4" />
          生成九宫格
        </Button>
      </div>

      {/* 镜头网格 */}
      <div className="grid grid-cols-3 gap-3">
        {shots.map((shot) => (
          <Card
            key={shot.id}
            className="relative aspect-square cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all"
            onClick={() => onShotClick?.(shot)}
          >
            {shot.generated_image_url ? (
              <img
                src={shot.generated_image_url}
                alt={`镜头 ${shot.shot_order}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
                <span className="text-xs">镜头 {shot.shot_order}</span>
                <span className="text-[10px] mt-1">未生成</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
              #{shot.shot_order}
            </div>
          </Card>
        ))}

        {/* 占位符 */}
        {placeholderCount > 0 &&
          generatePlaceholders(placeholderCount, shots.length + startOrder).map(
            (order) => (
              <Card
                key={`placeholder-${order}`}
                className="relative aspect-square overflow-hidden border-dashed"
              >
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
                  <span className="text-xs">镜头 {order}</span>
                  <span className="text-[10px] mt-1">待创建</span>
                </div>
              </Card>
            )
          )}
      </div>

      {/* 不完整分组提示 */}
      {!isComplete && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            该组镜头不足9个,无法生成九宫格。请先创建更多镜头或等待其他分组完成。
          </p>
        </div>
      )}
    </div>
  );
}
