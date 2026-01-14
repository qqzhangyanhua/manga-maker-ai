/**
 * 章节内容快速编辑器（用于版本管理页面）
 * 提供简化的编辑功能 + "保存为新版本"按钮
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, GitBranch, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createChapterVersion, analyzeVersionQuality } from "../services/versionService";
import { versionQueryKeys } from "../hooks/useChapterVersions";
import type { ChapterVersion } from "../types/version";

interface NovelChapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string | null;
  word_count: number;
  status: string;
}

interface QuickChapterEditorProps {
  chapter: NovelChapter;
  onContentChange?: (content: string) => void;
}

export function QuickChapterEditor({
  chapter,
  onContentChange,
}: QuickChapterEditorProps) {
  const [content, setContent] = useState(chapter.content || "");
  const [isDirty, setIsDirty] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "analyzing" | "completed" | "failed"
  >("idle");
  const [latestVersionId, setLatestVersionId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // 监听章节变化
  useEffect(() => {
    setContent(chapter.content || "");
    setIsDirty(false);
    setAnalysisStatus("idle");
  }, [chapter.id, chapter.content]);

  // 创建版本 mutation
  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const newVersion = await createChapterVersion(chapter.id, {
        content,
        notes: `手动创建版本 - ${new Date().toLocaleString("zh-CN")}`,
        auto_analyze: false, // 先不自动分析，手动控制
      });
      return newVersion;
    },
    onSuccess: async (newVersion) => {
      // 刷新版本列表
      await queryClient.invalidateQueries({
        queryKey: versionQueryKeys.byChapter(chapter.id),
      });

      setLatestVersionId(newVersion.id);
      setIsDirty(false);
      toast.success(`版本 ${newVersion.version_number} 创建成功`);

      // 开始质量分析
      setAnalysisStatus("analyzing");
      try {
        await analyzeVersionQuality(newVersion.id);
        setAnalysisStatus("completed");
        toast.success("质量分析完成");

        // 再次刷新版本列表以获取分析结果
        await queryClient.invalidateQueries({
          queryKey: versionQueryKeys.byChapter(chapter.id),
        });
      } catch (error) {
        console.error("Quality analysis failed:", error);
        setAnalysisStatus("failed");
        toast.error("质量分析失败，但版本已保存");
      }
    },
    onError: (error) => {
      console.error("Failed to create version:", error);
      toast.error(error instanceof Error ? error.message : "创建版本失败");
    },
  });

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsDirty(newContent !== (chapter.content || ""));
    onContentChange?.(newContent);
  };

  const handleSaveAsVersion = () => {
    if (!content.trim()) {
      toast.error("内容不能为空");
      return;
    }

    if (!isDirty) {
      toast.info("内容未修改，无需创建新版本");
      return;
    }

    createVersionMutation.mutate();
  };

  const wordCount = content.length;

  return (
    <GlassCard className="p-6 space-y-4">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            第 {chapter.chapter_number} 章: {chapter.title}
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            {wordCount} 字 {isDirty && "• 有未保存的修改"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 保存为新版本按钮 */}
          <Button
            onClick={handleSaveAsVersion}
            disabled={!isDirty || createVersionMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {createVersionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <GitBranch className="h-4 w-4 mr-2" />
                保存为新版本
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 质量分析状态提示 */}
      {analysisStatus !== "idle" && (
        <Alert
          className={
            analysisStatus === "analyzing"
              ? "bg-blue-900/20 border-blue-800/30"
              : analysisStatus === "completed"
                ? "bg-green-900/20 border-green-800/30"
                : "bg-red-900/20 border-red-800/30"
          }
        >
          <div className="flex items-center gap-2">
            {analysisStatus === "analyzing" && (
              <>
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                <AlertDescription className="text-blue-300">
                  正在进行 AI 质量分析...
                </AlertDescription>
              </>
            )}
            {analysisStatus === "completed" && (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  质量分析完成！查看下方版本列表查看评分
                </AlertDescription>
              </>
            )}
            {analysisStatus === "failed" && (
              <>
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  质量分析失败，但版本已保存
                </AlertDescription>
              </>
            )}
          </div>
        </Alert>
      )}

      {/* 内容编辑器 */}
      <div className="space-y-2">
        <Label className="text-white">章节内容</Label>
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="开始写作章节内容..."
          className="min-h-[400px] bg-zinc-900/40 border-purple-500/10 text-white placeholder:text-zinc-500 resize-none font-mono focus-visible:ring-purple-500/50"
          disabled={createVersionMutation.isPending}
        />
      </div>

      {/* 帮助提示 */}
      <div className="text-xs text-zinc-500 space-y-1">
        <p>💡 提示:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>编辑内容后点击"保存为新版本"创建版本</li>
          <li>系统会自动进行 AI 质量分析 (约 3-5 秒)</li>
          <li>可在下方版本列表查看质量评分和改进建议</li>
          <li>支持对比不同版本，选择最佳版本</li>
        </ul>
      </div>
    </GlassCard>
  );
}
