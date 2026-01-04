/**
 * AI 生成角色对话框
 */
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, User } from "lucide-react";
import { toast } from "sonner";

interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  content?: string;
}

interface GeneratedCharacter {
  name: string;
  role: string;
  description: string;
  traits: string[];
  appearance: string;
  background: string;
  selected: boolean;
}

interface GenerateCharactersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  outlines: ChapterOutline[];
  onGenerated: (characters: any[]) => void;
}

export function GenerateCharactersDialog({
  isOpen,
  onClose,
  projectId,
  outlines,
  onGenerated,
}: GenerateCharactersDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedCharacters, setSuggestedCharacters] = useState<GeneratedCharacter[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  async function handleAnalyze() {
    if (outlines.length === 0) {
      toast.error("暂无章节内容可供分析");
      return;
    }

    setIsAnalyzing(true);
    try {
      // 提取所有章节的内容和大纲
      const chaptersContext = outlines
        .map((ch) => {
          const content = ch.content || ch.outline;
          return `第${ch.chapterNumber}章《${ch.title}》：\n${content}`;
        })
        .join("\n\n");

      const response = await fetch(
        `/api/novel/projects/${projectId}/analyze-chapters-characters`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapters_context: chaptersContext,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const characters = data.characters.map((char: any) => ({
          ...char,
          selected: true, // 默认全选
        }));
        setSuggestedCharacters(characters);
        setHasAnalyzed(true);
        toast.success(`分析完成，发现 ${characters.length} 个角色`);
      } else {
        const error = await response.json();
        toast.error(error.detail || "分析失败");
      }
    } catch (error) {
      console.error("分析角色失败:", error);
      toast.error("分析失败，请重试");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function toggleCharacterSelection(index: number) {
    const newCharacters = [...suggestedCharacters];
    newCharacters[index].selected = !newCharacters[index].selected;
    setSuggestedCharacters(newCharacters);
  }

  function handleConfirm() {
    const selectedCharacters = suggestedCharacters.filter((ch) => ch.selected);
    if (selectedCharacters.length === 0) {
      toast.error("请至少选择一个角色");
      return;
    }

    // 转换为标准角色格式
    const characters = selectedCharacters.map((char) => ({
      id: Date.now().toString() + Math.random().toString(36),
      name: char.name,
      role: char.role,
      description: char.description,
      traits: char.traits,
      appearance: char.appearance,
      background: char.background,
      relationships: [],
    }));

    onGenerated(characters);
    // toast 提示已移至 CharacterManager 的 handleGeneratedCharacters 中
    onClose();
    resetState();
  }

  function resetState() {
    setSuggestedCharacters([]);
    setHasAnalyzed(false);
  }

  function handleClose() {
    onClose();
    resetState();
  }

  const selectedCount = suggestedCharacters.filter((ch) => ch.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 生成角色
          </DialogTitle>
          <DialogDescription>
            AI 将分析已生成的章节内容，自动提取出现的角色并生成详细设定
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!hasAnalyzed ? (
            // 分析前的状态
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">📖 分析范围</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 已生成章节数：{outlines.length} 章</li>
                  <li>• AI 将分析章节中出现的所有角色</li>
                  <li>• 自动生成角色的性格、外貌、背景等信息</li>
                  <li>• 分析时间约 10-30 秒</li>
                </ul>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || outlines.length === 0}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    开始分析
                  </>
                )}
              </Button>
            </div>
          ) : (
            // 分析后显示结果
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  已选择 {selectedCount} / {suggestedCharacters.length} 个角色
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allSelected = selectedCount === suggestedCharacters.length;
                    setSuggestedCharacters(
                      suggestedCharacters.map((ch) => ({
                        ...ch,
                        selected: !allSelected,
                      }))
                    );
                  }}
                >
                  {selectedCount === suggestedCharacters.length ? "取消全选" : "全选"}
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {suggestedCharacters.map((character, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all ${
                        character.selected
                          ? "border-primary shadow-sm"
                          : "border-transparent opacity-60"
                      }`}
                      onClick={() => toggleCharacterSelection(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={character.selected}
                            onCheckedChange={() => toggleCharacterSelection(index)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{character.name}</span>
                              <Badge variant="secondary">{character.role}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {character.description}
                            </p>
                            {character.traits.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {character.traits.map((trait, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {trait}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {character.appearance && (
                              <p className="text-xs text-muted-foreground">
                                外貌：{character.appearance}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          {hasAnalyzed && (
            <Button onClick={handleConfirm} disabled={selectedCount === 0}>
              添加 {selectedCount} 个角色
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
