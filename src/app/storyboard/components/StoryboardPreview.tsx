import { Grid3X3, Edit3, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import AutoLayoutGrid from "@/components/Storyboard/AutoLayoutGrid";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { PanelDetails } from "./PanelDetails";
import { PanelStats } from "./PanelStats";
import { EmptyState } from "./EmptyState";

type StoryboardPreviewProps = {
  hasGeneratedPanels: boolean;
  panels: PanelData[];
  selectedPanel: string | null;
  onPanelSelect: (panelId: string | null) => void;
  selectedPanelData: PanelData | undefined;
  onEnterEditor: () => void;
  onGenerateImages: () => void;
  onExport: () => void;
  isExporting: boolean;
  onGenerateSingleImage: (panelId: string) => void;
  generatingSinglePanel: string | null;
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
  onGenerateSingleImage,
  generatingSinglePanel,
}: StoryboardPreviewProps) {
  return (
    <div className="comic-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-primary" />
          <h2 className="font-comic text-xl text-foreground">智能分镜排版</h2>
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
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting ? "导出中..." : "导出"}
            </Button>
          </div>
        )}
      </div>

      {hasGeneratedPanels ? (
        <>
          <PanelStats panels={panels} />

          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border text-xs">
            <span className="text-muted-foreground">自动排版：</span>
            <span className="px-2 py-0.5 rounded-full bg-comic-red/20 text-comic-red">
              高重要度=大格
            </span>
            <span className="px-2 py-0.5 rounded-full bg-comic-orange/20 text-comic-orange">
              动作=宽格
            </span>
            <span className="px-2 py-0.5 rounded-full bg-comic-blue/20 text-comic-blue">
              特写=竖格
            </span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
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
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
