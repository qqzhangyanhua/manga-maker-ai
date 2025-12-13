/**
 * 批量角色替换弹窗组件
 *
 * 功能：
 * - 批量修改选中分镜的角色
 * - 可选修改表情类型
 * - 可选修改服装
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Loader2, Info } from "lucide-react";
import { NO_CHANGE_VALUE } from "@/constants/panel-options";
import {
  EXPRESSION_TYPES,
  EXPRESSION_LABELS,
} from "@/lib/expression-generation";

interface Character {
  id: string;
  name: string;
  viewCount: number;
}

interface Outfit {
  id: string;
  outfit_type: string;
  description: string | null;
}

interface BatchCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPanelIds: string[];
  characters: Character[];
  onConfirm: (updates: BatchCharacterUpdates) => Promise<void>;
}

export interface BatchCharacterUpdates {
  character_id?: string;
  expression_type?: string;
  outfit_id?: string;
}

const OUTFIT_TYPE_LABELS: Record<string, string> = {
  default: "默认装",
  school: "校服",
  battle: "战斗服",
  casual: "休闲装",
  formal: "正装",
  sleepwear: "睡衣",
  sports: "运动装",
  custom: "自定义",
};

export default function BatchCharacterDialog({
  open,
  onOpenChange,
  selectedPanelIds,
  characters,
  onConfirm,
}: BatchCharacterDialogProps) {
  const [characterId, setCharacterId] = useState<string>(NO_CHANGE_VALUE);
  const [expressionType, setExpressionType] = useState<string>(NO_CHANGE_VALUE);
  const [outfitId, setOutfitId] = useState<string>(NO_CHANGE_VALUE);
  const [isLoading, setIsLoading] = useState(false);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);

  // 当选择角色变化时，加载该角色的服装列表
  useEffect(() => {
    if (characterId === NO_CHANGE_VALUE || characterId === "__clear__") {
      setOutfits([]);
      setOutfitId(NO_CHANGE_VALUE);
      return;
    }

    const fetchOutfits = async () => {
      setLoadingOutfits(true);
      try {
        const response = await fetch(`/api/character/${characterId}`);
        if (response.ok) {
          const data = await response.json();
          setOutfits(data.character?.outfits || []);
        }
      } catch (error) {
        console.error("Failed to fetch outfits:", error);
      } finally {
        setLoadingOutfits(false);
      }
    };

    fetchOutfits();
  }, [characterId]);

  // 重置表单
  const resetForm = () => {
    setCharacterId(NO_CHANGE_VALUE);
    setExpressionType(NO_CHANGE_VALUE);
    setOutfitId(NO_CHANGE_VALUE);
    setOutfits([]);
  };

  // 关闭弹窗时重置
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // 检查是否有修改
  const hasChanges =
    characterId !== NO_CHANGE_VALUE ||
    expressionType !== NO_CHANGE_VALUE ||
    outfitId !== NO_CHANGE_VALUE;

  // 提交修改
  const handleSubmit = async () => {
    if (!hasChanges) return;

    const updates: BatchCharacterUpdates = {};
    if (characterId !== NO_CHANGE_VALUE) {
      updates.character_id = characterId === "__clear__" ? "" : characterId;
    }
    if (expressionType !== NO_CHANGE_VALUE) {
      updates.expression_type =
        expressionType === "__clear__" ? "" : expressionType;
    }
    if (outfitId !== NO_CHANGE_VALUE) {
      updates.outfit_id = outfitId === "__clear__" ? "" : outfitId;
    }

    setIsLoading(true);
    try {
      await onConfirm(updates);
      handleOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取选中角色的名称
  const getSelectedCharacterName = (): string | null => {
    if (characterId === NO_CHANGE_VALUE || characterId === "__clear__")
      return null;
    const character = characters.find((c) => c.id === characterId);
    return character?.name || null;
  };

  // 获取选中服装的描述
  const getSelectedOutfitLabel = (): string | null => {
    if (outfitId === NO_CHANGE_VALUE || outfitId === "__clear__") return null;
    const outfit = outfits.find((o) => o.id === outfitId);
    if (!outfit) return null;
    return (
      OUTFIT_TYPE_LABELS[outfit.outfit_type] ||
      outfit.description ||
      outfit.outfit_type
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            批量角色替换
          </DialogTitle>
          <DialogDescription>
            修改已选中的 {selectedPanelIds.length} 个分镜的角色设置。
            留空表示不修改该属性。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 角色选择 */}
          <div className="space-y-2">
            <Label htmlFor="character" className="text-sm font-medium">
              角色
            </Label>
            <Select value={characterId} onValueChange={setCharacterId}>
              <SelectTrigger id="character">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE_VALUE}>
                  <span className="text-muted-foreground">不修改</span>
                </SelectItem>
                <SelectItem value="__clear__">
                  <span className="text-destructive">清除角色绑定</span>
                </SelectItem>
                {characters.map((character) => (
                  <SelectItem key={character.id} value={character.id}>
                    {character.name}
                    {character.viewCount > 0 && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({character.viewCount}视图)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {characters.length === 0 && (
              <p className="text-xs text-muted-foreground">
                暂无角色，请先在角色库中创建角色
              </p>
            )}
          </div>

          {/* 表情类型 */}
          <div className="space-y-2">
            <Label htmlFor="expression" className="text-sm font-medium">
              表情类型
            </Label>
            <Select value={expressionType} onValueChange={setExpressionType}>
              <SelectTrigger id="expression">
                <SelectValue placeholder="选择表情" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE_VALUE}>
                  <span className="text-muted-foreground">不修改</span>
                </SelectItem>
                <SelectItem value="__clear__">
                  <span className="text-destructive">清除表情设置</span>
                </SelectItem>
                {EXPRESSION_TYPES.map((exp) => (
                  <SelectItem key={exp} value={exp}>
                    {EXPRESSION_LABELS[exp]}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({exp})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 服装选择 - 仅当选择了角色时显示 */}
          {characterId !== NO_CHANGE_VALUE && characterId !== "__clear__" && (
            <div className="space-y-2">
              <Label htmlFor="outfit" className="text-sm font-medium">
                服装
              </Label>
              <Select
                value={outfitId}
                onValueChange={setOutfitId}
                disabled={loadingOutfits}
              >
                <SelectTrigger id="outfit">
                  <SelectValue
                    placeholder={loadingOutfits ? "加载中..." : "选择服装"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHANGE_VALUE}>
                    <span className="text-muted-foreground">不修改</span>
                  </SelectItem>
                  <SelectItem value="__clear__">
                    <span className="text-destructive">清除服装设置</span>
                  </SelectItem>
                  {outfits.map((outfit) => (
                    <SelectItem key={outfit.id} value={outfit.id}>
                      {OUTFIT_TYPE_LABELS[outfit.outfit_type] ||
                        outfit.outfit_type}
                      {outfit.description && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          - {outfit.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {outfits.length === 0 && !loadingOutfits && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  该角色暂无服装数据
                </p>
              )}
            </div>
          )}

          {/* 修改预览 */}
          {hasChanges && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium mb-2">将应用以下修改：</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {characterId !== NO_CHANGE_VALUE && (
                  <li>
                    角色 →{" "}
                    <span className="text-foreground">
                      {characterId === "__clear__"
                        ? "清除绑定"
                        : getSelectedCharacterName()}
                    </span>
                  </li>
                )}
                {expressionType !== NO_CHANGE_VALUE && (
                  <li>
                    表情 →{" "}
                    <span className="text-foreground">
                      {expressionType === "__clear__"
                        ? "清除设置"
                        : EXPRESSION_LABELS[
                            expressionType as keyof typeof EXPRESSION_LABELS
                          ]}
                    </span>
                  </li>
                )}
                {outfitId !== NO_CHANGE_VALUE && (
                  <li>
                    服装 →{" "}
                    <span className="text-foreground">
                      {outfitId === "__clear__"
                        ? "清除设置"
                        : getSelectedOutfitLabel()}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!hasChanges || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                应用中...
              </>
            ) : (
              <>应用修改 ({selectedPanelIds.length}格)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
