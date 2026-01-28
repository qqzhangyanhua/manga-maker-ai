"use client";

import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { CharacterReferenceCard } from "./CharacterReferenceCard";
import { useProjectCharacters } from "./hooks/useProjectCharacters";
import type { CharacterReference, ReferenceImage } from "./types";

interface CharacterReferenceSectionProps {
  projectId: string;
  characterReferences: CharacterReference[];
  onUpdateCharacterReferences: (references: CharacterReference[]) => void;
}

export function CharacterReferenceSection({
  projectId,
  characterReferences,
  onUpdateCharacterReferences,
}: CharacterReferenceSectionProps) {
  // 使用项目级别的角色数据
  const { data, isLoading } = useProjectCharacters(projectId);

  // 初始化角色参考图状态（如果还没有）
  useEffect(() => {
    if (data?.characters && characterReferences.length === 0) {
      const initialized: CharacterReference[] = data.characters.map((char, index) => ({
        id: char.id || `char-${index}-${char.name}`,
        name: char.name,
        role: char.role,
        avatar_url: char.generatedImageUrl,
        selectedReferenceImages: [],
      }));
      onUpdateCharacterReferences(initialized);
    }
  }, [data?.characters, characterReferences.length, onUpdateCharacterReferences]);

  // 点击按钮直接将头像添加为参考图
  const handleAddAvatarAsReference = (characterId: string) => {
    const character = characterReferences.find((c) => c.id === characterId);
    if (!character || !character.avatar_url) return;

    // 如果已选中，则取消选中
    if (character.selectedReferenceImages.length > 0) {
      const updated = characterReferences.map((char) => {
        if (char.id === characterId) {
          return { ...char, selectedReferenceImages: [] };
        }
        return char;
      });
      onUpdateCharacterReferences(updated);
      return;
    }

    // 添加头像作为参考图
    const avatarRef: ReferenceImage = {
      id: `avatar-${characterId}`,
      url: character.avatar_url,
      source: "character_avatar",
      sourceId: characterId,
    };

    const updated = characterReferences.map((char) => {
      if (char.id === characterId) {
        return { ...char, selectedReferenceImages: [avatarRef] };
      }
      return char;
    });
    onUpdateCharacterReferences(updated);
  };

  const handleRemoveImage = (characterId: string, imageId: string) => {
    const updated = characterReferences.map((char) => {
      if (char.id === characterId) {
        return {
          ...char,
          selectedReferenceImages: char.selectedReferenceImages.filter(
            (img) => img.id !== imageId
          ),
        };
      }
      return char;
    });
    onUpdateCharacterReferences(updated);
  };

  // 1️⃣ 加载状态
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">角色参考图（可选）</h3>
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <p className="text-xs text-muted-foreground">正在加载角色数据...</p>
      </div>
    );
  }

  // 2️⃣ 缺少项目ID
  if (!projectId) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">角色参考图（可选）</h3>
        <div className="flex items-start gap-2 text-xs bg-gradient-to-br from-purple-900/30 to-orange-900/20 border border-purple-800/50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-purple-300">缺少项目信息</p>
            <p className="text-purple-400/80 mt-1">无法加载角色数据,请刷新页面后重试</p>
          </div>
        </div>
      </div>
    );
  }

  // 3️⃣ 无角色数据
  if (!data?.characters || data.characters.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">角色参考图（可选）</h3>
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>未检测到角色。如需添加角色参考图,请先在项目中创建角色。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">角色参考图（可选）</h3>
      <div className="space-y-2">
        {characterReferences.map((character) => (
          <CharacterReferenceCard
            key={character.id}
            character={character}
            selectedImages={character.selectedReferenceImages}
            onAddAvatarAsReference={() => handleAddAvatarAsReference(character.id)}
            onRemoveImage={(imageId) => handleRemoveImage(character.id, imageId)}
          />
        ))}
      </div>
    </div>
  );
}
