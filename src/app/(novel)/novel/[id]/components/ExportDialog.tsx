"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, FileType, FileImage } from "lucide-react";
import { toast } from "sonner";

interface ExportDialogProps {
  projectId: string;
  projectTitle: string;
}

export function ExportDialog({ projectId, projectTitle }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"txt" | "docx" | "pdf">("txt");
  const [includeOutline, setIncludeOutline] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/novel/projects/${projectId}/export?format=${format}&include_outline=${includeOutline}`
      );

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 获取文件内容
      const blob = await response.blob();

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("导出成功");
      setIsOpen(false);
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = () => {
    switch (format) {
      case "txt":
        return <FileText className="h-4 w-4" />;
      case "docx":
        return <FileType className="h-4 w-4" />;
      case "pdf":
        return <FileImage className="h-4 w-4" />;
    }
  };

  const getFormatDescription = () => {
    switch (format) {
      case "txt":
        return "纯文本格式，兼容性最好，体积最小";
      case "docx":
        return "Word 文档格式，支持格式化排版，适合编辑";
      case "pdf":
        return "PDF 格式，排版固定，适合阅读和打印";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          导出小说
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>导出小说</DialogTitle>
          <DialogDescription>
            选择导出格式和选项，将小说保存到本地
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 导出格式 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">导出格式</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="txt" id="txt" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <Label htmlFor="txt" className="font-medium cursor-pointer">
                      TXT 纯文本
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    纯文本格式，兼容性最好，体积最小
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="docx" id="docx" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4" />
                    <Label htmlFor="docx" className="font-medium cursor-pointer">
                      Word 文档 (.docx)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    支持格式化排版，适合编辑和投稿
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="pdf" id="pdf" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    <Label htmlFor="pdf" className="font-medium cursor-pointer">
                      PDF 文档
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    排版固定，适合阅读、打印和分享
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 导出选项 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">导出选项</Label>
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <Checkbox
                id="outline"
                checked={includeOutline}
                onCheckedChange={(checked) => setIncludeOutline(checked as boolean)}
              />
              <div className="flex-1">
                <Label
                  htmlFor="outline"
                  className="font-medium cursor-pointer"
                >
                  包含章节大纲
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  在每章正文前显示章节大纲内容
                </p>
              </div>
            </div>
          </div>

          {/* 预览信息 */}
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              {getFormatIcon()}
              <span className="font-medium">
                将导出为: {projectTitle}.{format}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {getFormatDescription()}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "导出中..." : "开始导出"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
