"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
  Sparkles,
  BookOpen,
  ChevronDown as ChevronDownIcon,
  Wand2,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";

interface ChapterOutline {
  _tempId?: string; // 临时 ID，用于前端列表渲染
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents: string[];
  characters: string[];
  plotLines: string[]; // 情节线索
  isKeyChapter: boolean;
}

/**
 * 生成临时唯一ID
 */
function generateTempId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 确保 outline 对象所有字段都正确初始化
 */
function ensureOutlineFields(outline: ChapterOutline): ChapterOutline {
  return {
    _tempId: outline._tempId || generateTempId(),
    chapterNumber: outline.chapterNumber ?? (outline as unknown as { chapter_number?: number }).chapter_number ?? 0,
    title: outline.title ?? "",
    outline: outline.outline ?? "",
    keyEvents: Array.isArray(outline.keyEvents) ? outline.keyEvents :
      Array.isArray((outline as unknown as { key_events?: string[] }).key_events) ? (outline as unknown as { key_events: string[] }).key_events : [],
    characters: Array.isArray(outline.characters) ? outline.characters : [],
    plotLines: Array.isArray(outline.plotLines) ? outline.plotLines :
      Array.isArray((outline as unknown as { plot_lines?: string[] }).plot_lines) ? (outline as unknown as { plot_lines: string[] }).plot_lines : [],
    isKeyChapter: outline.isKeyChapter ?? (outline as unknown as { is_key_chapter?: boolean }).is_key_chapter ?? false,
  };
}

interface OutlineEditorProps {
  projectId: string;
  initialOutlines: ChapterOutline[];
  onSave: (outlines: ChapterOutline[]) => Promise<void>;
  onGenerateOutline?: (mode: "full" | "continue") => Promise<void>;
}

