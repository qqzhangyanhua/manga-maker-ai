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

interface ExportDialogProps {
  open: boolean;
  projectId: string;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({
  open,
  projectId,
  onOpenChange,
}: ExportDialogProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<string>("png");
  const [quality, setQuality] = useState<string>("high");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(): Promise<void> {
    try {
      setIsExporting(true);

      const response = await fetch(\`/api/project/\${projectId}/export\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, quality }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "导出失败");
      }

      toast({
        title: "导出任务已创建",
        description: "正在处理导出，请稍候...",
      });

      // Poll for status
      const jobId = data.job_id;
      const checkStatus = async (): Promise<void> => {
        const statusResponse = await fetch(
          \`/api/project/\${projectId}/export/status?job_id=\${jobId}\`
        );
        const statusData = await statusResponse.json();

        if (statusData.status === "completed") {
          toast({
            title: "导出完成",
            description: "点击下载按钮获取文件",
          });

          // Auto download
          window.open(statusData.download_url, "_blank");
          onOpenChange(false);
        } else if (statusData.status === "failed") {
          throw new Error("导出失败");
        } else {
          // Continue polling
          setTimeout(checkStatus, 2000);
        }
      };

      await checkStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "导出失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
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
            <Select value={format} onValueChange={setFormat}>
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
            <Select value={quality} onValueChange={setQuality}>
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
              {format === "png" && " 将导出所有分镜为独立的 PNG 图片文件"}
              {format === "pdf" && " 将所有分镜合并为一个 PDF 文档"}
              {format === "zip" && " 将所有分镜打包为 ZIP 压缩包"}
            </p>
          </div>
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
