/**
 * 小说项目详情页 - 章节管理和编辑
 * 重构版本：修复类型安全、数据同步、错误处理问题
 * 性能优化：使用动态导入减少初始包大小
 */
"use client";

import { useState, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Settings, Globe, Users, FileText, TrendingUp, Network } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

import { ProjectHeader } from "./ProjectHeader";
import { ChaptersTab } from "./ChaptersTab";
import { useNovelProject } from "./useNovelProject";
import { denormalizeOutline } from "./types";
import type { ChapterOutline } from "./types";

// ✅ 性能优化：动态导入重型组件
// 对话框组件保持同步导入（小而常用）
import { ProjectSettings } from "./components/ProjectSettings";
import { GenerateOutlineDialog } from "./components/GenerateOutlineDialog";
import { ContinueOutlineDialog } from "./components/ContinueOutlineDialog";
import { ProgressDashboard } from "./components/ProgressDashboard";

// 编辑器组件使用动态导入（较大且按需加载）
const WorldSettingEditor = lazy(() =>
  import("./components/WorldSettingEditor").then(mod => ({
    default: mod.WorldSettingEditor
  }))
);
const CharacterManager = lazy(() =>
  import("./components/CharacterManager").then(mod => ({
    default: mod.CharacterManager
  }))
);
const OutlineEditor = lazy(() =>
  import("./components/OutlineEditor").then(mod => ({
    default: mod.OutlineEditor
  }))
);
const CharacterRelationshipGraph = lazy(() =>
  import("./components/relationship-graph").then(mod => ({
    default: mod.CharacterRelationshipGraph
  }))
);

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
      <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black flex items-center justify-center">
        <ErrorState
          error={error}
          title="加载项目失败"
          description="无法加载项目数据，请检查项目是否存在或稍后重试。"
          onRetry={refetch}
        />
      </div>
    );
  }

  // 加载骨架屏
  if (loading || !project) {
    return (
      <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <div className="container mx-auto py-12 px-4 max-w-7xl">
          <div className="animate-pulse space-y-8">
            <div className="flex justify-between items-center">
               <div className="space-y-3 w-1/3">
                 <div className="h-10 bg-zinc-800 rounded-lg w-full"></div>
                 <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
               </div>
               <div className="h-10 w-32 bg-zinc-800 rounded"></div>
            </div>
            <div className="h-12 bg-zinc-800 rounded-lg w-full"></div>
            <div className="grid grid-cols-12 gap-6 mt-8">
              <div className="col-span-3 h-[600px] bg-zinc-800/50 rounded-xl border border-zinc-800"></div>
              <div className="col-span-9 h-[600px] bg-zinc-800/50 rounded-xl border border-zinc-800"></div>
            </div>
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
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      {/* 装饰性光晕 */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8 relative z-10">
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
          <TabsList className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-1 h-auto rounded-xl">
            <TabsTrigger value="chapters" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all py-2 px-4">
              <BookOpen className="h-4 w-4 mr-2" />
              章节管理
            </TabsTrigger>
            <TabsTrigger value="outline" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all py-2 px-4">
              <FileText className="h-4 w-4 mr-2" />
              故事大纲
            </TabsTrigger>
            <TabsTrigger value="characters" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all py-2 px-4">
              <Users className="h-4 w-4 mr-2" />
              角色管理
            </TabsTrigger>
            <TabsTrigger value="relationship" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all py-2 px-4">
              <Network className="h-4 w-4 mr-2" />
              关系图谱
            </TabsTrigger>
            <TabsTrigger value="world" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all py-2 px-4">
              <Globe className="h-4 w-4 mr-2" />
              世界观
            </TabsTrigger>
            <TabsTrigger value="progress" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all py-2 px-4">
              <TrendingUp className="h-4 w-4 mr-2" />
              创作进度
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all py-2 px-4">
              <Settings className="h-4 w-4 mr-2" />
              项目设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chapters" className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
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

          <TabsContent value="outline" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className="p-6">
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <OutlineEditor
                  projectId={projectId}
                  initialOutlines={outlines}
                  onSave={handleSaveOutlines}
                  onGenerateOutline={handleGenerateOutline}
                />
              </Suspense>
            </GlassCard>
          </TabsContent>

          <TabsContent value="characters" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className="p-6">
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <CharacterManager
                  projectId={projectId}
                  initialCharacters={characters}
                  outlines={outlines}
                  onSave={handleSaveCharacters}
                />
              </Suspense>
            </GlassCard>
          </TabsContent>

          <TabsContent value="relationship" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className="p-6">
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <CharacterRelationshipGraph
                  characters={characters}
                  projectId={projectId}
                  readonly={true}
                />
              </Suspense>
            </GlassCard>
          </TabsContent>

          <TabsContent value="world" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className="p-6">
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <WorldSettingEditor
                  projectId={projectId}
                  initialData={worldSetting}
                  outlines={outlines}
                  onSave={handleSaveWorldSetting}
                />
              </Suspense>
            </GlassCard>
          </TabsContent>

          <TabsContent value="progress" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className="p-6">
              <ProgressDashboard
                outlines={outlines}
                characters={characters}
                worldSetting={worldSetting}
                targetWords={project?.target_words}
              />
            </GlassCard>
          </TabsContent>

          <TabsContent value="settings" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
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
