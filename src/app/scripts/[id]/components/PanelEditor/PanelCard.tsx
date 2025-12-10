/**
 * 分镜卡片组件
 * 显示单个分镜的详细信息
 */

"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PanelGenerationProgress } from "./PanelGenerationProgress";
import type { Panel, GenerationTask } from "../../types/script-editor.types";

interface PanelCardProps {
  panel: Panel;
  index: number;
  actions?: React.ReactNode;
  generationTask?: GenerationTask;
  onRetryGeneration?: () => void;
  onCancelGeneration?: () => void;
}

export function PanelCard({
  panel,
  index,
  actions,
  generationTask,
  onRetryGeneration,
  onCancelGeneration,
}: PanelCardProps) {
  const imageUrl = panel.generated_image || panel.image_url;

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Shot #{index + 1}</Badge>
          {panel.shot_size && (
            <Badge variant="outline">{panel.shot_size}</Badge>
          )}
          {panel.camera_angle && (
            <Badge variant="outline">{panel.camera_angle}</Badge>
          )}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">画面描述</Label>
            <p className="text-sm">{panel.description || "无描述"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">对白</Label>
            <p className="text-sm italic text-muted-foreground">
              {panel.character_name ? `${panel.character_name}: ` : ""}
              {panel.dialogue || "无对白"}
            </p>
          </div>
        </div>

        {/* 生成进度显示 */}
        {generationTask && (
          <PanelGenerationProgress
            task={generationTask}
            onRetry={onRetryGeneration}
            onCancel={onCancelGeneration}
          />
        )}
      </CardContent>
      {imageUrl && (
        <CardFooter className="bg-muted/10 p-0 overflow-hidden rounded-b-lg">
          <div className="w-full h-32 relative">
            <img
              src={imageUrl}
              alt="Shot preview"
              className="w-full h-full object-cover"
            />
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
