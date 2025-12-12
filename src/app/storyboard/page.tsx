"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
import Link from "next/link";
import Header from "@/components/Header";
import {
  ArrowLeft,
  Wand2,
  Grid3X3,
  Download,
  Sparkles,
  BookOpen,
  MessageSquare,
  Edit3,
  FileText,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScriptInput from "@/components/Storyboard/ScriptInput";
import AutoLayoutGrid from "@/components/Storyboard/AutoLayoutGrid";
import NarrativeTemplateSelector from "@/components/Storyboard/NarrativeTemplateSelector";
import DialogueRefiner from "@/components/Storyboard/DialogueRefiner";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { useToast } from "@/hooks/use-toast";
import { useUsage } from "@/hooks/use-usage";
import { ApiProject } from "./types";
import { useStoryIntegration } from "./hooks/useStoryIntegration";
import { useMetadata } from "./hooks/useMetadata";
import {
  useStoryboardGeneration,
  useImageGeneration,
} from "./hooks/useStoryboardGeneration";
import { UsageBadge } from "./components/UsageBadge";
import { GenerationSettings } from "./components/GenerationSettings";
import { GenerationStrategy } from "./components/GenerationStrategy";
import { PanelDetails } from "./components/PanelDetails";
import { PanelStats } from "./components/PanelStats";

const StoryboardEditorPageContent = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("freeform");

  // Single source of truth for project data
  const [currentProject, setCurrentProject] = useState<ApiProject | null>(null);

  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [defaultCharacterId, setDefaultCharacterId] = useState<string | undefined>(undefined);
  const [defaultStyleKey, setDefaultStyleKey] = useState<string | undefined>(undefined);
  const [softMode, setSoftMode] = useState(true);
  const [promptErrors, setPromptErrors] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { usage, loading: usageLoading, refresh: refreshUsage } = useUsage();

  // Custom hooks
  const { storyId, initialScript } = useStoryIntegration();
  const { characters, styles } = useMetadata();

  // Derive panels from project (single source of truth)
  const panels: PanelData[] = currentProject?.panels.map(panel => ({
    id: panel.id,
    description: panel.description || "",
    dialogue: panel.dialogue || "",
    type: (panel.panel_type || "medium") as "closeup" | "medium" | "wide" | "action" | "dialogue" | "transition",
    importance: (panel.importance || "medium") as "high" | "medium" | "low",
    cameraAngle: panel.camera_angle || undefined,
    shotSize: panel.shot_size || undefined,
    englishPrompt: panel.prompt_used || undefined,
    generatedImage: panel.generated_image || undefined,
  })) ?? [];

  const hasGeneratedPanels = panels.length > 0;

  const handleProjectUpdate = (project: ApiProject | null) => {
    setCurrentProject(project);
    if (project) {
      toast({
        title: "分镜生成成功",
        description: `已生成 ${project.panels.length} 个分镜画面`,
      });
    }
  };

  const handlePanelsUpdate = (updatedPanels: PanelData[]) => {
    if (!currentProject) return;

    // Convert PanelData back to ApiPanel format
    const apiPanels = updatedPanels.map((panel, index) => {
      // Find the original panel to preserve fields not in PanelData
      const originalPanel = currentProject.panels.find(p => p.id === panel.id);

      return {
        id: panel.id,
        panel_order: index,
        description: panel.description,
        dialogue: panel.dialogue || null,
        panel_type: panel.type,
        importance: panel.importance,
        camera_angle: panel.cameraAngle || null,
        shot_size: panel.shotSize || null,
        prompt_used: panel.englishPrompt || null,
        generated_image: panel.generatedImage || null,
        character_name: originalPanel?.character_name || null,
        emotion: originalPanel?.emotion || null,
        script_segment_id: originalPanel?.script_segment_id || null,
        script_start: originalPanel?.script_start || null,
        script_end: originalPanel?.script_end || null,
        visual_prompt: originalPanel?.visual_prompt || null,
        created_at: originalPanel?.created_at || new Date().toISOString(),
      };
    });

    setCurrentProject({
      ...currentProject,
      panels: apiPanels,
    });
  };

  const { isGenerating, handleGenerate, handleGenerateFromTemplate } = useStoryboardGeneration({
    storyId,
    onProjectUpdate: handleProjectUpdate,
    onPanelsUpdate: handlePanelsUpdate,
    onRefreshUsage: refreshUsage,
  });

  const { promptErrors: imagePromptErrors, handleGenerateImages, handleGenerateSingleImage } = useImageGeneration({
    panels,
    currentProject,
    defaultCharacterId,
    defaultStyleKey,
    softMode,
    onPanelsUpdate: handlePanelsUpdate,
    onPromptErrorsUpdate: setPromptErrors,
    onRefreshUsage: refreshUsage,
    setSoftMode,
  });

  const [generatingSinglePanel, setGeneratingSinglePanel] = useState<string | null>(null);

  const handleSingleImageGeneration = async (panelId: string) => {
    setGeneratingSinglePanel(panelId);
    try {
      await handleGenerateSingleImage(panelId);
    } finally {
      setGeneratingSinglePanel(null);
    }
  };

  const handleDialogueUpdate = (panelId: string, newDialogue: string) => {
    if (!currentProject) return;

    const updatedPanels = currentProject.panels.map((panel) =>
      panel.id === panelId ? { ...panel, dialogue: newDialogue } : panel
    );

    setCurrentProject({
      ...currentProject,
      panels: updatedPanels,
    });

    toast({
      title: "对白已更新",
      description: "分镜对白已优化",
    });
  };

  const handleTemplateGenerate = async () => {
    if (!selectedTemplate || Object.keys(templateData).length === 0) {
      toast({
        title: "请先填写模板",
        description: "选择一个叙事模板并填写各个部分",
        variant: "destructive",
      });
      return;
    }
    await handleGenerateFromTemplate(templateData);
  };

  const handleExport = async () => {
    if (!currentProject) {
      toast({
        title: "无可导出内容",
        description: "请先生成分镜",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`/api/project/${currentProject.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "json" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "导出失败");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `storyboard-${currentProject.title}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "导出成功",
        description: "分镜剧本已导出为 JSON 文件",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEnterEditor = () => {
    if (!currentProject) return;
    router.push(`/storyboard/editor/${currentProject.id}`);
  };

  const selectedPanelData = panels.find((item) => item.id === selectedPanel);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <div className="text-sm text-muted-foreground">今日用量</div>
            <UsageBadge
              label="分镜生成"
              item={usage?.storyboard_generation}
              loading={usageLoading}
            />
            <UsageBadge label="图像生成" item={usage?.image_generation} loading={usageLoading} />
            <UsageBadge label="聊天/LLM" item={usage?.llm_chat} loading={usageLoading} />
          </div>

          <GenerationSettings
            characters={characters}
            styles={styles}
            defaultCharacterId={defaultCharacterId}
            defaultStyleKey={defaultStyleKey}
            softMode={softMode}
            onCharacterChange={setDefaultCharacterId}
            onStyleChange={setDefaultStyleKey}
            onSoftModeChange={setSoftMode}
          />

          {hasGeneratedPanels && (
            <GenerationStrategy
              characters={characters}
              styles={styles}
              defaultCharacterId={defaultCharacterId}
              defaultStyleKey={defaultStyleKey}
              softMode={softMode}
              promptErrors={promptErrors}
            />
          )}

          <div className="text-center mb-10">
            <h1 className="font-comic text-4xl md:text-5xl comic-title mb-4">剧本与分镜系统</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              从小说到分镜的智能翻译器，AI 编剧助理帮你完成专业分镜
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="freeform" className="flex items-center gap-1">
                    <Wand2 className="w-4 h-4" />
                    自由创作
                  </TabsTrigger>
                  <TabsTrigger value="template" className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    结构模板
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="freeform" className="mt-4">
                  <div className="comic-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Wand2 className="w-5 h-5 text-primary" />
                      <h2 className="font-comic text-xl text-foreground">小说转漫画</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      粘贴你的小说或剧本文本，AI 将自动分析并拆解为专业分镜。
                    </p>
                    <ScriptInput
                      key={initialScript}
                      onGenerate={handleGenerate}
                      isGenerating={isGenerating}
                      initialValue={initialScript}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="template" className="mt-4">
                  <div className="comic-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <h2 className="font-comic text-xl text-foreground">结构化写作模板</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      选择经典叙事结构，跟随模板引导完成故事大纲。
                    </p>
                    <NarrativeTemplateSelector
                      selectedTemplate={selectedTemplate}
                      onSelectTemplate={setSelectedTemplate}
                      templateData={templateData}
                      onTemplateDataChange={setTemplateData}
                    />
                    {selectedTemplate && (
                      <Button
                        variant="comic"
                        className="w-full mt-6"
                        onClick={handleTemplateGenerate}
                        disabled={isGenerating}
                      >
                        <Sparkles className="w-4 h-4" />
                        {isGenerating ? "生成中..." : "从模板生成分镜"}
                      </Button>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {hasGeneratedPanels && (
                <div className="comic-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h2 className="font-comic text-xl text-foreground">对白智能优化</h2>
                  </div>
                  <DialogueRefiner panels={panels} onDialogueUpdate={handleDialogueUpdate} />
                </div>
              )}
            </div>

            <div className="comic-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-primary" />
                  <h2 className="font-comic text-xl text-foreground">智能分镜排版</h2>
                </div>
                {hasGeneratedPanels && currentProject && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEnterEditor}>
                      <Edit3 className="w-4 h-4" />
                      进入编辑器
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateImages()}>
                      <Sparkles className="w-4 h-4" />
                      生成图像
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      disabled={isExporting}
                    >
                      <Download className="w-4 h-4" />
                      {isExporting ? "导出中..." : "导出"}
                    </Button>
                  </div>
                )}
              </div>

              {hasGeneratedPanels ? (
                <>
                  <PanelStats panels={panels} />

                  <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border text-xs">
                    <span className="text-muted-foreground">自动排版：</span>
                    <span className="px-2 py-0.5 rounded-full bg-comic-red/20 text-comic-red">
                      高重要度=大格
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-comic-orange/20 text-comic-orange">
                      动作=宽格
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-comic-blue/20 text-comic-blue">
                      特写=竖格
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      过渡=小格
                    </span>
                  </div>

                  <AutoLayoutGrid
                    panels={panels}
                    selectedPanel={selectedPanel}
                    onPanelSelect={setSelectedPanel}
                  />

                  {selectedPanelData && (
                    <PanelDetails
                      panel={selectedPanelData}
                      onGenerateImage={handleSingleImageGeneration}
                      isGenerating={generatingSinglePanel === selectedPanelData.id}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-primary/10 p-6 mb-4">
                    <FileText className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">还没有分镜</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    在左侧输入你的故事剧本，或选择一个叙事模板开始创作。AI
                    将自动为你拆解出专业的分镜画面。
                  </p>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>支持粘贴小说、剧本、故事大纲等任何叙事文本</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>AI 会自动分析情节节奏和镜头语言</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>生成后可进一步编辑对白和生成图像</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default function StoryboardEditorPage() {
  return (
    <Suspense fallback={null}>
      <StoryboardEditorPageContent />
    </Suspense>
  );
}
