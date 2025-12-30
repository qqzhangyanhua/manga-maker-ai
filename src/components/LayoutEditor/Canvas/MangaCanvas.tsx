"use client";

/**
 * 漫画 Canvas 编辑器组件
 * 基于 Fabric.js 的 Canvas 编辑器
 */

import { useRef, useEffect, useCallback, useState } from "react";
import * as fabric from "fabric";
import { cn } from "@/lib/utils";
import { useLayoutEditorStore, useCurrentPage } from "@/stores/layout-editor-store";
import type { MangaCanvasData, PanelSlot, BubbleStyleConfig } from "@/types/layout";

interface MangaCanvasProps {
  className?: string;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  onSelectionChange?: (selectedId: string | null) => void;
  onCanvasModified?: () => void;
}

// 扩展 Fabric.js 对象类型
type MangaType = "panel" | "bubble" | "text" | "effect" | "decoration";

export function MangaCanvas({
  className,
  onCanvasReady,
  onSelectionChange,
  onCanvasModified,
}: MangaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { zoom, showGrid } = useLayoutEditorStore();
  const currentPage = useCurrentPage();

  const [isReady, setIsReady] = useState(false);

  // 初始化 Canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    setIsReady(true);

    // 通知外部 Canvas 已准备就绪
    onCanvasReady?.(canvas);

    // 选择事件
    canvas.on("selection:created", (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        const panelId = selected.get("mangaPanelId") as string | undefined;
        if (panelId) {
          onSelectionChange?.(panelId);
        }
      }
    });

    canvas.on("selection:cleared", () => {
      onSelectionChange?.(null);
    });

    // 修改事件
    canvas.on("object:modified", () => {
      onCanvasModified?.();
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [onCanvasReady, onSelectionChange, onCanvasModified]);

  // 更新 Canvas 尺寸
  useEffect(() => {
    if (!fabricRef.current || !currentPage) return;

    const canvas = fabricRef.current;
    canvas.setWidth(currentPage.width);
    canvas.setHeight(currentPage.height);
    canvas.renderAll();
  }, [currentPage?.width, currentPage?.height]);

  // 更新缩放
  useEffect(() => {
    if (!fabricRef.current) return;

    const canvas = fabricRef.current;
    const scale = zoom / 100;
    canvas.setZoom(scale);
    canvas.renderAll();
  }, [zoom]);

  // 显示/隐藏网格
  useEffect(() => {
    if (!fabricRef.current || !currentPage) return;

    const canvas = fabricRef.current;

    // 移除现有网格
    const existingGrid = canvas.getObjects().filter((obj) => {
      return obj.get("mangaType") === "decoration";
    });
    existingGrid.forEach((obj) => canvas.remove(obj));

    if (showGrid) {
      // 绘制网格
      const gridSize = 50;
      const width = currentPage.width;
      const height = currentPage.height;

      // 垂直线
      for (let x = 0; x <= width; x += gridSize) {
        const line = new fabric.Line([x, 0, x, height], {
          stroke: "#e0e0e0",
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        line.set("mangaType", "decoration");
        canvas.add(line);
        canvas.sendObjectToBack(line);
      }

      // 水平线
      for (let y = 0; y <= height; y += gridSize) {
        const line = new fabric.Line([0, y, width, y], {
          stroke: "#e0e0e0",
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        line.set("mangaType", "decoration");
        canvas.add(line);
        canvas.sendObjectToBack(line);
      }
    }

    canvas.renderAll();
  }, [showGrid, currentPage?.width, currentPage?.height]);

  // 加载 Canvas 数据
  const loadCanvasData = useCallback((data: MangaCanvasData) => {
    if (!fabricRef.current) return;

    const canvas = fabricRef.current;

    // 使用 fabric 6.x API
    if (data.objects && data.objects.length > 0) {
      fabric.util.enlivenObjects(data.objects as object[]).then((enlivened) => {
        const objects = enlivened as fabric.FabricObject[];
        objects.forEach((obj) => canvas.add(obj));
        canvas.renderAll();
      });
    }
  }, []);

  // 当页面切换时加载 Canvas 数据
  useEffect(() => {
    if (!fabricRef.current || !currentPage) return;

    const canvas = fabricRef.current;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";

    if (currentPage.canvasData) {
      loadCanvasData(currentPage.canvasData as MangaCanvasData);
    }

    canvas.renderAll();
  }, [currentPage?.id, loadCanvasData]);

  // 导出 Canvas 数据
  const exportCanvasData = useCallback((): MangaCanvasData | null => {
    if (!fabricRef.current || !currentPage) return null;

    const canvas = fabricRef.current;
    // fabric.js toJSON 实际上支持参数，但 TS 类型定义未声明
    const toJSONWithProps = (canvas as unknown as { toJSON: (props: string[]) => { objects: object[] } }).toJSON;
    const canvasJson = toJSONWithProps.call(canvas, ["mangaType", "mangaPanelId", "mangaSlotId", "mangaBubbleStyleId"]);
    const objects = canvasJson.objects;

    // 提取 panel mapping
    const panelMapping: Record<string, string> = {};
    objects.forEach((obj) => {
      const typedObj = obj as Record<string, unknown>;
      if (typedObj.mangaType === "panel") {
        const slotId = typedObj.mangaSlotId as string | undefined;
        const panelId = typedObj.mangaPanelId as string | undefined;
        if (slotId && panelId) {
          panelMapping[slotId] = panelId;
        }
      }
    });

    return {
      version: "1.0",
      objects,
      background: canvas.backgroundColor as string,
      mangaMeta: {
        pageSize: {
          width: currentPage.width,
          height: currentPage.height,
          dpi: currentPage.dpi,
        },
        templateId: currentPage.templateId,
        panelMapping,
      },
    };
  }, [currentPage]);

  // 添加 Panel 到 Canvas
  const addPanel = useCallback(
    async (imageUrl: string, slot: PanelSlot, panelId: string) => {
      if (!fabricRef.current || !currentPage) return;

      const canvas = fabricRef.current;

      try {
        const img = await fabric.FabricImage.fromURL(imageUrl, {
          crossOrigin: "anonymous",
        });

        const left = (slot.x / 100) * currentPage.width;
        const top = (slot.y / 100) * currentPage.height;
        const slotWidth = (slot.width / 100) * currentPage.width;
        const slotHeight = (slot.height / 100) * currentPage.height;

        img.set({
          left,
          top,
          scaleX: slotWidth / (img.width || 1),
          scaleY: slotHeight / (img.height || 1),
          angle: slot.rotation || 0,
        });

        // 添加自定义属性
        img.set("mangaType", "panel" as MangaType);
        img.set("mangaPanelId", panelId);
        img.set("mangaSlotId", slot.id);

        canvas.add(img);
        canvas.renderAll();
      } catch (error) {
        console.error("Failed to add panel image:", error);
      }
    },
    [currentPage]
  );

  // 添加气泡
  const addBubble = useCallback(
    (
      text: string,
      position: { x: number; y: number },
      styleConfig?: Partial<BubbleStyleConfig>
    ) => {
      if (!fabricRef.current) return;

      const canvas = fabricRef.current;

      // 创建气泡背景
      const bubble = new fabric.Rect({
        width: 180,
        height: 60,
        rx: 15,
        ry: 15,
        fill: styleConfig?.backgroundColor || "#ffffff",
        stroke: styleConfig?.borderColor || "#000000",
        strokeWidth: styleConfig?.borderWidth || 2,
        originX: "center",
        originY: "center",
      });

      // 创建文字
      const textbox = new fabric.Textbox(text || "输入文字...", {
        width: 160,
        fontSize: styleConfig?.defaultTextStyle?.fontSize || 16,
        fontFamily: styleConfig?.defaultTextStyle?.fontFamily || "Noto Sans SC",
        fill: styleConfig?.defaultTextStyle?.color || "#000000",
        textAlign: (styleConfig?.defaultTextStyle?.textAlign as CanvasTextAlign) || "center",
        originX: "center",
        originY: "center",
      });

      // 组合成 Group
      const group = new fabric.Group([bubble, textbox], {
        left: position.x,
        top: position.y,
      });

      group.set("mangaType", "bubble" as MangaType);

      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();

      return group;
    },
    []
  );

  // 添加文字
  const addText = useCallback((text: string, position: { x: number; y: number }) => {
    if (!fabricRef.current) return;

    const canvas = fabricRef.current;

    const textbox = new fabric.Textbox(text || "输入文字", {
      left: position.x,
      top: position.y,
      width: 200,
      fontSize: 24,
      fontFamily: "Noto Sans SC",
      fill: "#000000",
    });

    textbox.set("mangaType", "text" as MangaType);

    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.renderAll();

    return textbox;
  }, []);

  // 删除选中对象
  const deleteSelected = useCallback(() => {
    if (!fabricRef.current) return;

    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();

    if (activeObject) {
      canvas.remove(activeObject);
      canvas.renderAll();
    }
  }, []);

  // 暴露方法给外部
  useEffect(() => {
    if (!isReady) return;

    // 将方法挂载到 window 上供调试使用
    (window as unknown as { mangaCanvas: unknown }).mangaCanvas = {
      loadCanvasData,
      exportCanvasData,
      addPanel,
      addBubble,
      addText,
      deleteSelected,
      getCanvas: () => fabricRef.current,
    };
  }, [isReady, loadCanvasData, exportCanvasData, addPanel, addBubble, addText, deleteSelected]);

  // 计算容器样式
  const scale = zoom / 100;
  const canvasStyle = {
    transform: `scale(${scale})`,
    transformOrigin: "center center",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 overflow-auto bg-muted/50 flex items-center justify-center p-8",
        className
      )}
    >
      <div
        className="shadow-lg"
        style={canvasStyle}
      >
        <canvas
          ref={canvasRef}
          width={currentPage?.width || 1080}
          height={currentPage?.height || 1920}
        />
      </div>
    </div>
  );
}
