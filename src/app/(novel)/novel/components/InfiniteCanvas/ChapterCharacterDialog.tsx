"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Check, X, Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ChapterCharacterFull } from "./shared-types";

// Character 类型是 ChapterCharacterFull 的简化版
type Character = Pick<ChapterCharacterFull, "id" | "name" | "description" | "base_image_url"> & {
  tags: string[];
};

interface ChapterCharacterDialogProps {
  open: boolean;
  onClose: () => void;
  chapterId: string;
  chapterNumber: number;
  timelineId: string;
  initialCharacterIds?: string[];
  onSaved?: () => void;
}

export function ChapterCharacterDialog({
  open,
  onClose,
  chapterId,
  chapterNumber,
  timelineId,
  initialCharacterIds = [],
  onSaved,
}: ChapterCharacterDialogProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialCharacterIds)
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/character");
      if (!response.ok) throw new Error("获取角色列表失败");
      const data = await response.json();
      setCharacters(data.characters || []);
    } catch (error) {
      console.error("加载角色失败:", error);
      toast.error("加载角色列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChapterCharacters = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/canvas/chapter/${chapterId}/characters`
      );
      if (response.ok) {
        const data = await response.json();
        setSelectedIds(new Set(data.characterIds || []));
      }
    } catch (error) {
      console.error("加载章节角色失败:", error);
    }
  }, [chapterId]);

  useEffect(() => {
    if (open) {
      loadCharacters();
      loadChapterCharacters();
    }
  }, [open, loadCharacters, loadChapterCharacters]);

  const toggleCharacter = (characterId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/canvas/chapter/${chapterId}/characters`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterIds: Array.from(selectedIds),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存失败");
      }

      toast.success("角色绑定已保存");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("保存角色绑定失败:", error);
      toast.error(
        error instanceof Error ? error.message : "保存角色绑定失败"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            第 {chapterNumber} 章 - 角色管理
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-zinc-400 mb-4">
            选择本章节中出现的角色，这些角色将用于生成漫画时的角色垫图参考。
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="ml-2 text-zinc-400">加载角色列表...</span>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-400 mb-2">暂无角色</p>
              <p className="text-xs text-zinc-500">
                请先在角色库中创建角色，然后再回来绑定
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {characters.map((character) => {
                const isSelected = selectedIds.has(character.id);
                return (
                  <div
                    key={character.id}
                    onClick={() => toggleCharacter(character.id)}
                    className={`
                      relative p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        isSelected
                          ? "border-purple-500 bg-purple-900/20"
                          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {character.base_image_url ? (
                        <img
                          src={character.base_image_url}
                          alt={character.name}
                          className="w-12 h-12 rounded-lg object-cover border border-zinc-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center">
                          <Users className="w-6 h-6 text-zinc-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {character.name}
                        </div>
                        {character.description && (
                          <div className="text-xs text-zinc-400 truncate">
                            {character.description}
                          </div>
                        )}
                        {character.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {character.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
          <div className="text-sm text-zinc-400">
            已选择 {selectedIds.size} 个角色
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  保存
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
