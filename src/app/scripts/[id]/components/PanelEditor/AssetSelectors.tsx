/**
 * Panel Asset Selectors - Character, Outfit, Expression, Scene
 * Phase 2: Asset binding components for panel editor
 */

"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { StoryCharacterWithDetails } from "@/components/StoryCharacter/types";

// Character asset types
interface CharacterOutfit {
  id: string;
  outfit_type: string;
  outfit_name: string;
  image_url?: string;
}

interface CharacterExpression {
  id: string;
  expression_type: string;
  image_url?: string;
}

interface Scene {
  id: string;
  scene_name: string;
  scene_type: string;
  image_url?: string;
}

// Props interfaces
interface CharacterAssetSelectorProps {
  storyId: string;
  characterId?: string;
  expressionType?: string;
  outfitId?: string;
  onCharacterChange: (characterId: string) => void;
  onExpressionChange: (expressionType: string) => void;
  onOutfitChange: (outfitId: string) => void;
}

interface SceneSelectorProps {
  sceneId?: string;
  onSceneChange: (sceneId: string) => void;
}

/**
 * Character Asset Selector - Character, Expression, Outfit
 */
export function CharacterAssetSelector({
  storyId,
  characterId,
  expressionType,
  outfitId,
  onCharacterChange,
  onExpressionChange,
  onOutfitChange,
}: CharacterAssetSelectorProps) {
  const [storyCharacters, setStoryCharacters] = useState<
    StoryCharacterWithDetails[]
  >([]);
  const [outfits, setOutfits] = useState<CharacterOutfit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch story characters
  useEffect(() => {
    async function fetchStoryCharacters(): Promise<void> {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/story/${storyId}/characters`);
        const data = await response.json();
        if (response.ok) {
          setStoryCharacters(data.characters || []);
        }
      } catch (error) {
        console.error("Failed to fetch story characters:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStoryCharacters();
  }, [storyId]);

  // Fetch outfits when character changes
  useEffect(() => {
    async function fetchOutfits(): Promise<void> {
      if (!characterId) {
        setOutfits([]);
        return;
      }

      try {
        const response = await fetch(`/api/character/${characterId}`);
        const data = await response.json();
        if (response.ok && data.character) {
          setOutfits(data.character.outfits || []);
        }
      } catch (error) {
        console.error("Failed to fetch character outfits:", error);
      }
    }

    fetchOutfits();
  }, [characterId]);

  const selectedCharacter = storyCharacters.find(
    (sc) => sc.character_id === characterId
  );

  const expressionTypes = [
    { value: "neutral", label: "中性 (Neutral)" },
    { value: "happy", label: "开心 (Happy)" },
    { value: "sad", label: "悲伤 (Sad)" },
    { value: "angry", label: "愤怒 (Angry)" },
    { value: "surprised", label: "惊讶 (Surprised)" },
    { value: "shy", label: "害羞 (Shy)" },
    { value: "confident", label: "自信 (Confident)" },
    { value: "worried", label: "担忧 (Worried)" },
    { value: "determined", label: "坚定 (Determined)" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        加载角色资产...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Character Selector */}
      <div className="space-y-2">
        <Label>角色 (Character)</Label>
        <Select
          value={characterId || ""}
          onValueChange={onCharacterChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">无角色</SelectItem>
            {storyCharacters.map((sc) => (
              <SelectItem key={sc.character_id} value={sc.character_id}>
                {sc.character_name} ({sc.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expression Selector - Only show if character selected */}
      {characterId && (
        <div className="space-y-2">
          <Label>表情 (Expression)</Label>
          <Select
            value={expressionType || ""}
            onValueChange={onExpressionChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择表情" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">默认表情</SelectItem>
              {expressionTypes.map((exp) => (
                <SelectItem key={exp.value} value={exp.value}>
                  {exp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Outfit Selector - Only show if character selected */}
      {characterId && outfits.length > 0 && (
        <div className="space-y-2">
          <Label>服装 (Outfit)</Label>
          <Select
            value={outfitId || ""}
            onValueChange={onOutfitChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择服装" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">默认服装</SelectItem>
              {outfits.map((outfit) => (
                <SelectItem key={outfit.id} value={outfit.id}>
                  {outfit.outfit_name} ({outfit.outfit_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Character info display */}
      {selectedCharacter && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
          <p>
            <strong>角色:</strong> {selectedCharacter.character_name}
          </p>
          <p>
            <strong>角色类型:</strong> {selectedCharacter.role}
          </p>
          {selectedCharacter.character_arc && (
            <p>
              <strong>角色弧光:</strong> {selectedCharacter.character_arc}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Scene Selector
 */
export function SceneSelector({ sceneId, onSceneChange }: SceneSelectorProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchScenes(): Promise<void> {
      try {
        setIsLoading(true);
        const response = await fetch("/api/scene");
        const data = await response.json();
        if (response.ok) {
          setScenes(data.scenes || []);
        }
      } catch (error) {
        console.error("Failed to fetch scenes:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScenes();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        加载场景...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>场景 (Scene)</Label>
      <Select value={sceneId || ""} onValueChange={onSceneChange}>
        <SelectTrigger>
          <SelectValue placeholder="选择场景" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">无场景</SelectItem>
          {scenes.map((scene) => (
            <SelectItem key={scene.id} value={scene.id}>
              {scene.scene_name} ({scene.scene_type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
