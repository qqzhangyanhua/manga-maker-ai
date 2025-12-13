/**
 * 分镜卡片组件
 * 显示单个分镜的详细信息
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, AlertCircle, Edit2, Maximize2 } from "lucide-react";
import { PanelGenerationProgress } from "./PanelGenerationProgress";
import { ImagePreviewDialog } from "@/components/ImagePreview/ImagePreviewDialog";
import type { Panel, GenerationTask } from "../../types/script-editor.types";

interface PanelCardProps {
  panel: Panel;
  index: number;
  actions?: React.ReactNode;
  generationTask?: GenerationTask;
  onRetryGeneration?: () => void;
  onCancelGeneration?: () => void;
  compact?: boolean; // 紧凑模式，用于布局组内显示
}

export function PanelCard({
  panel,
  index,
  actions,
  generationTask,
  onRetryGeneration,
  onCancelGeneration,
  compact = false,
}: PanelCardProps) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageUrl = panel.generated_image || panel.image_url;

  return (
    <>
      <Card className={`group hover:border-primary/50 transition-colors ${compact ? "text-sm" : ""}`}>
        <CardHeader className={`flex flex-row items-start justify-between space-y-0 ${compact ? "pb-1 pt-3 px-3" : "pb-2"}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className={compact ? "text-xs px-1.5 py-0" : ""}>
              #{index + 1}
            </Badge>
            {panel.shot_size && (
              <Badge variant="outline" className={compact ? "text-xs px-1.5 py-0" : ""}>
                {panel.shot_size}
              </Badge>
            )}
            {!compact && panel.camera_angle && (
              <Badge variant="outline">{panel.camera_angle}</Badge>
            )}

            {/* 角色绑定状态 - 紧凑模式下简化显示 */}
            {compact ? (
              panel.character_id ? (
                <User className="w-3 h-3 text-green-600" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-500" />
              )
            ) : (
              panel.character_id ? (
                <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
                  <User className="w-3 h-3 mr-1" />
                  角色已绑定
                </Badge>
              ) : (
                <Badge variant="default" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  未绑定角色
                </Badge>
              )
            )}
          </div>
          {actions}
        </CardHeader>
        <CardContent className={compact ? "pt-2 px-3 pb-2" : "pt-4"}>
          {compact ? (
            // 紧凑模式：只显示描述，单列
            <div className="space-y-1">
              <p className="text-xs line-clamp-2">{panel.description || "无描述"}</p>
              {panel.dialogue && (
                <p className="text-xs italic text-muted-foreground line-clamp-1">
                  {panel.dialogue}
                </p>
              )}
            </div>
          ) : (
            // 正常模式：显示完整内容
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
          )}

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
          <CardFooter className={`bg-muted/10 p-0 overflow-hidden rounded-b-lg`}>
            <div className={`w-full relative group/image ${compact ? "h-24" : "h-32"}`}>
              <img
                src={imageUrl}
                alt="Shot preview"
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setPreviewOpen(true)}
              />
              {/* 图片操作按钮 */}
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/image:opacity-100">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewOpen(true);
                  }}
                >
                  <Maximize2 className="w-4 h-4 mr-1" />
                  预览
                </Button>
                {!compact && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/panel/editor/${panel.id}`);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                )}
              </div>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* 图片预览对话框 */}
      <ImagePreviewDialog
        open={previewOpen}
        imageUrl={imageUrl}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
