/**
 * 分镜编辑/创建对话框组件
 * 包含完整的表单字段和角色选择器
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { CharacterSelector } from "./CharacterSelector";
import { CharacterAssetSelector, SceneSelector } from "./AssetSelectors";
import type { Panel, StoryCharacter } from "../../types/script-editor.types";

interface PanelEditDialogProps {
  open: boolean;
  panel: Partial<Panel> | null;
  characters: StoryCharacter[];
  storyId: string; // NEW: Required for asset selectors
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  onChange: (field: string, value: string) => void;
}

export function PanelEditDialog({
  open,
  panel,
  characters,
  storyId,
  saving,
  onOpenChange,
  onSave,
  onChange,
}: PanelEditDialogProps) {
  if (!panel) return null;

  const isNew = !panel.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "新建分镜" : "编辑分镜"}</DialogTitle>
          <DialogDescription>配置分镜画面的详细参数</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>景别 (Shot Size)</Label>
              <Select
                value={panel.shot_size}
                onValueChange={(v) => onChange("shot_size", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择景别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extreme_closeup">
                    特写 (Extreme Close-up)
                  </SelectItem>
                  <SelectItem value="closeup">近景 (Close-up)</SelectItem>
                  <SelectItem value="medium_shot">中景 (Medium Shot)</SelectItem>
                  <SelectItem value="full_shot">全景 (Full Shot)</SelectItem>
                  <SelectItem value="long_shot">远景 (Long Shot)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>视角 (Camera Angle)</Label>
              <Select
                value={panel.camera_angle}
                onValueChange={(v) => onChange("camera_angle", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择视角" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eye_level">平视 (Eye Level)</SelectItem>
                  <SelectItem value="high_angle">俯视 (High Angle)</SelectItem>
                  <SelectItem value="low_angle">仰视 (Low Angle)</SelectItem>
                  <SelectItem value="dutch_angle">
                    荷兰角 (Dutch Angle)
                  </SelectItem>
                  <SelectItem value="bird_eye">鸟瞰 (Bird's Eye)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>画面描述</Label>
            <Textarea
              placeholder="描述画面中发生了什么..."
              value={panel.description || ""}
              onChange={(e) => onChange("description", e.target.value)}
              rows={3}
            />
          </div>

          {/* Phase 2: Asset Binding */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">资产绑定 (Asset Binding)</h3>
            <div className="grid grid-cols-2 gap-4">
              <CharacterAssetSelector
                storyId={storyId}
                characterId={panel.character_id}
                expressionType={panel.expression_type}
                outfitId={panel.outfit_id}
                onCharacterChange={(v) => onChange("character_id", v)}
                onExpressionChange={(v) => onChange("expression_type", v)}
                onOutfitChange={(v) => onChange("outfit_id", v)}
              />
              <SceneSelector
                sceneId={panel.scene_id}
                onSceneChange={(v) => onChange("scene_id", v)}
              />
            </div>
          </div>

          {/* Legacy fields - Keep for backward compatibility */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>角色 (Legacy)</Label>
              <CharacterSelector
                characters={characters}
                value={panel.character_name || ""}
                onChange={(v) => onChange("character_name", v)}
              />
            </div>
            <div className="space-y-2">
              <Label>情感/表情 (Legacy)</Label>
              <Input
                placeholder="例如: 惊讶, 愤怒"
                value={panel.emotion || ""}
                onChange={(e) => onChange("emotion", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>重要性</Label>
              <Select
                value={panel.importance}
                onValueChange={(v) => onChange("importance", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>对白 (可选)</Label>
            <Textarea
              placeholder="角色说的话..."
              value={panel.dialogue || ""}
              onChange={(e) => onChange("dialogue", e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
