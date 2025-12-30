/**
 * Canvas 对象创建 Hook
 * 抽取气泡和特效的创建逻辑
 */

import { useCallback } from "react";
import * as fabric from "fabric";
import { useToast } from "@/hooks/use-toast";
import { generateEffectPath, type EffectConfig } from "@/components/LayoutEditor/Effects";
import type { BubbleStyleConfig } from "@/types/layout";

interface UseCanvasObjectsOptions {
  canvas: fabric.Canvas | null;
  onModified?: () => void;
}

/** 自定义属性扩展接口 */
interface MangaObjectProps {
  mangaType?: string;
  effectType?: string;
}

/** 将 fabric 对象 JSON 序列化时包含自定义属性 */
export const MANGA_CUSTOM_PROPS = ["mangaType", "mangaPanelId", "mangaSlotId", "effectType"];

/**
 * 获取 canvas 的 JSON 数据（包含自定义属性）
 */
export function getCanvasJSON(canvas: fabric.Canvas): object {
  const toJSONWithProps = (canvas as unknown as { toJSON: (props: string[]) => object }).toJSON;
  return toJSONWithProps.call(canvas, MANGA_CUSTOM_PROPS);
}

export function useCanvasObjects({ canvas, onModified }: UseCanvasObjectsOptions) {
  const { toast } = useToast();

  /**
   * 创建气泡形状
   */
  const createBubble = useCallback(
    (styleConfig: BubbleStyleConfig) => {
      if (!canvas) {
        toast({ title: "画布未初始化", variant: "destructive" });
        return null;
      }

      const bubbleWidth = 150;
      const bubbleHeight = 80;
      const centerX = (canvas.width || 800) / 2;
      const centerY = (canvas.height || 600) / 2;

      let bubbleShape: fabric.FabricObject & MangaObjectProps;

      const baseProps = {
        fill: styleConfig.backgroundColor,
        stroke: styleConfig.borderColor,
        strokeWidth: styleConfig.borderWidth,
        strokeDashArray: styleConfig.borderStyle === "dashed" ? [8, 4] : undefined,
        opacity: styleConfig.backgroundOpacity,
      };

      switch (styleConfig.shape) {
        case "cloud":
          bubbleShape = new fabric.Ellipse({
            left: centerX - bubbleWidth / 2,
            top: centerY - bubbleHeight / 2,
            rx: bubbleWidth / 2,
            ry: bubbleHeight / 2,
            ...baseProps,
          }) as fabric.Ellipse & MangaObjectProps;
          break;

        case "explosion": {
          const points: fabric.XY[] = [];
          const outerRadius = Math.min(bubbleWidth, bubbleHeight) / 2;
          const innerRadius = outerRadius * 0.6;
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4 - Math.PI / 2;
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
          }
          bubbleShape = new fabric.Polygon(points, {
            left: centerX - outerRadius,
            top: centerY - outerRadius,
            fill: styleConfig.backgroundColor,
            stroke: styleConfig.borderColor,
            strokeWidth: styleConfig.borderWidth,
            opacity: styleConfig.backgroundOpacity,
          }) as fabric.Polygon & MangaObjectProps;
          break;
        }

        case "rectangle":
          bubbleShape = new fabric.Rect({
            left: centerX - bubbleWidth / 2,
            top: centerY - bubbleHeight / 2,
            width: bubbleWidth,
            height: bubbleHeight,
            rx: 4,
            ry: 4,
            ...baseProps,
          }) as fabric.Rect & MangaObjectProps;
          break;

        default: // rounded
          bubbleShape = new fabric.Rect({
            left: centerX - bubbleWidth / 2,
            top: centerY - bubbleHeight / 2,
            width: bubbleWidth,
            height: bubbleHeight,
            rx: 16,
            ry: 16,
            ...baseProps,
          }) as fabric.Rect & MangaObjectProps;
      }

      bubbleShape.mangaType = "bubble";
      return bubbleShape;
    },
    [canvas, toast]
  );

  /**
   * 添加气泡到画布
   */
  const addBubble = useCallback(
    (styleConfig: BubbleStyleConfig) => {
      const bubble = createBubble(styleConfig);
      if (!bubble || !canvas) return;

      canvas.add(bubble);
      canvas.setActiveObject(bubble);
      canvas.renderAll();
      onModified?.();
      toast({ title: "气泡已添加到画布" });
    },
    [canvas, createBubble, onModified, toast]
  );

  /**
   * 创建特效形状
   */
  const createEffect = useCallback(
    (effect: EffectConfig) => {
      if (!canvas) {
        toast({ title: "画布未初始化", variant: "destructive" });
        return null;
      }

      const effectSize = 100;
      const centerX = (canvas.width || 800) / 2;
      const centerY = (canvas.height || 600) / 2;

      const pathData = generateEffectPath(effect.type, effectSize);

      const effectPath = new fabric.Path(pathData, {
        left: centerX - effectSize / 2,
        top: centerY - effectSize / 2,
        fill: effect.color || "#000000",
        stroke: effect.color || "#000000",
        strokeWidth: 2,
        opacity: 0.8,
      }) as fabric.Path & MangaObjectProps;

      effectPath.mangaType = "effect";
      effectPath.effectType = effect.type;

      return effectPath;
    },
    [canvas, toast]
  );

  /**
   * 添加特效到画布
   */
  const addEffect = useCallback(
    (effect: EffectConfig) => {
      const effectObj = createEffect(effect);
      if (!effectObj || !canvas) return;

      canvas.add(effectObj);
      canvas.setActiveObject(effectObj);
      canvas.renderAll();
      onModified?.();
      toast({ title: `${effect.name}特效已添加` });
    },
    [canvas, createEffect, onModified, toast]
  );

  return {
    addBubble,
    addEffect,
    createBubble,
    createEffect,
  };
}
