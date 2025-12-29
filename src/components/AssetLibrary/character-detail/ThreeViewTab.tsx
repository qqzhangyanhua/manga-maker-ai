import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ImagePreviewCard from "../ImagePreviewCard";
import type { GeneratedViewsState, ViewGeneratingState, ViewType } from "./types";

interface ThreeViewTabProps {
  generatedViews: GeneratedViewsState;
  viewGenerating: ViewGeneratingState;
  isGenerating: boolean;
  isUploading: boolean;
  onGenerateThreeView: () => void;
  onRegenerateSingleView: (viewType: ViewType) => void;
  onOpenUploadDialog: (viewType: ViewType) => void;
}

const ThreeViewTab = ({
  generatedViews,
  viewGenerating,
  isGenerating,
  isUploading,
  onGenerateThreeView,
  onRegenerateSingleView,
  onOpenUploadDialog,
}: ThreeViewTabProps) => {
  return (
    <div className="comic-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-comic text-xl text-foreground">角色三视图</h3>
          <p className="text-sm text-muted-foreground">
            生成标准的正面、侧面、背面视图，作为一致性基准
          </p>
        </div>
        <Button
          variant="comic"
          onClick={onGenerateThreeView}
          disabled={isGenerating}
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? "生成中..." : "生成三视图"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["front", "side", "back"] as ViewType[]).map((view) => (
          <ImagePreviewCard
            key={view}
            imageUrl={generatedViews[view]}
            label={view === "front" ? "正面" : view === "side" ? "侧面" : "背面"}
            aspectRatio="portrait"
            isGenerating={viewGenerating[view] || isUploading}
            onGenerate={onGenerateThreeView}
            onUpload={() => onOpenUploadDialog(view)}
            onRegenerate={() => onRegenerateSingleView(view)}
            onReplace={() => onOpenUploadDialog(view)}
            showGenerateButton={true}
            showUploadButton={true}
          />
        ))}
      </div>
    </div>
  );
};

export default ThreeViewTab;
