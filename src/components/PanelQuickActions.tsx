/**
 * 分镜快捷操作组件
 * 单个分镜的生成、查看、编辑操作
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wand2,
  Eye,
  Edit2,
  MoreVertical,
  Download,
  Trash2,
} from "lucide-react";
import { PanelImageViewer } from "./PanelImageViewer";
import { useToast } from "@/hooks/use-toast";

interface Panel {
  id: string;
  panel_order?: number;
  generated_image?: string;
  image_url?: string;
  description?: string;
}

interface PanelQuickActionsProps {
  panel: Panel;
  onGenerateImage: (panelId: string) => void;
  onEditPanel?: (panelId: string) => void;
  onDeletePanel?: (panelId: string) => void;
  onRefresh?: () => void;
}

export function PanelQuickActions({
  panel,
  onGenerateImage,
  onEditPanel,
  onDeletePanel,
  onRefresh,
}: PanelQuickActionsProps) {
  const { toast } = useToast();
  const [viewerOpen, setViewerOpen] = useState(false);

  const imageUrl = panel.generated_image || panel.image_url;
  const hasImage = !!imageUrl;

  const handleDownload = () => {
    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `panel-${panel.panel_order || panel.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "下载成功",
      description: "图片已保存到本地",
    });
  };

  return (
    <>
      {/* 悬停显示的操作按钮 */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {hasImage ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setViewerOpen(true);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Eye className="w-4 h-4 mr-1" />
              查看
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateImage(panel.id);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Wand2 className="w-4 h-4 mr-1" />
              重新生成
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onGenerateImage(panel.id);
            }}
            className="bg-gradient-to-r from-orange-500 to-orange-600"
          >
            <Wand2 className="w-4 h-4 mr-1" />
            生成图片
          </Button>
        )}

        {/* 更多操作菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 px-2"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
            {onEditPanel && (
              <DropdownMenuItem
                onClick={() => onEditPanel(panel.id)}
                className="text-gray-300 hover:bg-gray-800 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                编辑分镜
              </DropdownMenuItem>
            )}
            {hasImage && (
              <DropdownMenuItem
                onClick={handleDownload}
                className="text-gray-300 hover:bg-gray-800 cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </DropdownMenuItem>
            )}
            {onDeletePanel && (
              <DropdownMenuItem
                onClick={() => onDeletePanel(panel.id)}
                className="text-red-400 hover:bg-gray-800 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除分镜
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 图片查看器 */}
      {hasImage && (
        <PanelImageViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          imageUrl={imageUrl}
          panelTitle={panel.description}
          panelOrder={panel.panel_order}
        />
      )}
    </>
  );
}
