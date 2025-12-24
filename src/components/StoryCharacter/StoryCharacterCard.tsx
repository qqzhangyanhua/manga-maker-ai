"use client";

import { useState } from "react";
import Image from "next/image";
import { X, GripVertical, User, MoreVertical, RefreshCw, Wand2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { RoleSelector } from "./RoleSelector";
import { VariationDialog } from "./VariationDialog";
import { useRegenerateCharacterImage } from "@/app/scripts/[id]/hooks/useGenerateStoryCharacters";
import { type StoryCharacterWithDetails, type CharacterRole } from "./types";

interface StoryCharacterCardProps {
  storyCharacter: StoryCharacterWithDetails;
  onRoleChange: (characterId: string, role: CharacterRole) => Promise<void>;
  onRemove: (characterId: string) => Promise<void>;
  onRefresh?: () => void;
  isDragging?: boolean;
  onImageClick?: (imageUrl: string) => void;
}

export function StoryCharacterCard({
  storyCharacter,
  onRoleChange,
  onRemove,
  onRefresh,
  isDragging,
  onImageClick,
}: StoryCharacterCardProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showVariationDialog, setShowVariationDialog] = useState(false);

  const regenerateImageMutation = useRegenerateCharacterImage();

  const { character } = storyCharacter;
  const role = storyCharacter.role as CharacterRole;

  const imageUrl =
    character.reference_image ||
    character.base_image_url ||
    character.expressions?.[0]?.image_url;

  const hasImage = Boolean(imageUrl);

  const handleRoleChange = async (newRole: CharacterRole) => {
    if (newRole === role) return;
    setIsUpdating(true);
    try {
      await onRoleChange(character.id, newRole);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`确定要从故事中移除角色「${character.name}」吗？`)) {
      return;
    }
    setIsRemoving(true);
    try {
      await onRemove(character.id);
    } finally {
      setIsRemoving(false);
    }
  };

  // 快速重生成（使用原提示词）
  const handleFastRegenerate = async () => {
    if (!confirm(`确定要使用原提示词重新生成「${character.name}」的图片吗？`)) {
      return;
    }

    setIsRegenerating(true);
    try {
      await regenerateImageMutation.mutateAsync({
        characterId: character.id,
        mode: "fast",
      });
      toast({
        title: "重新生成成功",
        description: "角色图片已更新",
      });
      onRefresh?.();
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "图片生成失败",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // 自定义变化重生成
  const handleVariationRegenerate = async (variationPrompt: string) => {
    setIsRegenerating(true);
    try {
      await regenerateImageMutation.mutateAsync({
        characterId: character.id,
        mode: "variation",
        variation_prompt: variationPrompt,
      });
      toast({
        title: "变体生成成功",
        description: "角色图片已更新",
      });
      onRefresh?.();
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "图片生成失败",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const expressionCount = character.expressions?.length || 0;
  const outfitCount = character.outfits?.length || 0;

  return (
    <>
      <div
        className={`
          flex items-center gap-2 p-2 rounded-lg border bg-card
          transition-all duration-200
          ${isDragging ? "shadow-lg ring-2 ring-primary" : "hover:bg-accent/50"}
          ${isRemoving || isRegenerating ? "opacity-50" : ""}
        `}
      >
        {/* Drag handle */}
        <div
          className="cursor-grab text-muted-foreground hover:text-foreground flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Character avatar */}
        <div
          className={`relative w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0 ${hasImage ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasImage && onImageClick) {
              onImageClick(imageUrl);
            }
          }}
        >
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={character.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Character info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" title={character.name}>
            {character.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {expressionCount}表情 · {outfitCount}服装
          </p>
        </div>

        {/* Role selector */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <RoleSelector
            value={role}
            onChange={handleRoleChange}
            disabled={isUpdating || isRemoving || isRegenerating}
          />
        </div>

        {/* Action buttons */}
        {!hasImage ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: 实现生成图片功能（需要从 suggested_characters 获取数据）
              toast({
                title: "功能开发中",
                description: "请使用 AI 生成角色功能",
              });
            }}
            disabled={isRegenerating}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            生成图片
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                disabled={isRegenerating || isRemoving}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleFastRegenerate();
                }}
                disabled={isRegenerating}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                快速重生成
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVariationDialog(true);
                }}
                disabled={isRegenerating}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                自定义变化...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="text-destructive focus:text-destructive"
                disabled={isRemoving}
              >
                <X className="w-4 h-4 mr-2" />
                移除角色
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Variation Dialog */}
      <VariationDialog
        open={showVariationDialog}
        onOpenChange={setShowVariationDialog}
        characterName={character.name}
        onConfirm={handleVariationRegenerate}
      />
    </>
  );
}
