"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { CharacterReference, ReferenceImage } from "./types";

interface CharacterReferenceCardProps {
  character: CharacterReference;
  selectedImages: ReferenceImage[];
  onAddAvatarAsReference: () => void;
  onRemoveImage: (imageId: string) => void;
}

export function CharacterReferenceCard({
  character,
  selectedImages,
  onAddAvatarAsReference,
  onRemoveImage,
}: CharacterReferenceCardProps) {
  const hasAvatar = !!character.avatar_url;
  const isSelected = selectedImages.length > 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={character.avatar_url} alt={character.name} />
            <AvatarFallback>{character.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="text-sm font-medium">{character.name}</h4>
            {character.role && (
              <Badge variant="secondary" className="text-xs mt-1">
                {character.role}
              </Badge>
            )}
          </div>
        </div>

        {hasAvatar && (
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            onClick={onAddAvatarAsReference}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {isSelected ? "已选用" : "选用头像"}
          </Button>
        )}
      </div>

      {/* 已选参考图 */}
      {selectedImages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            已选参考图 ({selectedImages.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {selectedImages.map((image) => (
              <div
                key={image.id}
                className="relative flex-shrink-0 group"
              >
                <img
                  src={image.thumbnail || image.url}
                  alt="参考图"
                  className="h-16 w-16 rounded object-cover border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveImage(image.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {hasAvatar ? "点击「选用头像」添加参考图" : "该角色暂无头像图片"}
        </p>
      )}
    </Card>
  );
}
