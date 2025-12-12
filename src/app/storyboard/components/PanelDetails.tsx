import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";

type PanelDetailsProps = {
  panel: PanelData;
  onGenerateImage?: (panelId: string) => void;
  isGenerating?: boolean;
};

export const PanelDetails = ({ panel, onGenerateImage, isGenerating }: PanelDetailsProps) => {
  const hasImage = !!panel.generatedImage;
  const hasPrompt = !!panel.englishPrompt;

  return (
    <div className="mt-6 p-4 rounded-lg bg-muted border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">分镜详情</h3>

        {onGenerateImage && hasPrompt && (
          <Button
            size="sm"
            variant={hasImage ? "outline" : "default"}
            onClick={() => onGenerateImage(panel.id)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : hasImage ? (
              <>
                <RefreshCw className="w-4 h-4" />
                重新生成
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成图像
              </>
            )}
          </Button>
        )}

        {hasImage && (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>已生成</span>
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">镜头类型：</span>
          <span className="text-foreground font-semibold">
            {panel.type === "wide" && "远景/全景"}
            {panel.type === "medium" && "中景"}
            {panel.type === "closeup" && "特写"}
            {panel.type === "action" && "动作镜头"}
            {panel.type === "dialogue" && "对话场景"}
            {panel.type === "transition" && "过渡镜头"}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">画面描述：</span>
          <span className="text-foreground">{panel.description}</span>
        </p>
        {panel.dialogue && (
          <p>
            <span className="text-muted-foreground">对白：</span>
            <span className="text-foreground italic">"{panel.dialogue}"</span>
          </p>
        )}
        {panel.character && (
          <p>
            <span className="text-muted-foreground">角色：</span>
            <span className="text-foreground">{panel.character}</span>
            {panel.emotion && <span className="text-muted-foreground"> ({panel.emotion})</span>}
          </p>
        )}
        {panel.cameraAngle && (
          <p>
            <span className="text-muted-foreground">镜头角度：</span>
            <span className="text-foreground">{panel.cameraAngle}</span>
          </p>
        )}
        {panel.shotSize && (
          <p>
            <span className="text-muted-foreground">景别：</span>
            <span className="text-foreground">{panel.shotSize}</span>
          </p>
        )}
        {!hasPrompt && !hasImage && (
          <p className="text-orange-600 text-xs mt-2">
            提示：需要先为此分镜生成提示词才能生成图像
          </p>
        )}
      </div>
    </div>
  );
};
