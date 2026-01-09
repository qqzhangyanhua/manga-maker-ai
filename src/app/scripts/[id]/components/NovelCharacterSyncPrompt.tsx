import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ActionPrompt } from "@/components/common/ActionPrompt";

interface NovelCharacterSyncPromptProps {
  shouldShow: boolean;
  novelTitle: string;
  unmatchedCount: number;
  onSyncClick: () => void;
}

export function NovelCharacterSyncPrompt({
  shouldShow,
  novelTitle,
  unmatchedCount,
  onSyncClick,
}: NovelCharacterSyncPromptProps) {
  if (!shouldShow) return null;

  return (
    <div className="mt-6">
      <ActionPrompt
        icon={<Sparkles className="w-full h-full" />}
        message={`检测到此剧本来自小说「${novelTitle}」，发现 ${unmatchedCount} 个角色尚未同步`}
        variant="info"
        action={
          <Button
            onClick={onSyncClick}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            同步角色设定
          </Button>
        }
      />
    </div>
  );
}
