/**
 * 创作下一章对话框
 * 支持 AI 辅助续写建议
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, BookOpen } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  nextChapterOrder: number;
  onSuccess: () => void;
}

interface AISuggestion {
  title: string;
  summary: string;
  key_events: string[];
  cliffhanger: string | null;
  is_key_chapter: boolean;
  key_chapter_reason: string | null;
}

export function CreateChapterDialog({
  open,
  onOpenChange,
  storyId,
  nextChapterOrder,
  onSuccess,
}: CreateChapterDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [promptHint, setPromptHint] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  async function handleGenerateSuggestion() {
    setIsGeneratingSuggestion(true);

    try {
      const response = await fetch("/api/chapter/generate-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: storyId,
          prompt_hint: promptHint || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成建议失败");
      }

      setAiSuggestion(data.suggestion);
      setTitle(data.suggestion.title);
      setSummary(data.suggestion.summary);

      toast({
        title: "AI 建议已生成",
        description: "可以修改后使用，或重新生成",
      });
    } catch (error) {
      console.error("Failed to generate suggestion:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestion(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast({
        title: "请输入章节标题",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/chapter/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: storyId,
          title: title.trim(),
          summary: summary.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "创建章节失败");
      }

      toast({
        title: "章节已创建",
        description: `${data.chapter.title} - 草稿`,
      });

      // 重置表单
      setTitle("");
      setSummary("");
      setPromptHint("");
      setAiSuggestion(null);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create chapter:", error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }

  function handleCancel() {
    setTitle("");
    setSummary("");
    setPromptHint("");
    setAiSuggestion(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            创作第 {nextChapterOrder} 章
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            手动创作或使用 AI 辅助续写
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI 提示 */}
          <div className="space-y-2">
            <Label htmlFor="prompt-hint" className="text-gray-300">
              剧情提示（可选）
            </Label>
            <div className="flex gap-2">
              <Input
                id="prompt-hint"
                value={promptHint}
                onChange={(e) => setPromptHint(e.target.value)}
                placeholder="例如：主角发现关键线索..."
                className="flex-1 bg-gray-800 border-gray-700 text-gray-100"
                disabled={isGeneratingSuggestion || isCreating}
              />
              <Button
                variant="outline"
                onClick={handleGenerateSuggestion}
                disabled={isGeneratingSuggestion || isCreating}
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
              >
                {isGeneratingSuggestion ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 建议
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* AI 建议显示 */}
          {aiSuggestion && (
            <Alert className="border-orange-500 bg-orange-500/10">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <AlertDescription className="ml-2">
                <div className="space-y-2">
                  <p className="font-semibold text-orange-400">AI 建议：</p>
                  {aiSuggestion.key_events && aiSuggestion.key_events.length > 0 && (
                    <div className="text-sm text-gray-300">
                      <p className="font-medium">关键事件：</p>
                      <ul className="list-disc list-inside space-y-1">
                        {aiSuggestion.key_events.map((event, idx) => (
                          <li key={idx}>{event}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiSuggestion.cliffhanger && (
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">悬念：</span>{aiSuggestion.cliffhanger}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 章节标题 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">
              章节标题 *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`第${nextChapterOrder}章：标题`}
              className="bg-gray-800 border-gray-700 text-gray-100"
              disabled={isGeneratingSuggestion || isCreating}
            />
          </div>

          {/* 章节梗概 */}
          <div className="space-y-2">
            <Label htmlFor="summary" className="text-gray-300">
              章节梗概（可选）
            </Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="描述本章的主要内容和情节..."
              rows={6}
              className="bg-gray-800 border-gray-700 text-gray-100 resize-none"
              disabled={isGeneratingSuggestion || isCreating}
            />
          </div>

          <div className="text-xs text-gray-500">
            <BookOpen className="w-3 h-3 inline mr-1" />
            章节创建后会保存为草稿状态，完成分镜后可发布
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isGeneratingSuggestion || isCreating}
            className="border-gray-700 text-gray-400"
          >
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isGeneratingSuggestion || isCreating || !title.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中
              </>
            ) : (
              "创建章节"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
