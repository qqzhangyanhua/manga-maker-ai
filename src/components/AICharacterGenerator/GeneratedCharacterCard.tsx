"use client";

import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_OPTIONS, ROLE_COLORS } from "@/components/StoryCharacter/types";
import type { GeneratedCharacter } from "./types";

interface GeneratedCharacterCardProps {
  character: GeneratedCharacter;
  selected: boolean;
  onToggle: () => void;
}

export function GeneratedCharacterCard({
  character,
  selected,
  onToggle,
}: GeneratedCharacterCardProps) {
  const roleOption = ROLE_OPTIONS.find((r) => r.value === character.role);
  const roleColor = ROLE_COLORS[character.role] || ROLE_COLORS.supporting;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md relative overflow-hidden",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onToggle}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <CardContent className="p-3">
        {/* Character image */}
        <div className="aspect-[3/4] mb-3 rounded-lg overflow-hidden bg-muted">
          {character.image_base64 ? (
            <img
              src={
                character.image_base64.startsWith("data:")
                  ? character.image_base64
                  : `data:image/png;base64,${character.image_base64}`
              }
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              图片生成失败
            </div>
          )}
        </div>

        {/* Character info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate flex-1">
              {character.name}
            </h4>
            <Badge
              variant="outline"
              className={cn("text-xs shrink-0", roleColor)}
            >
              {roleOption?.label || "配角"}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-3">
            {character.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
