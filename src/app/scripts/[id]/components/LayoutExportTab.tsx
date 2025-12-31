/**
 * 排版导出 Tab 组件
 * 高级排版功能：自定义页面尺寸、对话框、间距、分页预览、导出
 */

"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileImage,
  FileText,
  Download,
  Maximize2,
  MessageSquare,
  Grid3X3,
  Eye,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 预设页面尺寸
const PAGE_PRESETS = {
  A4: { width: 210, height: 297, label: "A4 (210×297mm)" },
  A5: { width: 148, height: 210, label: "A5 (148×210mm)" },
  B5: { width: 176, height: 250, label: "B5 (176×250mm)" },
  COMIC_JP: { width: 182, height: 257, label: "日漫 (182×257mm)" },
  COMIC_US: { width: 168, height: 260, label: "美漫 (168×260mm)" },
  WEBTOON: { width: 800, height: 1280, label: "条漫 (800×1280px)" },
  CUSTOM: { width: 210, height: 297, label: "自定义" },
};

type PagePresetKey = keyof typeof PAGE_PRESETS;

interface Panel {
  id: string;
  generated_image?: string;
  image_url?: string;
  panel_order?: number;
  description?: string;
  chapter_id?: string;
}

interface Chapter {
  id: string;
  title: string;
  chapter_order: number;
}

interface LayoutExportTabProps {
  storyId: string;
  projectId: string | null;
  chapters: Chapter[];
  panels: Panel[];
  storyTitle: string;
}

