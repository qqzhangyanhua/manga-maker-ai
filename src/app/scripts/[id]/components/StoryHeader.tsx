import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Story } from "../types/script-editor.types";

type StoryHeaderProps = {
  story: Story;
  onBack: () => void;
};

/**
 * 故事详情页头部组件
 * 显示返回按钮、标题、类型和更新时间
 */
export function StoryHeader({ story, onBack }: StoryHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="text-zinc-400 hover:text-orange-500 hover:bg-zinc-800/50"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent">
          {story.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-2">
          <Badge
            variant="secondary"
            className="bg-orange-500/20 text-orange-400 border border-orange-500/30"
          >
            {story.genre}
          </Badge>
          <span>
            更新于: {format(new Date(story.updated_at), "yyyy-MM-dd HH:mm")}
          </span>
        </div>
      </div>
    </div>
  );
}