export function OutlineEditor({
  projectId,
  initialOutlines,
  onSave,
  onGenerateOutline,
}: OutlineEditorProps) {
  // 规范化 initialOutlines 确保所有字段都存在
  const [outlines, setOutlines] = useState<ChapterOutline[]>(
    initialOutlines.map(ensureOutlineFields)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // 当 initialOutlines 变化时更新 outlines
  useEffect(() => {
    setOutlines(initialOutlines.map(ensureOutlineFields));
  }, [initialOutlines]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(outlines);
      toast.success("大纲已保存");
    } catch (error) {
      toast.error("保存失败");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateOutline = async (mode: "full" | "continue") => {
    if (!onGenerateOutline) return;

    // 续写模式需要至少有一章现有内容
    if (mode === "continue" && outlines.length === 0) {
      toast.error("续写模式需要至少有一章现有内容");
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateOutline(mode);
      toast.success(mode === "full" ? "大纲生成成功" : "续写章节生成成功");
    } catch (error) {
      toast.error("生成失败");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const addChapter = () => {
    const newChapterNumber = outlines.length + 1;
    setOutlines([
      ...outlines,
      {
        _tempId: generateTempId(),
        chapterNumber: newChapterNumber,
        title: `第${newChapterNumber}章`,
        outline: "",
        keyEvents: [],
        characters: [],
        plotLines: [],
        isKeyChapter: false,
      },
    ]);
  };

  const updateChapter = (
    index: number,
    field: keyof ChapterOutline,
    value: string | string[] | boolean | number
  ) => {
    const newOutlines = [...outlines];
    newOutlines[index] = { ...newOutlines[index], [field]: value };
    setOutlines(newOutlines);
  };

  const removeChapter = (index: number) => {
    setDeleteIndex(index);
  };

  const confirmRemoveChapter = () => {
    if (deleteIndex === null) return;

    const newOutlines = outlines.filter((_, i) => i !== deleteIndex);
    // 重新编号
    newOutlines.forEach((outline, i) => {
      outline.chapterNumber = i + 1;
    });
    setOutlines(newOutlines);
    setDeleteIndex(null);
  };

  const moveChapter = (index: number, direction: "up" | "down") => {
    const newOutlines = [...outlines];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOutlines.length) return;

    // 交换位置
    [newOutlines[index], newOutlines[targetIndex]] = [
      newOutlines[targetIndex],
      newOutlines[index],
    ];

    // 重新编号
    newOutlines.forEach((outline, i) => {
      outline.chapterNumber = i + 1;
    });

    setOutlines(newOutlines);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <h2 className="text-2xl font-bold">故事大纲</h2>
          <Badge variant="secondary">{outlines.length} 章</Badge>
        </div>
        <div className="flex gap-2">
          {onGenerateOutline && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={isGenerating}
                  variant="outline"
                  className="border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/50"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGenerating ? "AI 生成中..." : "AI 生成大纲"}
                  <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleGenerateOutline("full")}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">完整生成</span>
                    <span className="text-xs text-muted-foreground">
                      从头开始生成全新大纲（会覆盖现有内容）
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleGenerateOutline("continue")}
                  disabled={outlines.length === 0}
                >
                  <PenLine className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">续写章节</span>
                    <span className="text-xs text-muted-foreground">
                      基于现有内容生成后续章节（保持剧情连贯）
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={addChapter} variant="outline" className="border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/50">
            <Plus className="mr-2 h-4 w-4" />
            添加章节
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* 大纲列表 */}
      <div className="space-y-3">
        {outlines.map((outline, index) => (
          <Card
            key={outline._tempId || `outline-${outline.chapterNumber}-${index}`}
            className={`${outline.isKeyChapter ? "border-yellow-500/50 bg-yellow-900/10" : "border-purple-500/10 bg-zinc-900/40"} backdrop-blur-sm`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveChapter(index, "up")}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveChapter(index, "down")}
                      disabled={index === outlines.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/20">{outline.chapterNumber}</Badge>
                    <Input
                      value={outline.title}
                      onChange={(e) =>
                        updateChapter(index, "title", e.target.value)
                      }
                      className="font-semibold bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
                      placeholder="章节标题"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={outline.isKeyChapter}
                      onChange={(e) =>
                        updateChapter(index, "isKeyChapter", e.target.checked)
                      }
                      className="rounded"
                    />
                    <span className="text-yellow-600">关键章节</span>
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChapter(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 章节大纲 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  章节大纲
                </label>
                <Textarea
                  value={outline.outline}
                  onChange={(e) =>
                    updateChapter(index, "outline", e.target.value)
                  }
                  placeholder="描述本章的主要内容、情节发展..."
                  rows={3}
                  className="mt-1 bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
                />
              </div>

              {/* 关键事件 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  关键事件（用逗号分隔）
                </label>
                <Input
                  value={(outline.keyEvents || []).join(", ")}
                  onChange={(e) =>
                    updateChapter(
                      index,
                      "keyEvents",
                      e.target.value.split(",").map((e) => e.trim())
                    )
                  }
                  placeholder="例如：主角觉醒, 反派登场, 重要对话"

                  className="mt-1 bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
                />
              </div>

              {/* 出场角色 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  出场角色（用逗号分隔）
                </label>
                <Input
                  value={(outline.characters || []).join(", ")}
                  onChange={(e) =>
                    updateChapter(
                      index,
                      "characters",
                      e.target.value.split(",").map((c) => c.trim())
                    )
                  }
                  placeholder="例如：李寻欢, 林诗音, 龙啸云"
                  className="mt-1 bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
                />
              </div>

              {/* 情节线索 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  情节线索（用逗号分隔）
                </label>
                <Input
                  value={(outline.plotLines || []).join(", ")}
                  onChange={(e) =>
                    updateChapter(
                      index,
                      "plotLines",
                      e.target.value.split(",").map((p) => p.trim())
                    )
                  }
                  placeholder="例如：寻找真相, 复仇计划, 感情纠葛"
                  className="mt-1 bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
                />
              </div>

              {/* 标签展示 */}
              <div className="flex flex-wrap gap-2">
                {outline.keyEvents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {outline.keyEvents.map((event, i) => (
                      <Badge key={`event-${event}-${i}`} variant="destructive" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                )}
                {outline.characters.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {outline.characters.map((char, i) => (
                      <Badge key={`char-${char}-${i}`} variant="secondary" className="text-xs">
                        {char}
                      </Badge>
                    ))}
                  </div>
                )}
                {outline.plotLines.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {outline.plotLines.map((plot, i) => (
                      <Badge key={`plot-${plot}-${i}`} variant="outline" className="text-xs">
                        {plot}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {outlines.length === 0 && (
        <Card className="p-12 text-center bg-zinc-900/40 backdrop-blur-sm border-purple-500/10">
          <div className="flex flex-col items-center gap-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">还没有大纲</h3>
              <p className="text-sm text-muted-foreground mt-1">
                点击"添加章节"开始规划你的故事，或使用"AI 生成大纲"让 AI
                帮你构思
              </p>
            </div>
            <div className="flex gap-2">
              {onGenerateOutline && (
                <Button onClick={() => handleGenerateOutline("full")} disabled={isGenerating}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 生成大纲
                </Button>
              )}
              <Button onClick={addChapter} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                手动添加章节
              </Button>
            </div>
          </div>
        </Card>
      )}

      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这一章吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveChapter}
              className="bg-destructive hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
