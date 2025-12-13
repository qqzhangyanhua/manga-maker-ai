"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { fabric } from "fabric";

export type CanvasSchema = {
  objects: Record<string, any>[] | null;
  history?: Record<string, any>[][] | null;
  future?: Record<string, any>[][] | null;
  template?: string | null;
};

export type CanvasController = {
  setBackgroundImage: (url: string) => Promise<void>;
  addPanelTemplate: (type: "single" | "two-column" | "three-grid") => void;
  addBubble: () => void;
  clearOverlays: () => void;
  undo: () => void;
  redo: () => void;
  exportImage: () => Promise<string | null>;
  exportSchema: () => CanvasSchema;
  loadSchema: (schema?: CanvasSchema | null) => Promise<void>;
  getActiveTemplate: () => string | null;
};

type CanvasWorkspaceProps = {
  initialImage?: string | null;
  onHistoryChange?: (info: { undo: number; redo: number }) => void;
  onTemplateChange?: (template: string | null) => void;
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 1000;
const HISTORY_LIMIT = 20;

/**
 * Fabric.js 画布封装，支持撤销/重做与模板同步
 */
const CanvasWorkspace = forwardRef<CanvasController, CanvasWorkspaceProps>(
  ({ initialImage, onHistoryChange, onTemplateChange }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const historyRef = useRef<Record<string, any>[][]>([]);
    const futureRef = useRef<Record<string, any>[][]>([]);
    const templateRef = useRef<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      if (containerRef.current && !canvasRef.current) {
        canvasRef.current = new fabric.Canvas(containerRef.current, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: "#f5f5f5",
          selection: true,
        });
        canvasRef.current.add(
          new fabric.Text("上传或选择一张图片开始编辑", {
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
            fontSize: 20,
            fill: "#999",
            originX: "center",
            originY: "center",
          })
        );
        setReady(true);
      }

      return () => {
        canvasRef.current?.dispose();
        canvasRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (initialImage && ready) {
        setBackground(initialImage);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialImage, ready]);

    const notifyHistory = useCallback(() => {
      onHistoryChange?.({
        undo: historyRef.current.length,
        redo: futureRef.current.length,
      });
    }, [onHistoryChange]);

    const notifyTemplate = useCallback(() => {
      onTemplateChange?.(templateRef.current);
    }, [onTemplateChange]);

    const captureSnapshot = useCallback((): Record<string, any>[] => {
      if (!canvasRef.current) return [];
      return canvasRef.current
        .getObjects()
        .filter((obj) => obj.get("data-panel") || obj.get("data-bubble"))
        .map((obj) => obj.toObject(["data-panel", "data-bubble"]));
    }, []);

    const clearGuideObjects = useCallback(() => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const toRemove = canvas.getObjects().filter((obj) => obj.get("data-panel"));
      toRemove.forEach((obj) => canvas.remove(obj));
    }, []);

    const pushHistory = useCallback(() => {
      const snapshot = captureSnapshot();
      historyRef.current = [...historyRef.current, snapshot].slice(-HISTORY_LIMIT);
      futureRef.current = [];
      notifyHistory();
    }, [captureSnapshot, notifyHistory]);

    const clearOverlays = useCallback((trackHistory: boolean = true) => {
      if (trackHistory) {
        pushHistory();
      }
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const toRemove = canvas
        .getObjects()
        .filter((obj) => obj.get("data-panel") || obj.get("data-bubble"));
      toRemove.forEach((obj) => canvas.remove(obj));
      canvas.renderAll();
    }, [pushHistory]);

    const applySnapshot = useCallback((objects: Record<string, any>[] | null | undefined) => {
      if (!canvasRef.current) return;
      clearOverlays(false);
      if (!objects || objects.length === 0) {
        canvasRef.current.renderAll();
        return;
      }
      const canvas = canvasRef.current;
      fabric.util.enlivenObjects(objects, (enlivened) => {
        enlivened.forEach((obj) => canvas.add(obj));
        canvas.renderAll();
      });
    }, [clearOverlays]);

    const setBackground = async (url: string) => {
      return new Promise<void>((resolve) => {
        if (!canvasRef.current) return resolve();
        fabric.Image.fromURL(
          url,
          (img) => {
            const canvas = canvasRef.current!;
            const scaleX = CANVAS_WIDTH / img.width!;
            const scaleY = CANVAS_HEIGHT / img.height!;
            const scale = Math.min(scaleX, scaleY);
            img.scale(scale);
            canvas.setBackgroundImage(
              img,
              () => {
                canvas.renderAll();
                resolve();
              },
              {
                originX: "left",
                originY: "top",
                crossOrigin: "anonymous",
              }
            );
          },
          {
            crossOrigin: "anonymous",
            selectable: false,
          }
        );
      });
    };

    const addPanelTemplate = useCallback((type: "single" | "two-column" | "three-grid") => {
      if (!canvasRef.current) return;
      pushHistory();
      templateRef.current = type;
      notifyTemplate();
      clearGuideObjects();
      const canvas = canvasRef.current;
      const padding = 20;
      const panelOptions = {
        fill: "rgba(255,255,255,0.05)",
        stroke: "#ffb703",
        strokeDashArray: [8, 6],
        strokeWidth: 3,
        selectable: true,
        lockRotation: true,
      };

      if (type === "single") {
        const rect = new fabric.Rect({
          ...panelOptions,
          left: padding,
          top: padding,
          width: CANVAS_WIDTH - padding * 2,
          height: CANVAS_HEIGHT - padding * 2,
        });
        rect.set("data-panel", true);
        canvas.add(rect);
      } else if (type === "two-column") {
        const columnWidth = (CANVAS_WIDTH - padding * 3) / 2;
        for (let i = 0; i < 2; i++) {
          const rect = new fabric.Rect({
            ...panelOptions,
            left: padding + i * (columnWidth + padding),
            top: padding,
            width: columnWidth,
            height: CANVAS_HEIGHT - padding * 2,
          });
          rect.set("data-panel", true);
          canvas.add(rect);
        }
      } else {
        const rowHeight = (CANVAS_HEIGHT - padding * 4) / 3;
        const columnWidth = (CANVAS_WIDTH - padding * 3) / 2;
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 2; col++) {
            const rect = new fabric.Rect({
              ...panelOptions,
              left: padding + col * (columnWidth + padding),
              top: padding + row * (rowHeight + padding),
              width: columnWidth,
              height: rowHeight,
            });
            rect.set("data-panel", true);
            canvas.add(rect);
          }
        }
      }
      canvas.renderAll();
    }, [pushHistory, notifyTemplate, clearGuideObjects]);

    const addBubble = useCallback(() => {
      if (!canvasRef.current) return;
      pushHistory();
      const bubble = new fabric.Textbox("双击编辑对白", {
        left: CANVAS_WIDTH / 2 - 100,
        top: CANVAS_HEIGHT / 2 - 50,
        width: 200,
        fill: "#0f172a",
        fontSize: 20,
        fontFamily: "Noto Sans SC, system-ui",
        backgroundColor: "rgba(255,255,255,0.9)",
        padding: 12,
        borderColor: "#0f172a",
        cornerColor: "#0f172a",
        cornerSize: 12,
      });
      bubble.set("data-bubble", true);
      canvasRef.current.add(bubble);
      canvasRef.current.setActiveObject(bubble);
    }, [pushHistory]);

    const exportImage = async () => {
      if (!canvasRef.current) return null;
      const bg = canvasRef.current.backgroundImage;
      if (!bg) return null;
      return canvasRef.current.toDataURL({
        format: "png",
        multiplier: 1,
        enableRetinaScaling: true,
      });
    };

    const exportSchema = useCallback((): CanvasSchema => {
      const snapshot = captureSnapshot();
      return {
        objects: snapshot,
        history: historyRef.current,
        future: futureRef.current,
        template: templateRef.current,
      };
    }, [captureSnapshot]);

    const loadSchema = useCallback(async (schema?: CanvasSchema | null) => {
      if (!canvasRef.current) return;
      historyRef.current = (schema?.history as Record<string, any>[][]) || [];
      futureRef.current = (schema?.future as Record<string, any>[][]) || [];
      templateRef.current = schema?.template ?? null;
      notifyHistory();
      notifyTemplate();
      applySnapshot(schema?.objects || null);
    }, [notifyHistory, notifyTemplate, applySnapshot]);

    const undo = useCallback(() => {
      if (!canvasRef.current || historyRef.current.length === 0) return;
      const current = captureSnapshot();
      const previous = historyRef.current.pop();
      futureRef.current = [...futureRef.current, current].slice(-HISTORY_LIMIT);
      applySnapshot(previous || []);
      notifyHistory();
    }, [captureSnapshot, applySnapshot, notifyHistory]);

    const redo = useCallback(() => {
      if (!canvasRef.current || futureRef.current.length === 0) return;
      const current = captureSnapshot();
      const nextSnapshot = futureRef.current.pop();
      historyRef.current = [...historyRef.current, current].slice(-HISTORY_LIMIT);
      applySnapshot(nextSnapshot || []);
      notifyHistory();
    }, [captureSnapshot, applySnapshot, notifyHistory]);

    useImperativeHandle(
      ref,
      () => ({
        setBackgroundImage: setBackground,
        addPanelTemplate,
        addBubble,
        clearOverlays: () => clearOverlays(),
        undo,
        redo,
        exportImage,
        exportSchema,
        loadSchema,
        getActiveTemplate: () => templateRef.current,
      }),
      [addPanelTemplate, addBubble, clearOverlays, exportSchema, loadSchema, redo, undo]
    );

    return (
      <div className="flex-1 flex flex-col bg-muted/30 rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm text-muted-foreground">画布尺寸</p>
            <p className="font-medium text-foreground">
              {CANVAS_WIDTH} x {CANVAS_HEIGHT}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">支持拖拽、缩放、撤销 (⌘/Ctrl + Z)</div>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900/40 p-4">
          <canvas ref={containerRef as any} className="shadow-2xl rounded-lg border border-slate-800" />
        </div>
      </div>
    );
  }
);

CanvasWorkspace.displayName = "CanvasWorkspace";

export default CanvasWorkspace;
