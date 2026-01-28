/**
 * Comic Panel Composer
 * 为场景图添加对话框和漫画效果
 *
 * ✅ 修复问题:
 * - SSRF 防护 (URL 白名单验证)
 * - 类型安全 (完整 TypeScript 类型)
 * - 输入验证 (文本清理)
 * - 资源管理 (显式清理)
 * - 统一日志 (使用 api-logger)
 */

import type { Image, CanvasRenderingContext2D, Canvas } from 'canvas';
import { validateImageUrl, UrlValidationError } from '@/lib/security/url-validator';
import { sanitizeDialogueText, estimateTextLines } from '@/lib/security/text-sanitizer';
import {
  BUBBLE_LAYOUT,
  TEXT_STYLE,
  BUBBLE_STYLES,
  BUBBLE_POSITIONS,
  CANVAS_LIMITS
} from '@/lib/config/comic-constants';
import { logInfo, logError } from '@/lib/api-logger';

// ==================== 类型定义 ====================

export type BubblePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export type BubbleStyle = 'speech' | 'thought' | 'shout' | 'whisper';

export interface DialogueBubble {
  text: string;
  position: BubblePosition;
  style: BubbleStyle;
}

export interface DialogueLayout {
  bubbles: DialogueBubble[];
}

export interface BubbleDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ==================== 主函数 ====================

/**
 * 为场景图添加对话框
 *
 * @param baseImageUrl - 基础场景图 URL (必须来自可信源)
 * @param dialogueLayout - 对话框布局信息
 * @returns PNG 格式的图像 Buffer
 * @throws UrlValidationError - URL 不安全
 * @throws Error - 图像处理失败
 */
export async function addSpeechBubbles(
  baseImageUrl: string,
  dialogueLayout: DialogueLayout
): Promise<Buffer> {
  const startTime = Date.now();
  let baseImage: Image | null = null;
  let canvas: Canvas | null = null;

  try {
    // 动态导入 canvas 包（仅在运行时加载，避免构建时错误）
    const { createCanvas, loadImage } = await import('canvas');

    // 1. 验证 URL 安全性 (SSRF 防护)
    logInfo('开始验证图像 URL', { url: baseImageUrl.substring(0, 100) });
    validateImageUrl(baseImageUrl);

    // 2. 清理对话框文本
    const sanitizedLayout: DialogueLayout = {
      bubbles: dialogueLayout.bubbles.map(bubble => ({
        ...bubble,
        text: sanitizeDialogueText(bubble.text, {
          maxLength: 500,
          allowNewlines: true,
          allowSpecialChars: true,
        }),
      })),
    };

    // 3. 加载基础图片 (带超时)
    logInfo('开始加载基础图片', { url: baseImageUrl.substring(0, 100) });
    baseImage = await loadImageWithTimeout(baseImageUrl, CANVAS_LIMITS.DOWNLOAD_TIMEOUT, loadImage);

    // 4. 验证图片尺寸
    if (baseImage.width > CANVAS_LIMITS.MAX_WIDTH || baseImage.height > CANVAS_LIMITS.MAX_HEIGHT) {
      throw new Error(
        `图片尺寸过大: ${baseImage.width}x${baseImage.height} (最大 ${CANVAS_LIMITS.MAX_WIDTH}x${CANVAS_LIMITS.MAX_HEIGHT})`
      );
    }

    logInfo('图片加载成功', {
      width: baseImage.width,
      height: baseImage.height,
      bubbleCount: sanitizedLayout.bubbles.length,
    });

    // 5. 创建 Canvas
    canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext('2d');

    // 6. 绘制基础图片
    ctx.drawImage(baseImage, 0, 0);

    // 7. 添加对话框
    for (const bubble of sanitizedLayout.bubbles) {
      await drawSpeechBubble(ctx, bubble, baseImage.width, baseImage.height);
    }

    // 8. 转换为 Buffer
    const buffer = canvas.toBuffer('image/png');

    const duration = Date.now() - startTime;
    logInfo('对话框添加完成', {
      bubbleCount: sanitizedLayout.bubbles.length,
      bufferSize: buffer.length,
      durationMs: duration,
    });

    return buffer;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof UrlValidationError) {
      logError('URL 验证失败', error, {
        url: baseImageUrl.substring(0, 100),
        code: error.code,
        durationMs: duration,
      });
      throw error;
    }

    logError('添加对话框失败', error, {
      url: baseImageUrl.substring(0, 100),
      durationMs: duration,
    });
    throw error;
  } finally {
    // 9. 资源清理 (虽然 Node.js 会自动 GC，但显式清理更好)
    baseImage = null;
    canvas = null;

    // 提示垃圾回收 (仅在启用时)
    if (global.gc) {
      global.gc();
    }
  }
}

