/**
 * 章节编辑器组件（增强版）
 * 
 * 集成富文本编辑器 (Tiptap)
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { RevisionDialog } from "./RevisionDialog";
import { RichTextEditor } from "@/components/novel/RichTextEditor";
import { WordCountDisplay } from "@/components/novel/WordCountDisplay";
import { useEditor } from "@tiptap/react";
import { getEditorExtensions, defaultEditorOptions } from "@/lib/novel/tiptap-config";
import { serializeContent, deserializeContent, textToTiptapJSON, tiptapJSONToText } from "@/lib/novel/content-serializer";

interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents: string[];
  characters: string[];
  plotLines: string[];
  isKeyChapter: boolean;
  content?: string;
  wordCount?: number;
  status?: "draft" | "completed";
}

interface ChapterEditorProps {
  chapter: ChapterOutline;
  project: { id: string; title: string };
  onUpdate: (chapter: ChapterOutline) => void;
}

export function ChapterEditor({ chapter, project, onUpdate }: ChapterEditorProps) {
  const [title, setTitle] = useState(chapter.title);
  const [outline, setOutline] = useState(chapter.outline || "");
  const [content, setContent] = useState(chapter.content || "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  // 初始化富文本编辑器
  const editor = useEditor({
    extensions: getEditorExtensions("开始写作章节内容..."),
    content: content ? deserializeContent(content) : '',
    ...defaultEditorOptions,
    onUpdate: ({ editor }) => {
      const json = serializeContent(editor.getJSON());
      setContent(json);
    },
  });

  // 🔧 新增：监听 chapter prop 变化，联动更新表单内容
  useEffect(() => {
    console.log(`[ChapterEditor] 切换到章节 ${chapter.chapterNumber}: ${chapter.title}`);
    setTitle(chapter.title);
    setOutline(chapter.outline || "");
    
    const newContent = chapter.content || "";
    setContent(newContent);
    
    // 更新编辑器内容
    if (editor && newContent) {
      try {
        const parsedContent = deserializeContent(newContent);
        editor.commands.setContent(parsedContent, { emitUpdate: false });
      } catch (error) {
        console.error('Failed to update editor content:', error);
      }
    }
  }, [chapter.chapterNumber, chapter.title, chapter.outline, chapter.content, editor]);

  async function handleGenerate() {
    if (!outline.trim()) {
      toast.error("请先填写章节大纲");
      return;
    }

    try {
      setGenerating(true);
      setContent(""); // 清空现有内容
      if (editor) {
        editor.commands.setContent('');
      }

      // 步骤1：创建或查找对应的 chapter 记录（后端需要 chapter_id）
      let chapterId: string | null = null;

      // 先尝试查找是否已有对应的 chapter
      const listResponse = await fetch(`/api/novel/chapters/project/${project.id}`);
      if (listResponse.ok) {
        const chapters = await listResponse.json();
        const existingChapter = chapters.find(
          (ch: { chapter_number: number }) => ch.chapter_number === chapter.chapterNumber
        );
        if (existingChapter) {
          chapterId = existingChapter.id;
        }
      }

      // 如果不存在，创建新的 chapter 记录
      if (!chapterId) {
        const createResponse = await fetch("/api/novel/chapters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: project.id,
            chapter_number: chapter.chapterNumber,
            title: title,
            outline: outline,
          }),
        });

        if (!createResponse.ok) {
          throw new Error("创建章节记录失败");
        }

        const newChapter = await createResponse.json();
        chapterId = newChapter.id;
      } else {
        // 🔧 修复：如果 chapter 已存在，更新其 outline 和 title 确保使用最新值
        const updateResponse = await fetch(`/api/novel/chapters/${chapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title,
            outline: outline,
          }),
        });

        if (!updateResponse.ok) {
          console.warn("更新章节大纲失败，将使用旧大纲");
        }
      }

      // 步骤2：使用 chapter_id 进行流式生成
      const response = await fetch("/api/novel/chapters/generate/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapter_id: chapterId,
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
            
            // 实时更新编辑器
            if (editor) {
              const tiptapContent = textToTiptapJSON(accumulatedContent);
              // ✅ 修复：Tiptap v2 使用选项对象代替布尔值
              // emitUpdate: false 避免在流式更新时触发多余事件
              editor.commands.setContent(tiptapContent, { emitUpdate: false });
            }
          }
        }
      }

      // 🔧 修复：生成完成后自动保存到 outlines
      // 将生成的纯文本转换为 Tiptap JSON 格式
      const tiptapContent = textToTiptapJSON(accumulatedContent);
      const serializedContent = serializeContent(tiptapContent);
      
      const updatedChapter: ChapterOutline = {
        ...chapter,
        title,
        outline,
        content: serializedContent,
        wordCount: accumulatedContent.length,
        status: "completed",
      };

      onUpdate(updatedChapter);
      toast.success("生成完成并已保存");
    } catch (error) {
      console.error("生成失败:", error);
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  function handleReviseSelection() {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');

    if (!text || text.trim().length === 0) {
      toast.error("请先选中要修订的文本");
      return;
    }

    setSelectedText(text);
    setIsRevisionDialogOpen(true);
  }

  function handleReplaceText(newText: string) {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
  }

  async function handleSave() {
    try {
      setSaving(true);

      // 计算字数（从编辑器获取纯文本）
      const plainText = editor ? tiptapJSONToText(editor.getJSON()) : '';
      const wordCount = plainText.length;

      // 更新当前章节的数据
      const updatedChapter: ChapterOutline = {
        ...chapter,
        title,
        outline,
        content,
        wordCount,
        status: content.trim() ? "completed" : "draft",
      };

      onUpdate(updatedChapter);
      toast.success("保存成功");
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
          <CardTitle>第 {chapter.chapterNumber} 章</CardTitle>
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
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">章节内容</label>
            {editor && <WordCountDisplay editor={editor} />}
          </div>
          <div className="border rounded-md p-4 min-h-[400px]">
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="开始写作章节内容..."
              editable={!generating}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 提示：选中需要修改的文本，然后点击"修订选中"按钮，AI 会根据您的指令改写选中的内容
          </p>
        </div>
      </CardContent>

      {/* 修订对话框 */}
      <RevisionDialog
        chapterId={project.id}
        open={isRevisionDialogOpen}
        onOpenChange={setIsRevisionDialogOpen}
        selectedText={selectedText}
        onAccept={handleReplaceText}
      />
    </Card>
  );
}
