/**
 * CharacterStatusCard - 展示已有章节角色的状态卡片
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface ChapterCharacter {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  source_type: "manual" | "novel" | "story_ai" | "imported" | null;
}

interface CharacterStatusCardProps {
  character: ChapterCharacter;
  onRegenerate?: (characterId: string) => void;
  isRegenerating?: boolean;
}

const SOURCE_TYPE_CONFIG = {
  novel: { label: "小说角色", variant: "default" as const, color: "bg-blue-100 text-blue-700" },
  manual: { label: "手动创建", variant: "secondary" as const, color: "bg-gray-100 text-gray-700" },
  story_ai: { label: "故事AI", variant: "default" as const, color: "bg-purple-100 text-purple-700" },
  imported: { label: "导入", variant: "outline" as const, color: "bg-green-100 text-green-700" },
};

export function CharacterStatusCard({
  character,
  onRegenerate,
  isRegenerating = false,
}: CharacterStatusCardProps) {
  const hasImage = !!character.base_image_url;
  const sourceConfig = character.source_type ? SOURCE_TYPE_CONFIG[character.source_type] : null;

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg hover:shadow-md transition-shadow bg-white">
      {/* 左侧：角色头像 */}
      <Avatar className="h-16 w-16 rounded-lg">
        <AvatarImage src={character.base_image_url || undefined} alt={character.name} />
        <AvatarFallback className="rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 text-lg font-semibold">
          {character.name.slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      {/* 中间：角色信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm truncate">{character.name}</h4>
          {sourceConfig && (
            <Badge variant={sourceConfig.variant} className={`${sourceConfig.color} text-xs`}>
              {sourceConfig.label}
            </Badge>
          )}
        </div>
        {character.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{character.description}</p>
        )}
      </div>

      {/* 右侧：状态指示器 */}
      <div className="flex items-center gap-2">
        {hasImage ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-medium">已准备</span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-xs font-medium">缺失图片</span>
            </div>
            {onRegenerate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRegenerate(character.id)}
                disabled={isRegenerating}
                className="h-7 text-xs"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    重新生成
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
