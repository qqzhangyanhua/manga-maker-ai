/**
 * Canvas Export Utilities
 * Export canvas pages to PNG, JPG, PDF, ZIP
 */

import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { ExportFormat, DpiOption } from "@/types/layout";

export interface CanvasExportOptions {
  format: ExportFormat;
  quality: number;
  dpi: DpiOption;
  filename?: string;
}

export interface CanvasPage {
  id: string;
  pageOrder: number;
  width: number;
  height: number;
  dataUrl: string; // Base64 data URL from canvas.toDataURL()
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert data URL to Blob
 */
function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Export a single canvas page to PNG
 */
export async function exportCanvasToPNG(
  page: CanvasPage,
  options: CanvasExportOptions
): Promise<Blob> {
  // Create a new canvas to apply quality settings
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get canvas context");

  // Calculate dimensions based on DPI
  const scale = options.dpi / 72; // Base DPI is 72
  canvas.width = page.width * scale;
  canvas.height = page.height * scale;

  // Load and draw the image
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = page.dataUrl;
  });

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create PNG blob"));
        }
      },
      "image/png",
      options.quality / 100
    );
  });
}

/**
 * Export a single canvas page to JPG
 */
export async function exportCanvasToJPG(
  page: CanvasPage,
  options: CanvasExportOptions
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get canvas context");

  const scale = options.dpi / 72;
  canvas.width = page.width * scale;
  canvas.height = page.height * scale;

  // Fill with white background for JPG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = page.dataUrl;
  });

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create JPG blob"));
        }
      },
      "image/jpeg",
      options.quality / 100
    );
  });
}

/**
 * Export multiple canvas pages to PDF
 */
export async function exportCanvasToPDF(
  pages: CanvasPage[],
  options: CanvasExportOptions
): Promise<Blob> {
  if (pages.length === 0) throw new Error("No pages to export");

  // Sort by page order
  const sortedPages = [...pages].sort((a, b) => a.pageOrder - b.pageOrder);
  const firstPage = sortedPages[0];

  // Create PDF with page dimensions
  const orientation = firstPage.width > firstPage.height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [firstPage.width, firstPage.height],
    compress: true,
  });

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];

    if (i > 0) {
      pdf.addPage([page.width, page.height], page.width > page.height ? "landscape" : "portrait");
    }

    // Add image to PDF
    pdf.addImage(
      page.dataUrl,
      "PNG",
      0,
      0,
      page.width,
      page.height,
      undefined,
      "FAST"
    );
  }

  return pdf.output("blob");
}

/**
 * Export multiple canvas pages to ZIP
 */
export async function exportCanvasToZIP(
  pages: CanvasPage[],
  options: CanvasExportOptions,
  projectName: string
): Promise<Blob> {
  const zip = new JSZip();

  const sortedPages = [...pages].sort((a, b) => a.pageOrder - b.pageOrder);

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];
    const pageNum = String(i + 1).padStart(3, "0");

    // Export based on format (default to PNG for ZIP)
    let blob: Blob;
    let extension: string;

    if (options.format === "jpg") {
      blob = await exportCanvasToJPG(page, options);
      extension = "jpg";
    } else {
      blob = await exportCanvasToPNG(page, options);
      extension = "png";
    }

    zip.file(`${projectName}_page_${pageNum}.${extension}`, blob);
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Main export function
 */
export async function exportCanvasPages(
  pages: CanvasPage[],
  options: CanvasExportOptions,
  projectName: string = "manga"
): Promise<void> {
  if (pages.length === 0) {
    throw new Error("没有可导出的页面");
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  let blob: Blob;
  let filename: string;

  switch (options.format) {
    case "png":
      if (pages.length === 1) {
        blob = await exportCanvasToPNG(pages[0], options);
        filename = `${projectName}_${timestamp}.png`;
      } else {
        // Multiple pages - export as ZIP
        blob = await exportCanvasToZIP(pages, { ...options, format: "png" }, projectName);
        filename = `${projectName}_${timestamp}.zip`;
      }
      break;

    case "jpg":
      if (pages.length === 1) {
        blob = await exportCanvasToJPG(pages[0], options);
        filename = `${projectName}_${timestamp}.jpg`;
      } else {
        blob = await exportCanvasToZIP(pages, { ...options, format: "jpg" }, projectName);
        filename = `${projectName}_${timestamp}.zip`;
      }
      break;

    case "pdf":
      blob = await exportCanvasToPDF(pages, options);
      filename = `${projectName}_${timestamp}.pdf`;
      break;

    case "zip":
      blob = await exportCanvasToZIP(pages, options, projectName);
      filename = `${projectName}_${timestamp}.zip`;
      break;

    default:
      throw new Error(`不支持的导出格式: ${options.format}`);
  }

  downloadBlob(blob, options.filename || filename);
}
