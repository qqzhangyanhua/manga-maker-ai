"use client";

import { useState } from "react";
import Image from "next/image";
import { X, GripVertical, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleSelector } from "./RoleSelector";
import {
  type StoryCharacterWithDetails,
  type CharacterRole,
  ROLE_COLORS,
  ROLE_OPTIONS,
} from "./types";

interface StoryCharacterCardProps {
  storyCharacter: StoryCharacterWithDetails;
  onRoleChange: (characterId: string, role: CharacterRole) => Promise<void>;
  onRemove: (characterId: string) => Promise<void>;
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: (characterId: string) => void;
}

export function StoryCharacterCard({
  storyCharacter,
  onRoleChange,
  onRemove,
  isDragging,
  isSelected = false,
  onSelect,
}: StoryCharacterCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const { character } = storyCharacter;
  const role = storyCharacter.role as CharacterRole;
  const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.supporting;

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

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg border bg-card
        transition-all duration-200
        ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}
        ${isSelected ? "border-primary border-2 bg-primary/5" : "hover:bg-accent/50 cursor-pointer"}
        ${isRemoving ? "opacity-50" : ""}
      `}
      onClick={() => onSelect?.(character.id)}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
      )}

      {/* Drag handle */}
      <div
        className="cursor-grab text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Character avatar */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={character.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Character info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{character.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${roleColor}`}
          >
            {roleLabel}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {character.expressions?.length || 0} 表情 ·{" "}
          {character.outfits?.length || 0} 服装
        </div>
      </div>

      {/* Role selector */}
      <div onClick={(e) => e.stopPropagation()}>
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
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
