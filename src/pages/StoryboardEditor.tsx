import { useState } from "react";
import Header from "@/components/Header";
import { ArrowLeft, Wand2, Grid3X3, Download, Sparkles, BookOpen, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScriptInput from "@/components/Storyboard/ScriptInput";
import AutoLayoutGrid from "@/components/Storyboard/AutoLayoutGrid";
import NarrativeTemplateSelector from "@/components/Storyboard/NarrativeTemplateSelector";
import DialogueRefiner from "@/components/Storyboard/DialogueRefiner";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { useToast } from "@/hooks/use-toast";

// Enhanced AI response with better analysis
const generateSmartPanels = (script: string): PanelData[] => {
  // Analyze script for scene types
  const hasRain = script.includes("雨") || script.includes("下雨");
  const hasAction = script.includes("剑") || script.includes("战") || script.includes("跃") || script.includes("拔");
  const hasDialogue = script.includes('"') || script.includes('"') || script.includes("说");
  const hasEmotion = script.includes("哭") || script.includes("笑") || script.includes("泪") || script.includes("怒");
  const hasDistance = script.includes("远处") || script.includes("背影") || script.includes("消失");

  const panels: PanelData[] = [];

  // Panel 1: Establishing shot (远景)
  panels.push({
    id: "panel-1",
    type: "wide",
    importance: "high",
    description: hasRain 
      ? "远景：昏暗的街道，大雨倾盆，一个渺小的身影跪在地上"
      : "开场全景：展示故事发生的环境和氛围，建立场景基调",
  });

  // Panel 2: Character introduction or action
  if (hasAction) {
    panels.push({
      id: "panel-2",
      type: "action",
      importance: "high",
      description: "动态镜头：激烈的动作场面，使用破格和出血效果强调冲击力",
      character: "主角",
      emotion: "愤怒",
    });
  } else {
    panels.push({
      id: "panel-2",
      type: "medium",
      importance: "medium",
      description: "中景：展示人物的姿态和环境的关系",
      character: "主角",
    });
  }

  // Panel 3: Close-up for emotion
  if (hasEmotion) {
    panels.push({
      id: "panel-3",
      type: "closeup",
      importance: "high",
      description: hasRain 
        ? "特写：雨水混着泪水，表情痛苦扭曲" 
        : "特写：捕捉人物情感的微妙变化，眼神中的情绪",
      character: "主角",
      emotion: "悲痛",
    });
  }

  // Panel 4: Object focus (if mentioned)
  if (script.includes("项链") || script.includes("手")) {
    panels.push({
      id: "panel-4",
      type: "closeup",
      importance: "medium",
      description: "道具特写：湿漉漉的项链，手指紧握发白，细节展示情感",
    });
  }

  // Panel 5: Dialogue panel (if needed)
  if (hasDialogue) {
    panels.push({
      id: "panel-5",
      type: "dialogue",
      importance: "medium",
      description: "对话场景：人物交流，注意气泡位置不要遮挡表情",
      dialogue: "这不可能...",
      character: "主角",
      emotion: "震惊",
    });
  }

  // Panel 6: Distant figure / transition
  if (hasDistance) {
    panels.push({
      id: "panel-6",
      type: "wide",
      importance: "medium",
      description: "背影远景：黑衣人模糊的背影消失在雨幕中，象征离别",
    });
  }

  // Panel 7: Transition/ending
  panels.push({
    id: `panel-${panels.length + 1}`,
    type: "transition",
    importance: "low",
    description: "收尾过渡：余韵留白，为下一个场景做铺垫",
  });

  return panels;
};

const StoryboardEditor = () => {
  const [activeTab, setActiveTab] = useState("freeform");
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleGenerate = async (script: string) => {
    setIsGenerating(true);
    setPanels([]);
    setSelectedPanel(null);

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const generatedPanels = generateSmartPanels(script);
    setPanels(generatedPanels);
    setIsGenerating(false);

    toast({
      title: "智能分镜拆解完成",
      description: `已分析剧本并生成 ${generatedPanels.length} 个分镜格`,
    });
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
      prev.map((p) => (p.id === panelId ? { ...p, dialogue: newDialogue } : p))
    );
    toast({
      title: "对白已更新",
      description: "分镜对白已优化",
    });
  };

  const handleGenerateImages = () => {
    toast({
      title: "生成漫画图像",
      description: "连接 Lovable Cloud 后可使用 AI 生成每个分镜的图像",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          {/* Page Header */}
          <div className="text-center mb-10">
            <h1 className="font-comic text-4xl md:text-5xl comic-title mb-4">
              剧本与分镜系统
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              从小说到分镜的智能翻译器，AI 编剧助理帮你完成专业分镜
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Script Input */}
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

              {/* Dialogue Refiner */}
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

            {/* Right: Storyboard Preview */}
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

              {/* Layout Legend */}
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

              {/* Panel Details */}
              {selectedPanel && (
                <div className="mt-6 p-4 rounded-lg bg-muted border border-border">
                  <h3 className="font-semibold text-foreground mb-2">分镜详情</h3>
                  {(() => {
                    const panel = panels.find((p) => p.id === selectedPanel);
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

          {/* Export Section */}
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

export default StoryboardEditor;
