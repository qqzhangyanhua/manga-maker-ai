/**
 * 图片合成服务
 * 将多个分镜合成为一张多格漫画图片
 */

import sharp from "sharp";
import { uploadBase64Image } from "./upload-helpers";
import type { Panel } from "@prisma/client";

/**
 * 智能布局计算
 * 根据分镜数量自动确定最佳布局
 */
function calculateLayout(count: number): { rows: number; cols: number } {
  switch (count) {
    case 2:
      return { rows: 1, cols: 2 }; // 横排
    case 3:
      return { rows: 1, cols: 3 }; // 横排
    case 4:
      return { rows: 2, cols: 2 }; // 2x2 网格
    case 5:
      return { rows: 2, cols: 3 }; // 2x3 网格（5格）
    case 6:
      return { rows: 2, cols: 3 }; // 2x3 网格
    default:
      return { rows: 1, cols: count };
  }
}

/**
 * 生成占位图
 * 当分镜没有图片时，生成带描述文本的占位图
 */
async function generatePlaceholder(
  panel: Panel,
  width: number,
  height: number
): Promise<Buffer> {
  const description = panel.visual_prompt || panel.description || `分镜 #${panel.panel_order}`;

  // 创建带文本的灰色背景图
  const textLines = wrapText(description, 30); // 每行最多30个字符
  const lineHeight = 40;
  const textHeight = textLines.length * lineHeight;
  const startY = Math.max(50, (height - textHeight) / 2);

  // 使用 SVG 生成带文本的图片
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text
        x="50%"
        y="${startY}"
        font-family="Arial, sans-serif"
        font-size="32"
        fill="#6b7280"
        text-anchor="middle"
        font-weight="bold"
      >
        无图片
      </text>
      ${textLines.map((line, i) => `
        <text
          x="50%"
          y="${startY + 60 + i * lineHeight}"
          font-family="Arial, sans-serif"
          font-size="24"
          fill="#9ca3af"
          text-anchor="middle"
        >
          ${escapeXml(line)}
        </text>
      `).join('')}
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * 文本换行
 */
function wrapText(text: string, maxLength: number): string[] {
  const lines: string[] = [];
  let currentLine = "";

  for (const char of text) {
    if (currentLine.length >= maxLength) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.slice(0, 5); // 最多5行
}

/**
 * XML 转义
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 下载图片为 Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`[ImageComposer] 下载图片失败: ${url}`, error);
    throw error;
  }
}

/**
 * 合成多个分镜为一张图片
 * @param panels 分镜数组（已按 panel_order 排序）
 * @returns 合成后的图片 URL
 */
export async function composeMultiPanels(panels: Panel[]): Promise<string> {
  const count = panels.length;
  const { rows, cols } = calculateLayout(count);

  // 单个格子的尺寸
  const cellWidth = 800;
  const cellHeight = 800;

  // 格子间距
  const padding = 20;

  // 最终画布尺寸
  const canvasWidth = cols * cellWidth + (cols + 1) * padding;
  const canvasHeight = rows * cellHeight + (rows + 1) * padding;

  // 创建背景画布（白色）
  const canvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  // 准备所有格子的图片
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];

  for (let i = 0; i < count; i++) {
    const panel = panels[i];
    const row = Math.floor(i / cols);
    const col = i % cols;

    const left = padding + col * (cellWidth + padding);
    const top = padding + row * (cellHeight + padding);

    let imageBuffer: Buffer;

    // 如果有图片，下载并处理
    if (panel.generated_image || panel.sketch_image_url) {
      const imageUrl = panel.generated_image || panel.sketch_image_url || "";
      try {
        const originalBuffer = await downloadImage(imageUrl);

        // 调整图片大小以适应格子
        imageBuffer = await sharp(originalBuffer)
          .resize(cellWidth, cellHeight, {
            fit: "cover",
            position: "center",
          })
          .toBuffer();
      } catch (error) {
        console.error(`[ImageComposer] 处理图片失败，使用占位图`, error);
        // 如果下载或处理失败，使用占位图
        const placeholderSvg = await generatePlaceholder(panel, cellWidth, cellHeight);
        imageBuffer = await sharp(placeholderSvg).png().toBuffer();
      }
    } else {
      // 没有图片，生成占位图
      const placeholderSvg = await generatePlaceholder(panel, cellWidth, cellHeight);
      imageBuffer = await sharp(placeholderSvg).png().toBuffer();
    }

    composites.push({
      input: imageBuffer,
      left,
      top,
    });
  }

  // 合成所有图片
  const composedBuffer = await canvas
    .composite(composites)
    .png()
    .toBuffer();

  // 转换为 base64
  const base64 = composedBuffer.toString("base64");

  // 上传到 MinIO
  const filename = `composed-${Date.now()}.png`;
  const uploadedUrl = await uploadBase64Image(base64, filename);

  console.log(`[ImageComposer] 成功合成 ${count} 个分镜，布局: ${rows}x${cols}`);

  return uploadedUrl;
}
