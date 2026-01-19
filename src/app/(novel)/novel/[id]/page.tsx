/**
 * 小说项目详情页 - 章节管理和编辑
 * 重构版本：修复类型安全、数据同步、错误处理问题
 * 性能优化：使用动态导入减少初始包大小
 */
"use client";

import { useState, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Settings, Globe, Users, FileText, TrendingUp, Network, GitBranch, Database, Eye } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

import { ProjectHeader } from "./ProjectHeader";
import { ChaptersTab } from "./ChaptersTab";
import { useNovelProject } from "./useNovelProject";
import { denormalizeOutline } from "./types";
import type { ChapterOutline } from "./types";
import { ProjectDetailSkeleton } from "./components/ProjectDetailSkeleton";
import { novelTheme } from "../theme";
import { cn } from "@/lib/utils";
import "../novel-theme.css";

// ✅ 性能优化：动态导入重型组件
// Sprint 2 Task 2.3: 对话框组件也改为动态导入（非首屏必需）
import { ProjectSettings } from "./components/ProjectSettings";
import { ProgressDashboard } from "./components/ProgressDashboard";

// 对话框组件动态导入（仅在打开时加载）
const GenerateOutlineDialog = lazy(() =>
  import("./components/GenerateOutlineDialog").then(mod => ({
    default: mod.GenerateOutlineDialog
  }))
);
const ContinueOutlineDialog = lazy(() =>
  import("./components/ContinueOutlineDialog").then(mod => ({
    default: mod.ContinueOutlineDialog
  }))
);

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
const ChapterVersionManager = lazy(() =>
  import("./components/ChapterVersionManager").then(mod => ({
    default: mod.ChapterVersionManager
  }))
);
const WorldEntriesTab = lazy(() =>
  import("./components/world").then(mod => ({
    default: mod.WorldEntriesTab
  }))
);
const ForeshadowingTab = lazy(() =>
  import("./components/world").then(mod => ({
    default: mod.ForeshadowingTab
  }))
);

// ✅ 新增：错误边界和状态组件
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorState } from "@/components/ErrorState";
import { SaveIndicator } from "@/components/SaveIndicator";

