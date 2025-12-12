/**
 * Batch Asset Binding Dialog
 * Assign assets to multiple panels at once
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CharacterAssetSelector, SceneSelector } from "./AssetSelectors";

interface BatchAssetBindingDialogProps {
  open: boolean;
  storyId?: string;
  selectedPanelIds: string[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchAssetBindingDialog({
  open,
  storyId,
  selectedPanelIds,
  onOpenChange,
  onSuccess,
}: BatchAssetBindingDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [characterId, setCharacterId] = useState<string>("");
  const [expressionType, setExpressionType] = useState<string>("");
  const [outfitId, setOutfitId] = useState<string>("");
  const [sceneId, setSceneId] = useState<string>("");

  async function handleSubmit(): Promise<void> {
    if (!characterId && !sceneId) {
      toast({
        title: "请选择资产",
        description: "至少选择一个角色或场景",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const updates: Record<string, string> = {};
      if (characterId) updates.character_id = characterId;
      if (expressionType) updates.expression_type = expressionType;
      if (outfitId) updates.outfit_id = outfitId;
      if (sceneId) updates.scene_id = sceneId;

      const response = await fetch("/api/panel/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelIds: selectedPanelIds,
          updates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "批量绑定失败");
      }

      toast({
        title: "批量绑定成功",
        description: `已更新 ${data.data.updatedCount} 个分镜`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "批量绑定失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            批量资产绑定
          </DialogTitle>
          <DialogDescription>
            为选中的 {selectedPanelIds.length} 个分镜批量绑定资产
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>选择要绑定的资产</Label>
            <p className="text-sm text-muted-foreground">
              选择的资产将应用到所有选中的分镜
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CharacterAssetSelector
              storyId={storyId}
              characterId={characterId}
              expressionType={expressionType}
              outfitId={outfitId}
              onCharacterChange={setCharacterId}
              onExpressionChange={setExpressionType}
              onOutfitChange={setOutfitId}
            />
            <SceneSelector sceneId={sceneId} onSceneChange={setSceneId} />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>提示：</strong>
              批量绑定会覆盖选中分镜的现有资产绑定。如果只想更新部分分镜，请先取消不需要更新的分镜的选择。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            应用到 {selectedPanelIds.length} 个分镜
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
