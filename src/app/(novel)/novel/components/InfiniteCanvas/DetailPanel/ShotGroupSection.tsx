"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, AlertCircle, Users, CheckCircle, Sparkles, Image } from "lucide-react";
import type { ShotGroup } from "./types";
import type { ShotDesign } from "@prisma/client";
import { generatePlaceholders } from "../utils/shot-grouping";
import { ShotCharacterBindingPanel } from "../ShotCharacterBindingPanel";
import { ShotNineGridDialog } from "../ShotNineGridDialog";
import { novelTheme } from "../../../theme";
import { cn } from "@/lib/utils";

type ShotLike = ShotDesign | { 
  id: string; 
  shot_order: number; 
  generated_image_url?: string | null; 
  shot_description: string; 
  created_at: Date | string; 
  [key: string]: unknown;
};

interface ShotGroupSectionProps {
  group: ShotGroup;
  onGenerate: (group: ShotGroup) => void;
  onShotClick?: (shot: ShotLike) => void;
  novelProjectId?: string;
}

export function ShotGroupSection({
  group,
  onGenerate,
  onShotClick,
  novelProjectId,
}: ShotGroupSectionProps) {
  const { groupIndex, startOrder, endOrder, shots, isComplete, placeholderCount } = group;

  // 角色绑定面板状态
  const [bindingPanelOpen, setBindingPanelOpen] = useState(false);
  const [selectedShotForBinding, setSelectedShotForBinding] = useState<ShotDesign | null>(null);

  // 九宫格生成对话框状态
  const [nineGridDialogOpen, setNineGridDialogOpen] = useState(false);
  const [selectedShotForNineGrid, setSelectedShotForNineGrid] = useState<ShotDesign | null>(null);

  // 检查分镜是否已绑定角色 Prompt
  const hasBoundCharacters = (shot: ShotDesign) => {
    return shot.character_prompt_template_ids && shot.character_prompt_template_ids.length > 0;
  };

  // 检查分镜是否已合成 Prompt
  const hasComposedPrompt = (shot: ShotDesign) => {
    return shot.final_prompt_status === "completed";
  };

  // 检查分镜是否有九宫格候选图
  const hasNineGridGeneration = (shot: ShotDesign) => {
    return shot.nine_grid_status === "completed";
  };

  // 检查分镜是否已选择图片
  const hasSelectedImage = (shot: ShotDesign) => {
    return shot.selection_status === "selected" || shot.selection_status === "refined";
  };

  // 处理角色绑定点击
  const handleBindCharacter = (shot: ShotDesign) => {
    setSelectedShotForBinding(shot);
    setBindingPanelOpen(true);
  };

  // 处理九宫格生成点击
  const handleOpenNineGridDialog = (shot: ShotDesign) => {
    setSelectedShotForNineGrid(shot);
    setNineGridDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* 分组标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">
            第 {groupIndex + 1} 组
          </h3>
          <Badge variant="outline" className={cn("text-xs", novelTheme.badge.purple)}>
            镜头 {startOrder}-{endOrder}
          </Badge>
          {!isComplete && (
            <Badge variant="secondary" className={cn("text-xs", novelTheme.alert.warning)}>
              不足9个 (缺{placeholderCount}个)
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          disabled={!isComplete}
          onClick={() => onGenerate(group)}
          className={cn("gap-2", novelTheme.button.primary)}
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
            className={cn(
              "relative aspect-square cursor-pointer overflow-hidden transition-all group",
              novelTheme.card.base,
              novelTheme.interaction.cardHover
            )}
            onClick={() => onShotClick?.(shot)}
          >
            {shot.generated_image_url ? (
              <img
                src={shot.generated_image_url}
                alt={`镜头 ${shot.shot_order}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-2">
                <span className="text-[10px] text-center line-clamp-3">
                  {shot.shot_description || '无描述'}
                </span>
              </div>
            )}
            
            {/* 状态标识 */}
            <div className="absolute top-1 right-1 flex gap-1">
              {/* 角色绑定状态 */}
              {hasBoundCharacters(shot) && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1 py-0",
                    hasComposedPrompt(shot)
                      ? "bg-green-600/80 text-white"
                      : "bg-purple-600/80 text-white"
                  )}
                >
                  {hasComposedPrompt(shot) ? (
                    <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                  ) : (
                    <Users className="w-2.5 h-2.5 mr-0.5" />
                  )}
                  {shot.character_prompt_template_ids?.length || 0}
                </Badge>
              )}
              {/* 九宫格/选择状态 */}
              {hasSelectedImage(shot) && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1 py-0 bg-purple-600/80 text-white"
                >
                  <Image className="w-2.5 h-2.5 mr-0.5" aria-label="已选图标" />
                  已选
                </Badge>
              )}
              {hasNineGridGeneration(shot) && !hasSelectedImage(shot) && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1 py-0 bg-fuchsia-600/80 text-white"
                >
                  <Grid3x3 className="w-2.5 h-2.5 mr-0.5" />
                  待选
                </Badge>
              )}
            </div>
            
            {/* 操作按钮（hover 时显示） */}
            {novelProjectId && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                {/* 绑定角色按钮 */}
                <Button
                  size="sm"
                  variant="secondary"
                  className={cn("text-xs w-24", novelTheme.button.secondary)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBindCharacter(shot);
                  }}
                >
                  <Users className="w-3 h-3 mr-1" />
                  {hasBoundCharacters(shot) ? "编辑角色" : "绑定角色"}
                </Button>
                {/* 九宫格生成按钮（需要先合成 Prompt） */}
                {(hasComposedPrompt(shot) || shot.prompt) && (
                  <Button
                    size="sm"
                    variant={hasNineGridGeneration(shot) ? "outline" : "default"}
                    className={cn(
                      "text-xs w-24",
                      hasNineGridGeneration(shot) ? novelTheme.button.outline : novelTheme.button.primary
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNineGridDialog(shot);
                    }}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {hasNineGridGeneration(shot) ? "查看候选" : "生成候选"}
                  </Button>
                )}
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
                className={cn(
                  "relative aspect-square overflow-hidden border-dashed",
                  novelTheme.card.skeleton
                )}
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
        <div className={cn(
          "flex items-start gap-2 text-xs p-3 rounded-md",
          novelTheme.alert.warning
        )}>
          <AlertCircle className={cn("h-4 w-4 mt-0.5 flex-shrink-0", novelTheme.alertIcon.warning)} />
          <p>
            该组镜头不足9个,无法生成九宫格。请先创建更多镜头或等待其他分组完成。
          </p>
        </div>
      )}

      {/* 角色绑定面板 */}
      {novelProjectId && selectedShotForBinding && (
        <ShotCharacterBindingPanel
          open={bindingPanelOpen}
          onOpenChange={setBindingPanelOpen}
          shotId={selectedShotForBinding.id}
          shotDescription={selectedShotForBinding.shot_description}
          novelProjectId={novelProjectId}
          existingBindings={
            selectedShotForBinding.character_prompt_template_ids?.map((id) => ({
              templateId: id,
            })) || []
          }
          onSuccess={() => {
            setBindingPanelOpen(false);
            setSelectedShotForBinding(null);
          }}
        />
      )}

      {/* 九宫格生成对话框 */}
      {selectedShotForNineGrid && (
        <ShotNineGridDialog
          open={nineGridDialogOpen}
          onOpenChange={setNineGridDialogOpen}
          shotId={selectedShotForNineGrid.id}
          shotDescription={selectedShotForNineGrid.shot_description}
          promptCompositionId={selectedShotForNineGrid.prompt_composition_id || undefined}
          onSuccess={() => {
            setNineGridDialogOpen(false);
            setSelectedShotForNineGrid(null);
          }}
        />
      )}
    </div>
  );
}
