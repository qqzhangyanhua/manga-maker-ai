/**
 * Canvas 渲染工具
 * 用于在后台渲染页面 canvas 数据为图片
 */

import * as fabric from "fabric";

export interface RenderCanvasOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  multiplier?: number;
}

/**
 * 将 fabric.js JSON 数据渲染为 data URL
 */
export async function renderCanvasToDataUrl(
  canvasData: object,
  options: RenderCanvasOptions
): Promise<string> {
  const { width, height, backgroundColor = "#ffffff", multiplier = 1 } = options;

  // 创建离屏 canvas
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = width * multiplier;
  offscreenCanvas.height = height * multiplier;

  // 创建 fabric canvas
  const fabricCanvas = new fabric.Canvas(offscreenCanvas, {
    width: width * multiplier,
    height: height * multiplier,
    backgroundColor,
  });

  try {
    // 加载 canvas 数据
    await fabricCanvas.loadFromJSON(canvasData);

    // 如果有缩放，需要调整
    if (multiplier !== 1) {
      fabricCanvas.setZoom(multiplier);
    }

    fabricCanvas.renderAll();

    // 导出为 data URL
    const dataUrl = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1, // 已经在 canvas 级别处理了缩放
    });

    return dataUrl;
  } finally {
    // 清理资源
    fabricCanvas.dispose();
  }
}

/**
 * 生成缩略图（使用现有 canvas 或 canvas 数据）
 */
export function generateThumbnailFromCanvas(
  canvas: fabric.Canvas,
  options: { maxWidth?: number; maxHeight?: number } = {}
): string {
  const { maxWidth = 120, maxHeight = 160 } = options;

  const canvasWidth = canvas.width || 800;
  const canvasHeight = canvas.height || 600;

  // 计算缩放比例以适应最大尺寸
  const scaleX = maxWidth / canvasWidth;
  const scaleY = maxHeight / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1); // 不放大，只缩小

  // 生成缩略图
  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 0.8,
    multiplier: scale,
  });

  return dataUrl;
}

/**
 * 从 canvas 数据生成缩略图
 */
export async function generateThumbnailFromData(
  canvasData: object,
  pageSize: { width: number; height: number },
  options: { maxWidth?: number; maxHeight?: number } = {}
): Promise<string> {
  const { maxWidth = 120, maxHeight = 160 } = options;

  // 计算缩放比例
  const scaleX = maxWidth / pageSize.width;
  const scaleY = maxHeight / pageSize.height;
  const scale = Math.min(scaleX, scaleY, 1);

  // 创建小尺寸 canvas
  const thumbWidth = Math.round(pageSize.width * scale);
  const thumbHeight = Math.round(pageSize.height * scale);

  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = thumbWidth;
  offscreenCanvas.height = thumbHeight;

  const fabricCanvas = new fabric.Canvas(offscreenCanvas, {
    width: thumbWidth,
    height: thumbHeight,
    backgroundColor: "#ffffff",
  });

  try {
    await fabricCanvas.loadFromJSON(canvasData);
    fabricCanvas.setZoom(scale);
    fabricCanvas.renderAll();

    return fabricCanvas.toDataURL({
      format: "png",
      quality: 0.8,
      multiplier: 1,
    });
  } finally {
    fabricCanvas.dispose();
  }
}

/**
 * 批量渲染多个页面
 */
export async function renderMultiplePages(
  pages: Array<{
    id: string;
    pageOrder: number;
    width: number;
    height: number;
    canvasData?: object;
  }>,
  options: { multiplier?: number; onProgress?: (current: number, total: number) => void } = {}
): Promise<Array<{ id: string; pageOrder: number; width: number; height: number; dataUrl: string }>> {
  const { multiplier = 1, onProgress } = options;
  const results: Array<{ id: string; pageOrder: number; width: number; height: number; dataUrl: string }> = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    onProgress?.(i + 1, pages.length);

    if (page.canvasData) {
      const dataUrl = await renderCanvasToDataUrl(page.canvasData, {
        width: page.width,
        height: page.height,
        multiplier,
      });
      results.push({
        id: page.id,
        pageOrder: page.pageOrder,
        width: page.width,
        height: page.height,
        dataUrl,
      });
    } else {
      // 如果没有 canvas 数据，创建空白页
      const canvas = document.createElement("canvas");
      canvas.width = page.width * multiplier;
      canvas.height = page.height * multiplier;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      results.push({
        id: page.id,
        pageOrder: page.pageOrder,
        width: page.width,
        height: page.height,
        dataUrl: canvas.toDataURL("image/png"),
      });
    }
  }

  return results;
}
