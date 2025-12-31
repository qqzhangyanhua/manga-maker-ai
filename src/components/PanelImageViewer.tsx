/**
 * 分镜图片查看器
 * 支持单图查看、缩放、下载
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface PanelImageViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  panelTitle?: string;
  panelOrder?: number;
}

export function PanelImageViewer({
  open,
  onOpenChange,
  imageUrl,
  panelTitle,
  panelOrder,
}: PanelImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `panel-${panelOrder || "image"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {panelTitle || `分镜 #${panelOrder || ""}`}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-400 min-w-[3rem] text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                重置
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="bg-gradient-to-r from-orange-500 to-orange-600"
              >
                <Download className="w-4 h-4 mr-1" />
                下载
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-center p-6 bg-gray-950 overflow-auto max-h-[calc(90vh-80px)]">
          <img
            src={imageUrl}
            alt={panelTitle || "分镜图片"}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: "transform 0.2s ease-in-out",
            }}
            className="max-w-full h-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
