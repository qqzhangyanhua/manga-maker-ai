/**
 * 小说项目详情页 - 章节管理和编辑
 * 重构版本：修复类型安全、数据同步、错误处理问题
 */
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Settings, Globe, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";

import { ProjectHeader } from "./ProjectHeader";
import { ChaptersTab } from "./ChaptersTab";
import { useNovelProject } from "./useNovelProject";
import { denormalizeOutline } from "./types";
import type { ChapterOutline } from "./types";

// 组件导入
import { ProjectSettings } from "./components/ProjectSettings";
import { WorldSettingEditor } from "./components/WorldSettingEditor";
import { CharacterManager } from "./components/CharacterManager";
import { OutlineEditor } from "./components/OutlineEditor";
import { GenerateOutlineDialog } from "./components/GenerateOutlineDialog";
import { ContinueOutlineDialog } from "./components/ContinueOutlineDialog";

// ✅ 新增：错误边界和状态组件
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorState } from "@/components/ErrorState";
import { SaveIndicator } from "@/components/SaveIndicator";

function NovelProjectPageContent() {
  const params = useParams();
  const projectId = params.id as string;

  // ✅ 使用重构后的 Hook
  const {
    project,
    outlines,
    characters,
    worldSetting,
    selectedChapter,
    loading,
    error,
    saveStatus,
    lastSaved,
    setSelectedChapter,
    handleCreateChapter,
    handleChapterUpdate,
    handleSaveOutlines,
    handleSaveCharacters,
    handleSaveWorldSetting,
    handleUpdateProject,
    refetch,
  } = useNovelProject(projectId);

  const [isGenerateOutlineDialogOpen, setIsGenerateOutlineDialogOpen] = useState(false);
  const [isContinueOutlineDialogOpen, setIsContinueOutlineDialogOpen] = useState(false);

  // ✅ 错误状态处理
  if (error) {
    return (
      <ErrorState
        error={error}
        title="加载项目失败"
        description="无法加载项目数据，请检查项目是否存在或稍后重试。"
        onRetry={refetch}
      />
    );
  }

  // 加载骨架屏
  if (loading || !project) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
          <div className="grid grid-cols-12 gap-6 mt-8">
            <div className="col-span-3 h-96 bg-zinc-800 rounded"></div>
            <div className="col-span-9 h-96 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // 处理大纲生成模式
  const handleGenerateOutline = async (mode: "full" | "continue") => {
    if (mode === "full") {
      setIsGenerateOutlineDialogOpen(true);
    } else {
      setIsContinueOutlineDialogOpen(true);
    }
  };

  // 处理续写大纲完成
  const handleContinueOutlineGenerated = async (newChapters: ChapterOutline[]) => {
    const updatedOutlines = [...outlines, ...newChapters];

    // ✅ 使用统一的保存方法
    try {
      const backendOutlines = updatedOutlines.map(denormalizeOutline);
      await handleUpdateProject({ outlines: backendOutlines as never[] });
      toast.success("大纲续写成功");
    } catch (err) {
      console.error("续写大纲保存失败:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
        {/* 项目头部 + 保存指示器 */}
        <div className="flex items-center justify-between">
          <ProjectHeader
            project={project}
            projectId={projectId}
            outlines={outlines}
            onSelectChapter={setSelectedChapter}
          />
          {/* ✅ 自动保存指示器 */}
          <SaveIndicator
            status={saveStatus}
            lastSaved={lastSaved}
            className="ml-4"
          />
        </div>

        {/* 主内容区 */}
        <Tabs defaultValue="chapters" className="space-y-6">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 h-auto">
            <TabsTrigger value="chapters" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all">
              <BookOpen className="h-4 w-4 mr-2" />
              章节管理
            </TabsTrigger>
            <TabsTrigger value="outline" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all">
              <FileText className="h-4 w-4 mr-2" />
              故事大纲
            </TabsTrigger>
            <TabsTrigger value="characters" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all">
              <Users className="h-4 w-4 mr-2" />
              角色管理
            </TabsTrigger>
            <TabsTrigger value="world" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all">
              <Globe className="h-4 w-4 mr-2" />
              世界观
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all">
              <Settings className="h-4 w-4 mr-2" />
              项目设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chapters" className="space-y-4">
            <ChaptersTab
              project={project}
              outlines={outlines}
              selectedChapter={selectedChapter}
              loading={loading}
              onCreateChapter={handleCreateChapter}
              onSelectChapter={setSelectedChapter}
              onUpdateChapter={handleChapterUpdate}
            />
          </TabsContent>

          <TabsContent value="outline">
            <GlassCard className="p-6">
              <OutlineEditor
                projectId={projectId}
                initialOutlines={outlines}
                onSave={handleSaveOutlines}
                onGenerateOutline={handleGenerateOutline}
              />
            </GlassCard>
          </TabsContent>

          <TabsContent value="characters">
            <GlassCard className="p-6">
              {/* ✅ 使用类型安全的 characters */}
              <CharacterManager
                projectId={projectId}
                initialCharacters={characters}
                outlines={outlines}
                onSave={handleSaveCharacters}
              />
            </GlassCard>
          </TabsContent>

          <TabsContent value="world">
            <GlassCard className="p-6">
              {/* ✅ 使用类型安全的 worldSetting */}
              <WorldSettingEditor
                projectId={projectId}
                initialData={worldSetting}
                outlines={outlines}
                onSave={handleSaveWorldSetting}
              />
            </GlassCard>
          </TabsContent>

          <TabsContent value="settings">
            <GlassCard className="p-6">
              <ProjectSettings 
                project={project} 
                onUpdate={(updates) => {
                  handleUpdateProject(updates);
                }} 
              />
            </GlassCard>
          </TabsContent>
        </Tabs>

        {/* AI 生成大纲对话框 */}
        <GenerateOutlineDialog
          isOpen={isGenerateOutlineDialogOpen}
          onClose={() => setIsGenerateOutlineDialogOpen(false)}
          projectId={projectId}
          onGenerated={(generatedOutlines) => {
            handleSaveOutlines(generatedOutlines);
            toast.success("大纲已生成并保存");
          }}
        />

        {/* 续写大纲对话框 */}
        <ContinueOutlineDialog
          isOpen={isContinueOutlineDialogOpen}
          onClose={() => setIsContinueOutlineDialogOpen(false)}
          projectId={projectId}
          existingOutlines={outlines}
          projectGenre={project?.genre}
          onGenerated={handleContinueOutlineGenerated}
        />
      </div>
    </div>
  );
}

// ✅ 导出包装了错误边界的组件
export default function NovelProjectPage() {
  return (
    <ErrorBoundary>
      <NovelProjectPageContent />
    </ErrorBoundary>
  );
}
