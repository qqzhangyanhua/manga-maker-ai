"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROLE_LABELS, ROLE_COLORS } from "../constants/characterRoles";
import type { CharacterInfo } from "../types/character";

interface CharacterDetailDialogProps {
  open: boolean;
  onOpenChange: () => void;
  character: CharacterInfo | null;
  role: string;
  storyId: string;
  onRemoveSuccess?: () => void;
}

export function CharacterDetailDialog({
  open,
  onOpenChange,
  character,
  role,
  storyId,
  onRemoveSuccess,
}: CharacterDetailDialogProps) {
  const { toast } = useToast();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!character) return null;

  // 适配 Dialog 的 onOpenChange 签名
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      onOpenChange();
    }
  };

  const handleRemove = async () => {
    try {
      setRemoving(true);

      const response = await fetch(
        `/api/story/${storyId}/characters/${character.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "移除失败");
      }

      toast({
        title: "移除成功",
        description: `已将角色「${character.name}」从剧本中移除`,
      });

      setShowRemoveDialog(false);
      onOpenChange();
      onRemoveSuccess?.();
    } catch (error) {
      console.error("Remove character error:", error);
      toast({
        title: "移除失败",
        description: error instanceof Error ? error.message : "移除角色失败",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {character.name}
              <Badge
                variant="secondary"
                className={`${ROLE_COLORS[role]} text-white`}
              >
                {ROLE_LABELS[role] || role}
              </Badge>
            </DialogTitle>
            <DialogDescription>角色详细信息</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 角色图片 */}
            {character.reference_image ? (
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={character.reference_image}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-8xl">
                  {character.name.charAt(0)}
                </span>
              </div>
            )}

            {/* 角色描述 */}
            {character.description && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  角色描述
                </h4>
                <p className="text-sm leading-relaxed">
                  {character.description}
                </p>
              </div>
            )}

            {/* 风格提示词 */}
            {character.style_prompt && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  风格提示词
                </h4>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  {character.style_prompt}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={onOpenChange}
              disabled={removing}
            >
              关闭
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRemoveDialog(true)}
              disabled={removing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              从剧本移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除角色</AlertDialogTitle>
            <AlertDialogDescription>
              确定要将角色「{character.name}」从剧本中移除吗？
              <br />
              此操作不会删除角色本身，仅取消角色与剧本的关联。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  移除中...
                </>
              ) : (
                "确认移除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
