"use client";

/**
 * Export Dialog Component
 * Allows users to export canvas pages in various formats
 */

import { useState, useCallback } from "react";
import {
  Download,
  Loader2,
  FileImage,
  FileText,
  Archive,
  Share2,
  Smartphone,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import type { ExportFormat, DpiOption, PageRange } from "@/types/layout";

interface ExportDialogProps {
  onExport: (options: ExportOptions) => Promise<void>;
  pageCount: number;
  disabled?: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  dpi: DpiOption;
  pageRange: PageRange;
  customPages?: number[];
}

const FORMAT_OPTIONS = [
  {
    value: "png" as const,
    label: "PNG",
    description: "高质量图片，适合社交分享",
    icon: FileImage,
  },
  {
    value: "jpg" as const,
    label: "JPG",
    description: "压缩图片，文件更小",
    icon: FileImage,
  },
  {
    value: "pdf" as const,
    label: "PDF",
    description: "适合印刷或阅读器",
    icon: FileText,
  },
  {
    value: "zip" as const,
    label: "ZIP",
    description: "打包所有页面",
    icon: Archive,
  },
];

const PRESET_OPTIONS = [
  {
    id: "social",
    name: "社交分享",
    description: "PNG 72dpi，适合微信/微博",
    icon: Share2,
    config: { format: "png" as const, quality: 90, dpi: 72 as DpiOption },
  },
  {
    id: "webtoon",
    name: "条漫平台",
    description: "JPG 长图，适合条漫发布",
    icon: Smartphone,
    config: { format: "jpg" as const, quality: 85, dpi: 72 as DpiOption },
  },
  {
    id: "print",
    name: "印刷输出",
    description: "PDF 300dpi，高质量印刷",
    icon: Printer,
    config: { format: "pdf" as const, quality: 100, dpi: 300 as DpiOption },
  },
];

export function ExportDialog({
  onExport,
  pageCount,
  disabled = false,
}: ExportDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Export options
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(90);
  const [dpi, setDpi] = useState<DpiOption>(72);
  const [pageRange, setPageRange] = useState<PageRange>("all");

  // Apply preset
  const applyPreset = useCallback(
    (preset: (typeof PRESET_OPTIONS)[number]) => {
      setFormat(preset.config.format);
      setQuality(preset.config.quality);
      setDpi(preset.config.dpi);
    },
    []
  );

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await onExport({
        format,
        quality,
        dpi,
        pageRange,
      });
      toast({ title: "导出成功" });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [onExport, format, quality, dpi, pageRange, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          导出
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>导出设置</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label>快速预设</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_OPTIONS.map((preset) => (
                <button
                  key={preset.id}
                  className="flex flex-col items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  onClick={() => applyPreset(preset)}
                >
                  <preset.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">{preset.name}</span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>导出格式</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid grid-cols-2 gap-2"
            >
              {FORMAT_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label
                    htmlFor={opt.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <opt.icon className="h-4 w-4" />
                    <span>{opt.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>质量</Label>
              <span className="text-sm text-muted-foreground">{quality}%</span>
            </div>
            <Slider
              value={[quality]}
              onValueChange={([v]) => setQuality(v)}
              min={10}
              max={100}
              step={5}
            />
          </div>

          {/* DPI */}
          <div className="space-y-2">
            <Label>分辨率 (DPI)</Label>
            <Select
              value={String(dpi)}
              onValueChange={(v) => setDpi(Number(v) as DpiOption)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="72">72 DPI (网页/社交)</SelectItem>
                <SelectItem value="150">150 DPI (普通打印)</SelectItem>
                <SelectItem value="300">300 DPI (高质量印刷)</SelectItem>
                <SelectItem value="350">350 DPI (专业印刷)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page Range */}
          <div className="space-y-2">
            <Label>页面范围</Label>
            <Select
              value={pageRange}
              onValueChange={(v) => setPageRange(v as PageRange)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部页面 ({pageCount} 页)</SelectItem>
                <SelectItem value="current">当前页面</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isExporting ? "导出中..." : "开始导出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
