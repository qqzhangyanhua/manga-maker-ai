/**
 * 小说项目详情页 - 章节管理和编辑
 */
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Settings, Globe, Users, FileText } from "lucide-react";
import { toast } from "sonner";

import { ProjectHeader } from "./ProjectHeader";
import { ChaptersTab } from "./ChaptersTab";
import { useNovelProject } from "./useNovelProject";
import { denormalizeOutline } from "./types";
import type { ChapterOutline } from "./types";
import type { WorldSetting } from "./components/world-setting";

// 组件导入
import { ProjectSettings } from "./components/ProjectSettings";
import { WorldSettingEditor } from "./components/WorldSettingEditor";
import { CharacterManager } from "./components/CharacterManager";
import { OutlineEditor } from "./components/OutlineEditor";
import { GenerateOutlineDialog } from "./components/GenerateOutlineDialog";
import { ContinueOutlineDialog } from "./components/ContinueOutlineDialog";

export default function NovelProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const {
    project,
    outlines,
    selectedChapter,
    loading,
    setProject,
    setOutlines,
    setSelectedChapter,
    handleCreateChapter,
    handleChapterUpdate,
    handleSaveOutlines,
  } = useNovelProject(projectId);

  const [isGenerateOutlineDialogOpen, setIsGenerateOutlineDialogOpen] = useState(false);
  const [isContinueOutlineDialogOpen, setIsContinueOutlineDialogOpen] = useState(false);

  // 加载骨架屏
  if (loading || !project) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-12 gap-6 mt-8">
            <div className="col-span-3 h-96 bg-gray-200 rounded"></div>
            <div className="col-span-9 h-96 bg-gray-200 rounded"></div>
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
    setOutlines(updatedOutlines);

    // 自动保存
    const backendOutlines = updatedOutlines.map(denormalizeOutline);
    await fetch(`/api/novel/projects/${projectId}/outlines`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outlines: backendOutlines }),
    });
  };

  // 保存角色
  const handleSaveCharacters = async (characters: unknown[]) => {
    const response = await fetch(`/api/novel/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characters }),
    });
    if (response.ok) {
      const updated = await response.json();
      setProject(updated);
    } else {
      throw new Error("保存失败");
    }
  };

  // 保存世界观
  const handleSaveWorldSetting = async (worldSetting: WorldSetting) => {
    const response = await fetch(`/api/novel/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ world_setting: worldSetting }),
    });
    if (response.ok) {
      const updated = await response.json();
      setProject(updated);
    } else {
      throw new Error("保存失败");
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* 项目头部 */}
      <ProjectHeader
        project={project}
        projectId={projectId}
        outlines={outlines}
        onSelectChapter={setSelectedChapter}
      />

      {/* 主内容区 */}
      <Tabs defaultValue="chapters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chapters">
            <BookOpen className="h-4 w-4 mr-2" />
            章节管理
          </TabsTrigger>
          <TabsTrigger value="outline">
            <FileText className="h-4 w-4 mr-2" />
            故事大纲
          </TabsTrigger>
          <TabsTrigger value="characters">
            <Users className="h-4 w-4 mr-2" />
            角色管理
          </TabsTrigger>
          <TabsTrigger value="world">
            <Globe className="h-4 w-4 mr-2" />
            世界观
          </TabsTrigger>
          <TabsTrigger value="settings">
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
          <OutlineEditor
            projectId={projectId}
            initialOutlines={outlines}
            onSave={handleSaveOutlines}
            onGenerateOutline={handleGenerateOutline}
          />
        </TabsContent>

        <TabsContent value="characters">
          <CharacterManager
            projectId={projectId}
            initialCharacters={Array.isArray(project.characters) ? project.characters as never[] : []}
            outlines={outlines}
            onSave={handleSaveCharacters}
          />
        </TabsContent>

        <TabsContent value="world">
          <WorldSettingEditor
            projectId={projectId}
            initialData={project.world_setting as never}
            outlines={outlines}
            onSave={handleSaveWorldSetting}
          />
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettings project={project} onUpdate={setProject} />
        </TabsContent>
      </Tabs>

      {/* AI 生成大纲对话框 */}
      <GenerateOutlineDialog
        isOpen={isGenerateOutlineDialogOpen}
        onClose={() => setIsGenerateOutlineDialogOpen(false)}
        projectId={projectId}
        onGenerated={(generatedOutlines) => {
          setOutlines(generatedOutlines);
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
  );
}
