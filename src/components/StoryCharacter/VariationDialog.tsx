"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface VariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterName: string;
  onConfirm: (variationPrompt: string) => Promise<void>;
}

export function VariationDialog({
  open,
  onOpenChange,
  characterName,
  onConfirm,
}: VariationDialogProps) {
  const [variationPrompt, setVariationPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleConfirm = async () => {
    if (!variationPrompt.trim()) {
      return;
    }

    setIsGenerating(true);
    try {
      await onConfirm(variationPrompt.trim());
      // 成功后关闭对话框并清空输入
      setVariationPrompt("");
      onOpenChange(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setVariationPrompt("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            自定义变化
          </DialogTitle>
          <DialogDescription>
            为 {characterName} 描述您想要的变化，AI 将基于原图生成变体
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="variation-prompt">变化描述</Label>
            <Textarea
              id="variation-prompt"
              placeholder="例如：换成金色长发、穿上红色连衣裙、更年轻的外貌..."
              value={variationPrompt}
              onChange={(e) => setVariationPrompt(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              描述您希望改变的外貌特征，AI 会保持角色整体风格
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!variationPrompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>生成中...</>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                生成变体
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
