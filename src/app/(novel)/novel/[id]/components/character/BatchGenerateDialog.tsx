/**
 * 批量生成角色图片对话框
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Image as ImageIcon, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Character } from "./types";

interface BatchGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  novelProjectId: string;
  onSuccess: () => void;
}

interface GenerationStatus {
  characterId: string;
  status: "pending" | "generating" | "success" | "error";
  message?: string;
  imageUrl?: string;
}

export function BatchGenerateDialog({
  isOpen,
  onClose,
  characters,
  novelProjectId,
  onSuccess,
}: BatchGenerateDialogProps) {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatuses, setGenerationStatuses] = useState<GenerationStatus[]>([]);

  // 切换角色选择
  const toggleCharacter = (characterId: string) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(characterId)
        ? prev.filter((id) => id !== characterId)
        : [...prev, characterId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCharacterIds.length === characters.length) {
      setSelectedCharacterIds([]);
    } else {
      setSelectedCharacterIds(characters.map((c) => c.id));
    }
  };

  // 批量生成
  const handleBatchGenerate = async () => {
    const selectedCharacters = characters.filter((c) =>
      selectedCharacterIds.includes(c.id)
    );

    if (selectedCharacters.length === 0) {
      toast.error("请至少选择一个角色");
      return;
    }

    setIsGenerating(true);

    // 初始化状态
    const initialStatuses: GenerationStatus[] = selectedCharacters.map((c) => ({
      characterId: c.id,
      status: "pending",
    }));
    setGenerationStatuses(initialStatuses);

    // 逐个生成（串行，避免并发过多）
    for (let i = 0; i < selectedCharacters.length; i++) {
      const character = selectedCharacters[i];

      // 更新为生成中
      setGenerationStatuses((prev) =>
        prev.map((s) =>
          s.characterId === character.id ? { ...s, status: "generating" } : s
        )
      );

      try {
        const response = await fetch("/api/novel/character/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            novelProjectId,
            characterId: character.id,
            characterName: character.name,
            characterDescription: character.description,
            prompt: character.description, // 使用描述作为提示词
          }),
        });

        if (!response.ok) {
          throw new Error("生成失败");
        }

        const result = await response.json();

        if (result.success) {
          setGenerationStatuses((prev) =>
            prev.map((s) =>
              s.characterId === character.id
                ? {
                    ...s,
                    status: "success",
                    message: "生成成功",
                    imageUrl: result.imageUrl,
                  }
                : s
            )
          );
        } else {
          throw new Error(result.message || "生成失败");
        }
      } catch (error) {
        setGenerationStatuses((prev) =>
          prev.map((s) =>
            s.characterId === character.id
              ? {
                  ...s,
                  status: "error",
                  message: error instanceof Error ? error.message : "生成失败",
                }
              : s
          )
        );
      }
    }

    setIsGenerating(false);
    toast.success(`批量生成完成：${selectedCharacters.length} 个角色`);
    onSuccess();
  };

  const selectedCharacters = characters.filter((c) =>
    selectedCharacterIds.includes(c.id)
  );

  // 计算进度
  const completedCount = generationStatuses.filter(
    (s) => s.status === "success" || s.status === "error"
  ).length;
  const progress =
    generationStatuses.length > 0
      ? (completedCount / generationStatuses.length) * 100
      : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>批量生成角色图片</DialogTitle>
          <DialogDescription>
            选择需要生成图片的角色（共 {characters.length} 个角色）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 全选按钮 */}
          {!isGenerating && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedCharacterIds.length === characters.length
                  ? "取消全选"
                  : "全选"}
              </Button>
              <span className="text-sm text-muted-foreground">
                已选择 {selectedCharacterIds.length} 个角色
              </span>
            </div>
          )}

          {/* 角色列表 */}
          {!isGenerating ? (
            <ScrollArea className="h-96 border rounded-lg p-4">
              <div className="space-y-2">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleCharacter(character.id)}
                  >
                    <Checkbox
                      checked={selectedCharacterIds.includes(character.id)}
                      onCheckedChange={() => toggleCharacter(character.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{character.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {character.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-4">
              {/* 进度条 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>生成进度</span>
                  <span>
                    {completedCount} / {generationStatuses.length}
                  </span>
                </div>
                <Progress value={progress} />
              </div>

              {/* 状态列表 */}
              <ScrollArea className="h-72 border rounded-lg p-4">
                <div className="space-y-2">
                  {generationStatuses.map((status) => {
                    const character = characters.find(
                      (c) => c.id === status.characterId
                    );
                    if (!character) return null;

                    return (
                      <div
                        key={status.characterId}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                      >
                        {status.status === "pending" && (
                          <div className="h-5 w-5 rounded-full border-2 border-muted" />
                        )}
                        {status.status === "generating" && (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        )}
                        {status.status === "success" && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {status.status === "error" && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{character.name}</div>
                          {status.message && (
                            <div className="text-sm text-muted-foreground">
                              {status.message}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            {isGenerating ? "生成中..." : "关闭"}
          </Button>
          {!isGenerating && (
            <Button
              onClick={handleBatchGenerate}
              disabled={selectedCharacterIds.length === 0}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              生成 {selectedCharacterIds.length} 个角色
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