// ✅ Sprint 1 Task 1.1：数据丢失保护
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";

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

  // ✅ Sprint 1 Task 1.1：监听未保存的更改，防止数据丢失
  const hasUnsavedChanges = saveStatus === 'saving';
  useUnsavedChangesWarning(hasUnsavedChanges);

  // ✅ 错误状态处理
  if (error) {
    return (
      <div className={cn(novelTheme.layout.background, "novel-theme-scope")}>
        <ErrorState
          error={error}
          title="加载项目失败"
          description="无法加载项目数据，请检查项目是否存在或稍后重试。"
          onRetry={refetch}
        />
      </div>
    );
  }

  // ✅ Sprint 2 Task 2.4: 使用提取的骨架屏组件
  if (loading || !project) {
    return <ProjectDetailSkeleton />;
  }

  // 处理大纲生成模式
  const handleGenerateOutline = async (mode: "full" | "continue") => {
    if (mode === "full") {
      setIsGenerateOutlineDialogOpen(true);
    } else {
      setIsContinueOutlineDialogOpen(true);
    }
  };

  // ✅ Sprint 1 Task 1.2：修复数据同步问题 - 使用统一保存方法
  const handleContinueOutlineGenerated = async (newChapters: ChapterOutline[]) => {
    const updatedOutlines = [...outlines, ...newChapters];

    try {
      // ✅ 使用 handleSaveOutlines 而非直接调用 handleUpdateProject
      // 这样保证保存状态指示器能正确更新，数据流保持一致
      await handleSaveOutlines(updatedOutlines);
      toast.success("大纲续写成功");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "保存失败";
      toast.error(`大纲续写保存失败：${errorMsg}`);
      // ✅ 向上抛出异常，让调用方知道保存失败
      throw err;
    }
  };

  return (
    <div className={cn(novelTheme.layout.background, "novel-theme-scope")}>
      {/* 装饰性光晕 */}
      <div className={novelTheme.layout.glowPrimary} />
      <div className={novelTheme.layout.glowSecondary} />

      <div className={novelTheme.layout.container}>
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
          <TabsList className={novelTheme.tabs.list}>
            <TabsTrigger value="chapters" className={novelTheme.tabs.trigger}>
              <BookOpen className="h-4 w-4 mr-2" />
              章节管理
            </TabsTrigger>
            <TabsTrigger value="outline" className={novelTheme.tabs.trigger}>
              <FileText className="h-4 w-4 mr-2" />
              故事大纲
            </TabsTrigger>
            <TabsTrigger value="characters" className={novelTheme.tabs.trigger}>
              <Users className="h-4 w-4 mr-2" />
              角色管理
            </TabsTrigger>
            <TabsTrigger value="relationship" className={novelTheme.tabs.trigger}>
              <Network className="h-4 w-4 mr-2" />
              关系图谱
            </TabsTrigger>
            <TabsTrigger value="world" className={novelTheme.tabs.trigger}>
              <Globe className="h-4 w-4 mr-2" />
              世界观
            </TabsTrigger>
            <TabsTrigger value="world-memory" className={novelTheme.tabs.trigger}>
              <Database className="h-4 w-4 mr-2" />
              记忆库
            </TabsTrigger>
            <TabsTrigger value="foreshadowing" className={novelTheme.tabs.trigger}>
              <Eye className="h-4 w-4 mr-2" />
              伏笔
            </TabsTrigger>
            <TabsTrigger value="progress" className={novelTheme.tabs.trigger}>
              <TrendingUp className="h-4 w-4 mr-2" />
              创作进度
            </TabsTrigger>
            <TabsTrigger value="versions" className={novelTheme.tabs.trigger}>
              <GitBranch className="h-4 w-4 mr-2" />
              版本管理
            </TabsTrigger>
            <TabsTrigger value="settings" className={novelTheme.tabs.trigger}>
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
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
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
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
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
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <CharacterRelationshipGraph
                  characters={characters}
                  projectId={projectId}
                  readonly={false}
                  onSaveRelationships={handleSaveCharacters}
                />
              </Suspense>
            </GlassCard>
          </TabsContent>

          <TabsContent value="world" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
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

          <TabsContent value="world-memory" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <WorldEntriesTab
                  projectId={projectId}
                  chapters={project.chapters}  // ✅ 传递完整章节列表（包含content）
                />
              </Suspense>
            </GlassCard>
          </TabsContent>

          <TabsContent value="foreshadowing" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <ForeshadowingTab
                  projectId={projectId}
                  currentChapter={outlines.length > 0 ? outlines.length : 1}
                />
              </Suspense>
            </GlassCard>
          </TabsContent>

          <TabsContent value="progress" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
              <ProgressDashboard
                outlines={outlines}
                characters={characters}
                worldSetting={worldSetting}
                targetWords={project?.target_words}
              />
            </GlassCard>
          </TabsContent>

          <TabsContent value="versions" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <ChapterVersionManager
                  projectId={projectId}
                  selectedChapter={selectedChapter}
                />
              </Suspense>
            </GlassCard>
          </TabsContent>

          <TabsContent value="settings" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlassCard className={cn(novelTheme.card.base, "p-6")}>
              <ProjectSettings
                project={project}
                onUpdate={(updatedProject) => {
                  // ✅ Sprint 1 Task 1.3：适配类型，ProjectSettings 返回完整对象，我们只需部分字段
                  handleUpdateProject({
                    title: updatedProject.title,
                    description: updatedProject.description,
                    genre: updatedProject.genre,
                    target_words: updatedProject.target_words,
                    status: updatedProject.status,
                  });
                }}
              />
            </GlassCard>
          </TabsContent>
        </Tabs>

        {/* ✅ Sprint 2 Task 2.3: 对话框懒加载 - 仅在打开时加载组件 */}
        {/* AI 生成大纲对话框 */}
        {isGenerateOutlineDialogOpen && (
          <Suspense fallback={null}>
            <GenerateOutlineDialog
              isOpen={isGenerateOutlineDialogOpen}
              onClose={() => setIsGenerateOutlineDialogOpen(false)}
              projectId={projectId}
              onGenerated={(generatedOutlines) => {
                handleSaveOutlines(generatedOutlines);
                toast.success("大纲已生成并保存");
              }}
            />
          </Suspense>
        )}

        {/* 续写大纲对话框 */}
        {isContinueOutlineDialogOpen && (
          <Suspense fallback={null}>
            <ContinueOutlineDialog
              isOpen={isContinueOutlineDialogOpen}
              onClose={() => setIsContinueOutlineDialogOpen(false)}
              projectId={projectId}
              existingOutlines={outlines}
              projectGenre={project?.genre}
              onGenerated={handleContinueOutlineGenerated}
            />
          </Suspense>
        )}
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
