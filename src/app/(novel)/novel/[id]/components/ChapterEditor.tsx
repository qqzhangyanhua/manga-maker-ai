/**
 * 章节编辑器组件（简化版）
 */
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { RevisionDialog } from "./RevisionDialog";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  outline: string | null;
  content: string | null;
  word_count: number;
}

interface ChapterEditorProps {
  chapter: Chapter;
  project: { id: string; title: string };
  onUpdate: (chapter: Chapter) => void;
}

export function ChapterEditor({ chapter, project, onUpdate }: ChapterEditorProps) {
  const [title, setTitle] = useState(chapter.title);
  const [outline, setOutline] = useState(chapter.outline || "");
  const [content, setContent] = useState(chapter.content || "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleGenerate() {
    if (!outline.trim()) {
      toast.error("请先填写章节大纲");
      return;
    }

    try {
      setGenerating(true);
      setContent(""); // 清空现有内容

      const response = await fetch("/api/novel/chapters/generate/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapter_id: chapter.id,
          use_rag: true,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error("生成失败");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") {
              break;
            }
            if (data.startsWith("[ERROR")) {
              throw new Error(data);
            }
            accumulatedContent += data;
            setContent(accumulatedContent);
          }
        }
      }

      toast.success("生成完成");
    } catch (error) {
      console.error("生成失败:", error);
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  function handleReviseSelection() {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content.substring(start, end);

    if (!text || text.trim().length === 0) {
      toast.error("请先选中要修订的文本");
      return;
    }

    setSelectedText(text);
    setIsRevisionDialogOpen(true);
  }

  function handleReplaceText(newText: string) {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const updatedContent = before + newText + after;

    setContent(updatedContent);
  }

  async function handleSave() {
    try {
      setSaving(true);

      const response = await fetch(`/api/novel/chapters/${chapter.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          outline,
          content,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        toast.success("保存成功");
      } else {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>第 {chapter.chapter_number} 章</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || !outline.trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generating ? "生成中..." : "AI 生成"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReviseSelection}
              disabled={generating || saving}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              修订选中
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 标题 */}
        <div>
          <label className="text-sm font-medium mb-2 block">章节标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入章节标题..."
          />
        </div>

        {/* 大纲 */}
        <div>
          <label className="text-sm font-medium mb-2 block">章节大纲</label>
          <Textarea
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="描述本章节的主要情节、人物和场景..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-1">
            大纲用于 AI 生成内容，描述越详细，生成效果越好
          </p>
        </div>

        {/* 内容 */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            章节内容
            <span className="text-muted-foreground ml-2">
              ({content.length} 字)
            </span>
          </label>
          <Textarea
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="章节正文内容..."
            rows={20}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            💡 提示：选中需要修改的文本，然后点击"修订选中"按钮，AI 会根据您的指令改写选中的内容
          </p>
        </div>
      </CardContent>

      {/* 修订对话框 */}
      <RevisionDialog
        isOpen={isRevisionDialogOpen}
        onClose={() => setIsRevisionDialogOpen(false)}
        selectedText={selectedText}
        onReplace={handleReplaceText}
      />
    </Card>
  );
}
