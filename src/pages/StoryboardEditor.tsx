import { useState } from "react";
import Header from "@/components/Header";
import { ArrowLeft, Wand2, Grid3X3, Download, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScriptInput from "@/components/Storyboard/ScriptInput";
import AutoLayoutGrid from "@/components/Storyboard/AutoLayoutGrid";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { useToast } from "@/hooks/use-toast";

// Simulated AI response - in production, this would come from Lovable AI
const generateMockPanels = (script: string): PanelData[] => {
  // Simple analysis based on content
  const hasAction = script.includes("剑") || script.includes("战") || script.includes("跃") || script.includes("拔");
  const hasDialogue = script.includes('"') || script.includes('"') || script.includes("说");
  const hasEmotion = script.includes("笑") || script.includes("红") || script.includes("愣") || script.includes("沉默");

  const panels: PanelData[] = [
    {
      id: "panel-1",
      type: "wide",
      importance: "high",
      description: "开场全景：展示故事发生的环境和氛围",
      character: undefined,
      emotion: undefined,
    },
    {
      id: "panel-2",
      type: "medium",
      importance: "medium",
      description: "主角登场：介绍主要人物的外貌和气质",
      character: "主角",
      emotion: "冷静",
    },
    {
      id: "panel-3",
      type: hasDialogue ? "dialogue" : "medium",
      importance: "medium",
      description: hasDialogue ? "对话场景：两人对峙，气氛紧张" : "情节推进：展示故事发展",
      dialogue: hasDialogue ? "你终于来了..." : undefined,
      character: "主角",
      emotion: hasEmotion ? "复杂" : undefined,
    },
    {
      id: "panel-4",
      type: hasAction ? "action" : "closeup",
      importance: "high",
      description: hasAction ? "高潮动作：激烈的打斗或动作场面，使用破格强调冲击力" : "特写镜头：捕捉人物情感的微妙变化",
      character: "主角",
      emotion: hasAction ? "愤怒" : "期待",
    },
    {
      id: "panel-5",
      type: "closeup",
      importance: "medium",
      description: "反应镜头：展示对方或旁观者的反应",
      character: "配角",
      emotion: "惊讶",
    },
    {
      id: "panel-6",
      type: "transition",
      importance: "low",
      description: "收尾过渡：为下一个场景做铺垫",
    },
  ];

  return panels;
};

const StoryboardEditor = () => {
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (script: string) => {
    setIsGenerating(true);
    setPanels([]);
    setSelectedPanel(null);

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const generatedPanels = generateMockPanels(script);
    setPanels(generatedPanels);
    setIsGenerating(false);

    toast({
      title: "分镜生成完成",
      description: `已生成 ${generatedPanels.length} 个分镜格`,
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
              将小说或剧本自动转换为漫画分镜，智能排版创造动态布局
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Script Input */}
            <div className="comic-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wand2 className="w-5 h-5 text-primary" />
                <h2 className="font-comic text-xl text-foreground">小说转漫画</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                粘贴你的小说或剧本文本，AI 将自动分析角色、动作、对白，并拆分成漫画分镜。
              </p>
              <ScriptInput onGenerate={handleGenerate} isGenerating={isGenerating} />
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
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border">
                  <span className="text-xs text-muted-foreground">排版说明：</span>
                  <span className="px-2 py-0.5 rounded-full bg-comic-red/20 text-comic-red text-xs">高重要度 = 大格</span>
                  <span className="px-2 py-0.5 rounded-full bg-comic-yellow/20 text-comic-yellow text-xs">动作 = 宽格</span>
                  <span className="px-2 py-0.5 rounded-full bg-comic-blue/20 text-comic-blue text-xs">特写 = 竖格</span>
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
                          <span className="text-muted-foreground">类型：</span>
                          <span className="text-foreground">{panel.type}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">描述：</span>
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
