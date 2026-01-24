"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, AlertCircle } from "lucide-react";
import { CharacterReferenceCard } from "./CharacterReferenceCard";
import { ReferenceImagePicker } from "./ReferenceImagePicker";
import { useChapterCharacters } from "./hooks/useChapterCharacters";
import type { CharacterReference, ReferenceImage } from "./types";

interface CharacterReferenceSectionProps {
  chapterId: string;
  projectId: string;
  characterReferences: CharacterReference[];
  onUpdateCharacterReferences: (references: CharacterReference[]) => void;
}

export function CharacterReferenceSection({
  chapterId,
  projectId,
  characterReferences,
  onUpdateCharacterReferences,
}: CharacterReferenceSectionProps) {
  const { data, isLoading } = useChapterCharacters(chapterId);
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    characterId: string;
    characterName: string;
  } | null>(null);

  // 初始化角色参考图状态（如果还没有）
  useEffect(() => {
    if (data?.characters && characterReferences.length === 0) {
      const initialized: CharacterReference[] = data.characters.map((char) => ({
        id: char.id,
        name: char.name,
        role: char.role,
        avatar_url: char.avatar_url,
        selectedReferenceImages: [],
      }));
      onUpdateCharacterReferences(initialized);
    }
  }, [data?.characters, characterReferences.length, onUpdateCharacterReferences]);

  const handleSelectImages = (characterId: string, characterName: string) => {
    setPickerState({
      open: true,
      characterId,
      characterName,
    });
  };

  const handleConfirmImages = (images: ReferenceImage[]) => {
    if (!pickerState) return;

    const updated = characterReferences.map((char) => {
      if (char.id === pickerState.characterId) {
        return {
          ...char,
          selectedReferenceImages: images,
        };
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

  // 🔍 调试日志 - 帮助追踪数据流
  console.log("[CharacterReferenceSection] 状态:", {
    chapterId,
    projectId,
    isLoading,
    hasData: !!data,
    characterCount: data?.characters?.length || 0,
    characterReferencesCount: characterReferences.length,
  });

  // 1️⃣ 优先处理加载状态 - 显示骨架屏
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

  // 2️⃣ 处理缺少必要参数的情况
  if (!chapterId) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">角色参考图（可选）</h3>
        <div className="flex items-start gap-2 text-xs bg-amber-900/20 border border-amber-800/50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-300">缺少章节信息</p>
            <p className="text-amber-400/80 mt-1">无法加载角色数据,请刷新页面后重试</p>
          </div>
        </div>
      </div>
    );
  }

  // 3️⃣ 处理数据为空的情况 - 只有在确认加载完成且数据为空时才显示
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">角色参考图（可选）</h3>
        <Button size="sm" variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          手动添加角色
        </Button>
      </div>

      <div className="space-y-2">
        {characterReferences.map((character) => (
          <CharacterReferenceCard
            key={character.id}
            character={character}
            selectedImages={character.selectedReferenceImages}
            onSelectImages={() => handleSelectImages(character.id, character.name)}
            onRemoveImage={(imageId) => handleRemoveImage(character.id, imageId)}
          />
        ))}
      </div>

      {/* 参考图选择器对话框 */}
      {pickerState && (
        <ReferenceImagePicker
          open={pickerState.open}
          onOpenChange={(open) => {
            if (!open) setPickerState(null);
          }}
          projectId={projectId}
          characterId={pickerState.characterId}
          characterName={pickerState.characterName}
          selectedImages={
            characterReferences.find((c) => c.id === pickerState.characterId)
              ?.selectedReferenceImages || []
          }
          onConfirm={handleConfirmImages}
        />
      )}
    </div>
  );
}
