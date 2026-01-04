/**
 * PDF文本提取工具
 * 使用动态导入避免Next.js打包问题
 */

export interface PdfParseProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface PdfParseResult {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
  };
}

/**
 * 从PDF文件提取文本
 * @param file PDF文件对象
 * @param onProgress 进度回调
 * @returns 解析结果
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (progress: PdfParseProgress) => void
): Promise<PdfParseResult> {
  // 动态导入 pdfjs-dist，避免Next.js打包问题
  const pdfjsLib = await import('pdfjs-dist');

  // 配置 PDF.js worker
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  // 读取文件为ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // 加载PDF文档
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageCount = pdf.numPages;
  const textParts: string[] = [];

  // 逐页提取文本
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // 拼接页面文本
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    textParts.push(pageText);

    // 报告进度
    if (onProgress) {
      onProgress({
        current: pageNum,
        total: pageCount,
        percentage: Math.round((pageNum / pageCount) * 100),
      });
    }
  }

  // 获取元数据
  const metadata = await pdf.getMetadata().catch(() => ({ info: {} as Record<string, unknown> }));

  return {
    text: textParts.join('\n\n'),
    pageCount,
    metadata: {
      title: typeof metadata.info === 'object' && metadata.info && 'Title' in metadata.info ? String(metadata.info.Title) : undefined,
      author: typeof metadata.info === 'object' && metadata.info && 'Author' in metadata.info ? String(metadata.info.Author) : undefined,
    },
  };
}

/**
 * 验证文件是否为PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}
