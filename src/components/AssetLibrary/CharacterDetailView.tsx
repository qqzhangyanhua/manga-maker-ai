import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Plus, Shirt, Smile, RotateCcw, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import CreateOutfitDialog from "./CreateOutfitDialog";

interface CharacterAsset {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  tags: string[];
  training_status: "pending" | "training" | "ready" | "failed";
  usage_count: number;
  views?: Array<{ id: string; view_type: string; image_url: string }>;
  expressions?: Array<{ id: string; expression_type: string; image_url: string }>;
  outfits?: Array<{ id: string; outfit_name: string; outfit_type: string; image_url: string | null }>;
}

interface CharacterDetailProps {
  character: CharacterAsset;
  onBack: () => void;
  onUpdate?: (character: CharacterAsset) => void;
}

// Expression types for the matrix
const expressions = [
  { id: "neutral", label: "平静", emoji: "😐" },
  { id: "happy", label: "开心", emoji: "😊" },
  { id: "sad", label: "悲伤", emoji: "😢" },
  { id: "angry", label: "愤怒", emoji: "😠" },
  { id: "surprised", label: "惊讶", emoji: "😲" },
  { id: "shy", label: "害羞", emoji: "😳" },
  { id: "confident", label: "自信", emoji: "😎" },
  { id: "worried", label: "担忧", emoji: "😟" },
  { id: "determined", label: "坚定", emoji: "😤" },
];

// Outfit presets
const outfitPresets = [
  { id: "default", label: "默认装", icon: "👤" },
  { id: "school", label: "校服", icon: "🎓" },
  { id: "battle", label: "战斗服", icon: "⚔️" },
  { id: "casual", label: "休闲装", icon: "👕" },
  { id: "formal", label: "正装", icon: "👔" },
  { id: "sleepwear", label: "睡衣", icon: "🌙" },
];

