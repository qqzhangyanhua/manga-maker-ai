/**
 * Export Utilities
 * Handle PNG/PDF/ZIP export for manga projects
 */

import { jsPDF } from "jspdf";
import JSZip from "jszip";

export interface PanelData {
  id: string;
  panel_order: number;
  image_url: string | null;
  generated_image: string | null;
  description: string;
}

export interface ExportOptions {
  format: "png" | "pdf" | "zip";
  quality?: "low" | "medium" | "high";
  columns?: number; // For PNG grid layout
  pageSize?: "a4" | "letter"; // For PDF
}

/**
 * Download image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Load image and return HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Export panels to PNG (grid layout)
 */
export async function exportToPNG(
  panels: PanelData[],
  options: ExportOptions
): Promise<Blob> {
  const columns = options.columns || 2;
  const quality = options.quality || "high";

  // Quality settings
  const qualityMap = {
    low: 0.6,
    medium: 0.8,
    high: 0.95,
  };
  const jpegQuality = qualityMap[quality];

  // Panel dimensions
  const panelWidth = 512;
  const panelHeight = 768;
  const padding = 20;

  // Calculate canvas size
  const rows = Math.ceil(panels.length / columns);
  const canvasWidth = columns * panelWidth + (columns + 1) * padding;
  const canvasHeight = rows * panelHeight + (rows + 1) * padding;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Cannot get canvas context");
  }

  // Fill background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw panels
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const imageUrl = panel.generated_image || panel.image_url;

    if (!imageUrl) {
      continue; // Skip panels without images
    }

    const row = Math.floor(i / columns);
    const col = i % columns;
    const x = col * panelWidth + (col + 1) * padding;
    const y = row * panelHeight + (row + 1) * padding;

    try {
      const img = await loadImage(imageUrl);
      ctx.drawImage(img, x, y, panelWidth, panelHeight);

      // Draw panel number
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(x, y, 40, 30);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${i + 1}`, x + 20, y + 15);
    } catch (error) {
      console.error(`Failed to load image for panel ${i + 1}:`, error);
      // Draw placeholder
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(x, y, panelWidth, panelHeight);
      ctx.fillStyle = "#999";
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("图片加载失败", x + panelWidth / 2, y + panelHeight / 2);
    }
  }

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/jpeg",
      jpegQuality
    );
  });
}

/**
 * Export panels to PDF
 */
export async function exportToPDF(
  panels: PanelData[],
  options: ExportOptions
): Promise<Blob> {
  const pageSize = options.pageSize || "a4";
  const quality = options.quality || "high";

  // Create PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: pageSize,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - 2 * margin;

  // Quality settings
  const qualityMap = {
    low: 0.6,
    medium: 0.8,
    high: 0.95,
  };
  const imageQuality = qualityMap[quality];

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const imageUrl = panel.generated_image || panel.image_url;

    if (i > 0) {
      pdf.addPage();
    }

    if (imageUrl) {
      try {
        const base64 = await fetchImageAsBase64(imageUrl);

        // Calculate aspect ratio
        const img = await loadImage(imageUrl);
        const aspectRatio = img.width / img.height;

        let imgWidth = contentWidth;
        let imgHeight = imgWidth / aspectRatio;

        if (imgHeight > contentHeight) {
          imgHeight = contentHeight;
          imgWidth = imgHeight * aspectRatio;
        }

        const x = margin + (contentWidth - imgWidth) / 2;
        const y = margin;

        pdf.addImage(base64, "JPEG", x, y, imgWidth, imgHeight, undefined, "FAST");
      } catch (error) {
        console.error(`Failed to add image for panel ${i + 1}:`, error);
        pdf.text(`Panel ${i + 1} - Image load failed`, margin, margin + 20);
      }
    } else {
      pdf.text(`Panel ${i + 1} - No image`, margin, margin + 20);
    }

    // Add description at bottom
    if (panel.description) {
      const descY = pageHeight - margin - 10;
      pdf.setFontSize(10);
      pdf.text(`Panel ${i + 1}: ${panel.description}`, margin, descY, {
        maxWidth: contentWidth,
      });
    }
  }

  return pdf.output("blob");
}

/**
 * Export panels to ZIP (individual images)
 */
export async function exportToZIP(
  panels: PanelData[],
  projectTitle: string
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const imageUrl = panel.generated_image || panel.image_url;

    if (!imageUrl) {
      continue;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const blob = await response.blob();
      const extension = imageUrl.endsWith(".png") ? "png" : "jpg";
      const filename = `panel_${String(i + 1).padStart(3, "0")}.${extension}`;

      zip.file(filename, blob);

      // Add description as text file
      if (panel.description) {
        const descFilename = `panel_${String(i + 1).padStart(3, "0")}.txt`;
        zip.file(descFilename, panel.description);
      }
    } catch (error) {
      console.error(`Failed to add panel ${i + 1} to ZIP:`, error);
    }
  }

  // Generate ZIP
  return zip.generateAsync({ type: "blob" });
}

/**
 * Main export function
 */
export async function exportProject(
  panels: PanelData[],
  projectTitle: string,
  options: ExportOptions
): Promise<Blob> {
  // Validate panels
  const panelsWithImages = panels.filter(
    (p) => p.generated_image || p.image_url
  );

  if (panelsWithImages.length === 0) {
    throw new Error("No panels with images to export");
  }

  // Sort by panel_order
  const sortedPanels = [...panelsWithImages].sort(
    (a, b) => a.panel_order - b.panel_order
  );

  // Export based on format
  switch (options.format) {
    case "png":
      return exportToPNG(sortedPanels, options);
    case "pdf":
      return exportToPDF(sortedPanels, options);
    case "zip":
      return exportToZIP(sortedPanels, projectTitle);
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
