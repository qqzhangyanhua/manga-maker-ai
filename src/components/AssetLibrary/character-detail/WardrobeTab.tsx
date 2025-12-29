import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ImagePreviewCard from "../ImagePreviewCard";
import { outfitPresets } from "./constants";
import type { CharacterAsset, CreateOutfitData, UploadType } from "./types";

interface WardrobeTabProps {
  character: CharacterAsset;
  localOutfits: Array<{ id: string; outfit_name: string; outfit_type: string; image_url: string | null }>;
  outfitGenerating: Record<string, boolean>;
  onSetOutfitGenerating: (state: Record<string, boolean>) => void;
  onOutfitUpdate: (outfit: { id: string; outfit_name: string; outfit_type: string; image_url: string | null }) => void;
  onOpenOutfitDialog: () => void;
  onOpenUploadDialog: (outfitId: UploadType) => void;
  refreshUsage: () => void;
}

const WardrobeTab = ({
  character,
  localOutfits,
  outfitGenerating,
  onSetOutfitGenerating,
  onOutfitUpdate,
  onOpenOutfitDialog,
  onOpenUploadDialog,
  refreshUsage,
}: WardrobeTabProps) => {
  const { toast } = useToast();

  const handleGenerateOutfit = async (outfitId: string, outfitName: string, outfitType: string) => {
    onSetOutfitGenerating({ ...outfitGenerating, [outfitId]: true });
    try {
      const response = await fetch("/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          outfit_name: outfitName,
          outfit_type: outfitType,
          generate_image: true,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        toast({ title: "服装图片生成成功", description: "图片已生成" });
        refreshUsage();

        if (result.outfit) {
          onOutfitUpdate(result.outfit);
        }
      } else {
        throw new Error("生成失败");
      }
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive"
      });
    } finally {
      onSetOutfitGenerating({ ...outfitGenerating, [outfitId]: false });
    }
  };

  const handleCreatePresetOutfit = async (preset: { id: string; label: string; icon: string }) => {
    onSetOutfitGenerating({ ...outfitGenerating, [preset.id]: true });
    try {
      const response = await fetch("/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          outfit_name: preset.label,
          outfit_type: preset.id,
          generate_image: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "服装创建成功",
          description: `${preset.label} 已添加到服装库并生成图片`,
        });

        refreshUsage();

        if (result.outfit) {
          onOutfitUpdate(result.outfit);
        }
      } else {
        throw new Error("创建失败");
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      onSetOutfitGenerating({ ...outfitGenerating, [preset.id]: false });
    }
  };

  return (
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
          onClick={onOpenOutfitDialog}
        >
          <Plus className="w-4 h-4" />
          添加新服装
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Show existing outfits */}
        {localOutfits.map((outfit) => {
          const preset = outfitPresets.find(p => p.id === outfit.outfit_type);
          return (
            <ImagePreviewCard
              key={outfit.id}
              imageUrl={outfit.image_url && !outfit.image_url.includes("placeholder") ? outfit.image_url : undefined}
              label={`${preset?.icon || "👔"} ${outfit.outfit_name}`}
              aspectRatio="portrait"
              isGenerating={outfitGenerating[outfit.id] || false}
              onGenerate={() => handleGenerateOutfit(outfit.id, outfit.outfit_name, outfit.outfit_type)}
              onUpload={() => onOpenUploadDialog(outfit.id)}
              onRegenerate={() => handleGenerateOutfit(outfit.id, outfit.outfit_name, outfit.outfit_type)}
              onReplace={() => onOpenUploadDialog(outfit.id)}
              showGenerateButton={true}
              showUploadButton={true}
            />
          );
        })}

        {/* Show remaining presets that haven't been created */}
        {outfitPresets
          .filter(preset => !localOutfits.some(o => o.outfit_type === preset.id))
          .map((outfit) => (
            <button
              key={outfit.id}
              onClick={() => handleCreatePresetOutfit(outfit)}
              disabled={outfitGenerating[outfit.id]}
              className={cn(
                "p-4 rounded-lg border-2 border-dashed border-border bg-card/50 transition-all flex flex-col items-center gap-3",
                outfitGenerating[outfit.id]
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-primary/50"
              )}
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
                {outfitGenerating[outfit.id] ? (
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  outfit.icon
                )}
              </div>
              <span className="font-semibold text-foreground">{outfit.label}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {outfitGenerating[outfit.id] ? "生成中..." : "点击生成"}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
};

export default WardrobeTab;
