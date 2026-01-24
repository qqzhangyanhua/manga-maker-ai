"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Crown,
  Skull,
  User,
  Check,
  Loader2,
  Sparkles,
  BookImage,
  X,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NovelCharacter {
  name: string;
  role: string;
  description: string;
  traits?: string[];
  relationships?: Record<string, string>;
  tempId: string;
  generatedImageUrl?: string;
}

interface GenerateFinalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  timelineId: string;
  onConfirm: (selectedCharacters: NovelCharacter[]) => void;
}

function getRoleIcon(role: string) {
  switch (role) {
    case "protagonist":
      return <Crown className="w-3 h-3 text-yellow-400" />;
    case "antagonist":
      return <Skull className="w-3 h-3 text-red-400" />;
    default:
      return <User className="w-3 h-3 text-zinc-400" />;
  }
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "protagonist":
      return "bg-yellow-900/50 text-yellow-300 border-yellow-800";
    case "antagonist":
      return "bg-red-900/50 text-red-300 border-red-800";
    case "supporting":
      return "bg-blue-900/50 text-blue-300 border-blue-800";
    default:
      return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "protagonist":
      return "主角";
    case "antagonist":
      return "反派";
    case "supporting":
      return "配角";
    case "minor":
      return "龙套";
    default:
      return "角色";
  }
}

export function GenerateFinalDialog({
  open,
  onOpenChange,
  chapterId,
  chapterTitle,
  chapterNumber,
  timelineId,
  onConfirm,
}: GenerateFinalDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    data: charactersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["novel-characters", timelineId],
    queryFn: async () => {
      const res = await fetch(
        `/api/canvas/timeline/${timelineId}/novel-characters`
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "获取角色列表失败");
      }
      return res.json() as Promise<{
        success: boolean;
        timeline_id: string;
        novel_id: string;
        novel_title: string;
        characters: NovelCharacter[];
      }>;
    },
    enabled: open,
    staleTime: 30 * 1000,
  });

  const characters = useMemo(() => charactersData?.characters || [], [charactersData?.characters]);

  // 初始化选中主角
  useEffect(() => {
    if (open && characters.length > 0) {
      const protagonistIds = characters
        .filter((c) => c.role === "protagonist")
        .map((c) => c.tempId);
      setSelectedIds(new Set(protagonistIds));
    } else if (!open) {
      // 关闭时清空选择
      setSelectedIds(new Set());
    }
  }, [open, characters]);

  const toggleCharacter = useCallback((tempId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(characters.map((c) => c.tempId)));
  }, [characters]);

  const handleSelectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleConfirm = useCallback(() => {
    const selectedCharacters = characters.filter((c) =>
      selectedIds.has(c.tempId)
    );
    onConfirm(selectedCharacters);
  }, [characters, selectedIds, onConfirm]);

  const protagonists = characters.filter((c) => c.role === "protagonist");
  const antagonists = characters.filter((c) => c.role === "antagonist");
  const supporting = characters.filter((c) => c.role === "supporting");
  const minor = characters.filter(
    (c) => c.role === "minor" || !["protagonist", "antagonist", "supporting"].includes(c.role)
  );

  const renderCharacterGroup = (
    title: string,
    chars: NovelCharacter[],
    icon: React.ReactNode
  ) => {
    if (chars.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
          {icon}
          {title} ({chars.length})
        </div>
        <div className="grid grid-cols-2 gap-2">
          {chars.map((char) => {
            const isSelected = selectedIds.has(char.tempId);
            return (
              <div
                key={char.tempId}
                onClick={() => toggleCharacter(char.tempId)}
                className={cn(
                  "relative p-3 rounded-lg border-2 cursor-pointer transition-all",
                  isSelected
                    ? "border-purple-500 bg-purple-900/20"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {char.generatedImageUrl ? (
                      <img
                        src={char.generatedImageUrl}
                        alt={char.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getRoleIcon(char.role)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-white truncate text-sm">
                        {char.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4",
                          getRoleBadgeColor(char.role)
                        )}
                      >
                        {getRoleLabel(char.role)}
                      </Badge>
                    </div>
                    {char.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {char.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookImage className="h-5 w-5 text-purple-500" />
            选择本章角色 - 第{chapterNumber}章
          </DialogTitle>
          <DialogDescription>
            {chapterTitle} - 选择出现在本章的角色，将用于生成最终漫画时的角色垫图参考
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="ml-2 text-zinc-400">加载角色列表...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <X className="w-12 h-12 mx-auto text-red-400 mb-3" />
              <p className="text-zinc-400 mb-2">加载失败</p>
              <p className="text-xs text-zinc-500 mb-4">
                {error instanceof Error ? error.message : "未知错误"}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                重试
              </Button>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-400 mb-2">暂无角色</p>
              <p className="text-xs text-zinc-500">
                小说项目中尚未定义角色，可以继续生成（将不使用角色垫图）
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  选择本章节中出现的角色，将用于生成最终漫画时的角色垫图参考
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs h-7"
                  >
                    全选
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectNone}
                    className="text-xs h-7"
                  >
                    清空
                  </Button>
                </div>
              </div>

              {renderCharacterGroup(
                "主角",
                protagonists,
                <Crown className="w-3 h-3 text-yellow-400" />
              )}
              {renderCharacterGroup(
                "反派",
                antagonists,
                <Skull className="w-3 h-3 text-red-400" />
              )}
              {renderCharacterGroup(
                "配角",
                supporting,
                <Users className="w-3 h-3 text-blue-400" />
              )}
              {renderCharacterGroup(
                "其他角色",
                minor,
                <User className="w-3 h-3 text-zinc-400" />
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4">
          <div className="flex-1 text-sm text-zinc-400">
            已选择 {selectedIds.size} / {characters.length} 个角色
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            确认并生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
