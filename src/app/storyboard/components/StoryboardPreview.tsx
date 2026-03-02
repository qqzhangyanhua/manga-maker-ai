import { Grid3X3, Edit3, Sparkles, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AutoLayoutGrid from "@/components/Storyboard/AutoLayoutGrid";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { PanelDetails } from "./PanelDetails";
import { PanelStats } from "./PanelStats";
import { EmptyState } from "./EmptyState";
import { GeneratingState } from "./GeneratingState";
import type { ExportFormat } from "../hooks/useExport";

type StoryboardPreviewProps = {
  hasGeneratedPanels: boolean;
  panels: PanelData[];
  selectedPanel: string | null;
  onPanelSelect: (panelId: string | null) => void;
  selectedPanelData: PanelData | undefined;
  onEnterEditor: () => void;
  onGenerateImages: () => void;
  onExport: (format: ExportFormat) => void;
  isExporting: boolean;
  formatLabels: Record<ExportFormat, string>;
  onGenerateSingleImage: (panelId: string) => void;
  generatingSinglePanel: string | null;
  isGenerating: boolean;
};

export function StoryboardPreview({
  hasGeneratedPanels,
  panels,
  selectedPanel,
  onPanelSelect,
  selectedPanelData,
  onEnterEditor,
  onGenerateImages,
  onExport,
  isExporting,
  formatLabels,
  onGenerateSingleImage,
  generatingSinglePanel,
  isGenerating,
}: StoryboardPreviewProps) {
  return (
    <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-6 overflow-hidden shadow-lg">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-semibold text-white">智能分镜排版</h2>
        </div>
        {hasGeneratedPanels && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEnterEditor}>
              <Edit3 className="w-4 h-4" />
              进入编辑器
            </Button>
            <Button variant="outline" size="sm" onClick={onGenerateImages}>
              <Sparkles className="w-4 h-4" />
              生成图像
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "导出中..." : "导出"}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport("json")} disabled={isExporting}>
                  {formatLabels.json}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("png")} disabled={isExporting}>
                  {formatLabels.png}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("pdf")} disabled={isExporting}>
                  {formatLabels.pdf}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("zip")} disabled={isExporting}>
                  {formatLabels.zip}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {hasGeneratedPanels ? (
        <>
          <PanelStats panels={panels} />

          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-zinc-700 text-xs">
            <span className="text-zinc-400">自动排版：</span>
            <span className="px-2 py-0.5 rounded-full bg-comic-red/20 text-comic-red">
              高重要度=大格
            </span>
            <span className="px-2 py-0.5 rounded-full bg-comic-orange/20 text-comic-orange">
              动作=宽格
            </span>
            <span className="px-2 py-0.5 rounded-full bg-comic-blue/20 text-comic-blue">
              特写=竖格
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-300">
              过渡=小格
            </span>
          </div>

          <AutoLayoutGrid
            panels={panels}
            selectedPanel={selectedPanel}
            onPanelSelect={onPanelSelect}
          />

          {selectedPanelData && (
            <PanelDetails
              panel={selectedPanelData}
              onGenerateImage={onGenerateSingleImage}
              isGenerating={generatingSinglePanel === selectedPanelData.id}
            />
          )}
        </>
      ) : isGenerating ? (
        <GeneratingState />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
