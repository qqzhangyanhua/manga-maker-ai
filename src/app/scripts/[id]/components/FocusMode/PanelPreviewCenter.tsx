"use client";

/**
 * 中央预览区组件
 * 显示大图预览和生成进度
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  ZoomIn,
  Download,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusMode } from "../../contexts/FocusModeContext";

interface PanelPreviewCenterProps {
  className?: string;
}

export function PanelPreviewCenter({ className }: PanelPreviewCenterProps) {
  const { state, actions, panels } = useFocusMode();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const currentPanel = state.currentPanel;
  const currentIndex = panels.findIndex((p) => p.id === state.currentPanelId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < panels.length - 1;

  // 获取显示的图片URL
  const displayImageUrl = state.showOriginal
    ? currentPanel?.generated_image
    : state.previewImageUrl || currentPanel?.generated_image;

  const handleDownload = () => {
    if (!displayImageUrl) return;
    
    const link = document.createElement("a");
    link.href = displayImageUrl;
    link.download = `panel-${currentPanel?.panel_order || "image"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("flex flex-col h-full bg-[#0f0f13]", className)}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {/* 导航按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.goToPreviousPanel}
            disabled={!hasPrevious}
            className="text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.goToNextPanel}
            disabled={!hasNext}
            className="text-gray-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* 分镜信息 */}
          <div className="flex items-center gap-2 ml-2">
            <Badge variant="outline" className="text-orange-400 border-orange-400">
              分镜 #{currentPanel?.panel_order}
            </Badge>
            <span className="text-sm text-gray-400">
              {currentIndex + 1} / {panels.length}
            </span>
          </div>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-2">
          {displayImageUrl && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(displayImageUrl, "_blank")}
                className="text-gray-400 hover:text-white"
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                全屏查看
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-gray-400 hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 中央预览区 */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {/* 装饰光晕 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

        <div className="relative w-full h-full max-w-5xl mx-auto">
          {state.isGenerating ? (
            // 生成中状态
            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-orange-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-white mb-2">正在生成图片...</p>
                <p className="text-sm text-gray-400">
                  使用模型: {state.config.modelName}
                </p>
              </div>
              <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                  style={{ width: `${state.generationProgress}%` }}
                />
              </div>
            </div>
          ) : displayImageUrl ? (
            // 图片预览
            <div className="w-full h-full flex items-center justify-center">
              <div className="relative max-w-full max-h-full">
                <img
                  src={displayImageUrl}
                  alt={`分镜 ${currentPanel?.panel_order}`}
                  className={cn(
                    "max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300",
                    isImageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setIsImageLoaded(true)}
                />
                
                {!isImageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                  </div>
                )}

                {/* 图片类型标签 */}
                {!state.showOriginal && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-green-500/90 text-white">
                      新生成
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // 空状态
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500/10 to-purple-500/10 flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-white mb-2">暂无图片</p>
                <p className="text-sm text-gray-400">
                  在右侧配置后点击"生成图片"按钮开始创作
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部描述区 */}
      {currentPanel && (
        <div className="p-6 border-t border-gray-800 bg-[#16161a]/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-400 mb-2">分镜描述</h4>
                <p className="text-base text-white leading-relaxed">
                  {currentPanel.description || "无描述"}
                </p>
              </div>
            </div>
            
            {currentPanel.prompt_used && (
              <div className="flex items-start gap-3 mt-4 pt-4 border-t border-gray-800">
                <Sparkles className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">使用的提示词</h4>
                  <p className="text-sm text-gray-300 font-mono bg-black/30 p-3 rounded-lg">
                    {currentPanel.prompt_used}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

