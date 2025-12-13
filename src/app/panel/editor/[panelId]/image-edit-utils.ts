import { BubbleOptions, BubbleStyle, CropArea, FilterOptions } from "./types";

export function hexToRgba(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  if (Number.isNaN(bigint)) {
    return `rgba(255,255,255,${opacity / 100})`;
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

export function drawBubbleShape(
  ctx: CanvasRenderingContext2D,
  style: BubbleStyle,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (style === "pointer") {
    const tailWidth = width * 0.18;
    const tailHeight = height * 0.2;
    const tailX = x + width * 0.55;
    const tailY = y + height;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(tailX + tailWidth, y + height);
    ctx.lineTo(tailX + tailWidth / 2, tailY + tailHeight);
    ctx.lineTo(tailX, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    return;
  }

  if (style === "oval") {
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
    return;
  }

  if (style === "cloud") {
    ctx.beginPath();
    ctx.moveTo(x + width * 0.25, y);
    ctx.quadraticCurveTo(x, y, x + width * 0.15, y + height * 0.25);
    ctx.quadraticCurveTo(x, y + height, x + width * 0.3, y + height * 0.75);
    ctx.quadraticCurveTo(x + width * 0.5, y + height * 1.05, x + width * 0.7, y + height * 0.75);
    ctx.quadraticCurveTo(x + width, y + height, x + width * 0.85, y + height * 0.4);
    ctx.quadraticCurveTo(x + width, y, x + width * 0.6, y + height * 0.1);
    ctx.closePath();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function applyEditsToImage(
  imageUrl: string,
  options: {
    rotation: number;
    filters: FilterOptions;
    crop: CropArea;
    bubble: BubbleOptions;
  },
) {
  if (typeof window === "undefined") {
    throw new Error("当前环境不支持本地编辑");
  }

  const { rotation: rotateDeg, filters: filterOptions, crop: cropArea, bubble: bubbleOptions } =
    options;
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("图片加载失败或跨域受限"));
  });

  const cropX = (cropArea.x / 100) * img.width;
  const cropY = (cropArea.y / 100) * img.height;
  const cropWidth = Math.max(1, Math.round((cropArea.width / 100) * img.width));
  const cropHeight = Math.max(1, Math.round((cropArea.height / 100) * img.height));

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) {
    throw new Error("画布初始化失败");
  }

  cropCtx.filter = `brightness(${filterOptions.brightness}%) contrast(${filterOptions.contrast}%) saturate(${filterOptions.saturation}%) grayscale(${filterOptions.grayscale}%) blur(${filterOptions.blur}px)`;
  cropCtx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const rad = (rotateDeg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotatedWidth = Math.max(1, Math.ceil(cropWidth * cos + cropHeight * sin));
  const rotatedHeight = Math.max(1, Math.ceil(cropWidth * sin + cropHeight * cos));

  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = rotatedWidth;
  rotatedCanvas.height = rotatedHeight;
  const rotatedCtx = rotatedCanvas.getContext("2d");
  if (!rotatedCtx) {
    throw new Error("旋转画布初始化失败");
  }

  // 保存变换状态，用于旋转图片
  rotatedCtx.save();
  rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotatedCtx.rotate(rad);
  rotatedCtx.drawImage(cropCanvas, -cropWidth / 2, -cropHeight / 2);
  // 恢复变换状态，确保后续气泡绘制使用正常坐标系
  rotatedCtx.restore();

  // 调试信息：记录气泡参数
  console.log("气泡绘制参数：", {
    show: bubbleOptions.show,
    hasText: !!bubbleOptions.text.trim(),
    text: bubbleOptions.text,
    originalX: bubbleOptions.x,
    originalY: bubbleOptions.y,
    originalWidth: bubbleOptions.width,
    originalHeight: bubbleOptions.height,
    cropArea,
  });

  if (bubbleOptions.show && bubbleOptions.text.trim()) {
    const bubbleRelativeX = ((bubbleOptions.x - cropArea.x) / cropArea.width) * 100;
    const bubbleRelativeY = ((bubbleOptions.y - cropArea.y) / cropArea.height) * 100;
    const bubbleRelativeWidth = (bubbleOptions.width / cropArea.width) * 100;
    const bubbleRelativeHeight = (bubbleOptions.height / cropArea.height) * 100;
    const bubbleHalfWidth = bubbleRelativeWidth / 2;
    const bubbleHalfHeight = bubbleRelativeHeight / 2;
    const bubbleInBounds =
      bubbleRelativeX + bubbleHalfWidth > 0 &&
      bubbleRelativeX - bubbleHalfWidth < 100 &&
      bubbleRelativeY + bubbleHalfHeight > 0 &&
      bubbleRelativeY - bubbleHalfHeight < 100;

    if (!bubbleInBounds) {
      console.warn("气泡在裁剪区域外，跳过绘制", {
        bubbleRelativeX,
        bubbleRelativeY,
        bubbleRelativeWidth,
        bubbleRelativeHeight,
      });
      return rotatedCanvas.toDataURL("image/png");
    }

    const bubbleCtx = rotatedCtx;
    const bubbleBg = hexToRgba(bubbleOptions.background, bubbleOptions.opacity);
    const fontSizePx = bubbleOptions.fontSize;
    const fontFamily = bubbleOptions.fontFamily || "sans-serif";
    bubbleCtx.font = `${fontSizePx}px ${fontFamily}`;

    const textLines = bubbleOptions.text.split("\n");
    const maxLineWidth = Math.max(
      ...textLines.map((line) => bubbleCtx.measureText(line || " ").width),
      1,
    );

    const bubbleWidth = (bubbleRelativeWidth / 100) * rotatedWidth;
    const innerWidth = Math.max(1, Math.min(bubbleWidth - bubbleOptions.padding * 2, maxLineWidth));
    const lineHeight = fontSizePx * 1.4;
    const baseHeight = (bubbleRelativeHeight / 100) * rotatedHeight;
    const contentHeight = textLines.length * lineHeight;
    const bubbleHeight = Math.max(contentHeight + bubbleOptions.padding * 2, baseHeight);
    const centerX = (bubbleRelativeX / 100) * rotatedWidth;
    const centerY = (bubbleRelativeY / 100) * rotatedHeight;
    const drawX = centerX - bubbleWidth / 2;
    const drawY = centerY - bubbleHeight / 2;

    const radius = bubbleOptions.style === "oval" ? bubbleHeight / 2 : 12;
    bubbleCtx.fillStyle = bubbleBg;
    drawBubbleShape(bubbleCtx, bubbleOptions.style, drawX, drawY, bubbleWidth, bubbleHeight, radius);
    bubbleCtx.fill();

    bubbleCtx.fillStyle = bubbleOptions.color;
    bubbleCtx.textBaseline = "top";
    const contentWidth = Math.max(1, bubbleWidth - bubbleOptions.padding * 2);
    const textStartX = drawX + bubbleOptions.padding + Math.max(0, (contentWidth - innerWidth) / 2);
    const tailReserve = bubbleOptions.style === "pointer" ? bubbleHeight * 0.12 : 0;
    const textStartY =
      drawY +
      Math.max(
        bubbleOptions.padding,
        (bubbleHeight - tailReserve - contentHeight) / 2,
      );

    textLines.forEach((line, index) => {
      bubbleCtx.fillText(line, textStartX, textStartY + index * lineHeight, contentWidth);
    });

    console.log("气泡已成功绘制到画布", {
      bubbleRelativeX,
      bubbleRelativeY,
      bubbleRelativeWidth,
      bubbleRelativeHeight,
      centerX,
      centerY,
      drawX,
      drawY,
      bubbleWidth,
      bubbleHeight,
    });
  } else {
    console.warn("气泡未绘制", {
      show: bubbleOptions.show,
      hasText: !!bubbleOptions.text.trim(),
    });
  }

  return rotatedCanvas.toDataURL("image/png");
}
