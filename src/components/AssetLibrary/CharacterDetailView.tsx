import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Smile, Shirt, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import CreateOutfitDialog from "./CreateOutfitDialog";
import ImageUploadDialog from "./ImageUploadDialog";
import GenerateSimilarDialog from "./GenerateSimilarDialog";
import PoseVariantsView from "./PoseVariantsView";
import { useUsage } from "@/hooks/use-usage";
import CharacterHeader from "./character-detail/CharacterHeader";
import ThreeViewTab from "./character-detail/ThreeViewTab";
import ExpressionMatrixTab from "./character-detail/ExpressionMatrixTab";
import WardrobeTab from "./character-detail/WardrobeTab";
import { useCharacterUpload } from "./character-detail/useCharacterUpload";
import { useCharacterGeneration } from "./character-detail/useCharacterGeneration";
import { expressions } from "./character-detail/constants";
import type { CharacterDetailProps, CreateOutfitData } from "./character-detail/types";

const CharacterDetailView = ({ character, onBack, onUpdate }: CharacterDetailProps) => {
  const [activeTab, setActiveTab] = useState("threeview");
  const [generatedViews, setGeneratedViews] = useState<{ front?: string; side?: string; back?: string }>({});
  const [expressionSheet, setExpressionSheet] = useState<Record<string, string>>({});
  const [isOutfitDialogOpen, setIsOutfitDialogOpen] = useState(false);
  const [generateSimilarDialogOpen, setGenerateSimilarDialogOpen] = useState(false);

  // 本地服装列表状态，用于立即响应UI更新
  const [localOutfits, setLocalOutfits] = useState<Array<{ id: string; outfit_name: string; outfit_type: string; image_url: string | null }>>(character.outfits || []);

  // 服装生成loading状态
  const [outfitGenerating, setOutfitGenerating] = useState<Record<string, boolean>>({});

  const { toast } = useToast();
  const { usage, loading: usageLoading, refresh: refreshUsage } = useUsage();

  // Load existing data from character and sync with character prop changes
  useState(() => {
    if (character.views) {
      const views: Record<string, string> = {};
      character.views.forEach((v) => {
        views[v.view_type] = v.image_url;
      });
      setGeneratedViews(views);
    }

    if (character.expressions) {
      const expressions: Record<string, string> = {};
      character.expressions.forEach((e) => {
        expressions[e.expression_type] = e.image_url;
      });
      setExpressionSheet(expressions);
    }

    // 同步服装数据
    if (character.outfits) {
      setLocalOutfits(character.outfits);
    }
  });

  // 辅助函数：更新角色数据中的服装列表
  const updateCharacterOutfits = (newOutfit: { id: string; outfit_name: string; outfit_type: string; image_url: string | null }) => {
    // 立即更新本地状态，确保UI快速响应
    setLocalOutfits(prevOutfits => {
      const existingIndex = prevOutfits.findIndex(o => o.id === newOutfit.id);

      if (existingIndex >= 0) {
        // 更新现有服装
        const updated = [...prevOutfits];
        updated[existingIndex] = newOutfit;
        return updated;
      } else {
        // 添加新服装
        return [...prevOutfits, newOutfit];
      }
    });

    // 同时通知父组件更新
    if (onUpdate) {
      const existingOutfits = character.outfits || [];
      const existingIndex = existingOutfits.findIndex(o => o.id === newOutfit.id);

      let updatedOutfits: Array<{ id: string; outfit_name: string; outfit_type: string; image_url: string | null }>;
      if (existingIndex >= 0) {
        updatedOutfits = [...existingOutfits];
        updatedOutfits[existingIndex] = newOutfit;
      } else {
        updatedOutfits = [...existingOutfits, newOutfit];
      }

      onUpdate({
        ...character,
        outfits: updatedOutfits,
      });
    }
  };

  // Custom hooks for upload and generation
  const uploadHook = useCharacterUpload({
    character,
    onUpdate,
    onViewsUpdate: (views) => setGeneratedViews(prev => ({ ...prev, ...views })),
    onExpressionsUpdate: (exps) => setExpressionSheet(prev => ({ ...prev, ...exps })),
    onOutfitsUpdate: updateCharacterOutfits,
  });

  const generationHook = useCharacterGeneration({
    character,
    onUpdate,
    onViewsUpdate: (views) => setGeneratedViews(views),
    onExpressionsUpdate: (exps) => setExpressionSheet(prev => ({ ...prev, ...exps })),
    refreshUsage,
  });

  const handleCreateOutfit = async (data: CreateOutfitData) => {
    try {
      const response = await fetch("/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "服装创建失败");
      }

      const result = await response.json();

      toast({
        title: "服装创建成功",
        description: `${data.outfit_name} 已添加到服装库`,
      });

      refreshUsage();

      // 立即更新UI，从响应中获取outfit数据
      if (result.outfit) {
        updateCharacterOutfits(result.outfit);
      } else {
        // 如果响应中没有outfit，则重新获取
        const updatedChar = await fetch(`/api/character/${character.id}`);
        if (updatedChar.ok) {
          const charData = await updatedChar.json();
          if (charData.character.outfits) {
            setLocalOutfits(charData.character.outfits);
          }
          if (onUpdate) {
            onUpdate(charData.character);
          }
        }
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
        variant: "destructive",
        action: (
          <ToastAction
            altText="升级配额"
            onClick={() =>
              window.open("mailto:support@example.com?subject=ComicAI%20额度申请", "_blank")
            }
          >
            升级配额
          </ToastAction>
        ),
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

      <GenerateSimilarDialog
        open={generateSimilarDialogOpen}
        onOpenChange={setGenerateSimilarDialogOpen}
        character={character}
        onSuccess={() => {
          toast({
            title: "提示",
            description: "新角色已保存到角色库，请返回列表查看",
          });
          refreshUsage();
        }}
        onUsageRefresh={refreshUsage}
      />

      <div className="space-y-6">
        <CharacterHeader
          character={character}
          onBack={onBack}
          onUpdate={onUpdate}
          onGenerateSimilar={() => setGenerateSimilarDialogOpen(true)}
          usage={usage}
          usageLoading={usageLoading}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
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
            <TabsTrigger value="poses" className="flex items-center gap-1">
              <User className="w-4 h-4" />
              姿势变体
            </TabsTrigger>
          </TabsList>

          {/* Three View Tab */}
          <TabsContent value="threeview" className="mt-6">
            <ThreeViewTab
              generatedViews={generatedViews}
              viewGenerating={generationHook.viewGenerating}
              isGenerating={generationHook.isGenerating}
              isUploading={uploadHook.isUploading}
              onGenerateThreeView={generationHook.handleGenerateThreeView}
              onRegenerateSingleView={generationHook.handleRegenerateSingleView}
              onOpenUploadDialog={uploadHook.openUploadDialog}
            />
          </TabsContent>

          {/* Expression Matrix Tab */}
          <TabsContent value="expressions" className="mt-6">
            <ExpressionMatrixTab
              expressionSheet={expressionSheet}
              allExpressionsGenerating={generationHook.allExpressionsGenerating}
              selectedExpression={generationHook.selectedExpression}
              isGenerating={generationHook.isGenerating}
              isUploading={uploadHook.isUploading}
              onGenerateExpression={generationHook.handleGenerateExpression}
              onGenerateAllExpressions={generationHook.handleGenerateAllExpressions}
              onOpenUploadDialog={uploadHook.openUploadDialog}
            />
          </TabsContent>

          {/* Wardrobe Tab */}
          <TabsContent value="wardrobe" className="mt-6">
            <WardrobeTab
              character={character}
              localOutfits={localOutfits}
              outfitGenerating={outfitGenerating}
              onSetOutfitGenerating={setOutfitGenerating}
              onOutfitUpdate={updateCharacterOutfits}
              onOpenOutfitDialog={() => setIsOutfitDialogOpen(true)}
              onOpenUploadDialog={uploadHook.openUploadDialog}
              refreshUsage={refreshUsage}
            />
          </TabsContent>

          {/* Pose Variants Tab */}
          <TabsContent value="poses" className="mt-6">
            <PoseVariantsView character={character} />
          </TabsContent>
        </Tabs>

        {/* 图片上传对话框（三视图、表情和服装共用） */}
        <ImageUploadDialog
          open={uploadHook.uploadDialogOpen}
          onOpenChange={uploadHook.setUploadDialogOpen}
          onUploadSuccess={(base64Image) => {
            const currentType = uploadHook.currentUploadType;
            // 根据 currentUploadType 判断类型
            if (["front", "side", "back"].includes(currentType)) {
              uploadHook.handleUploadImage(base64Image);
            } else if (expressions.some((e) => e.id === currentType)) {
              uploadHook.handleUploadExpression(base64Image);
            } else {
              uploadHook.handleUploadOutfit(base64Image);
            }
          }}
          title={
            uploadHook.currentUploadType === "front"
              ? "上传正面视图"
              : uploadHook.currentUploadType === "side"
              ? "上传侧面视图"
              : uploadHook.currentUploadType === "back"
              ? "上传背面视图"
              : expressions.some((e) => e.id === uploadHook.currentUploadType)
              ? `上传${expressions.find((e) => e.id === uploadHook.currentUploadType)?.label}表情`
              : "上传服装图片"
          }
          description="上传角色的图片"
        />
      </div>
    </>
  );
};

export default CharacterDetailView;
