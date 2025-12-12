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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PanelTemplate } from "@/types/template";

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PanelTemplate | null;
  projectId: string;
  selectedPanelIds?: string[];
  maxPanelOrder?: number;
  onApply: (data: ApplyTemplateData) => Promise<void>;
}

export interface ApplyTemplateData {
  templateId: string;
  projectId: string;
  mode: "insert" | "replace";
  insertAfterOrder?: number;
  targetPanelIds?: string[];
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  template,
  projectId,
  selectedPanelIds = [],
  maxPanelOrder = 0,
  onApply
}: ApplyTemplateDialogProps) {
  const [mode, setMode] = useState<"insert" | "replace">("insert");
  const [insertAfterOrder, setInsertAfterOrder] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const canReplace = selectedPanelIds.length > 0;

  const handleApply = async () => {
    if (!template) return;

    if (mode === "insert") {
      const orderValue = insertAfterOrder.trim();
      if (orderValue === "") {
        // Insert at end
        await handleApplyTemplate(-1);
      } else {
        const order = parseInt(orderValue, 10);
        if (isNaN(order) || order < 0 || order > maxPanelOrder) {
          return;
        }
        await handleApplyTemplate(order);
      }
    } else {
      // Replace mode
      if (selectedPanelIds.length === 0) {
        return;
      }
      await handleApplyTemplate();
    }
  };

  const handleApplyTemplate = async (insertOrder?: number) => {
    if (!template) return;

    setIsLoading(true);
    try {
      const data: ApplyTemplateData = {
        templateId: template.id,
        projectId,
        mode
      };

      if (mode === "insert" && insertOrder !== undefined) {
        data.insertAfterOrder = insertOrder;
      } else if (mode === "replace") {
        data.targetPanelIds = selectedPanelIds;
      }

      await onApply(data);
      onOpenChange(false);

      // Reset form
      setMode("insert");
      setInsertAfterOrder("");
    } catch (error) {
      console.error("Failed to apply template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!template) return null;

  const insertOrderNumber = insertAfterOrder.trim() === ""
    ? maxPanelOrder
    : parseInt(insertAfterOrder, 10);
  const isValidInsertOrder = insertAfterOrder.trim() === "" ||
    (!isNaN(insertOrderNumber) && insertOrderNumber >= 0 && insertOrderNumber <= maxPanelOrder);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>应用模板</DialogTitle>
          <DialogDescription>
            将「{template.name}」({template.panel_count} 个分镜) 应用到项目中
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode selection */}
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as "insert" | "replace")}>
            <div className="space-y-3">
              {/* Insert mode */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="insert" id="insert" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="insert" className="font-medium">
                    插入模式
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    在指定位置插入模板分镜，后续分镜自动后移
                  </p>
                  {mode === "insert" && (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="position" className="text-sm">
                        插入位置 (留空则插入到末尾)
                      </Label>
                      <Input
                        id="position"
                        type="number"
                        min={0}
                        max={maxPanelOrder}
                        placeholder={`0-${maxPanelOrder} (当前最大 ${maxPanelOrder})`}
                        value={insertAfterOrder}
                        onChange={(e) => setInsertAfterOrder(e.target.value)}
                      />
                      {insertAfterOrder && !isValidInsertOrder && (
                        <p className="text-sm text-destructive">
                          请输入 0-{maxPanelOrder} 之间的数字
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Replace mode */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="replace"
                  id="replace"
                  className="mt-1"
                  disabled={!canReplace}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="replace"
                    className={`font-medium ${!canReplace ? "text-muted-foreground" : ""}`}
                  >
                    替换模式
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    替换选中的分镜为模板分镜
                    {canReplace && ` (已选中 ${selectedPanelIds.length} 个分镜)`}
                  </p>
                  {!canReplace && (
                    <p className="text-sm text-destructive mt-1">
                      请先在分镜编辑器中选择要替换的分镜
                    </p>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>

          {/* Info alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {mode === "insert"
                ? `将在位置 ${insertOrderNumber} 之后插入 ${template.panel_count} 个分镜`
                : `将替换 ${selectedPanelIds.length} 个分镜为模板的 ${template.panel_count} 个分镜`
              }
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              isLoading ||
              (mode === "insert" && !isValidInsertOrder) ||
              (mode === "replace" && !canReplace)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                应用中...
              </>
            ) : (
              "应用模板"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
