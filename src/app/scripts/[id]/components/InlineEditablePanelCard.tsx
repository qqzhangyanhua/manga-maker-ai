/**
 * 可 Inline 编辑的分镜卡片
 * 在原有 PanelCard 基础上添加字段级别的 inline 编辑能力
 */

"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, AlertCircle, Maximize2, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { InlineEditableField } from "./InlineEditableField";
import { ImagePreviewDialog } from "@/components/ImagePreview/ImagePreviewDialog";
import type { Panel } from "../types/script-editor.types";

interface InlineEditablePanelCardProps {
  panel: Panel;
  index: number;
  actions?: React.ReactNode;
  onPanelUpdate?: (panelId: string, field: string, value: string) => Promise<void>;
  compact?: boolean;
}

export function InlineEditablePanelCard({
  panel,
  index,
  actions,
  onPanelUpdate,
  compact = false,
}: InlineEditablePanelCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageUrl = (panel.generated_image || panel.image_url) ?? null;

  // 保存字段
  const handleSaveField = useCallback(
    async (field: string, value: string) => {
      if (!onPanelUpdate) return;

      try {
        await onPanelUpdate(panel.id, field, value);
      } catch (error) {
        toast({
          title: "保存失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        throw error; // 重新抛出以便 InlineEditableField 显示错误状态
      }
    },
    [panel.id, onPanelUpdate, toast]
  );

  // 检查是否为流式生成中的临时分镜
  const isGenerating =
    (panel as Panel & { _isGenerating?: boolean })._isGenerating || false;

  return (
    <>
      <Card
        className={`group hover:border-primary/50 transition-colors ${
          compact ? "text-sm" : ""
        }`}
      >
        <CardHeader
          className={`flex flex-row items-start justify-between space-y-0 ${
            compact ? "pb-1 pt-3 px-3" : "pb-2"
          }`}
        >
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

            {/* 角色绑定状态 */}
            {compact ? (
              panel.character_id ? (
                <User className="w-3 h-3 text-green-600" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-500" />
              )
            ) : (
              panel.character_id ? (
                <Badge
                  variant="default"
                  className="bg-green-500/10 text-green-700 border-green-500/20"
                >
                  <User className="w-3 h-3 mr-1" />
                  角色已绑定
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="bg-amber-500/10 text-amber-700 border-amber-500/20"
                >
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
            // 紧凑模式：只显示描述，不可编辑
            <div className="space-y-1">
              <p className="text-xs line-clamp-2">
                {(panel as Panel & { visual_description?: string }).visual_description ||
                  panel.description ||
                  "无描述"}
              </p>
              {panel.dialogue && (
                <p className="text-xs italic text-muted-foreground line-clamp-1">
                  {panel.dialogue}
                </p>
              )}
            </div>
          ) : isGenerating ? (
            // 生成中：显示原始内容，不可编辑
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">画面描述</span>
                <p className="text-sm">
                  {(panel as Panel & { visual_description?: string }).visual_description ||
                    panel.description ||
                    "生成中..."}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">对白</span>
                <p className="text-sm italic text-muted-foreground">
                  {panel.dialogue || "生成中..."}
                </p>
              </div>
            </div>
          ) : (
            // 正常模式：可 inline 编辑
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InlineEditableField
                value={
                  (panel as Panel & { visual_description?: string }).visual_description ||
                  panel.description ||
                  ""
                }
                onSave={(value) => handleSaveField("visual_description", value)}
                label="画面描述"
                placeholder="描述这个分镜的画面内容..."
                multiline
                maxRows={4}
              />

              <InlineEditableField
                value={panel.dialogue || ""}
                onSave={(value) => handleSaveField("dialogue", value)}
                label="对白"
                placeholder="角色的对白内容..."
                multiline
                maxRows={3}
              />
            </div>
          )}

          {/* 角色描述（可选显示） */}
          {!compact &&
            (panel as Panel & { character_descriptions?: string })
              .character_descriptions && (
              <div className="mt-4">
                <InlineEditableField
                  value={
                    (panel as Panel & { character_descriptions?: string })
                      .character_descriptions || ""
                  }
                  onSave={(value) => handleSaveField("character_descriptions", value)}
                  label="角色描述"
                  placeholder="描述出场角色..."
                  multiline
                  maxRows={2}
                />
              </div>
            )}
        </CardContent>

        {imageUrl && (
          <CardFooter className="bg-muted/10 p-0 overflow-hidden rounded-b-lg">
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