// ==================== 辅助函数 ====================

/**
 * 带超时的图片加载
 */
async function loadImageWithTimeout(
  url: string, 
  timeout: number, 
  loadImage: (url: string) => Promise<Image>
): Promise<Image> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`图片加载超时 (${timeout}ms): ${url}`));
    }, timeout);

    loadImage(url)
      .then(image => {
        clearTimeout(timer);
        resolve(image);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 绘制单个对话框
 */
async function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  bubble: DialogueBubble,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  // 计算对话框尺寸
  const dimensions = calculateBubbleDimensions(
    bubble,
    canvasWidth,
    canvasHeight
  );

  // 绘制背景
  drawBubbleBackground(ctx, dimensions, bubble.style);

  // 绘制文字
  drawBubbleText(ctx, bubble.text, dimensions);
}

/**
 * 计算对话框尺寸和位置
 */
function calculateBubbleDimensions(
  bubble: DialogueBubble,
  canvasWidth: number,
  canvasHeight: number
): BubbleDimensions {
  // 计算宽度
  const bubbleWidth = Math.min(
    canvasWidth * BUBBLE_LAYOUT.WIDTH_RATIO,
    BUBBLE_LAYOUT.MAX_WIDTH
  );

  // 计算高度
  const lines = estimateTextLines(bubble.text, bubbleWidth - BUBBLE_LAYOUT.PADDING * 2, TEXT_STYLE.CHAR_WIDTH);
  const bubbleHeight = Math.max(
    lines * TEXT_STYLE.LINE_HEIGHT + BUBBLE_LAYOUT.PADDING * 2,
    60
  );

  // 计算位置
  const positionFn = BUBBLE_POSITIONS[bubble.position] || BUBBLE_POSITIONS['top-right'];
  const baseX = positionFn.x(canvasWidth);
  const baseY = positionFn.y(canvasHeight);

  // 调整位置确保不超出画布
  const x = Math.max(
    BUBBLE_LAYOUT.MARGIN,
    Math.min(baseX, canvasWidth - bubbleWidth - BUBBLE_LAYOUT.MARGIN)
  );
  const y = Math.max(
    BUBBLE_LAYOUT.MARGIN,
    Math.min(baseY, canvasHeight - bubbleHeight - BUBBLE_LAYOUT.MARGIN)
  );

  return { x, y, width: bubbleWidth, height: bubbleHeight };
}

/**
 * 绘制对话框背景
 */
function drawBubbleBackground(
  ctx: CanvasRenderingContext2D,
  dimensions: BubbleDimensions,
  style: BubbleStyle
): void {
  const { x, y, width, height } = dimensions;
  const styleConfig = BUBBLE_STYLES[style] || BUBBLE_STYLES.speech;

  ctx.save();

  // 应用样式
  ctx.fillStyle = styleConfig.fillColor;
  ctx.strokeStyle = styleConfig.strokeColor;
  ctx.lineWidth = styleConfig.lineWidth;
  ctx.setLineDash(styleConfig.lineDash);

  // 绘制圆角矩形
  const radius = BUBBLE_LAYOUT.BORDER_RADIUS;
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

  ctx.fill();
  ctx.stroke();

  // 绘制尾巴 (仅 speech 样式)
  if (style === 'speech') {
    ctx.setLineDash([]); // 重置虚线
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height);
    ctx.lineTo(x + width * 0.25, y + height + BUBBLE_LAYOUT.TAIL_LENGTH);
    ctx.lineTo(x + width * 0.4, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 绘制对话框文字
 */
function drawBubbleText(
  ctx: CanvasRenderingContext2D,
  text: string,
  dimensions: BubbleDimensions
): void {
  const { x, y, width, height } = dimensions;

  ctx.save();

  // 设置字体
  ctx.fillStyle = 'black';
  ctx.font = `bold ${TEXT_STYLE.FONT_SIZE}px ${TEXT_STYLE.FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 自动换行
  const lines = wrapText(ctx, text, width - BUBBLE_LAYOUT.PADDING * 2);
  const lineHeight = TEXT_STYLE.LINE_HEIGHT;
  const startY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2;

  // 绘制每一行
  lines.forEach((line, index) => {
    ctx.fillText(line, x + width / 2, startY + index * lineHeight);
  });

  ctx.restore();
}

/**
 * 文字自动换行 (按字符分割)
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of chars) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * 下载图片 (保留用于兼容性)
 */
export async function downloadImage(imageUrl: string): Promise<Buffer> {
  validateImageUrl(imageUrl);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`图片下载失败: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
