/**
 * 批量风格调整弹窗组件
 *
 * 功能：
 * - 批量修改选中分镜的重要性级别
 * - 批量绑定场景
 * - 调用 batch-update API
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
import { Palette, Loader2, Info } from "lucide-react";
import {
  IMPORTANCE_LEVELS,
  NO_CHANGE_VALUE,
} from "@/constants/panel-options";

interface Scene {
  id: string;
  name: string;
  scene_type: string;
  image_url?: string | null;
}

interface BatchStyleDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onOpenChange: (open: boolean) => void;
  /** 已选中的分镜ID列表 */
  selectedPanelIds: string[];
  /** 确认修改回调 */
  onConfirm: (updates: BatchStyleUpdates) => Promise<void>;
}

export interface BatchStyleUpdates {
  importance?: string;
  scene_id?: string;
}

export default function BatchStyleDialog({
  open,
  onOpenChange,
  selectedPanelIds,
  onConfirm,
}: BatchStyleDialogProps) {
  const [importance, setImportance] = useState<string>(NO_CHANGE_VALUE);
  const [sceneId, setSceneId] = useState<string>(NO_CHANGE_VALUE);
  const [isLoading, setIsLoading] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);

  // 加载场景列表
  useEffect(() => {
    if (open && scenes.length === 0) {
      const fetchScenes = async () => {
        setLoadingScenes(true);
        try {
          const response = await fetch("/api/scene");
          if (response.ok) {
            const data = await response.json();
            setScenes(data.scenes || []);
          }
        } catch (error) {
          console.error("Failed to fetch scenes:", error);
        } finally {
          setLoadingScenes(false);
        }
      };
      fetchScenes();
    }
  }, [open, scenes.length]);

  // 重置表单
  const resetForm = () => {
    setImportance(NO_CHANGE_VALUE);
    setSceneId(NO_CHANGE_VALUE);
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
    importance !== NO_CHANGE_VALUE || sceneId !== NO_CHANGE_VALUE;

  // 提交修改
  const handleSubmit = async () => {
    if (!hasChanges) return;

    const updates: BatchStyleUpdates = {};
    if (importance !== NO_CHANGE_VALUE) {
      updates.importance = importance;
    }
    if (sceneId !== NO_CHANGE_VALUE) {
      updates.scene_id = sceneId;
    }

    setIsLoading(true);
    try {
      await onConfirm(updates);
      handleOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取选中场景的名称
  const getSelectedSceneName = (): string | null => {
    if (sceneId === NO_CHANGE_VALUE) return null;
    const scene = scenes.find((s) => s.id === sceneId);
    return scene?.name || null;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            批量调整风格
          </DialogTitle>
          <DialogDescription>
            修改已选中的 {selectedPanelIds.length} 个分镜的风格设置。
            留空表示不修改该属性。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 重要性级别 */}
          <div className="space-y-2">
            <Label htmlFor="importance" className="text-sm font-medium">
              重要性级别
            </Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger id="importance">
                <SelectValue placeholder="选择重要性" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE_VALUE}>
                  <span className="text-muted-foreground">不修改</span>
                </SelectItem>
                {IMPORTANCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {importance !== NO_CHANGE_VALUE && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                {IMPORTANCE_LEVELS.find((l) => l.value === importance)?.description}
              </p>
            )}
          </div>

          {/* 场景绑定 */}
          <div className="space-y-2">
            <Label htmlFor="scene" className="text-sm font-medium">
              绑定场景
            </Label>
            <Select value={sceneId} onValueChange={setSceneId} disabled={loadingScenes}>
              <SelectTrigger id="scene">
                <SelectValue placeholder={loadingScenes ? "加载中..." : "选择场景"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE_VALUE}>
                  <span className="text-muted-foreground">不修改</span>
                </SelectItem>
                <SelectItem value="__clear__">
                  <span className="text-destructive">清除场景绑定</span>
                </SelectItem>
                {scenes.map((scene) => (
                  <SelectItem key={scene.id} value={scene.id}>
                    {scene.name}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({scene.scene_type})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {scenes.length === 0 && !loadingScenes && (
              <p className="text-xs text-muted-foreground">
                暂无场景，请先在场景库中创建场景
              </p>
            )}
          </div>

          {/* 修改预览 */}
          {hasChanges && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium mb-2">将应用以下修改：</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {importance !== NO_CHANGE_VALUE && (
                  <li>
                    重要性 →{" "}
                    <span className="text-foreground">
                      {IMPORTANCE_LEVELS.find((l) => l.value === importance)?.label}
                    </span>
                  </li>
                )}
                {sceneId !== NO_CHANGE_VALUE && (
                  <li>
                    场景 →{" "}
                    <span className="text-foreground">
                      {sceneId === "__clear__" ? "清除绑定" : getSelectedSceneName()}
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
