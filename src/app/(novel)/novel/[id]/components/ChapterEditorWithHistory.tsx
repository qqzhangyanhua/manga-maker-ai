/**
 * 章节编辑器 - 增强版
 *
 * 功能：
 * - 自动保存
 * - 版本历史
 * - 差异对比
 * - 快捷键支持
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save, Wand2, History, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  VersionHistory,
  createChapterVersionHistory,
  type ChapterData,
  type VersionDiff,
  type Change,
} from "@/lib/version-history";
import { cn } from "@/lib/utils";

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

interface ChapterEditorWithHistoryProps {
  chapter: ChapterOutline;
  project: { id: string; title: string };
  onUpdate: (chapter: ChapterOutline) => void;
}

export function ChapterEditorWithHistory({
  chapter,
  project,
  onUpdate,
}: ChapterEditorWithHistoryProps) {
  // 编辑器状态
  const [title, setTitle] = useState(chapter.title);
  const [outline, setOutline] = useState(chapter.outline || "");
  const [content, setContent] = useState(chapter.content || "");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // AI 生成状态
  const [generating, setGenerating] = useState(false);

  // 版本历史状态
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null);
  const versionHistoryRef = useRef<VersionHistory<ChapterData> | null>(null);

  // 修订对话框状态
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化版本历史
  useEffect(() => {
    versionHistoryRef.current = createChapterVersionHistory(
      project.id,
      chapter.chapterNumber
    );

    // 加载现有数据到版本历史
    versionHistoryRef.current.startTracking({
      title: chapter.title,
      outline: chapter.outline,
      content: chapter.content || "",
      wordCount: chapter.wordCount || 0,
      status: chapter.status || "draft",
    });

    return () => {
      versionHistoryRef.current?.stopTracking();
    };
  }, [project.id, chapter.chapterNumber]);

  // 监听章节 prop 变化
  useEffect(() => {
    setTitle(chapter.title);
    setOutline(chapter.outline || "");
    setContent(chapter.content || "");
    setHasUnsavedChanges(false);
  }, [chapter.chapterNumber, chapter.title, chapter.outline, chapter.content]);

  // 检测内容变化
  useEffect(() => {
    setHasUnsavedChanges(true);
    // 更新版本历史跟踪
    if (versionHistoryRef.current) {
      versionHistoryRef.current.update({
        title,
        outline,
        content,
        wordCount: content.length,
        status: content.trim() ? "completed" : "draft",
      });
    }
  }, [title, outline, content]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S 保存
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + H 打开历史
      if ((e.metaKey || e.ctrlKey) && e.key === "h") {
        e.preventDefault();
        setVersionHistoryOpen(true);
      }
      // Escape 退出对比模式
      if (e.key === "Escape" && compareMode) {
        setCompareMode(false);
        setSelectedVersionId(null);
        setVersionDiff(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [compareMode]);

  /**
   * 保存章节
   */
  async function handleSave() {
    try {
      setSaving(true);

      const updatedChapter: ChapterOutline = {
        ...chapter,
        title,
        outline,
        content,
        wordCount: content.length,
        status: content.trim() ? "completed" : "draft",
      };

      await onUpdate(updatedChapter);

      // 创建版本记录
      if (versionHistoryRef.current) {
        versionHistoryRef.current.saveVersion("手动保存", ["manual"]);
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success("保存成功");
    } catch (error) {
      console.error("保存失败:", error);
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  /**
   * AI 生成章节内容
   */
  async function handleGenerate() {
    if (!outline.trim()) {
      toast.error("请先填写章节大纲");
      return;
    }

    try {
      setGenerating(true);
      setContent(""); // 清空现有内容

      // 步骤1：创建或查找对应的 chapter 记录
      let chapterId: string | null = null;

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
        // 更新现有章节的 outline 和 title
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

      // 步骤2：流式生成
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
          }
        }
      }

      // 生成完成后自动保存
      const updatedChapter: ChapterOutline = {
        ...chapter,
        title,
        outline,
        content: accumulatedContent,
        wordCount: accumulatedContent.length,
        status: "completed",
      };

      await onUpdate(updatedChapter);

      // 创建版本记录
      if (versionHistoryRef.current) {
        versionHistoryRef.current.saveVersion("AI 生成", ["ai-generated"]);
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success("生成完成并已保存");
    } catch (error) {
      console.error("生成失败:", error);
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  /**
   * 修订选中文本
   */
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

  /**
   * 替换文本
   */
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

  /**
   * 打开版本历史对比
   */
  function handleCompareVersion(versionId: string) {
    if (!versionHistoryRef.current) return;

    const currentData = {
      title,
      outline,
      content,
      wordCount: content.length,
      status: (content.trim() ? "completed" : "draft") as "draft" | "completed",
    };

    try {
      // 创建临时版本用于对比
      const tempVersion = {
        id: "current",
        timestamp: Date.now(),
        data: currentData,
      };

      const targetVersion = versionHistoryRef.current.getVersion(versionId);
      if (!targetVersion) {
        toast.error("版本不存在");
        return;
      }

      const diff = versionHistoryRef.current.compareVersions(
        versionId,
        "current"
      );

      setVersionDiff(diff);
      setSelectedVersionId(versionId);
      setCompareMode(true);
    } catch (error) {
      console.error("对比失败:", error);
      toast.error("对比失败");
    }
  }

  /**
   * 恢复到指定版本
   */
  function handleRestoreVersion(versionId: string) {
    if (!versionHistoryRef.current) return;

    try {
      const restoredData = versionHistoryRef.current.restoreVersion(versionId);

      setTitle(restoredData.title);
      setOutline(restoredData.outline);
      setContent(restoredData.content || "");

      setCompareMode(false);
      setSelectedVersionId(null);
      setVersionDiff(null);

      toast.success("已恢复到该版本");
    } catch (error) {
      console.error("恢复失败:", error);
      toast.error("恢复失败");
    }
  }

  /**
   * 获取版本列表
   */
  function getVersions() {
    if (!versionHistoryRef.current) return [];
    return versionHistoryRef.current.getVersions();
  }

  /**
   * 格式化时间
   */
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString("zh-CN");
  }

  /**
   * 渲染变化列表
   */
  function renderChanges(changes: Change[]) {
    if (changes.length === 0) {
      return <p className="text-sm text-muted-foreground">无变化</p>;
    }

    return (
      <div className="space-y-2">
        {changes.map((change, index) => (
          <div key={index} className="text-sm">
            <Badge
              variant={change.type === "added" ? "default" : change.type === "removed" ? "destructive" : "secondary"}
              className="mr-2"
            >
              {change.type === "added" ? "新增" : change.type === "removed" ? "删除" : "修改"}
            </Badge>
            <span className="font-medium">{change.field}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {lastSaved && (
            <span>上次保存: {lastSaved.toLocaleTimeString()}</span>
          )}
          {autoSaving && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              自动保存中...
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-orange-500">有未保存的更改</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVersionHistoryOpen(true)}
            title="版本历史 (Ctrl+H)"
          >
            <History className="h-4 w-4 mr-2" />
            历史版本
          </Button>
        </div>
      </div>

      {/* 编辑器卡片 */}
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
                title="使用 AI 生成章节内容"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generating ? "生成中..." : "AI 生成"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReviseSelection}
                disabled={generating || saving}
                title="修订选中的文本 (Ctrl+Shift+R)"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                修订选中
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                title="保存 (Ctrl+S)"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              章节标题
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入章节标题..."
            />
          </div>

          {/* 大纲 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              章节大纲
            </label>
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
      </Card>

      {/* 版本历史对话框 */}
      <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              版本历史
            </DialogTitle>
            <DialogDescription>
              查看和恢复历史版本，或对比不同版本间的差异
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 对比模式 */}
            {compareMode && versionDiff && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">版本对比</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCompareMode(false);
                      setSelectedVersionId(null);
                      setVersionDiff(null);
                    }}
                  >
                    退出对比
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-2">选中版本</p>
                    <p className="text-muted-foreground">
                      {formatTime(
                        getVersions().find((v) => v.id === selectedVersionId)?.timestamp || 0
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {versionDiff.changeCount} 处变化
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-2">当前版本</p>
                    <p className="text-muted-foreground">刚刚</p>
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-2">变化详情</p>
                  {renderChanges(versionDiff.changes)}
                </div>

                <Button
                  onClick={() => selectedVersionId && handleRestoreVersion(selectedVersionId)}
                  variant="default"
                  size="sm"
                >
                  恢复到此版本
                </Button>
              </div>
            )}

            {/* 版本列表 */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {getVersions().map((version, index) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {version.description || `版本 ${getVersions().length - index}`}
                        </span>
                        {version.tags?.includes("auto-save") && (
                          <Badge variant="secondary" className="text-xs">
                            自动
                          </Badge>
                        )}
                        {version.tags?.includes("manual") && (
                          <Badge variant="default" className="text-xs">
                            手动
                          </Badge>
                        )}
                        {version.tags?.includes("ai-generated") && (
                          <Badge variant="outline" className="text-xs">
                            AI生成
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(version.timestamp)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!compareMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompareVersion(version.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          对比
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestoreVersion(version.id)}
                      >
                        恢复
                      </Button>
                    </div>
                  </div>
                ))}

                {getVersions().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无历史版本
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* 修订对话框 - 暂时使用原有组件 */}
      {/* TODO: 迁移到独立的 RevisionDialog */}
    </div>
  );
}
