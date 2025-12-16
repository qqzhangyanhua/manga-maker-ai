import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { CheckCircle2, Circle, Grid3X3 } from "lucide-react";

type PanelStatsProps = {
  panels: PanelData[];
};

export const PanelStats = ({ panels }: PanelStatsProps) => {
  const totalCount = panels.length;
  const generatedCount = panels.filter((p) => p.generatedImage).length;
  const pendingCount = totalCount - generatedCount;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-zinc-700 text-sm">
      <div className="flex items-center gap-2 text-zinc-400">
        <Grid3X3 className="w-4 h-4" />
        <span className="font-medium">分镜统计：</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-white font-semibold">{totalCount}</span>
        <span className="text-zinc-400">个分镜</span>
      </div>

      {generatedCount > 0 && (
        <div className="flex items-center gap-1 text-green-500">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-semibold">{generatedCount}</span>
          <span className="text-zinc-400">已生成</span>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-1 text-orange-500">
          <Circle className="w-4 h-4" />
          <span className="font-semibold">{pendingCount}</span>
          <span className="text-zinc-400">待生成</span>
        </div>
      )}

      {generatedCount > 0 && (
        <div className="ml-auto text-xs text-zinc-400">
          完成度: {Math.round((generatedCount / totalCount) * 100)}%
        </div>
      )}
    </div>
  );
};
