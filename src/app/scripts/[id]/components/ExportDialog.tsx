/**
 * Export Dialog Component
 * Export project to PNG/PDF/ZIP
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Download, FileImage, FileText, FolderArchive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportProject, downloadBlob, panelsFromProjectPayload, type ExportOptions } from "@/lib/export-utils";

interface ExportDialogProps {
  open: boolean;
  projectId: string;
  projectTitle?: string;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({
  open,
  projectId,
  projectTitle = "manga",
  onOpenChange,
}: ExportDialogProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<"png" | "pdf" | "zip">("png");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleExport(): Promise<void> {
    try {
      setIsExporting(true);
      setProgress(0);

      // Fetch project data
      toast({
        title: "准备导出",
        description: "正在加载项目数据...",
      });

      const response = await fetch(`/api/project/${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch project data");
      }

      const projectData = await response.json();
      const panels = panelsFromProjectPayload(projectData);

      setProgress(20);

      // Validate panels
      const panelsWithImages = panels.filter(
        (p: { generated_image: string | null; image_url: string | null }) =>
          p.generated_image || p.image_url
      );

      if (panelsWithImages.length === 0) {
        throw new Error("项目中没有可导出的图片");
      }

      toast({
        title: "开始导出",
        description: `正在导出 ${panelsWithImages.length} 个分镜...`,
      });

      setProgress(40);

      // Export options
      const options: ExportOptions = {
        format,
        quality,
        columns: 2, // PNG grid columns
        pageSize: "a4", // PDF page size
      };

      // Execute export
      const blob = await exportProject(
        panelsWithImages,
        projectTitle,
        options
      );

      setProgress(80);

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const extension = format === "png" ? "png" : format === "pdf" ? "pdf" : "zip";
      const filename = `${projectTitle}_${timestamp}.${extension}`;

      // Download file
      downloadBlob(blob, filename);

      setProgress(100);

      toast({
        title: "导出成功",
        description: `文件已保存为 ${filename}`,
      });

      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "导出失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }

  const formatOptions = [
    { value: "png", label: "PNG 图片序列", icon: FileImage },
    { value: "pdf", label: "PDF 文档", icon: FileText },
    { value: "zip", label: "ZIP 压缩包", icon: FolderArchive },
  ];

  const qualityOptions = [
    { value: "low", label: "低质量 (快速)" },
    { value: "medium", label: "中等质量" },
    { value: "high", label: "高质量 (推荐)" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            导出项目
          </DialogTitle>
          <DialogDescription>
            选择导出格式和质量设置
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>导出格式</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as "png" | "pdf" | "zip")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>导出质量</Label>
            <Select
              value={quality}
              onValueChange={(value) => setQuality(value as "low" | "medium" | "high")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qualityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>提示：</strong>
              {format === "png" && " 将所有分镜合成为单张 PNG 网格图"}
              {format === "pdf" && " 将所有分镜合并为一个 PDF 文档"}
              {format === "zip" && " 将所有分镜打包为 ZIP 压缩包"}
            </p>
          </div>

          {isExporting && progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">导出进度</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            取消
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            开始导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
