"use client";

import { User, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SuggestedCharacterResponse } from "@/types/suggested-characters.types";
import type { CharacterRole } from "@/components/StoryCharacter/types";

interface SuggestedCharacterCardProps {
  character: SuggestedCharacterResponse;
  selected: boolean;
  onToggle: () => void;
}

const roleColors: Record<CharacterRole, string> = {
  protagonist: "bg-blue-500/20",
  antagonist: "bg-red-500/20",
  supporting: "bg-green-500/20",
  minor: "bg-gray-500/20",
};

const roleLabels: Record<CharacterRole, string> = {
  protagonist: "主角",
  antagonist: "反派",
  supporting: "配角",
  minor: "龙套",
};

export function SuggestedCharacterCard({
  character,
  selected,
  onToggle,
}: SuggestedCharacterCardProps) {
  const characterRole = character.role as CharacterRole;

  return (
    <div
      onClick={onToggle}
      className={cn(
        "p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-muted hover:border-primary/50"
      )}
    >
      {/* 占位头像 */}
      <div
        className={cn(
          "w-full aspect-[3/4] rounded-md flex items-center justify-center mb-2 transition-all",
          roleColors[characterRole]
        )}
      >
        <User className="w-12 h-12 text-muted-foreground/60" />
      </div>

      {/* 角色信息 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <h4 className="font-medium text-sm truncate flex-1" title={character.name}>
            {character.name}
          </h4>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {roleLabels[characterRole]}
          </Badge>
        </div>
        <p
          className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
          title={character.description}
        >
          {character.description}
        </p>
      </div>

      {/* 选择指示器 */}
      {selected && (
        <div className="mt-2 flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-primary">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium">已选择</span>
          </div>
        </div>
      )}
    </div>
  );
}
