/**
 * Panel Asset Selectors - Character, Outfit, Expression, Scene
 * Phase 2: Asset binding components for panel editor
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
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
  panelDescription?: string; // NEW: 分镜描述，用于智能推荐
  onCharacterChange: (characterId: string) => void;
  onExpressionChange: (expressionType: string) => void;
  onOutfitChange: (outfitId: string) => void;
}

interface SceneSelectorProps {
  sceneId?: string;
  onSceneChange: (sceneId: string) => void;
}

/**
 * 智能推荐角色
 * 根据分镜描述中的关键词匹配角色
 */
function useSmartRecommendation(
  description: string | undefined,
  storyCharacters: StoryCharacterWithDetails[]
): StoryCharacterWithDetails | null {
  return useMemo(() => {
    if (!description || storyCharacters.length === 0) return null;

    const lowerDesc = description.toLowerCase();

    // 1. 精确匹配角色名字
    for (const sc of storyCharacters) {
      const charName = sc.character.name.toLowerCase();
      if (lowerDesc.includes(charName)) {
        return sc;
      }
    }

    // 2. 匹配角色类型关键词
    const roleKeywords: Record<string, string[]> = {
      protagonist: ["主角", "主人公", "hero", "protagonist"],
      antagonist: ["反派", "敌人", "villain", "antagonist", "enemy"],
      supporting: ["配角", "supporting", "助手", "朋友", "friend"],
    };

    for (const sc of storyCharacters) {
      const keywords = roleKeywords[sc.role] || [];
      for (const keyword of keywords) {
        if (lowerDesc.includes(keyword)) {
          return sc;
        }
      }
    }

    // 3. 优先推荐主角
    const protagonist = storyCharacters.find((sc) => sc.role === "protagonist");
    if (protagonist) return protagonist;

    return null;
  }, [description, storyCharacters]);
}

/**
 * Character Asset Selector - Character, Expression, Outfit
 */
export function CharacterAssetSelector({
  storyId,
  characterId,
  expressionType,
  outfitId,
  panelDescription,
  onCharacterChange,
  onExpressionChange,
  onOutfitChange,
}: CharacterAssetSelectorProps) {
  const [storyCharacters, setStoryCharacters] = useState<
    StoryCharacterWithDetails[]
  >([]);
  const [outfits, setOutfits] = useState<CharacterOutfit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 智能推荐
  const recommendedCharacter = useSmartRecommendation(
    panelDescription,
    storyCharacters
  );

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

  const hasRecommendation = recommendedCharacter && !characterId;

  return (
    <div className="space-y-4">
      {/* 智能推荐提示 */}
      {hasRecommendation && (
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-blue-700">
              💡 智能推荐：检测到可能需要角色「
              <strong>{recommendedCharacter.character.name}</strong>」(
              {recommendedCharacter.role === "protagonist" ? "主角" : recommendedCharacter.role === "antagonist" ? "反派" : recommendedCharacter.role === "supporting" ? "配角" : "龙套"})
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onCharacterChange(recommendedCharacter.character_id)}
            >
              应用推荐
            </Button>
          </div>
        </div>
      )}

      {/* 无角色警告 */}
      {!characterId && storyCharacters.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-700">
              ⚠️ 故事中还没有添加角色，生成时将不使用角色参考图
            </p>
            <p className="text-xs text-amber-600 mt-1">
              请先在左侧「故事角色」区域添加角色
            </p>
          </div>
        </div>
      )}

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
                {sc.character.name} ({sc.role === "protagonist" ? "主角" : sc.role === "antagonist" ? "反派" : sc.role === "supporting" ? "配角" : "龙套"})
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
            <strong>角色:</strong> {selectedCharacter.character.name}
          </p>
          <p>
            <strong>角色类型:</strong>{" "}
            {selectedCharacter.role === "protagonist"
              ? "主角"
              : selectedCharacter.role === "antagonist"
              ? "反派"
              : selectedCharacter.role === "supporting"
              ? "配角"
              : "龙套"}
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
