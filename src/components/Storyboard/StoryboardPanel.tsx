import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, FileText } from "lucide-react";

export interface PanelData {
  id: string;
  type: "closeup" | "medium" | "wide" | "action" | "dialogue" | "transition";
  importance: "high" | "medium" | "low";
  description: string;
  dialogue?: string;
  character?: string;
  emotion?: string;
  generatedImage?: string;
  englishPrompt?: string;
}

interface StoryboardPanelProps {
  panel: PanelData;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

const panelTypeConfig = {
  closeup: { label: "特写", color: "bg-comic-red/20 border-comic-red", icon: "🎯" },
  medium: { label: "中景", color: "bg-comic-blue/20 border-comic-blue", icon: "👤" },
  wide: { label: "全景", color: "bg-comic-green/20 border-comic-green", icon: "🌆" },
  action: { label: "动作", color: "bg-comic-orange/20 border-comic-orange", icon: "⚡" },
  dialogue: { label: "对话", color: "bg-comic-purple/20 border-comic-purple", icon: "💬" },
  transition: { label: "过渡", color: "bg-comic-pink/20 border-comic-pink", icon: "🔄" },
};

const StoryboardPanel = ({ panel, index, isSelected, onClick }: StoryboardPanelProps) => {
  const config = panelTypeConfig[panel.type];
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-lg border-2 transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02]",
        config.color,
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* Panel Number */}
      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-xs font-bold text-foreground z-10">
        {index + 1}
      </div>

      {/* Type Badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/80 text-xs font-semibold flex items-center gap-1 z-10">
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </div>

      {/* Generated Image or Placeholder */}
      {panel.generatedImage ? (
        <div className="relative w-full h-32 bg-muted">
          <img
            src={panel.generatedImage}
            alt={panel.description}
            className="w-full h-full object-cover"
          />
          {panel.englishPrompt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPrompt(!showPrompt);
              }}
              className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-background/90 flex items-center justify-center hover:bg-background z-10"
              title="查看英文提示词"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          {showPrompt && panel.englishPrompt && (
            <div className="absolute inset-0 bg-background/95 p-3 text-xs text-foreground overflow-y-auto z-20">
              <div className="font-semibold mb-1">English Prompt:</div>
              <div className="text-muted-foreground">{panel.englishPrompt}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-32 bg-muted/50 flex items-center justify-center text-muted-foreground text-sm">
          <Eye className="w-5 h-5 mr-2" />
          等待生成
        </div>
      )}

      {/* Content Preview */}
      <div className="p-4 min-h-[100px] flex flex-col justify-between">
        <p className="text-sm text-foreground line-clamp-3">{panel.description}</p>

        {panel.dialogue && (
          <div className="mt-2 p-2 rounded bg-background/50 text-xs text-muted-foreground italic">
            "{panel.dialogue}"
          </div>
        )}

        {panel.character && (
          <div className="mt-2 text-xs text-muted-foreground">
            角色: {panel.character}
            {panel.emotion && ` (${panel.emotion})`}
          </div>
        )}
      </div>

      {/* Importance Indicator */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-1",
        panel.importance === "high" && "bg-comic-red",
        panel.importance === "medium" && "bg-comic-yellow",
        panel.importance === "low" && "bg-comic-green"
      )} />
    </button>
  );
};

export default StoryboardPanel;
