/**
 * 续写大纲对话框
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PenLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { novelTheme } from "../../theme";

interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents: string[];
  characters: string[];
  plotLines: string[];
  isKeyChapter: boolean;
}

interface ContinueOutlineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  existingOutlines: ChapterOutline[];
  projectGenre?: string | null;
  onGenerated: (newChapters: ChapterOutline[]) => void;
}

export function ContinueOutlineDialog({
  isOpen,
  onClose,
  projectId,
  existingOutlines,
  projectGenre,
  onGenerated,
}: ContinueOutlineDialogProps) {
  const [chapterCount, setChapterCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // 获取最后3章作为上下文
  const lastChapters = existingOutlines.slice(-3);
  const nextChapterNumber = existingOutlines.length + 1;

  async function handleGenerate() {
    if (chapterCount < 1 || chapterCount > 20) {
      toast.error("章节数必须在 1-20 之间");
      return;
    }

    setIsGenerating(true);
    try {
      // 转换为后端格式
      const existingOulinesBackend = lastChapters.map((ch) => ({
        chapter_number: ch.chapterNumber,
        title: ch.title,
        outline: ch.outline,
        key_events: ch.keyEvents,
        characters: ch.characters,
        plot_lines: ch.plotLines,
        is_key_chapter: ch.isKeyChapter,
      }));

      const response = await fetch(
        `/api/novel/projects/${projectId}/generate-outline`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chapter_count: chapterCount,
            style: projectGenre || undefined,
            mode: "continue",
            existing_outlines: existingOulinesBackend,
            start_chapter: nextChapterNumber,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        // 转换字段名（从 snake_case 到 camelCase）
        const normalizedChapters = data.chapters.map(
          (chapter: {
            chapter_number: number;
            title: string;
            outline: string;
            key_events: string[];
            characters: string[];
            plot_lines: string[];
            is_key_chapter: boolean;
          }) => ({
            chapterNumber: chapter.chapter_number,
            title: chapter.title,
            outline: chapter.outline,
            keyEvents: chapter.key_events,
            characters: chapter.characters,
            plotLines: chapter.plot_lines,
            isKeyChapter: chapter.is_key_chapter,
          })
        );

        onGenerated(normalizedChapters);
        toast.success(`成功续写 ${normalizedChapters.length} 章`);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.detail || "续写失败");
      }
    } catch (error) {
      console.error("续写大纲失败:", error);
      toast.error("续写失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className={novelTheme.dialog.titleIcon} />
            续写章节大纲
          </DialogTitle>
          <DialogDescription>
            基于现有章节内容，AI 将生成后续章节大纲，保持剧情连贯性
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 上下文摘要 */}
          <div className="space-y-2">
            <Label>参考上下文（最后 3 章）</Label>
            <ScrollArea className="h-32 rounded-md border border-purple-500/10 p-3 bg-zinc-900/40">
              <div className="space-y-2 text-sm">
                {lastChapters.length === 0 ? (
                  <p className="text-muted-foreground">暂无现有章节</p>
                ) : (
                  lastChapters.map((ch) => (
                    <div key={ch.chapterNumber} className="space-y-1">
                      <p className="font-medium">
                        第 {ch.chapterNumber} 章《{ch.title}》
                      </p>
                      <p className="text-muted-foreground line-clamp-2">
                        {ch.outline || "暂无大纲"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              AI 将基于这些内容生成后续章节，确保剧情连贯
            </p>
          </div>

          {/* 续写章节数 */}
          <div className="space-y-2">
            <Label htmlFor="chapter-count">续写章节数量</Label>
            <Input
              id="chapter-count"
              type="number"
              min={1}
              max={20}
              value={chapterCount}
              onChange={(e) => setChapterCount(Number(e.target.value))}
              placeholder="期望续写的章节数"
              className="bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
            />
            <p className="text-xs text-muted-foreground">
              将从第 {nextChapterNumber} 章开始生成，建议 3-10 章，最多 20 章
            </p>
          </div>

          {/* 提示信息 */}
          <div className={novelTheme.dialog.infoBox}>
            <p className="font-medium mb-1">💡 续写说明</p>
            <ul className="space-y-1 text-xs">
              <li>• AI 会分析前面章节的情节、人物和线索</li>
              <li>• 续写的章节会自动接续现有内容</li>
              <li>• 生成后可以手动编辑和调整</li>
              <li>• 生成时间约 {Math.ceil(chapterCount * 3)}-{Math.ceil(chapterCount * 5)} 秒</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || existingOutlines.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                续写中...
              </>
            ) : (
              <>
                <PenLine className="mr-2 h-4 w-4" />
                开始续写
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
