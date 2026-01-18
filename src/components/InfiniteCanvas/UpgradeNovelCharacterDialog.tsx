/**
 * UpgradeNovelCharacterDialog - 升级小说角色确认对话框
 */

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";

interface NovelCharacter {
  name: string;
  role: string;
  description: string;
  tempId: string;
  traits?: string[];
  relationships?: Record<string, string>;
}

interface UpgradeNovelCharacterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  novelCharacter: NovelCharacter | null;
  onConfirm: (character: NovelCharacter, generateImage: boolean) => void;
  isUpgrading?: boolean;
}

const ROLE_LABELS = {
  protagonist: "主角",
  antagonist: "反派",
  supporting: "配角",
  minor: "次要角色",
};

export function UpgradeNovelCharacterDialog({
  isOpen,
  onClose,
  novelCharacter,
  onConfirm,
  isUpgrading = false,
}: UpgradeNovelCharacterDialogProps) {
  const [generateImage, setGenerateImage] = useState(false);

  if (!novelCharacter) return null;

  const handleConfirm = () => {
    onConfirm(novelCharacter, generateImage);
  };

  const roleLabel = ROLE_LABELS[novelCharacter.role as keyof typeof ROLE_LABELS] || novelCharacter.role;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>升级角色为资产</DialogTitle>
          <DialogDescription>
            将小说角色转换为可复用的角色资产，用于后续场景和镜头生成
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 角色信息 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{novelCharacter.name}</h3>
              <Badge variant="outline">{roleLabel}</Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">角色描述</Label>
              <p className="text-sm border rounded-md p-3 bg-muted/50">
                {novelCharacter.description}
              </p>
            </div>

            {novelCharacter.traits && novelCharacter.traits.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">角色特质</Label>
                <div className="flex flex-wrap gap-1">
                  {novelCharacter.traits.map((trait, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 图片生成选项 */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="generate-image" className="text-sm font-medium">
                立即生成基础图片
              </Label>
              <p className="text-xs text-muted-foreground">
                生成角色的默认形象（推荐，约需 10-30 秒）
              </p>
            </div>
            <Switch
              id="generate-image"
              checked={generateImage}
              onCheckedChange={setGenerateImage}
              disabled={isUpgrading}
            />
          </div>

          {/* 提示信息 */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-900">
              <p className="font-medium mb-1">升级后的效果</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                <li>角色将添加到当前章节的角色列表</li>
                <li>可在场景和镜头生成中直接选择</li>
                <li>后续可为角色添加多套服装和表情</li>
                {!generateImage && <li>图片可稍后在角色管理中生成</li>}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpgrading}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isUpgrading}>
            {isUpgrading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                升级中...
              </>
            ) : (
              "确认升级"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
