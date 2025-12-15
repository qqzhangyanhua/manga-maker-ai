"use client";

import { useState, Suspense, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { Navbar } from "@/components/Landing";
import { ArrowLeft, MessageSquare } from "lucide-react";
import DialogueRefiner from "@/components/Storyboard/DialogueRefiner";
import { useToast } from "@/hooks/use-toast";
import { useUsage } from "@/hooks/use-usage";
import { ApiProject } from "./types";
import { useStoryIntegration } from "./hooks/useStoryIntegration";
import { useMetadata } from "./hooks/useMetadata";
import {
  useStoryboardGeneration,
  useImageGeneration,
} from "./hooks/useStoryboardGeneration";
import { GenerationSettings } from "./components/GenerationSettings";
import { GenerationStrategy } from "./components/GenerationStrategy";
import { TemplateWithMeta } from "@/types/template";
import { UsageSection } from "./components/UsageSection";
import { ScriptInputSection } from "./components/ScriptInputSection";
import { StoryboardPreview } from "./components/StoryboardPreview";
import { useExport } from "./hooks/useExport";
import { apiPanelsToPanelData, panelDataToApiPanels } from "./utils";
import { TabValue } from "./constants";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";

const StoryboardEditorPageContent = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>("freeform");

  // Single source of truth for project data
  const [currentProject, setCurrentProject] = useState<ApiProject | null>(null);

  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [defaultCharacterId, setDefaultCharacterId] = useState<string | undefined>(undefined);
  const [defaultStyleKey, setDefaultStyleKey] = useState<string | undefined>(undefined);
  const [softMode, setSoftMode] = useState(true);
  const [promptErrors, setPromptErrors] = useState<Record<string, string>>({});
  const [panelTemplates, setPanelTemplates] = useState<TemplateWithMeta[]>([]);
  const [selectedPanelTemplateId, setSelectedPanelTemplateId] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const { toast } = useToast();
  const { usage, loading: usageLoading, refresh: refreshUsage } = useUsage();

  // Custom hooks
  const { storyId, initialScript } = useStoryIntegration();
  const { characters, styles } = useMetadata();

  // 加载官方模板元数据，用于镜头分配与节拍参考
  useEffect(() => {
    const loadPanelTemplates = async () => {
      setTemplateLoading(true);
      try {
        const res = await fetch("/api/templates?type=official&limit=50");
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "加载模板失败");
        }
        const json = await res.json();
        setPanelTemplates(json.data?.templates || []);
      } catch (error) {
        console.error("加载官方模板失败:", error);
        toast({
          title: "加载模板失败",
          description: error instanceof Error ? error.message : "无法加载官方模板，请刷新页面重试",
          variant: "destructive",
        });
      } finally {
        setTemplateLoading(false);
      }
    };
    loadPanelTemplates();
  }, [toast]);

  const selectedPanelTemplate = panelTemplates.find((t) => t.id === selectedPanelTemplateId) || null;

  // Derive panels from project (single source of truth)
  const panels: PanelData[] = useMemo(
    () => (currentProject ? apiPanelsToPanelData(currentProject.panels) : []),
    [currentProject]
  );

  const hasGeneratedPanels = panels.length > 0;

  const handleProjectUpdate = useCallback((project: ApiProject | null) => {
    setCurrentProject(project);
    if (project) {
      toast({
        title: "分镜生成成功",
        description: `已生成 ${project.panels.length} 个分镜画面`,
      });
    }
  }, [toast]);

  const handlePanelsUpdate = useCallback((updatedPanels: PanelData[]) => {
    if (!currentProject) return;

    const apiPanels = panelDataToApiPanels(updatedPanels, currentProject);

    setCurrentProject({
      ...currentProject,
      panels: apiPanels,
    });
  }, [currentProject]);

  const { isGenerating, handleGenerate: generateStoryboard, handleGenerateFromTemplate } = useStoryboardGeneration({
    storyId,
    onProjectUpdate: handleProjectUpdate,
    onPanelsUpdate: handlePanelsUpdate,
    onRefreshUsage: refreshUsage,
    panelTemplate: selectedPanelTemplate,
  });

  // 包装 handleGenerate 以添加额外的防抖保护
  const handleGenerate = useCallback((script: string) => {
    if (isGenerating) {
      return; // 防止重复点击
    }
    generateStoryboard(script);
  }, [isGenerating, generateStoryboard]);

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

  const { isExporting, handleExport } = useExport({ currentProject });

  const [generatingSinglePanel, setGeneratingSinglePanel] = useState<string | null>(null);

  const handleSingleImageGeneration = useCallback(async (panelId: string) => {
    setGeneratingSinglePanel(panelId);
    try {
      await handleGenerateSingleImage(panelId);
    } finally {
      setGeneratingSinglePanel(null);
    }
  }, [handleGenerateSingleImage]);

  const handleDialogueUpdate = useCallback((panelId: string, newDialogue: string) => {
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
  }, [currentProject, toast]);

  const handleTemplateGenerate = useCallback(async () => {
    if (isGenerating) {
      return; // 防止重复点击
    }
    if (!selectedTemplate || Object.keys(templateData).length === 0) {
      toast({
        title: "请先填写模板",
        description: "选择一个叙事模板并填写各个部分",
        variant: "destructive",
      });
      return;
    }
    await handleGenerateFromTemplate(templateData);
  }, [isGenerating, selectedTemplate, templateData, handleGenerateFromTemplate, toast]);

  const handleEnterEditor = useCallback(() => {
    if (!currentProject) return;
    router.push(`/storyboard/editor/${currentProject.id}`);
  }, [currentProject, router]);

  const selectedPanelData = useMemo(
    () => panels.find((item) => item.id === selectedPanel),
    [panels, selectedPanel]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <UsageSection
            usage={usage}
            usageLoading={usageLoading}
            panelTemplates={panelTemplates}
            selectedPanelTemplateId={selectedPanelTemplateId}
            onPanelTemplateChange={setSelectedPanelTemplateId}
            templateLoading={templateLoading}
          />

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
              <ScriptInputSection
                activeTab={activeTab}
                onTabChange={setActiveTab}
                initialScript={initialScript}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
                templateData={templateData}
                onTemplateDataChange={setTemplateData}
                onTemplateGenerate={handleTemplateGenerate}
              />

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

            <StoryboardPreview
              hasGeneratedPanels={hasGeneratedPanels}
              panels={panels}
              selectedPanel={selectedPanel}
              onPanelSelect={setSelectedPanel}
              selectedPanelData={selectedPanelData}
              onEnterEditor={handleEnterEditor}
              onGenerateImages={handleGenerateImages}
              onExport={handleExport}
              isExporting={isExporting}
              onGenerateSingleImage={handleSingleImageGeneration}
              generatingSinglePanel={generatingSinglePanel}
              isGenerating={isGenerating}
            />
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
