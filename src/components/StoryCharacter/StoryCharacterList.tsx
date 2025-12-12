"use client";

import { useState } from "react";
import { Users, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryCharacterCard } from "./StoryCharacterCard";
import { CharacterSelector } from "./CharacterSelector";
import type { StoryCharacterWithDetails, CharacterRole } from "./types";

interface StoryCharacterListProps {
  storyId: string;
  characters: StoryCharacterWithDetails[];
  onAdd: (characterId: string, role: CharacterRole) => Promise<void>;
  onRemove: (characterId: string) => Promise<void>;
  onRoleChange: (characterId: string, role: CharacterRole) => Promise<void>;
  isLoading?: boolean;
}

export function StoryCharacterList({
  storyId,
  characters,
  onAdd,
  onRemove,
  onRoleChange,
  isLoading,
}: StoryCharacterListProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Get IDs of characters already in story
  const existingCharacterIds = characters.map((sc) => sc.character_id);

  const handleAdd = async (characterId: string, role: CharacterRole) => {
    setIsAdding(true);
    try {
      await onAdd(characterId, role);
      setShowSelector(false);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">故事角色</span>
          <span className="text-xs text-muted-foreground">
            ({characters.length})
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSelector(true)}
          className="h-8"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加角色
        </Button>
      </div>

      {/* Character list */}
      {characters.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            暂无角色，从角色库添加角色到故事中
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setShowSelector(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            添加角色
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {characters.map((sc) => (
            <StoryCharacterCard
              key={sc.id}
              storyCharacter={sc}
              onRoleChange={onRoleChange}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {/* Character selector modal */}
      <CharacterSelector
        open={showSelector}
        onOpenChange={setShowSelector}
        excludeIds={existingCharacterIds}
        onSelect={handleAdd}
        isLoading={isAdding}
      />
    </div>
  );
}
