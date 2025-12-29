import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { CharacterAsset, UploadType } from "./types";
import { expressions } from "./constants";

interface UseCharacterUploadProps {
  character: CharacterAsset;
  onUpdate?: (character: CharacterAsset) => void;
  onViewsUpdate: (views: Record<string, string>) => void;
  onExpressionsUpdate: (expressions: Record<string, string>) => void;
  onOutfitsUpdate: (outfit: { id: string; outfit_name: string; outfit_type: string; image_url: string | null }) => void;
}

export function useCharacterUpload({
  character,
  onUpdate,
  onViewsUpdate,
  onExpressionsUpdate,
  onOutfitsUpdate,
}: UseCharacterUploadProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState<UploadType>("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const openUploadDialog = (uploadType: UploadType) => {
    setCurrentUploadType(uploadType);
    setUploadDialogOpen(true);
  };

  // 处理三视图上传
  const handleUploadImage = async (base64Image: string) => {
    setIsUploading(true);
    try {
      const response = await fetch(base64Image);
      const blob = await response.blob();
      const file = new File([blob], `${currentUploadType}.png`, { type: "image/png" });

      const formData = new FormData();
      formData.append("character_id", character.id);
      formData.append("type", "view");
      formData.append("sub_type", currentUploadType);
      formData.append("file", file);

      const uploadResponse = await fetch("/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        const imageUrl = data.image_url;
        const urlWithTimestamp = imageUrl.includes('?')
          ? `${imageUrl}&t=${Date.now()}`
          : `${imageUrl}?t=${Date.now()}`;

        onViewsUpdate({ [currentUploadType]: urlWithTimestamp });

        toast({
          title: "上传成功",
          description: `${currentUploadType === "front" ? "正面" : currentUploadType === "side" ? "侧面" : "背面"}视图已上传`,
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
        const error = await uploadResponse.json();
        throw new Error(error.error || "上传失败");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 处理表情上传
  const handleUploadExpression = async (base64Image: string) => {
    setIsUploading(true);
    try {
      const response = await fetch(base64Image);
      const blob = await response.blob();
      const file = new File([blob], `${currentUploadType}.png`, { type: "image/png" });

      const formData = new FormData();
      formData.append("character_id", character.id);
      formData.append("type", "expression");
      formData.append("sub_type", currentUploadType);
      formData.append("file", file);

      const uploadResponse = await fetch("/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        const imageUrl = data.image_url;
        const urlWithTimestamp = imageUrl.includes('?')
          ? `${imageUrl}&t=${Date.now()}`
          : `${imageUrl}?t=${Date.now()}`;

        onExpressionsUpdate({ [currentUploadType]: urlWithTimestamp });

        const expLabel = expressions.find((e) => e.id === currentUploadType)?.label;
        toast({
          title: "上传成功",
          description: `${expLabel}表情已上传`,
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
        const error = await uploadResponse.json();
        throw new Error(error.error || "上传失败");
      }
    } catch (error) {
      console.error("Upload expression error:", error);
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 处理服装上传
  const handleUploadOutfit = async (base64Image: string) => {
    setIsUploading(true);
    try {
      const outfitId = currentUploadType;

      const response = await fetch(base64Image);
      const blob = await response.blob();
      const file = new File([blob], `${outfitId}.png`, { type: "image/png" });

      const formData = new FormData();
      formData.append("character_id", character.id);
      formData.append("type", "outfit");
      formData.append("sub_type", outfitId);
      formData.append("outfit_id", outfitId);
      formData.append("file", file);

      const uploadResponse = await fetch("/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        toast({
          title: "上传成功",
          description: "服装图片已上传",
        });

        const existingOutfits = character.outfits || [];
        const outfitIndex = existingOutfits.findIndex(o => o.id === outfitId);

        if (outfitIndex >= 0 && result.image_url) {
          const updatedOutfit = {
            ...existingOutfits[outfitIndex],
            image_url: result.image_url,
          };
          onOutfitsUpdate(updatedOutfit);
        } else {
          // Fallback: refresh character data
          const updatedChar = await fetch(`/api/character/${character.id}`);
          if (updatedChar.ok) {
            const charData = await updatedChar.json();
            if (onUpdate) {
              onUpdate(charData.character);
            }
          }
        }
      } else {
        const error = await uploadResponse.json();
        throw new Error(error.error || "上传失败");
      }
    } catch (error) {
      console.error("Upload outfit error:", error);
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadDialogOpen,
    setUploadDialogOpen,
    currentUploadType,
    isUploading,
    openUploadDialog,
    handleUploadImage,
    handleUploadExpression,
    handleUploadOutfit,
  };
}
