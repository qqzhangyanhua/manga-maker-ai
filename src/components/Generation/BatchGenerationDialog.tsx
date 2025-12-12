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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Info, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BatchGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  selectedPanelIds: string[];
  onGenerate: (data: BatchGenerationData) => Promise<void>;
}

export interface BatchGenerationData {
  projectId: string;
  panelIds: string[];
  settings: {
    style?: string;
    quality: "standard" | "high";
    failureMode: "skip" | "stop";
  };
}

export function BatchGenerationDialog({
  open,
  onOpenChange,
  projectId,
  selectedPanelIds,
  onGenerate
}: BatchGenerationDialogProps) {
  const [style, setStyle] = useState<string>("");
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [failureMode, setFailureMode] = useState<"skip" | "stop">("skip");
  const [isLoading, setIsLoading] = useState(false);

  const panelCount = selectedPanelIds.length;
  const estimatedTime = panelCount * (quality === "high" ? 15 : 10);
  const estimatedMinutes = Math.ceil(estimatedTime / 60);

  const handleGenerate = async () => {
    if (panelCount === 0) return;

    setIsLoading(true);
    try {
      await onGenerate({
        projectId,
        panelIds: selectedPanelIds,
        settings: {
          style: style || undefined,
          quality,
          failureMode
        }
      });

      // Reset form
      setStyle("");
      setQuality("standard");
      setFailureMode("skip");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to start batch generation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>批量生成图片</DialogTitle>
          <DialogDescription>
            为选中的 {panelCount} 个分镜批量生成图片
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Style selection */}
          <div className="space-y-2">
            <Label htmlFor="style">漫画风格 (可选)</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger id="style">
                <SelectValue placeholder="使用项目默认风格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">使用项目默认风格</SelectItem>
                <SelectItem value="manga">日式漫画</SelectItem>
                <SelectItem value="american">美式漫画</SelectItem>
                <SelectItem value="webtoon">韩国网络漫画</SelectItem>
                <SelectItem value="chibi">Q版风格</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality selection */}
          <div className="space-y-2">
            <Label>图片质量</Label>
            <RadioGroup value={quality} onValueChange={(value) => setQuality(value as "standard" | "high")}>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="standard" id="standard" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="standard" className="font-medium cursor-pointer">
                    标准质量
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    更快的生成速度，适合快速预览 (~10秒/张)
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="high" id="high" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="high" className="font-medium cursor-pointer">
                    高质量
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    更精细的图片细节，推荐用于最终输出 (~15秒/张)
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Failure mode */}
          <div className="space-y-2">
            <Label>失败处理</Label>
            <RadioGroup value={failureMode} onValueChange={(value) => setFailureMode(value as "skip" | "stop")}>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="skip" id="skip" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="skip" className="font-medium cursor-pointer">
                    跳过失败项
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    遇到错误时跳过该分镜，继续处理后续分镜
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="stop" id="stop" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="stop" className="font-medium cursor-pointer">
                    停止任务
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    遇到错误时停止整个批量生成任务
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Info alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>分镜数量:</span>
                  <span className="font-medium">{panelCount} 个</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>预计时间:</span>
                  <span className="font-medium">约 {estimatedMinutes} 分钟</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>图片质量:</span>
                  <span className="font-medium">{quality === "high" ? "高质量" : "标准质量"}</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Warning for large batches */}
          {panelCount > 20 && (
            <Alert variant="destructive">
              <Zap className="h-4 w-4" />
              <AlertDescription className="text-sm">
                批量生成 {panelCount} 个分镜可能需要较长时间。建议分批生成以避免超时。
              </AlertDescription>
            </Alert>
          )}
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
            onClick={handleGenerate}
            disabled={panelCount === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                启动中...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                开始生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
