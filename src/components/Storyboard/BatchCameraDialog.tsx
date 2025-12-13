/**
 * 批量镜头调整弹窗组件
 *
 * 功能：
 * - 批量修改选中分镜的镜头角度、景别、分镜类型
 * - 支持"不修改"选项保持原值
 * - 调用 batch-update API
 */

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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2, Info } from "lucide-react";
import {
  CAMERA_ANGLES,
  SHOT_SIZES,
  PANEL_TYPES,
  NO_CHANGE_VALUE,
} from "@/constants/panel-options";

interface BatchCameraDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onOpenChange: (open: boolean) => void;
  /** 已选中的分镜ID列表 */
  selectedPanelIds: string[];
  /** 确认修改回调 */
  onConfirm: (updates: BatchCameraUpdates) => Promise<void>;
}

export interface BatchCameraUpdates {
  camera_angle?: string;
  shot_size?: string;
  panel_type?: string;
}

export default function BatchCameraDialog({
  open,
  onOpenChange,
  selectedPanelIds,
  onConfirm,
}: BatchCameraDialogProps) {
  const [cameraAngle, setCameraAngle] = useState<string>(NO_CHANGE_VALUE);
  const [shotSize, setShotSize] = useState<string>(NO_CHANGE_VALUE);
  const [panelType, setPanelType] = useState<string>(NO_CHANGE_VALUE);
  const [isLoading, setIsLoading] = useState(false);

  // 重置表单
  const resetForm = () => {
    setCameraAngle(NO_CHANGE_VALUE);
    setShotSize(NO_CHANGE_VALUE);
    setPanelType(NO_CHANGE_VALUE);
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
    cameraAngle !== NO_CHANGE_VALUE ||
    shotSize !== NO_CHANGE_VALUE ||
    panelType !== NO_CHANGE_VALUE;

  // 提交修改
  const handleSubmit = async () => {
    if (!hasChanges) return;

    const updates: BatchCameraUpdates = {};
    if (cameraAngle !== NO_CHANGE_VALUE) {
      updates.camera_angle = cameraAngle;
    }
    if (shotSize !== NO_CHANGE_VALUE) {
      updates.shot_size = shotSize;
    }
    if (panelType !== NO_CHANGE_VALUE) {
      updates.panel_type = panelType;
    }

    setIsLoading(true);
    try {
      await onConfirm(updates);
      handleOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取选中选项的描述
  const getSelectedDescription = (
    value: string,
    options: ReadonlyArray<{ value: string; description: string }>
  ): string | null => {
    if (value === NO_CHANGE_VALUE) return null;
    const option = options.find((opt) => opt.value === value);
    return option?.description || null;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            批量调整镜头
          </DialogTitle>
          <DialogDescription>
            修改已选中的 {selectedPanelIds.length} 个分镜的镜头设置。
            留空表示不修改该属性。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 镜头角度 */}
          <div className="space-y-2">
            <Label htmlFor="camera-angle" className="text-sm font-medium">
              镜头角度
            </Label>
            <Select value={cameraAngle} onValueChange={setCameraAngle}>
              <SelectTrigger id="camera-angle">
                <SelectValue placeholder="选择镜头角度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE_VALUE}>
                  <span className="text-muted-foreground">不修改</span>
                </SelectItem>
                {CAMERA_ANGLES.map((angle) => (
                  <SelectItem key={angle.value} value={angle.value}>
                    {angle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getSelectedDescription(cameraAngle, CAMERA_ANGLES) && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                {getSelectedDescription(cameraAngle, CAMERA_ANGLES)}
              </p>
            )}
          </div>

          {/* 景别大小 */}
          <div className="space-y-2">
            <Label htmlFor="shot-size" className="text-sm font-medium">
              景别大小
            </Label>
            <Select value={shotSize} onValueChange={setShotSize}>
              <SelectTrigger id="shot-size">
                <SelectValue placeholder="选择景别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE_VALUE}>
                  <span className="text-muted-foreground">不修改</span>
                </SelectItem>
                {SHOT_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getSelectedDescription(shotSize, SHOT_SIZES) && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                {getSelectedDescription(shotSize, SHOT_SIZES)}
              </p>
            )}
          </div>

          {/* 分镜类型 */}
          <div className="space-y-2">
            <Label htmlFor="panel-type" className="text-sm font-medium">
              分镜类型
            </Label>
            <Select value={panelType} onValueChange={setPanelType}>
              <SelectTrigger id="panel-type">
                <SelectValue placeholder="选择分镜类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE_VALUE}>
                  <span className="text-muted-foreground">不修改</span>
                </SelectItem>
                {PANEL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getSelectedDescription(panelType, PANEL_TYPES) && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                {getSelectedDescription(panelType, PANEL_TYPES)}
              </p>
            )}
          </div>

          {/* 修改预览 */}
          {hasChanges && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium mb-2">将应用以下修改：</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {cameraAngle !== NO_CHANGE_VALUE && (
                  <li>
                    镜头角度 → <span className="text-foreground">{cameraAngle}</span>
                  </li>
                )}
                {shotSize !== NO_CHANGE_VALUE && (
                  <li>
                    景别大小 → <span className="text-foreground">{shotSize}</span>
                  </li>
                )}
                {panelType !== NO_CHANGE_VALUE && (
                  <li>
                    分镜类型 →{" "}
                    <span className="text-foreground">
                      {PANEL_TYPES.find((t) => t.value === panelType)?.label}
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
