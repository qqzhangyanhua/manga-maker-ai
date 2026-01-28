/**
 * AI 生成大纲对话框
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { novelTheme } from "../../theme";
import type { ChapterOutline } from "../types";

interface GenerateOutlineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onGenerated: (outlines: ChapterOutline[]) => void;
}

export function GenerateOutlineDialog({
  isOpen,
  onClose,
  projectId,
  onGenerated,
}: GenerateOutlineDialogProps) {
  const [chapterCount, setChapterCount] = useState(20);
  const [style, setStyle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (chapterCount < 1 || chapterCount > 100) {
      toast.error("章节数必须在 1-100 之间");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/novel/projects/${projectId}/generate-outline`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chapter_count: chapterCount,
            style: style || undefined,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        // 转换字段名（从 snake_case 到 camelCase）
        const normalizedChapters = data.chapters.map((chapter: {
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
        }));

        onGenerated(normalizedChapters);
        toast.success(`成功生成 ${normalizedChapters.length} 章大纲`);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.detail || "生成失败");
      }
    } catch (error) {
      console.error("生成大纲失败:", error);
      toast.error("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className={novelTheme.dialog.titleIcon} />
            AI 生成大纲
          </DialogTitle>
          <DialogDescription>
            根据项目描述、世界观和角色设定，AI 将自动生成完整的章节大纲
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chapter-count">章节数量</Label>
            <Input
              id="chapter-count"
              type="number"
              min={1}
              max={100}
              value={chapterCount}
              onChange={(e) => setChapterCount(Number(e.target.value))}
              placeholder="期望生成的章节数"
              className="bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
            />
            <p className="text-xs text-muted-foreground">
              建议 10-30 章，最多 100 章
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">风格偏好（可选）</Label>
            <Select value={style || "none"} onValueChange={(value) => setStyle(value === "none" ? "" : value)}>
              <SelectTrigger id="style" className="bg-zinc-900/40 border-purple-500/10 focus:ring-purple-500/50">
                <SelectValue placeholder="选择风格（可选）" />
              </SelectTrigger>
              <SelectContent className={novelTheme.dialog.content}>
                <SelectItem value="none">不指定</SelectItem>
                <SelectItem value="玄幻">玄幻</SelectItem>
                <SelectItem value="科幻">科幻</SelectItem>
                <SelectItem value="现代">现代</SelectItem>
                <SelectItem value="历史">历史</SelectItem>
                <SelectItem value="悬疑">悬疑</SelectItem>
                <SelectItem value="言情">言情</SelectItem>
                <SelectItem value="武侠">武侠</SelectItem>
                <SelectItem value="奇幻">奇幻</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={novelTheme.dialog.infoBox}>
            <p className="font-medium mb-1">💡 提示</p>
            <ul className="space-y-1 text-xs">
              <li>• AI 会参考项目描述、世界观和角色设定</li>
              <li>• 生成的大纲包含章节标题、摘要、关键事件等</li>
              <li>• 生成后可以手动编辑和调整</li>
              <li>• 生成时间约 30-60 秒</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            取消
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className={novelTheme.button.primary}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                开始生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
