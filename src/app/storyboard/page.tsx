"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { ArrowLeft, Wand2, Grid3X3, Download, Sparkles, BookOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScriptInput from "@/components/Storyboard/ScriptInput";
import AutoLayoutGrid from "@/components/Storyboard/AutoLayoutGrid";
import NarrativeTemplateSelector from "@/components/Storyboard/NarrativeTemplateSelector";
import DialogueRefiner from "@/components/Storyboard/DialogueRefiner";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { useToast } from "@/hooks/use-toast";

// API类型定义
type ApiPanel = {
  id: string;
  panel_order: number;
  panel_type: string;
  importance: string;
  description: string;
  dialogue: string | null;
  character_name: string | null;
  emotion: string | null;
  prompt_used: string | null;
  generated_image: string | null;
};

type ApiProject = {
  id: string;
  title: string;
  description: string | null;
  style: string | null;
  status: string;
  panels: ApiPanel[];
};

// 转换API数据为前端格式
const convertApiPanelToLocal = (apiPanel: ApiPanel): PanelData => ({
  id: apiPanel.id,
  type: apiPanel.panel_type as PanelData["type"],
  importance: apiPanel.importance as PanelData["importance"],
  description: apiPanel.description,
  dialogue: apiPanel.dialogue || undefined,
  character: apiPanel.character_name || undefined,
  emotion: apiPanel.emotion || undefined,
  generatedImage: apiPanel.generated_image || undefined,
  englishPrompt: apiPanel.prompt_used || undefined,
});

const StoryboardEditorPage = () => {
  const [activeTab, setActiveTab] = useState("freeform");
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [currentProject, setCurrentProject] = useState<ApiProject | null>(null);
  const { toast } = useToast();

  const handleGenerate = async (script: string) => {
    setIsGenerating(true);
    setPanels([]);
    setSelectedPanel(null);
    setCurrentProject(null);

    try {
      const response = await fetch("/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story: script,
          saveToDb: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成失败");
      }

      const data = await response.json();

      if (data.project) {
        setCurrentProject(data.project);
        const localPanels = data.project.panels.map(convertApiPanelToLocal);
        setPanels(localPanels);

        toast({
          title: "智能分镜拆解完成",
          description: `已生成项目《${data.project.title}》，包含 ${localPanels.length} 个分镜`,
        });
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromTemplate = async () => {
    if (!selectedTemplate || Object.keys(templateData).length === 0) {
      toast({
        title: "请先填写模板",
        description: "选择一个叙事模板并填写各个部分",
        variant: "destructive",
      });
      return;
    }

    const combinedScript = Object.values(templateData).join("\n\n");
    await handleGenerate(combinedScript);
  };

  const handleDialogueUpdate = (panelId: string, newDialogue: string) => {
    setPanels((prev) =>
      prev.map((panel) => (panel.id === panelId ? { ...panel, dialogue: newDialogue } : panel))
    );
    toast({
      title: "对白已更新",
      description: "分镜对白已优化",
    });
  };

  const handleGenerateImages = async () => {
    if (!currentProject) {
      toast({
        title: "请先生成分镜",
        description: "需要先创建故事板项目才能生成图像",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "开始生成图像",
        description: `正在为 ${panels.length} 个分镜生成AI图像...`,
      });

      const response = await fetch("/api/panel/generate-image", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: currentProject.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成图像失败");
      }

      const data = await response.json();

      // 更新panels的图像
      const updatedPanels = panels.map((panel) => {
        const updatedPanel = data.panels.find((p: ApiPanel) => p.id === panel.id);
        if (updatedPanel) {
          return {
            ...panel,
            generatedImage: updatedPanel.generated_image || undefined,
          };
        }
        return panel;
      });

      setPanels(updatedPanels);

      toast({
        title: "图像生成完成",
        description: `成功为 ${data.generated_count} 个分镜生成图像`,
      });
    } catch (error) {
      console.error("Generate images error:", error);
      toast({
        title: "图像生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  };

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

          <div className="text-center mb-10">
            <h1 className="font-comic text-4xl md:text-5xl comic-title mb-4">
              剧本与分镜系统
            </h1>
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
                    <ScriptInput onGenerate={handleGenerate} isGenerating={isGenerating} />
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
                        onClick={handleGenerateFromTemplate}
                        disabled={isGenerating}
                      >
                        <Sparkles className="w-4 h-4" />
                        {isGenerating ? "生成中..." : "从模板生成分镜"}
                      </Button>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {panels.length > 0 && (
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
                {panels.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleGenerateImages}>
                    <Sparkles className="w-4 h-4" />
                    生成图像
                  </Button>
                )}
              </div>

              {panels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border text-xs">
                  <span className="text-muted-foreground">自动排版：</span>
                  <span className="px-2 py-0.5 rounded-full bg-comic-red/20 text-comic-red">高重要度=大格</span>
                  <span className="px-2 py-0.5 rounded-full bg-comic-orange/20 text-comic-orange">动作=宽格</span>
                  <span className="px-2 py-0.5 rounded-full bg-comic-blue/20 text-comic-blue">特写=竖格</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">过渡=小格</span>
                </div>
              )}

              <AutoLayoutGrid
                panels={panels}
                selectedPanel={selectedPanel}
                onPanelSelect={setSelectedPanel}
              />

              {selectedPanel && (
                <div className="mt-6 p-4 rounded-lg bg-muted border border-border">
                  <h3 className="font-semibold text-foreground mb-2">分镜详情</h3>
                  {(() => {
                    const panel = panels.find((item) => item.id === selectedPanel);
                    if (!panel) return null;
                    return (
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-muted-foreground">镜头类型：</span>
                          <span className="text-foreground font-semibold">
                            {panel.type === "wide" && "远景/全景"}
                            {panel.type === "medium" && "中景"}
                            {panel.type === "closeup" && "特写"}
                            {panel.type === "action" && "动作镜头"}
                            {panel.type === "dialogue" && "对话场景"}
                            {panel.type === "transition" && "过渡镜头"}
                          </span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">画面描述：</span>
                          <span className="text-foreground">{panel.description}</span>
                        </p>
                        {panel.dialogue && (
                          <p>
                            <span className="text-muted-foreground">对白：</span>
                            <span className="text-foreground italic">"{panel.dialogue}"</span>
                          </p>
                        )}
                        {panel.character && (
                          <p>
                            <span className="text-muted-foreground">角色：</span>
                            <span className="text-foreground">{panel.character}</span>
                            {panel.emotion && <span className="text-muted-foreground"> ({panel.emotion})</span>}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {panels.length > 0 && (
            <div className="mt-8 flex justify-center gap-4">
              <Button variant="comic" size="lg" onClick={handleGenerateImages}>
                <Sparkles className="w-5 h-5" />
                使用 AI 生成所有分镜图像
              </Button>
              <Button variant="outline" size="lg">
                <Download className="w-5 h-5" />
                导出分镜剧本
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StoryboardEditorPage;