const CharacterDetailView = ({ character, onBack, onUpdate }: CharacterDetailProps) => {
  const [activeTab, setActiveTab] = useState("threeview");
  const [selectedExpression, setSelectedExpression] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState("default");
  const [generatedViews, setGeneratedViews] = useState<{front?: string; side?: string; back?: string}>({});
  const [expressionSheet, setExpressionSheet] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOutfitDialogOpen, setIsOutfitDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load existing data from character
  useState(() => {
    if (character.views) {
      const views: any = {};
      character.views.forEach((v) => {
        views[v.view_type] = v.image_url;
      });
      setGeneratedViews(views);
    }
    
    if (character.expressions) {
      const expressions: any = {};
      character.expressions.forEach((e) => {
        expressions[e.expression_type] = e.image_url;
      });
      setExpressionSheet(expressions);
    }
  });

  const handleGenerateThreeView = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          description: character.description || character.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const views: any = {};
        Object.entries(data.views).forEach(([viewType, viewData]: [string, any]) => {
          views[viewType] = viewData.image_url;
        });
        setGeneratedViews(views);
        
        toast({
          title: "三视图生成完成",
          description: "角色的正面、侧面、背面视图已生成",
        });

        // Refresh character data
        if (onUpdate) {
          const updatedChar = await fetch(`/api/character/${character.id}`);
          if (updatedChar.ok) {
            const charData = await updatedChar.json();
            onUpdate(charData.character);
          }
        }
      } else {
        const error = await response.json();
        toast({
          title: "生成失败",
          description: error.error || "三视图生成失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "生成失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExpression = async (expressionId: string) => {
    setIsGenerating(true);
    setSelectedExpression(expressionId);
    
    try {
      const response = await fetch("/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          expression_type: expressionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExpressionSheet(prev => ({
          ...prev,
          [expressionId]: data.expressions[expressionId].image_url,
        }));
        
        toast({
          title: "表情生成完成",
          description: `已生成${expressions.find(e => e.id === expressionId)?.label}表情`,
        });

        // Refresh character data
        if (onUpdate) {
          const updatedChar = await fetch(`/api/character/${character.id}`);
          if (updatedChar.ok) {
            const charData = await updatedChar.json();
            onUpdate(charData.character);
          }
        }
      } else {
        const error = await response.json();
        toast({
          title: "生成失败",
          description: error.error || "表情生成失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "生成失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setSelectedExpression(null);
    }
  };

  const handleGenerateAllExpressions = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          generate_all: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const allExpressions: Record<string, string> = {};
        Object.entries(data.expressions).forEach(([expType, expData]: [string, any]) => {
          allExpressions[expType] = expData.image_url;
        });
        setExpressionSheet(allExpressions);
        
        toast({
          title: "表情矩阵生成完成",
          description: "已生成全部9种表情",
        });

        // Refresh character data
        if (onUpdate) {
          const updatedChar = await fetch(`/api/character/${character.id}`);
          if (updatedChar.ok) {
            const charData = await updatedChar.json();
            onUpdate(charData.character);
          }
        }
      } else {
        const error = await response.json();
        toast({
          title: "生成失败",
          description: error.error || "表情矩阵生成失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "生成失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateOutfit = async (data: {
    outfit_name: string;
    outfit_type: string;
    description?: string;
  }) => {
    try {
      const response = await fetch("/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          ...data,
        }),
      });

      if (response.ok) {
        toast({
          title: "服装创建成功",
          description: `${data.outfit_name} 已添加到服装库`,
        });
        
        // Refresh character data
        if (onUpdate) {
          const updatedChar = await fetch(`/api/character/${character.id}`);
          if (updatedChar.ok) {
            const charData = await updatedChar.json();
            onUpdate(charData.character);
          }
        }
      } else {
        const error = await response.json();
        toast({
          title: "创建失败",
          description: error.error || "服装创建失败",
          variant: "destructive",
        });
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <>
      <CreateOutfitDialog
        open={isOutfitDialogOpen}
        onOpenChange={setIsOutfitDialogOpen}
        onSubmit={handleCreateOutfit}
      />
      
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回角色列表
        </button>
      </div>

      {/* Character Info */}
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-border">
          {character.base_image_url ? (
            <img src={character.base_image_url} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-4xl">👤</span>
            </div>
          )}
        </div>
        <div>
          <h2 className="font-comic text-3xl text-foreground">{character.name}</h2>
          <p className="text-muted-foreground">{character.description || "暂无描述"}</p>
          <div className="flex gap-2 mt-2">
            {character.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="threeview" className="flex items-center gap-1">
            <Camera className="w-4 h-4" />
            三视图
          </TabsTrigger>
          <TabsTrigger value="expressions" className="flex items-center gap-1">
            <Smile className="w-4 h-4" />
            表情矩阵
          </TabsTrigger>
          <TabsTrigger value="wardrobe" className="flex items-center gap-1">
            <Shirt className="w-4 h-4" />
            服装管理
          </TabsTrigger>
        </TabsList>

        {/* Three View Tab */}
        <TabsContent value="threeview" className="mt-6">
          <div className="comic-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-comic text-xl text-foreground">角色三视图</h3>
                <p className="text-sm text-muted-foreground">
                  生成标准的正面、侧面、背面视图，作为一致性基准
                </p>
              </div>
              <Button
                variant="comic"
                onClick={handleGenerateThreeView}
                disabled={isGenerating}
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? "生成中..." : "生成三视图"}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {["front", "side", "back"].map((view) => (
                <div
                  key={view}
                  className={cn(
                    "aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center",
                    generatedViews[view as keyof typeof generatedViews]
                      ? "border-primary bg-card overflow-hidden"
                      : "border-border bg-muted/50"
                  )}
                >
                  {generatedViews[view as keyof typeof generatedViews] ? (
                    <>
                      <img
                        src={generatedViews[view as keyof typeof generatedViews]}
                        alt={view}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 py-1 text-center text-sm font-semibold">
                        {view === "front" ? "正面" : view === "side" ? "侧面" : "背面"}
                      </div>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {view === "front" ? "正面视图" : view === "side" ? "侧面视图" : "背面视图"}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Expression Matrix Tab */}
        <TabsContent value="expressions" className="mt-6">
          <div className="comic-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-comic text-xl text-foreground">表情与姿态矩阵</h3>
                <p className="text-sm text-muted-foreground">
                  生成角色的喜怒哀乐表情，拖拽到分镜中使用
                </p>
              </div>
              <Button
                variant="comic"
                onClick={handleGenerateAllExpressions}
                disabled={isGenerating}
              >
                <Sparkles className="w-4 h-4" />
                一键生成全部
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {expressions.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => handleGenerateExpression(exp.id)}
                  disabled={isGenerating}
                  className={cn(
                    "aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all overflow-hidden relative",
                    expressionSheet[exp.id]
                      ? "border-primary"
                      : "border-border hover:border-primary/50 bg-muted/50"
                  )}
                >
                  {expressionSheet[exp.id] ? (
                    <>
                      <img
                        src={expressionSheet[exp.id]}
                        alt={exp.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 py-1 text-center">
                        <span className="text-lg mr-1">{exp.emoji}</span>
                        <span className="text-xs font-semibold">{exp.label}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl mb-1">{exp.emoji}</span>
                      <span className="text-xs text-muted-foreground">{exp.label}</span>
                      {selectedExpression === exp.id && isGenerating && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Wardrobe Tab */}
        <TabsContent value="wardrobe" className="mt-6">
          <div className="comic-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-comic text-xl text-foreground">服装管理系统</h3>
                <p className="text-sm text-muted-foreground">
                  为角色创建多套服装，在不同场景中使用
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsOutfitDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                添加新服装
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Show existing outfits */}
              {character.outfits && character.outfits.map((outfit) => (
                <button
                  key={outfit.id}
                  onClick={() => setSelectedOutfit(outfit.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-3",
                    selectedOutfit === outfit.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 bg-card"
                  )}
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
                    {outfitPresets.find(p => p.id === outfit.outfit_type)?.icon || "👔"}
                  </div>
                  <span className="font-semibold text-foreground">{outfit.outfit_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {outfit.image_url ? "已生成" : "待生成"}
                  </span>
                </button>
              ))}
              
              {/* Show remaining presets that haven't been created */}
              {outfitPresets
                .filter(preset => !character.outfits?.some(o => o.outfit_type === preset.id))
                .map((outfit) => (
                  <button
                    key={outfit.id}
                    onClick={async () => {
                      try {
                        const response = await fetch("/api/character/outfits", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            character_id: character.id,
                            outfit_name: outfit.label,
                            outfit_type: outfit.id,
                          }),
                        });

                        if (response.ok) {
                          toast({
                            title: "服装创建成功",
                            description: `${outfit.label} 已添加到服装库`,
                          });
                          
                          // Refresh character data
                          if (onUpdate) {
                            const updatedChar = await fetch(`/api/character/${character.id}`);
                            if (updatedChar.ok) {
                              const charData = await updatedChar.json();
                              onUpdate(charData.character);
                            }
                          }
                        }
                      } catch (error) {
                        toast({
                          title: "创建失败",
                          description: "网络错误，请稍后重试",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-card/50 transition-all flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
                      {outfit.icon}
                    </div>
                    <span className="font-semibold text-foreground">{outfit.label}</span>
                    <Button size="sm" variant="ghost" className="text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      生成
                    </Button>
                  </button>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};

export default CharacterDetailView;