export function LayoutExportTab({
  storyId,
  projectId,
  chapters,
  panels,
  storyTitle,
}: LayoutExportTabProps) {
  const { toast } = useToast();

  // 页面设置
  const [pagePreset, setPagePreset] = useState<PagePresetKey>("A4");
  const [customWidth, setCustomWidth] = useState(210);
  const [customHeight, setCustomHeight] = useState(297);

  // 排版设置
  const [panelsPerPage, setPanelsPerPage] = useState(4);
  const [panelGap, setPanelGap] = useState(10);
  const [pageMargin, setPageMargin] = useState(15);
  const [showDialogBubbles, setShowDialogBubbles] = useState(true);

  // 预览状态
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "png" | "zip">("pdf");

  // 获取当前页面尺寸
  const pageSize = useMemo(() => {
    if (pagePreset === "CUSTOM") {
      return { width: customWidth, height: customHeight };
    }
    return PAGE_PRESETS[pagePreset];
  }, [pagePreset, customWidth, customHeight]);

  // 获取有图片的分镜
  const panelsWithImages = useMemo(() => {
    return panels
      .filter((p) => p.generated_image || p.image_url)
      .sort((a, b) => (a.panel_order || 0) - (b.panel_order || 0));
  }, [panels]);

  // 计算总页数
  const totalPages = useMemo(() => {
    return Math.ceil(panelsWithImages.length / panelsPerPage);
  }, [panelsWithImages.length, panelsPerPage]);

  // 当前页的分镜
  const currentPagePanels = useMemo(() => {
    const start = currentPage * panelsPerPage;
    return panelsWithImages.slice(start, start + panelsPerPage);
  }, [panelsWithImages, currentPage, panelsPerPage]);

  // 导出处理
  const handleExport = async () => {
    if (!projectId) {
      toast({
        title: "无法导出",
        description: "项目不存在，请先生成分镜",
        variant: "destructive",
      });
      return;
    }

    if (panelsWithImages.length === 0) {
      toast({
        title: "无法导出",
        description: "没有可导出的图片，请先生成分镜图片",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(`/api/project/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: exportFormat,
          layout: {
            pageWidth: pageSize.width,
            pageHeight: pageSize.height,
            panelsPerPage,
            panelGap,
            pageMargin,
            showDialogBubbles,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "导出失败");
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${storyTitle}-export.${exportFormat === "pdf" ? "pdf" : "zip"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "导出成功",
        description: `已导出为 ${exportFormat.toUpperCase()} 格式`,
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：设置面板 */}
      <div className="lg:col-span-1 space-y-6">
        {/* 页面尺寸 */}
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Maximize2 className="w-4 h-4" />
            页面尺寸
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-400 text-sm">预设尺寸</Label>
              <Select
                value={pagePreset}
                onValueChange={(value) => setPagePreset(value as PagePresetKey)}
              >
                <SelectTrigger className="mt-1 bg-gray-900/50 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAGE_PRESETS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pagePreset === "CUSTOM" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-sm">宽度 (mm)</Label>
                  <Input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="mt-1 bg-gray-900/50 border-gray-700"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">高度 (mm)</Label>
                  <Input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="mt-1 bg-gray-900/50 border-gray-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 排版设置 */}
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            排版设置
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-400 text-sm">每页分镜数</Label>
              <div className="flex items-center gap-3 mt-2">
                <Slider
                  value={[panelsPerPage]}
                  onValueChange={([value]) => setPanelsPerPage(value)}
                  min={1}
                  max={9}
                  step={1}
                  className="flex-1"
                />
                <span className="text-white w-8 text-center">{panelsPerPage}</span>
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-sm">分镜间距 (px)</Label>
              <div className="flex items-center gap-3 mt-2">
                <Slider
                  value={[panelGap]}
                  onValueChange={([value]) => setPanelGap(value)}
                  min={0}
                  max={30}
                  step={2}
                  className="flex-1"
                />
                <span className="text-white w-8 text-center">{panelGap}</span>
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-sm">页面边距 (px)</Label>
              <div className="flex items-center gap-3 mt-2">
                <Slider
                  value={[pageMargin]}
                  onValueChange={([value]) => setPageMargin(value)}
                  min={0}
                  max={40}
                  step={5}
                  className="flex-1"
                />
                <span className="text-white w-8 text-center">{pageMargin}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 对话框设置 */}
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            对话框设置
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">显示对话气泡</span>
            <button
              onClick={() => setShowDialogBubbles(!showDialogBubbles)}
              className={`w-10 h-6 rounded-full transition-colors ${
                showDialogBubbles ? "bg-orange-500" : "bg-gray-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                  showDialogBubbles ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            对话气泡功能需要先在分镜中添加对话文字
          </p>
        </div>

        {/* 导出 */}
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-400 text-sm">导出格式</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={exportFormat === "pdf" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat("pdf")}
                  className={exportFormat === "pdf" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-700"}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  PDF
                </Button>
                <Button
                  variant={exportFormat === "png" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat("png")}
                  className={exportFormat === "png" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-700"}
                >
                  <FileImage className="w-4 h-4 mr-1" />
                  PNG
                </Button>
                <Button
                  variant={exportFormat === "zip" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat("zip")}
                  className={exportFormat === "zip" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-700"}
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  ZIP
                </Button>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              onClick={handleExport}
              disabled={isExporting || panelsWithImages.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  导出 {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧：预览面板 */}
      <div className="lg:col-span-2">
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4" />
              分页预览
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>
                第 {currentPage + 1} / {totalPages || 1} 页
              </span>
              <span className="text-gray-600">|</span>
              <span>共 {panelsWithImages.length} 张图片</span>
            </div>
          </div>

          {/* 预览区域 */}
          <div
            className="relative bg-white rounded-lg mx-auto overflow-hidden"
            style={{
              aspectRatio: `${pageSize.width} / ${pageSize.height}`,
              maxHeight: "500px",
              padding: `${pageMargin}px`,
            }}
          >
            {panelsWithImages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileImage className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无可预览的图片</p>
                  <p className="text-sm">请先生成分镜图片</p>
                </div>
              </div>
            ) : (
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelsPerPage))}, 1fr)`,
                  gridTemplateRows: `repeat(${Math.ceil(panelsPerPage / Math.ceil(Math.sqrt(panelsPerPage)))}, 1fr)`,
                  gap: `${panelGap}px`,
                }}
              >
                {currentPagePanels.map((panel) => (
                  <div
                    key={panel.id}
                    className="bg-gray-100 rounded overflow-hidden"
                  >
                    <img
                      src={panel.generated_image || panel.image_url}
                      alt={panel.description || `分镜 ${panel.panel_order}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="border-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
                上一页
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const pageNum = i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded text-sm ${
                        currentPage === pageNum
                          ? "bg-orange-500 text-white"
                          : "text-gray-400 hover:bg-gray-800"
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <span className="text-gray-500 px-2">...</span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className="border-gray-700"
              >
                下一页
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
