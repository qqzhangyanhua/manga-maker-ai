import { useState, useCallback, useMemo } from "react";

interface SuggestedCharacter {
  name: string;
  role: string; // 改为 string 以接受任意角色类型
  description: string;
  appearance: string;
  generated?: boolean;
}

interface UseNovelCharacterSyncProps {
  storyId: string;
  sourceNovelId: string | null;
  suggestedCharacters: unknown; // 改为 unknown
  storyCharacters: Array<{ character: { name: string } }>;
}

export function useNovelCharacterSync({
  storyId,
  sourceNovelId,
  suggestedCharacters: rawSuggestedCharacters,
  storyCharacters,
}: UseNovelCharacterSyncProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // 安全地解析 suggestedCharacters
  const suggestedCharacters = useMemo(() => {
    if (!rawSuggestedCharacters || !Array.isArray(rawSuggestedCharacters)) {
      return [];
    }
    return rawSuggestedCharacters as SuggestedCharacter[];
  }, [rawSuggestedCharacters]);

  // 检查是否应该显示同步提示
  const shouldShowSyncPrompt = useMemo(() => {
    // 必须来自小说
    if (!sourceNovelId) return false;

    // 必须有建议角色
    if (!suggestedCharacters || suggestedCharacters.length === 0) return false;

    // 计算未同步的角色数量
    const existingNames = new Set(storyCharacters.map((sc) => sc.character.name));
    const unsyncedCount = suggestedCharacters.filter(
      (char) => !existingNames.has(char.name)
    ).length;

    // 有未同步的角色
    return unsyncedCount > 0;
  }, [sourceNovelId, suggestedCharacters, storyCharacters]);

  // 标记已同步的角色
  const charactersWithStatus = useMemo(() => {
    const existingNames = new Set(storyCharacters.map((sc) => sc.character.name));
    return suggestedCharacters.map((char) => ({
      ...char,
      generated: existingNames.has(char.name),
    }));
  }, [suggestedCharacters, storyCharacters]);

  const openDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  return {
    shouldShowSyncPrompt,
    dialogOpen,
    openDialog,
    closeDialog,
    charactersWithStatus,
  };
}
