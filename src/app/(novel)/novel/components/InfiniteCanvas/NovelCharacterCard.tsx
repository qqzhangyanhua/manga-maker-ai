/**
 * NovelCharacterCard - 展示待升级的小说角色卡片
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Loader2 } from "lucide-react";

interface NovelCharacter {
  name: string;
  role: string; // "protagonist" | "antagonist" | "supporting" | "minor"
  description: string;
  tempId: string;
  traits?: string[];
  relationships?: Record<string, string>;
}

interface NovelCharacterCardProps {
  novelCharacter: NovelCharacter;
  onUpgrade: (character: NovelCharacter) => void;
  isUpgrading?: boolean;
}

const ROLE_CONFIG = {
  protagonist: { label: "主角", color: "border-blue-500 bg-blue-50", badgeColor: "bg-blue-100 text-blue-700" },
  antagonist: { label: "反派", color: "border-red-500 bg-red-50", badgeColor: "bg-red-100 text-red-700" },
  supporting: { label: "配角", color: "border-green-500 bg-green-50", badgeColor: "bg-green-100 text-green-700" },
  minor: { label: "次要", color: "border-gray-400 bg-gray-50", badgeColor: "bg-gray-100 text-gray-700" },
};

export function NovelCharacterCard({
  novelCharacter,
  onUpgrade,
  isUpgrading = false,
}: NovelCharacterCardProps) {
  const roleConfig = ROLE_CONFIG[novelCharacter.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.minor;

  return (
    <div className={`p-4 border-2 rounded-lg ${roleConfig.color} transition-all hover:shadow-md`}>
      {/* 顶部：角色名 + 角色类型 */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{novelCharacter.name}</h4>
        <Badge className={`${roleConfig.badgeColor} text-xs`}>
          {roleConfig.label}
        </Badge>
      </div>

      {/* 中间：描述文本 */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {novelCharacter.description}
      </p>

      {/* 特质标签（如果有） */}
      {novelCharacter.traits && novelCharacter.traits.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {novelCharacter.traits.slice(0, 3).map((trait, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {trait}
            </Badge>
          ))}
          {novelCharacter.traits.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{novelCharacter.traits.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* 底部：升级按钮 */}
      <Button
        size="sm"
        className="w-full"
        onClick={() => onUpgrade(novelCharacter)}
        disabled={isUpgrading}
      >
        {isUpgrading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            升级中...
          </>
        ) : (
          <>
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            升级为角色资产
          </>
        )}
      </Button>
    </div>
  );
}
