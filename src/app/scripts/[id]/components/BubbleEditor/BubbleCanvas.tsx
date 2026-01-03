/**
 * 气泡画布组件 - 在分镜图片上渲染气泡
 * 功能增强版：支持拖拽位置、调整大小、双击编辑
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SpeechBubble, BUBBLE_PRESETS } from "./types";

export interface BubbleCanvasProps {
  bubble: SpeechBubble;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<SpeechBubble>) => void;
  onDelete: () => void;
  onDoubleClick?: () => void;
  allBubbles?: SpeechBubble[]; // 所有气泡（用于对齐检测）
  onShowGuides?: (guides: AlignmentGuide[]) => void; // 显示对齐参考线
}

export interface AlignmentGuide {
  type: "vertical" | "horizontal";
  position: number; // 百分比位置
}

type ResizeDirection = "nw" | "ne" | "sw" | "se" | null;

export function BubbleCanvas({
  bubble,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDoubleClick,
  allBubbles = [],
  onShowGuides,
}: BubbleCanvasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

  const bubbleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return; // 只响应左键

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
    onSelect();
  };

  // 处理调整大小开始
  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    setIsResizing(true);
    setResizeDirection(direction);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
    setOriginalSize({ ...bubble.size });
    setOriginalPosition({ ...bubble.position });
    onSelect();
  };

  // 处理双击编辑
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.();
  };

  // 处理拖拽和调整大小
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (isDragging && !isResizing) {
        // 拖拽移动位置
        const newX = bubble.position.x + (deltaX / containerRect.width) * 100;
        const newY = bubble.position.y + (deltaY / containerRect.height) * 100;

        // 对齐检测与吸附
        const SNAP_THRESHOLD = 2; // 吸附阈值（百分比）
        let snappedX = newX;
        let snappedY = newY;
        const guides: AlignmentGuide[] = [];

        // 获取同一分镜的其他气泡
        const otherBubbles = allBubbles.filter(
          (b) => b.panelId === bubble.panelId && b.id !== bubble.id
        );

        // 检测水平对齐（左边缘、中心、右边缘）
        for (const other of otherBubbles) {
          // 左边缘对齐
          if (Math.abs(newX - other.position.x) < SNAP_THRESHOLD) {
            snappedX = other.position.x;
            guides.push({ type: "vertical", position: other.position.x });
          }
          // 中心对齐
          const otherCenterX = other.position.x;
          if (Math.abs(newX - otherCenterX) < SNAP_THRESHOLD) {
            snappedX = otherCenterX;
            guides.push({ type: "vertical", position: otherCenterX });
          }
        }

        // 检测垂直对齐（上边缘、中心、下边缘）
        for (const other of otherBubbles) {
          // 上边缘对齐
          if (Math.abs(newY - other.position.y) < SNAP_THRESHOLD) {
            snappedY = other.position.y;
            guides.push({ type: "horizontal", position: other.position.y });
          }
          // 中心对齐
          const otherCenterY = other.position.y;
          if (Math.abs(newY - otherCenterY) < SNAP_THRESHOLD) {
            snappedY = otherCenterY;
            guides.push({ type: "horizontal", position: otherCenterY });
          }
        }

        // 显示参考线
        if (onShowGuides) {
          onShowGuides(guides);
        }

        // 限制在0-100范围内
        const clampedX = Math.max(0, Math.min(100, snappedX));
        const clampedY = Math.max(0, Math.min(100, snappedY));

        onUpdate({
          position: { x: clampedX, y: clampedY },
        });

        setDragStart({
          x: e.clientX,
          y: e.clientY,
        });
      } else if (isResizing && resizeDirection) {
        // 调整大小
        let newWidth = originalSize.width;
        let newHeight = originalSize.height;
        let newX = originalPosition.x;
        let newY = originalPosition.y;

        const deltaXPx = deltaX;
        const deltaYPx = deltaY;

        switch (resizeDirection) {
          case "se": // 右下角
            newWidth = Math.max(80, originalSize.width + deltaXPx);
            newHeight = Math.max(40, originalSize.height + deltaYPx);
            break;

          case "sw": // 左下角
            newWidth = Math.max(80, originalSize.width - deltaXPx);
            newHeight = Math.max(40, originalSize.height + deltaYPx);
            // 调整位置以保持右边固定
            newX = originalPosition.x + (deltaXPx / containerRect.width) * 100;
            break;

          case "ne": // 右上角
            newWidth = Math.max(80, originalSize.width + deltaXPx);
            newHeight = Math.max(40, originalSize.height - deltaYPx);
            // 调整位置以保持下边固定
            newY = originalPosition.y + (deltaYPx / containerRect.height) * 100;
            break;

          case "nw": // 左上角
            newWidth = Math.max(80, originalSize.width - deltaXPx);
            newHeight = Math.max(40, originalSize.height - deltaYPx);
            // 调整位置以保持右下角固定
            newX = originalPosition.x + (deltaXPx / containerRect.width) * 100;
            newY = originalPosition.y + (deltaYPx / containerRect.height) * 100;
            break;
        }

        // 限制最大尺寸
        newWidth = Math.min(400, newWidth);
        newHeight = Math.min(300, newHeight);

        onUpdate({
          size: { width: newWidth, height: newHeight },
          position: { x: newX, y: newY },
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
      // 清除参考线
      if (onShowGuides) {
        onShowGuides([]);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    resizeDirection,
    dragStart,
    bubble.position,
    bubble.size,
    originalSize,
    originalPosition,
    onUpdate,
  ]);

  const preset = BUBBLE_PRESETS[bubble.type];
  const style = bubble.style;

  // 根据气泡类型渲染不同形状
  const renderBubbleShape = () => {
    const commonClasses = cn(
      "w-full h-full flex items-center justify-center overflow-hidden",
      isDragging && "cursor-grabbing",
      !isDragging && !isResizing && "cursor-grab"
    );

    const textClasses = cn(
      "text-center break-words px-2 py-1",
      style.fontWeight === "bold" && "font-bold",
      style.fontStyle === "italic" && "italic"
    );

    const textStyle: React.CSSProperties = {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      color: style.color,
      textAlign: style.textAlign || "center",
    };

    const bubbleStyle: React.CSSProperties = {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderWidth: `${style.borderWidth || 0}px`,
      borderStyle: style.borderStyle || "solid",
      padding: `${style.padding || 8}px`,
    };

    const textContent = bubble.text || "双击编辑文字";

    switch (preset.shape) {
      case "rounded-rect":
        return (
          <div className={cn(commonClasses, "rounded-xl")} style={bubbleStyle}>
            <p className={textClasses} style={textStyle}>
              {textContent}
            </p>
          </div>
        );

      case "cloud":
        return (
          <div className={cn(commonClasses, "rounded-full")} style={bubbleStyle}>
            <p className={textClasses} style={textStyle}>
              {textContent}
            </p>
          </div>
        );

      case "rect":
        return (
          <div className={cn(commonClasses, "rounded")} style={bubbleStyle}>
            <p className={textClasses} style={textStyle}>
              {textContent}
            </p>
          </div>
        );

      case "star":
        return (
          <div
            className={cn(commonClasses, "rounded-lg")}
            style={{
              ...bubbleStyle,
              clipPath:
                "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            }}
          >
            <p className={textClasses} style={textStyle}>
              {textContent}
            </p>
          </div>
        );

      case "none":
        return (
          <div className={commonClasses}>
            <p className={textClasses} style={textStyle}>
              {textContent}
            </p>
          </div>
        );

      default:
        return (
          <div className={cn(commonClasses, "rounded-lg")} style={bubbleStyle}>
            <p className={textClasses} style={textStyle}>
              {textContent}
            </p>
          </div>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ pointerEvents: "none" }}
    >
      <div
        ref={bubbleRef}
        className={cn(
          "absolute pointer-events-auto group",
          isSelected && "ring-2 ring-orange-500 ring-offset-2 ring-offset-transparent"
        )}
        style={{
          left: `${bubble.position.x}%`,
          top: `${bubble.position.y}%`,
          width: `${bubble.size.width}px`,
          height: `${bubble.size.height}px`,
          transform: "translate(-50%, -50%)",
          zIndex: bubble.zIndex || 0,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {renderBubbleShape()}

        {/* Resize Handles - 仅在选中时显示 */}
        {isSelected && (
          <>
            {/* 左上角 */}
            <div
              className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-nw-resize hover:scale-125 transition-transform"
              onMouseDown={(e) => handleResizeStart(e, "nw")}
              onClick={(e) => e.stopPropagation()}
            />
            {/* 右上角 */}
            <div
              className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-ne-resize hover:scale-125 transition-transform"
              onMouseDown={(e) => handleResizeStart(e, "ne")}
              onClick={(e) => e.stopPropagation()}
            />
            {/* 左下角 */}
            <div
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-sw-resize hover:scale-125 transition-transform"
              onMouseDown={(e) => handleResizeStart(e, "sw")}
              onClick={(e) => e.stopPropagation()}
            />
            {/* 右下角 */}
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-se-resize hover:scale-125 transition-transform"
              onMouseDown={(e) => handleResizeStart(e, "se")}
              onClick={(e) => e.stopPropagation()}
            />
          </>
        )}
      </div>
    </div>
  );
}
