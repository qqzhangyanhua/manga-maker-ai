"use client";

import { useState } from "react";
import Image from "next/image";
import { X, GripVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleSelector } from "./RoleSelector";
import { type StoryCharacterWithDetails, type CharacterRole } from "./types";

interface StoryCharacterCardProps {
  storyCharacter: StoryCharacterWithDetails;
  onRoleChange: (characterId: string, role: CharacterRole) => Promise<void>;
  onRemove: (characterId: string) => Promise<void>;
  isDragging?: boolean;
}

export function StoryCharacterCard({
  storyCharacter,
  onRoleChange,
  onRemove,
  isDragging,
}: StoryCharacterCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const { character } = storyCharacter;
  const role = storyCharacter.role as CharacterRole;

  const imageUrl =
    character.reference_image ||
    character.base_image_url ||
    character.expressions?.[0]?.image_url;

  const handleRoleChange = async (newRole: CharacterRole) => {
    if (newRole === role) return;
    setIsUpdating(true);
    try {
      await onRoleChange(character.id, newRole);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(character.id);
    } finally {
      setIsRemoving(false);
    }
  };

  const expressionCount = character.expressions?.length || 0;
  const outfitCount = character.outfits?.length || 0;

  return (
    <div
      className={`
        flex items-center gap-2 p-2 rounded-lg border bg-card
        transition-all duration-200
        ${isDragging ? "shadow-lg ring-2 ring-primary" : "hover:bg-accent/50"}
        ${isRemoving ? "opacity-50" : ""}
      `}
    >
      {/* Drag handle */}
      <div
        className="cursor-grab text-muted-foreground hover:text-foreground flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Character avatar */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={character.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Character info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" title={character.name}>
          {character.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {expressionCount}表情 · {outfitCount}服装
        </p>
      </div>

      {/* Role selector */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <RoleSelector
          value={role}
          onChange={handleRoleChange}
          disabled={isUpdating || isRemoving}
        />
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
        disabled={isRemoving}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
