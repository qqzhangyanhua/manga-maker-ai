/**
 * 小说转漫画对话框
 * 选择场景和角色，将小说转换为漫画项目
 */
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Film, Loader2, ChevronRight, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { ChapterOutline } from "../types";

interface NovelCharacter {
  name: string;
  role?: string;
  description?: string;
}

interface ConvertToComicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  outlines: ChapterOutline[];
  characters: NovelCharacter[];
}

interface SceneSelection {
  chapter_number: number;
  scene_indices: number[];
}

interface CharacterMapping {
  novel_character_name: string;
  action: "create" | "link";
  role?: string;
}

export function ConvertToComicDialog({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  outlines,
  characters,
}: ConvertToComicDialogProps) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [selectedScenes, setSelectedScenes] = useState<Map<number, Set<number>>>(new Map());
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"scenes" | "characters">("scenes");

  // 计算选中的场景总数
  const totalSelectedScenes = useMemo(() => {
    let count = 0;
    selectedScenes.forEach((indices) => {
      count += indices.size;
    });
    return count;
  }, [selectedScenes]);

  // 预估分镜数量（每个场景约 3-4 个分镜）
  const estimatedPanels = totalSelectedScenes * 3;

  // 切换场景选择
  function toggleScene(chapterNumber: number, sceneIndex: number) {
    setSelectedScenes((prev) => {
      const newMap = new Map(prev);
      const chapterScenes = newMap.get(chapterNumber) || new Set();
      const newChapterScenes = new Set(chapterScenes);

      if (newChapterScenes.has(sceneIndex)) {
        newChapterScenes.delete(sceneIndex);
      } else {
        newChapterScenes.add(sceneIndex);
      }

      if (newChapterScenes.size === 0) {
        newMap.delete(chapterNumber);
      } else {
        newMap.set(chapterNumber, newChapterScenes);
      }

      return newMap;
    });
  }

  // 选择章节的所有场景
  function selectAllInChapter(chapterNumber: number, events: string[]) {
    setSelectedScenes((prev) => {
      const newMap = new Map(prev);
      const allIndices = new Set(events.map((_, i) => i));
      newMap.set(chapterNumber, allIndices);
      return newMap;
    });
  }

  // 清除章节的所有场景
  function clearChapter(chapterNumber: number) {
    setSelectedScenes((prev) => {
      const newMap = new Map(prev);
      newMap.delete(chapterNumber);
      return newMap;
    });
  }

  // 切换角色选择
  function toggleCharacter(name: string) {
    setSelectedCharacters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  }

  // 执行转换
  async function handleConvert() {
    if (totalSelectedScenes === 0) {
      toast.error("请至少选择一个场景");
      return;
    }

    setIsConverting(true);
    try {
      // 构建请求数据
      const sceneSelections: SceneSelection[] = [];
      selectedScenes.forEach((indices, chapterNumber) => {
        sceneSelections.push({
          chapter_number: chapterNumber,
          scene_indices: Array.from(indices).sort((a, b) => a - b),
        });
      });

      const characterMappings: CharacterMapping[] = Array.from(selectedCharacters).map(
        (name) => {
          const char = characters.find((c) => c.name === name);
          return {
            novel_character_name: name,
            action: "create" as const,
            role: char?.role,
          };
        }
      );

      const response = await fetch(
        `/api/novel/projects/${projectId}/convert-to-comic`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_scenes: sceneSelections,
            character_mappings: characterMappings,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "转换成功");
        onClose();
        // 跳转到新创建的故事页面
        router.push(`/scripts/${data.story_id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "转换失败");
      }
    } catch (err) {
      console.error("转换失败:", err);
      toast.error("转换失败，请稍后重试");
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            将《{projectTitle}》转换为漫画
          </DialogTitle>
          <DialogDescription>
            选择要可视化的场景和角色，系统将创建漫画项目并生成分镜
          </DialogDescription>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 py-2">
          <Badge variant={step === "scenes" ? "default" : "secondary"}>
            1. 选择场景
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === "characters" ? "default" : "secondary"}>
            2. 选择角色
          </Badge>
        </div>

        <Separator />

        {/* 场景选择步骤 */}
        {step === "scenes" && (
          <ScrollArea className="flex-1 min-h-[300px] max-h-[400px]">
            <div className="pr-4 space-y-2">
              {outlines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无大纲数据，请先生成故事大纲
                </div>
              ) : (
                <Accordion type="multiple" defaultValue={outlines.map((o) => `ch-${o.chapterNumber}`)}>
                  {outlines.map((chapter) => {
                    const chapterSelected = selectedScenes.get(chapter.chapterNumber) || new Set();
                    const hasEvents = chapter.keyEvents && chapter.keyEvents.length > 0;

                    return (
                      <AccordionItem key={chapter.chapterNumber} value={`ch-${chapter.chapterNumber}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2 text-left">
                            <span className="font-medium">
                              第{chapter.chapterNumber}章：{chapter.title}
                            </span>
                            {chapterSelected.size > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {chapterSelected.size} 个场景
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-2">
                            {hasEvents ? (
                              <>
                                <div className="flex gap-2 mb-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => selectAllInChapter(chapter.chapterNumber, chapter.keyEvents)}
                                  >
                                    全选
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => clearChapter(chapter.chapterNumber)}
                                  >
                                    清除
                                  </Button>
                                </div>
                                {chapter.keyEvents.map((event, idx) => (
                                  <label
                                    key={idx}
                                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={chapterSelected.has(idx)}
                                      onCheckedChange={() => toggleScene(chapter.chapterNumber, idx)}
                                    />
                                    <span className="text-sm">{event}</span>
                                  </label>
                                ))}
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground py-2">
                                此章节暂无关键事件，可在大纲编辑器中添加
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </ScrollArea>
        )}

        {/* 角色选择步骤 */}
        {step === "characters" && (
          <ScrollArea className="flex-1 min-h-[300px] max-h-[400px]">
            <div className="pr-4 space-y-2">
              {characters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  暂无角色数据，可跳过此步骤
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCharacters(new Set(characters.map((c) => c.name)))}
                    >
                      全选
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCharacters(new Set())}
                    >
                      清除
                    </Button>
                  </div>
                  {characters.map((char) => (
                    <label
                      key={char.name}
                      className="flex items-start gap-3 p-3 rounded-md hover:bg-muted cursor-pointer border"
                    >
                      <Checkbox
                        checked={selectedCharacters.has(char.name)}
                        onCheckedChange={() => toggleCharacter(char.name)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{char.name}</span>
                          {char.role && (
                            <Badge variant="outline" className="text-xs">
                              {char.role}
                            </Badge>
                          )}
                        </div>
                        {char.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {char.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        )}

        <Separator />

        {/* 统计信息 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground py-2">
          <div>
            已选择 <span className="font-medium text-foreground">{totalSelectedScenes}</span> 个场景
            {step === "characters" && selectedCharacters.size > 0 && (
              <>
                ，<span className="font-medium text-foreground">{selectedCharacters.size}</span> 个角色
              </>
            )}
          </div>
          <div>预计生成 {estimatedPanels} 个分镜</div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isConverting}>
            取消
          </Button>

          {step === "scenes" && (
            <Button
              onClick={() => setStep("characters")}
              disabled={totalSelectedScenes === 0}
            >
              下一步：选择角色
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === "characters" && (
            <>
              <Button variant="outline" onClick={() => setStep("scenes")}>
                上一步
              </Button>
              <Button onClick={handleConvert} disabled={isConverting}>
                {isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    转换中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    开始转换
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
