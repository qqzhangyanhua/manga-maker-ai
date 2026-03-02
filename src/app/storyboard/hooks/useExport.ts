import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiProject } from "../types";

/** 导出格式：json 无需图片，png/pdf/zip 需先生成分镜图片 */
export type ExportFormat = "json" | "png" | "pdf" | "zip";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  json: "JSON 剧本",
  png: "PNG 分镜包",
  pdf: "PDF 漫画",
  zip: "ZIP 完整包",
};

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  json: "json",
  png: "zip", // PNG 格式 API 返回 ZIP 包
  pdf: "pdf",
  zip: "zip",
};

type UseExportOptions = {
  currentProject: ApiProject | null;
};

export function useExport({ currentProject }: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (isExporting) return;

      if (!currentProject) {
        toast({
          title: "无可导出内容",
          description: "请先生成分镜",
          variant: "destructive",
        });
        return;
      }

      setIsExporting(true);
      try {
        const response = await fetch(`/api/project/${currentProject.id}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error((errData as { error?: string }).error || "导出失败");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = FORMAT_EXTENSIONS[format];
        a.download = `storyboard-${currentProject.title}-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "导出成功",
          description: `已导出为 ${FORMAT_LABELS[format]}`,
        });
      } catch (error) {
        console.error("Export error:", error);
        toast({
          title: "导出失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, currentProject, toast]
  );

  return { isExporting, handleExport, FORMAT_LABELS };
}
