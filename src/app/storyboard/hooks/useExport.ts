import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiProject } from "../types";

type UseExportOptions = {
  currentProject: ApiProject | null;
};

export function useExport({ currentProject }: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = useCallback(async () => {
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
        body: JSON.stringify({ format: "json" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "导出失败");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `storyboard-${currentProject.title}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "导出成功",
        description: "分镜剧本已导出为 JSON 文件",
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
  }, [currentProject, toast]);

  return { isExporting, handleExport };
}
