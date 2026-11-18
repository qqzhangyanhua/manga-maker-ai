"use client";

import { useState, Suspense, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";

interface StoryboardPageClientProps {
  initialPanelTemplates: TemplateWithMeta[];
}

const StoryboardEditorPageContent = ({ initialPanelTemplates }: StoryboardPageClientProps) => {
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
  const [panelTemplates] = useState<TemplateWithMeta[]>(initialPanelTemplates);
  const [selectedPanelTemplateId, setSelectedPanelTemplateId] = useState<string | null>(null);
  const [templateLoading] = useState(false);
  const { toast } = useToast();
  const { usage, loading: usageLoading, refresh: refreshUsage } = useUsage();

  // Spotlight effect state
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { storyId, initialScript } = useStoryIntegration();
  const { characters, styles } = useMetadata();

  // Mouse tracking for spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePosition(null);
  }, []);

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

  const { isExporting, handleExport, FORMAT_LABELS } = useExport({ currentProject });

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
    router.push(`/projects/${currentProject.id}/storyboard`);
  }, [currentProject, router]);

  const selectedPanelData = useMemo(
    () => panels.find((item) => item.id === selectedPanel),
    [panels, selectedPanel]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1410' }}>
      <Navbar />

      <main className="pt-16">
        {/* 装饰性光晕 */}
        <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

        <div
          ref={containerRef}
          className="relative px-4 py-12"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Global Spotlight Overlay */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-30 transition-opacity duration-500",
              isHovering ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: mousePosition
                ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 115, 22, 0.08), transparent 40%)`
                : "none",
            }}
          />

          <div className="max-w-7xl mx-auto relative">
            <PageBreadcrumb
              segments={[
                { label: "分镜编辑" },
              ]}
              className="mb-4"
            />
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              返回工作台
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
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                剧本与分镜系统
              </h1>
              <p className="text-zinc-300 text-lg max-w-2xl mx-auto">
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
                  <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-6 overflow-hidden shadow-lg">
                    {/* 顶部高光 */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-5 h-5 text-orange-500" />
                      <h2 className="text-xl font-semibold text-white">对白智能优化</h2>
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
                formatLabels={FORMAT_LABELS}
                onGenerateSingleImage={handleSingleImageGeneration}
                generatingSinglePanel={generatingSinglePanel}
                isGenerating={isGenerating}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default function StoryboardPageClient({ initialPanelTemplates }: StoryboardPageClientProps) {
  return (
    <Suspense fallback={null}>
      <StoryboardEditorPageContent initialPanelTemplates={initialPanelTemplates} />
    </Suspense>
  );
}
